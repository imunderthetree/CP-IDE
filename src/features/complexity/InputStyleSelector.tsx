// features/complexity/InputStyleSelector.tsx — Input generation style selector.

import { useState } from "react";
import type { InputStyle } from "../../lib/tauriClient";

interface InputStyleSelectorProps {
  value: InputStyle;
  onChange: (style: InputStyle) => void;
}

const OPTIONS: Array<{ value: InputStyle; label: string; desc: string }> = [
  { value: "SingleInt", label: "Single n", desc: "Just n on one line" },
  { value: "NIntegers", label: "n integers", desc: "n followed by n random integers" },
  { value: "NByMGrid", label: "n×n grid", desc: "n×n grid of random integers" },
];

export default function InputStyleSelector({ value, onChange }: InputStyleSelectorProps) {
  const [customTemplate, setCustomTemplate] = useState("{N}\n");

  const isCustom = typeof value === "object" && "Custom" in value;
  const selectedKey = isCustom ? "custom" : (value as string);

  return (
    <div className="input-style-selector">
      <label className="cx-label">Input Style</label>
      <div className="cx-pill-row">
        {OPTIONS.map((opt) => {
          const key = typeof opt.value === "string" ? opt.value : "custom";
          return (
            <button
              key={key}
              className={`filter-pill ${selectedKey === key ? "active" : ""}`}
              onClick={() => onChange(opt.value)}
              title={opt.desc}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          className={`filter-pill ${isCustom ? "active" : ""}`}
          onClick={() => onChange({ Custom: customTemplate })}
          title="Custom template with {N} placeholder"
        >
          Custom
        </button>
      </div>
      {isCustom && (
        <textarea
          className="cx-custom-template"
          value={customTemplate}
          onChange={(e) => {
            setCustomTemplate(e.target.value);
            onChange({ Custom: e.target.value });
          }}
          placeholder="Use {N} as the input size placeholder"
          rows={3}
          spellCheck={false}
        />
      )}
    </div>
  );
}
