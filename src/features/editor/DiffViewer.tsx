// features/editor/DiffViewer.tsx — Side-by-side diff of expected vs actual output.
//
// Compares line-by-line, highlights differing lines, and within differing
// lines highlights the specific characters that differ.

interface Props {
  expected: string;
  actual: string;
}

interface DiffLine {
  lineNum: number;
  expected: string;
  actual: string;
  status: "match" | "diff" | "missing-expected" | "missing-actual";
}

/** Compute line-by-line diff between expected and actual output. */
function computeDiff(expected: string, actual: string): DiffLine[] {
  const expLines = expected.split("\n");
  const actLines = actual.split("\n");
  const maxLen = Math.max(expLines.length, actLines.length);
  const result: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const exp = expLines[i];
    const act = actLines[i];

    if (exp === undefined) {
      result.push({ lineNum: i + 1, expected: "", actual: act, status: "missing-expected" });
    } else if (act === undefined) {
      result.push({ lineNum: i + 1, expected: exp, actual: "", status: "missing-actual" });
    } else if (exp === act) {
      result.push({ lineNum: i + 1, expected: exp, actual: act, status: "match" });
    } else {
      result.push({ lineNum: i + 1, expected: exp, actual: act, status: "diff" });
    }
  }

  return result;
}

/** Render a string with character-level diff highlighting against a reference string. */
function highlightChars(text: string, reference: string, side: "expected" | "actual"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const maxLen = Math.max(text.length, reference.length);
  let run = "";
  let runDiff = false;

  const flush = (idx: number) => {
    if (run) {
      if (runDiff) {
        nodes.push(
          <span key={`${side}-${idx}`} className="diff-char-highlight">
            {run}
          </span>
        );
      } else {
        nodes.push(<span key={`${side}-${idx}`}>{run}</span>);
      }
      run = "";
    }
  };

  for (let i = 0; i < maxLen; i++) {
    const c = text[i] ?? "";
    const r = reference[i] ?? "";
    const isDiff = c !== r;

    if (isDiff !== runDiff) {
      flush(i);
      runDiff = isDiff;
    }
    run += c || " ";
  }
  flush(maxLen);

  return nodes;
}

export default function DiffViewer({ expected, actual }: Props) {
  const lines = computeDiff(expected.trimEnd(), actual.trimEnd());

  if (lines.length === 0) {
    return (
      <div className="diff-empty">
        <span>Nothing to compare</span>
      </div>
    );
  }

  const allMatch = lines.every((l) => l.status === "match");

  return (
    <div className="diff-viewer">
      {allMatch && (
        <div className="diff-match-banner">
          <span className="diff-match-icon">✓</span>
          Output matches expected
        </div>
      )}

      <div className="diff-table">
        {/* Header */}
        <div className="diff-header-row">
          <div className="diff-line-num">#</div>
          <div className="diff-col-header diff-expected-header">Expected</div>
          <div className="diff-col-header diff-actual-header">Actual</div>
        </div>

        {/* Lines */}
        {lines.map((line) => (
          <div
            key={line.lineNum}
            className={`diff-row diff-row-${line.status}`}
          >
            <div className="diff-line-num">{line.lineNum}</div>
            <div className="diff-cell diff-expected-cell">
              {line.status === "diff"
                ? highlightChars(line.expected, line.actual, "expected")
                : line.status === "missing-expected"
                  ? <span className="diff-missing">—</span>
                  : line.expected || <span className="diff-empty-line">&nbsp;</span>}
            </div>
            <div className="diff-cell diff-actual-cell">
              {line.status === "diff"
                ? highlightChars(line.actual, line.expected, "actual")
                : line.status === "missing-actual"
                  ? <span className="diff-missing">—</span>
                  : line.actual || <span className="diff-empty-line">&nbsp;</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
