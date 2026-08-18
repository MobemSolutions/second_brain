"use client";

import { AlertTriangle } from "lucide-react";
import type {
  RoutineBlock,
  RoutineListBlock,
  RoutineProtocolBlock,
  RoutineTableBlock,
  RoutineTextBlock,
} from "@/data/looksmaxing";

function Heading({ children }: { children: string }) {
  return (
    <p className="section-label mb-1.5" style={{ color: "#9c9c9a" }}>
      {children}
    </p>
  );
}

function TableBlock({ block }: { block: RoutineTableBlock }) {
  return (
    <div>
      {block.heading && <Heading>{block.heading}</Heading>}
      <div className="overflow-x-auto rounded-md" style={{ border: "1px solid #e4e2de" }}>
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f4f1" }}>
              {block.headers.map((h) => (
                <th
                  key={h}
                  className="text-left font-medium px-2 py-1.5 whitespace-nowrap"
                  style={{ color: "#5a5a58" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid #e4e2de" }}>
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1.5 align-top" style={{ color: "#1a1a18", minWidth: 140 }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note && (
        <p className="text-xs mt-1.5 italic" style={{ color: "#7a7a78" }}>
          {block.note}
        </p>
      )}
    </div>
  );
}

function ListBlock({ block }: { block: RoutineListBlock }) {
  return (
    <div>
      {block.heading && <Heading>{block.heading}</Heading>}
      <ul className="list-disc pl-4 text-xs space-y-1" style={{ color: "#1a1a18" }}>
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ProtocolBlock({ block }: { block: RoutineProtocolBlock }) {
  const badges: { label: string; className: string }[] = [];
  if (block.frequency) badges.push({ label: block.frequency, className: "badge-violet" });
  if (block.sets) badges.push({ label: block.sets, className: "badge-blue" });
  if (block.reps) badges.push({ label: block.reps, className: "badge-blue" });
  if (block.duration) badges.push({ label: block.duration, className: "badge-gray" });

  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: "#1a1a18" }}>
        {block.heading}
      </p>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {badges.map((b, i) => (
            <span key={i} className={`badge ${b.className}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}
      {block.details && block.details.length > 0 && (
        <ul className="list-disc pl-4 text-xs space-y-1" style={{ color: "#1a1a18" }}>
          {block.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      {block.warning && (
        <div
          className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded-md text-xs"
          style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#92400e" }}
        >
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{block.warning}</span>
        </div>
      )}
    </div>
  );
}

function TextBlock({ block }: { block: RoutineTextBlock }) {
  return (
    <div>
      {block.heading && <Heading>{block.heading}</Heading>}
      <p className="text-xs leading-relaxed" style={{ color: "#5a5a58" }}>
        {block.text}
      </p>
    </div>
  );
}

function BlockSwitch({ block }: { block: RoutineBlock }) {
  switch (block.type) {
    case "table":
      return <TableBlock block={block} />;
    case "list":
      return <ListBlock block={block} />;
    case "protocol":
      return <ProtocolBlock block={block} />;
    case "text":
      return <TextBlock block={block} />;
  }
}

export default function RoutineBlockRenderer({ blocks }: { blocks: RoutineBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <BlockSwitch key={i} block={block} />
      ))}
    </div>
  );
}
