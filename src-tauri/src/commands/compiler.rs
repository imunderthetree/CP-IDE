// commands/compiler.rs — Compile and run user code via bundled or system compilers.
//
// Accepts { code, language, stdin, flags } from the frontend and returns
// { stdout, stderr, exit_code, runtime_ms, memory_kb }.
//
// Compiler resolution order:
//   1. Bundled compilers in the app resource directory (src-tauri/compilers/)
//   2. Fallback to system PATH (for development convenience)
//
// Supported languages: C++ (g++), Python (python/python3), Java (javac + java)

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Instant;
use tauri::Manager;

/// Windows constant: CREATE_NO_WINDOW prevents a visible console flash.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Request payload from the frontend.
#[derive(Debug, Deserialize)]
pub struct RunCodeRequest {
    /// Source code to compile and run.
    pub code: String,
    /// Language identifier: "cpp", "python", or "java".
    pub language: String,
    /// Standard input to feed to the program.
    pub stdin: String,
    /// Compile flags: "debug" (-g -fsanitize=address) or "judge" (-O2).
    pub flags: String,
}

/// Response payload sent back to the frontend.
#[derive(Debug, Serialize)]
pub struct RunCodeResponse {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub runtime_ms: u64,
    pub memory_kb: u64,
}

/// Create a `Command` that hides the console window on Windows.
fn hidden_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Resolve the full path to a compiler binary.
/// First checks the bundled compilers directory, then falls back to PATH.
fn resolve_compiler(app_handle: &tauri::AppHandle, binary_name: &str, subdir: &str) -> String {
    // Try bundled path first: <resource_dir>/compilers/<subdir>/<binary_name>
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let bundled = resource_dir
            .join("compilers")
            .join(subdir)
            .join(format!("{}.exe", binary_name));
        if bundled.exists() {
            return bundled.to_string_lossy().to_string();
        }
    }

    if binary_name == "python" {
        for cmd in ["python3", "python", "py", "pypy3"] {
            if let Ok(out) = std::process::Command::new(cmd).arg("--version").output() {
                if out.status.success() {
                    return cmd.to_string();
                }
            }
        }
    }

    // Fallback: rely on system PATH
    binary_name.to_string()
}

/// Create a temporary directory for compilation artifacts.
fn create_temp_dir() -> Result<PathBuf, String> {
    let temp = std::env::temp_dir().join(format!("cpide_{}", std::process::id()));
    std::fs::create_dir_all(&temp).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    Ok(temp)
}

/// Write source code to a temporary file and return the file path.
fn write_source_file(temp_dir: &PathBuf, filename: &str, code: &str) -> Result<PathBuf, String> {
    let path = temp_dir.join(filename);
    std::fs::write(&path, code).map_err(|e| format!("Failed to write source file: {}", e))?;
    Ok(path)
}

/// Run a command with stdin, capture output, and measure time.
fn run_process(
    cmd: &str,
    args: &[&str],
    stdin_data: &str,
    timeout_secs: u64,
) -> Result<RunCodeResponse, String> {
    let start = Instant::now();

    let mut child = hidden_command(cmd);
    child
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = child
        .spawn()
        .map_err(|e| format!("Failed to spawn process '{}': {}", cmd, e))?;

    // Write stdin
    if let Some(mut stdin_pipe) = child.stdin.take() {
        let _ = stdin_pipe.write_all(stdin_data.as_bytes());
        // stdin is dropped here, closing the pipe
    }

    // Wait with timeout
    let output = match child.wait_with_output() {
        Ok(output) => output,
        Err(e) => return Err(format!("Process execution failed: {}", e)),
    };

    let elapsed = start.elapsed();

    // Check timeout (best-effort since wait_with_output is blocking)
    if elapsed.as_secs() > timeout_secs {
        return Ok(RunCodeResponse {
            stdout: String::new(),
            stderr: format!("Time Limit Exceeded ({}s)", timeout_secs),
            exit_code: -1,
            runtime_ms: elapsed.as_millis() as u64,
            memory_kb: 0,
        });
    }

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(RunCodeResponse {
        stdout,
        stderr,
        exit_code,
        runtime_ms: elapsed.as_millis() as u64,
        memory_kb: 0, // TODO: Windows job objects for memory tracking
    })
}

