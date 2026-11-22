/**
 * MessageBubble
 * -------------
 * ChatGPT-style conversation turn:
 *   - Student message: right-aligned neutral surface pill (`bg-surface`),
 *     no avatar clutter, no gradients.
 *   - Assistant message: full-width editorial typography in the 768px
 *     column with a 28px CogniCode emblem, structured Markdown rendering,
 *     and layered code blocks with a copy button.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Logo from "../brand/Logo.jsx";

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line-subtle bg-code text-sm">
      <div className="flex items-center justify-between bg-code-header px-3.5 py-1.5 text-xs text-fg-secondary">
        <span className="font-mono lowercase">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-fg-secondary hover:bg-hover hover:text-fg transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Parse inline markdown tokens: `code`, **bold**, *italic*
 */
function renderInline(text) {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((token, idx) => {
    if (!token) return null;
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return <code key={idx}>{token.slice(1, -1)}</code>;
    }
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return <strong key={idx}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
      return <em key={idx}>{token.slice(1, -1)}</em>;
    }
    return token;
  });
}

/**
 * Render non-code prose blocks (headings, lists, blockquotes, paragraphs).
 */
function renderProseSegment(segment, segIdx) {
  const lines = segment.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      const Tag = `h${level}`;
      blocks.push(<Tag key={`${segIdx}-h-${i}`}>{content}</Tag>);
      i += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`${segIdx}-ul-${i}`}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`${segIdx}-ol-${i}`}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote key={`${segIdx}-bq-${i}`}>
          {renderInline(quoteLines.join(" "))}
        </blockquote>
      );
      continue;
    }

    // Paragraph (collect consecutive regular lines)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={`${segIdx}-p-${i}`}>
        {paraLines.map((pl, pIdx) => (
          <span key={pIdx}>
            {pIdx > 0 && <br />}
            {renderInline(pl)}
          </span>
        ))}
      </p>
    );
  }

  return blocks;
}

function FormattedContent({ content = "" }) {
  const regex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textSegment = content.slice(lastIndex, match.index);
      elements.push(...renderProseSegment(textSegment, lastIndex));
    }
    elements.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={match[1]}
        code={match[2].replace(/\n$/, "")}
      />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    elements.push(...renderProseSegment(content.slice(lastIndex), lastIndex));
  }

  return <div className="prose-chat">{elements}</div>;
}

export default function MessageBubble({ role, content, timestamp, intent, status }) {
  const isStudent = role === "student";
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (isStudent) {
    return (
      <div className="flex flex-col items-end animate-fade-in">
        <div
          className={[
            "max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
            status === "failed"
              ? "bg-danger-soft text-danger border border-danger"
              : "bg-surface text-fg",
          ].join(" ")}
        >
          {content}
        </div>
        {(timestamp || status === "queued" || status === "failed") && (
          <span className="mt-1 px-1 text-[11px] text-fg-muted">
            {timestamp ? formatTime(timestamp) : ""}
            {status === "queued" && " · Queued (reconnecting)"}
            {status === "failed" && " · Not delivered"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3.5 animate-fade-in">
      <div className="mt-0.5 shrink-0">
        <Logo size={26} />
      </div>

      <div className="min-w-0 flex-1">
        <FormattedContent content={content} />

        <div className="mt-2 flex items-center gap-2.5 text-xs text-fg-muted">
          {timestamp && <span>{formatTime(timestamp)}</span>}
          {intent && (
            <span className="capitalize">· {intent.replace(/_/g, " ")}</span>
          )}
          <button
            type="button"
            onClick={copyMessage}
            aria-label="Copy response"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-fg-muted opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:bg-hover hover:text-fg transition-all"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
