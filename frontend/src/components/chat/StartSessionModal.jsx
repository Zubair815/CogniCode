/**
 * StartSessionModal
 * -----------------
 * Modal for starting a new session — asks for a topic.
 * On submit, calls chatService.startSession and navigates to
 * the chat page.
 *
 * Created: 10/10/2026
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import { chatService } from "../../services/chatService.js";
import { chatRoute } from "../../constants/routes.js";

const SUGGESTED_TOPICS = [
  "Linked Lists",
  "Recursion",
  "Sorting Algorithms",
  "Binary Trees",
  "Big-O Analysis",
  "Hash Tables",
];

export default function StartSessionModal({ open, onClose }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens.
  useEffect(() => {
    if (open) {
      setTopic("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault();
    setError("");

    const t = topic.trim();
    if (t.length < 3) {
      setError("Topic must be at least 3 characters.");
      return;
    }

    setLoading(true);
    try {
      const session = await chatService.startSession(t);
      onClose();
      navigate(chatRoute(session.id));
    } catch (err) {
      setError(err.message || "Could not start session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[color:var(--border-2)] p-6 shadow-card animate-[ccFadeUp_0.25s_ease_both]"
        style={{ background: "var(--bg2)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              Start a new session
            </h3>
            <p className="text-xs text-[color:var(--text-muted)] mt-1">
              What do you want to learn today?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit}>
          <Input
            id="topic"
            label="Topic"
            placeholder="e.g., Linked Lists"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
            maxLength={200}
          />

          {/* Suggested topics */}
          <div className="flex flex-wrap gap-1.5 mb-4 mt-1">
            {SUGGESTED_TOPICS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-[color:var(--border-2)] text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-2)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs font-medium text-[color:var(--danger)]">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? "Starting…" : "Start session"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}