/// Compile and run C++ code.
fn run_cpp(
    app_handle: &tauri::AppHandle,
    code: &str,
    stdin: &str,
    flags: &str,
) -> Result<RunCodeResponse, String> {
    let temp_dir = create_temp_dir()?;
    let source_path = write_source_file(&temp_dir, "solution.cpp", code)?;
    let output_path = temp_dir.join("solution.exe");

    let compiler = resolve_compiler(app_handle, "g++", "mingw/bin");

    // Build compile args based on flag mode
    let mut compile_args: Vec<&str> = vec![];
    let source_str = source_path.to_string_lossy().to_string();
    let output_str = output_path.to_string_lossy().to_string();

    match flags {
        "debug" => {
            compile_args.extend_from_slice(&["-g", "-fsanitize=address", "-std=c++17"]);
        }
        _ => {
            // "judge" mode or default
            compile_args.extend_from_slice(&["-O2", "-std=c++17"]);
        }
    }
    compile_args.extend_from_slice(&[&source_str, "-o", &output_str]);

    // Compile
    let mut compile_cmd = hidden_command(&compiler);
    compile_cmd
        .args(&compile_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let compile_result = compile_cmd
        .spawn()
        .map_err(|e| format!("Failed to start compiler '{}': {}", compiler, e))?
        .wait_with_output()
        .map_err(|e| format!("Compiler execution failed: {}", e))?;

    if !compile_result.status.success() {
        let stderr = String::from_utf8_lossy(&compile_result.stderr).to_string();
        // Clean up temp files
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Ok(RunCodeResponse {
            stdout: String::new(),
            stderr: format!("Compilation Error:\n{}", stderr),
            exit_code: compile_result.status.code().unwrap_or(-1),
            runtime_ms: 0,
            memory_kb: 0,
        });
    }

    // Run the compiled binary
    let result = run_process(&output_str, &[], stdin, 10)?;

    // Clean up temp files
    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(result)
}

/// Run Python code directly via interpreter.
fn run_python(
    app_handle: &tauri::AppHandle,
    code: &str,
    stdin: &str,
) -> Result<RunCodeResponse, String> {
    let temp_dir = create_temp_dir()?;
    let source_path = write_source_file(&temp_dir, "solution.py", code)?;
    let source_str = source_path.to_string_lossy().to_string();

    let interpreter = resolve_compiler(app_handle, "python", "python");

    let result = run_process(&interpreter, &[&source_str], stdin, 10)?;

    // Clean up
    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(result)
}

/// Compile and run Java code.
fn run_java(
    app_handle: &tauri::AppHandle,
    code: &str,
    stdin: &str,
) -> Result<RunCodeResponse, String> {
    let temp_dir = create_temp_dir()?;

    // Extract the public class name from the code, default to "Main"
    let class_name = extract_java_class_name(code).unwrap_or_else(|| "Main".to_string());
    let filename = format!("{}.java", class_name);
    let source_path = write_source_file(&temp_dir, &filename, code)?;
    let source_str = source_path.to_string_lossy().to_string();
    let temp_str = temp_dir.to_string_lossy().to_string();

    let javac = resolve_compiler(app_handle, "javac", "jdk/bin");
    let java = resolve_compiler(app_handle, "java", "jdk/bin");

    // Compile
    let mut compile_cmd = hidden_command(&javac);
    compile_cmd
        .args(&[&source_str])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let compile_result = compile_cmd
        .spawn()
        .map_err(|e| format!("Failed to start javac '{}': {}", javac, e))?
        .wait_with_output()
        .map_err(|e| format!("javac execution failed: {}", e))?;

    if !compile_result.status.success() {
        let stderr = String::from_utf8_lossy(&compile_result.stderr).to_string();
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Ok(RunCodeResponse {
            stdout: String::new(),
            stderr: format!("Compilation Error:\n{}", stderr),
            exit_code: compile_result.status.code().unwrap_or(-1),
            runtime_ms: 0,
            memory_kb: 0,
        });
    }

    // Run
    let result = run_process(&java, &["-cp", &temp_str, &class_name], stdin, 10)?;

    // Clean up
    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(result)
}

/// Extract the public class name from Java source code.
fn extract_java_class_name(code: &str) -> Option<String> {
    for line in code.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("public class ") {
            let rest = &trimmed["public class ".len()..];
            let name: String = rest.chars().take_while(|c| c.is_alphanumeric() || *c == '_').collect();
            if !name.is_empty() {
                return Some(name);
            }
        }
    }
    None
}

/// Main Tauri command: compile and run code in the specified language.
///
/// Invoked from the frontend via: invoke("run_code", { request: { ... } })
#[tauri::command]
pub async fn run_code(
    app_handle: tauri::AppHandle,
    request: RunCodeRequest,
) -> Result<RunCodeResponse, String> {
    match request.language.as_str() {
        "cpp" => run_cpp(&app_handle, &request.code, &request.stdin, &request.flags),
        "python" => run_python(&app_handle, &request.code, &request.stdin),
        "java" => run_java(&app_handle, &request.code, &request.stdin),
        _ => Err(format!("Unsupported language: {}", request.language)),
    }
}

// ─── Batch Execution (compile once, run N times) ──────────────────────────────

/// Request payload for batch execution.
#[derive(Debug, Deserialize)]
pub struct RunBatchRequest {
    /// Source code to compile once.
    pub code: String,
    /// Language identifier: "cpp", "python", or "java".
    pub language: String,
    /// Array of stdin inputs — one per test case.
    pub stdins: Vec<String>,
    /// Compile flags: "debug" or "judge".
    pub flags: String,
}

/// Response for batch execution — one result per test case.
#[derive(Debug, Serialize)]
pub struct RunBatchResponse {
    /// If compilation failed, this holds the error message.
    pub compile_error: Option<String>,
    /// One RunCodeResponse per stdin, in order. Empty if compile failed.
    pub results: Vec<RunCodeResponse>,
}

