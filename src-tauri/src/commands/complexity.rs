// commands/complexity.rs — Empirical complexity analysis runner.
//
// Compiles the user's code once, then runs it with growing input sizes.
// Emits a Tauri event per data point so the frontend can plot live.
// Supports cancellation via a shared AtomicBool in app state.

use crate::commands::compiler_detect::detect_compilers;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, State};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ComplexityDataPoint {
    pub n: u64,
    pub time_ms: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub enum InputStyle {
    SingleInt,
    NIntegers,
    NByMGrid,
    Custom(String),
}

/// Shared cancellation flag managed by Tauri state.
pub struct ComplexityCancel {
    pub cancelled: Arc<AtomicBool>,
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Run complexity analysis: compile once, run at each n, emit data points.
#[tauri::command]
pub async fn run_complexity_analysis(
    app: tauri::AppHandle,
    code: String,
    language: String,
    n_values: Vec<u64>,
    input_style: InputStyle,
    compiler_path: Option<String>,
    cancel: State<'_, ComplexityCancel>,
) -> Result<(), String> {
    // Reset cancellation flag
    cancel.cancelled.store(false, Ordering::SeqCst);

    // Resolve compiler
    let compiler = match compiler_path {
        Some(p) => p,
        None => {
            detect_compilers(app.clone())
                .into_iter()
                .find(|c| c.language == language)
                .map(|c| c.path)
                .ok_or(format!(
                    "No compiler found for {}. Install one or check bundled compilers in Settings.",
                    language
                ))?
        }
    };

    // Write source to temp dir
    let tmp = std::env::temp_dir().join("cpide_complexity");
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;

    let src_file = match language.as_str() {
        "cpp" => "solution.cpp",
        "python" => "solution.py",
        "java" => "Solution.java",
        _ => return Err("Unsupported language".into()),
    };
    let src_path = tmp.join(src_file);
    std::fs::write(&src_path, &code).map_err(|e| e.to_string())?;

    // Compile once (C++ and Java only)
    if language == "cpp" {
        let bin_name = if cfg!(windows) {
            "solution_complexity.exe"
        } else {
            "solution_complexity"
        };
        let bin = tmp.join(bin_name);
        let status = std::process::Command::new(&compiler)
            .args([
                "-O2",
                "-o",
                bin.to_str().unwrap(),
                src_path.to_str().unwrap(),
            ])
            .status()
            .map_err(|e| format!("Failed to run compiler: {}", e))?;
        if !status.success() {
            return Err(
                "Compilation failed — fix errors before running complexity analysis".into(),
            );
        }
    } else if language == "java" {
        let status = std::process::Command::new(&compiler)
            .arg(src_path.to_str().unwrap())
            .current_dir(&tmp)
            .status()
            .map_err(|e| format!("Failed to run javac: {}", e))?;
        if !status.success() {
            return Err(
                "Java compilation failed — fix errors before running complexity analysis".into(),
            );
        }
    }

    // Run at each n, 3 times each, emit one event per n
    for &n in &n_values {
        // Check cancellation between iterations
        if cancel.cancelled.load(Ordering::SeqCst) {
            return Ok(());
        }

        let input = generate_input(n, &input_style);
        let mut times: Vec<f64> = Vec::new();

        for _ in 0..3 {
            if cancel.cancelled.load(Ordering::SeqCst) {
                return Ok(());
            }

            let start = std::time::Instant::now();
            run_with_input(&compiler, &language, &tmp, &input)?;
            times.push(start.elapsed().as_secs_f64() * 1000.0);
        }

        times.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median = times[times.len() / 2]; // Median of 3

        app.emit(
            "complexity_point",
            ComplexityDataPoint {
                n,
                time_ms: median,
            },
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Stop an in-progress complexity analysis.
#[tauri::command]
pub async fn stop_complexity_analysis(
    cancel: State<'_, ComplexityCancel>,
) -> Result<(), String> {
    cancel.cancelled.store(true, Ordering::SeqCst);
    Ok(())
}

// ─── Input Generation ─────────────────────────────────────────────────────────

/// Simple LCG pseudo-random number generator — no external crate needed.
struct LcgRng {
    state: u64,
}

impl LcgRng {
    fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1);
        (self.state >> 33) % 1_000_000 + 1
    }
}

fn generate_input(n: u64, style: &InputStyle) -> String {
    use std::fmt::Write;
    let mut rng = LcgRng::new(12345);

    match style {
        InputStyle::SingleInt => format!("{}\n", n),
        InputStyle::NIntegers => {
            let mut s = format!("{}\n", n);
            for i in 0..n {
                write!(s, "{}", rng.next()).unwrap();
                if i < n - 1 {
                    s.push(' ');
                }
            }
            s.push('\n');
            s
        }
        InputStyle::NByMGrid => {
            let mut s = format!("{} {}\n", n, n);
            for _ in 0..n {
                for j in 0..n {
                    write!(s, "{}", rng.next()).unwrap();
                    if j < n - 1 {
                        s.push(' ');
                    }
                }
                s.push('\n');
            }
            s
        }
        InputStyle::Custom(template) => template.replace("{N}", &n.to_string()),
    }
}

// ─── Execution ────────────────────────────────────────────────────────────────

fn run_with_input(
    compiler: &str,
    language: &str,
    tmp: &std::path::Path,
    input: &str,
) -> Result<(), String> {
    use std::io::Write as _;

    let bin_name = if cfg!(windows) {
        "solution_complexity.exe"
    } else {
        "solution_complexity"
    };

    let mut child = match language {
        "cpp" => std::process::Command::new(tmp.join(bin_name))
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn(),
        "python" => std::process::Command::new(compiler)
            .arg(tmp.join("solution.py"))
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn(),
        "java" => {
            let java_cmd = compiler.replace("javac", "java");
            std::process::Command::new(java_cmd)
                .args(["-cp", tmp.to_str().unwrap(), "Solution"])
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn()
        }
        _ => return Err("Unsupported language".into()),
    }
    .map_err(|e| format!("Failed to spawn process: {}", e))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin.write_all(input.as_bytes()).ok();
    }
    // Drop stdin to signal EOF
    drop(child.stdin.take());

    let status = child
        .wait()
        .map_err(|e| format!("Process wait failed: {}", e))?;

    if !status.success() {
        return Err(format!(
            "Process exited with code {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(())
}
