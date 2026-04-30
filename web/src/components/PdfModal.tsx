"use client";

import { X, ExternalLink } from "lucide-react";

export default function PdfModal({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <p className="text-sm text-zinc-300 truncate max-w-xs">{filename}</p>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs flex items-center gap-1.5 py-1"
          >
            <ExternalLink size={12} />
            Ouvrir dans l&apos;onglet
          </a>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1.5"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full border-0" title={filename} />
    </div>
  );
}