/// Compile C++ once, then run the binary against each stdin.
fn batch_cpp(
    app_handle: &tauri::AppHandle,
    code: &str,
    stdins: &[String],
    flags: &str,
) -> Result<RunBatchResponse, String> {
    let temp_dir = create_temp_dir()?;
    let source_path = write_source_file(&temp_dir, "solution.cpp", code)?;
    let output_path = temp_dir.join("solution.exe");

    let compiler = resolve_compiler(app_handle, "g++", "mingw/bin");

    let mut compile_args: Vec<&str> = vec![];
    let source_str = source_path.to_string_lossy().to_string();
    let output_str = output_path.to_string_lossy().to_string();

    match flags {
        "debug" => {
            compile_args.extend_from_slice(&["-g", "-fsanitize=address", "-std=c++17"]);
        }
        _ => {
            compile_args.extend_from_slice(&["-O2", "-std=c++17"]);
        }
    }
    compile_args.extend_from_slice(&[&source_str, "-o", &output_str]);

    // Compile once
    let mut compile_cmd = hidden_command(&compiler);
    compile_cmd
        .args(&compile_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let compile_result = compile_cmd
        .spawn()
        .map_err(|e| format!("Failed to start compiler '{}': {}", compiler, e))?
        .wait_with_output()
        .map_err(|e| format!("Compiler execution failed: {}", e))?;

    if !compile_result.status.success() {
        let stderr = String::from_utf8_lossy(&compile_result.stderr).to_string();
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Ok(RunBatchResponse {
            compile_error: Some(format!("Compilation Error:\n{}", stderr)),
            results: vec![],
        });
    }

    // Run against each stdin
    let mut results = Vec::with_capacity(stdins.len());
    for stdin in stdins {
        let result = run_process(&output_str, &[], stdin, 10)?;
        results.push(result);
    }

    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(RunBatchResponse {
        compile_error: None,
        results,
    })
}

/// Run Python against each stdin (no compilation step, but reuses the temp file).
fn batch_python(
    app_handle: &tauri::AppHandle,
    code: &str,
    stdins: &[String],
) -> Result<RunBatchResponse, String> {
    let temp_dir = create_temp_dir()?;
    let source_path = write_source_file(&temp_dir, "solution.py", code)?;
    let source_str = source_path.to_string_lossy().to_string();
    let interpreter = resolve_compiler(app_handle, "python", "python");

    let mut results = Vec::with_capacity(stdins.len());
    for stdin in stdins {
        let result = run_process(&interpreter, &[&source_str], stdin, 10)?;
        results.push(result);
    }

    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(RunBatchResponse {
        compile_error: None,
        results,
    })
}

/// Compile Java once, then run against each stdin.
fn batch_java(
    app_handle: &tauri::AppHandle,
    code: &str,
    stdins: &[String],
) -> Result<RunBatchResponse, String> {
    let temp_dir = create_temp_dir()?;

    let class_name = extract_java_class_name(code).unwrap_or_else(|| "Main".to_string());
    let filename = format!("{}.java", class_name);
    let source_path = write_source_file(&temp_dir, &filename, code)?;
    let source_str = source_path.to_string_lossy().to_string();
    let temp_str = temp_dir.to_string_lossy().to_string();

    let javac = resolve_compiler(app_handle, "javac", "jdk/bin");
    let java = resolve_compiler(app_handle, "java", "jdk/bin");

    // Compile once
    let mut compile_cmd = hidden_command(&javac);
    compile_cmd
        .args(&[&source_str])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let compile_result = compile_cmd
        .spawn()
        .map_err(|e| format!("Failed to start javac '{}': {}", javac, e))?
        .wait_with_output()
        .map_err(|e| format!("javac execution failed: {}", e))?;

    if !compile_result.status.success() {
        let stderr = String::from_utf8_lossy(&compile_result.stderr).to_string();
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Ok(RunBatchResponse {
            compile_error: Some(format!("Compilation Error:\n{}", stderr)),
            results: vec![],
        });
    }

    // Run against each stdin
    let mut results = Vec::with_capacity(stdins.len());
    for stdin in stdins {
        let result = run_process(&java, &["-cp", &temp_str, &class_name], stdin, 10)?;
        results.push(result);
    }

    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(RunBatchResponse {
        compile_error: None,
        results,
    })
}

/// Main Tauri command: compile once, run against multiple test case inputs.
///
/// Invoked from the frontend via: invoke("run_batch", { request: { ... } })
#[tauri::command]
pub async fn run_batch(
    app_handle: tauri::AppHandle,
    request: RunBatchRequest,
) -> Result<RunBatchResponse, String> {
    match request.language.as_str() {
        "cpp" => batch_cpp(&app_handle, &request.code, &request.stdins, &request.flags),
        "python" => batch_python(&app_handle, &request.code, &request.stdins),
        "java" => batch_java(&app_handle, &request.code, &request.stdins),
        _ => Err(format!("Unsupported language: {}", request.language)),
    }
}

