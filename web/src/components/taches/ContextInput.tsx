"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// Free-text "@sport, @finance…" contexte field with a suggestion dropdown
// driven by contexts already used elsewhere, matched against whatever
// comma-separated segment is currently being typed.
export default function ContextInput({ value, onChange, suggestions, placeholder, className, autoFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const segments = value.split(",");
  const current = segments[segments.length - 1].trim().toLowerCase();
  const already = new Set(segments.slice(0, -1).map((s) => s.trim().toLowerCase()));
  const matches = current
    ? suggestions.filter((s) => s.toLowerCase().includes(current) && s.toLowerCase() !== current && !already.has(s.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => { setHighlight(0); }, [current]);

  const pick = (s: string) => {
    const before = segments.slice(0, -1).map((x) => x.trim()).filter(Boolean);
    onChange([...before, s].join(", ") + ", ");
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + matches.length) % matches.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(matches[highlight]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {open && matches.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full rounded-lg overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e4e2de", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
        >
          {matches.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-1.5 text-sm"
              style={{
                backgroundColor: i === highlight ? "#f5f0ff" : "transparent",
                color: i === highlight ? "#6d28d9" : "#3e3e3c",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
