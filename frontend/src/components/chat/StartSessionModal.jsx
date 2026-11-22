/**
 * StartSessionModal
 * -----------------
 * Accessible dialog for starting a new Socratic tutoring session.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Alert from "../ui/Alert.jsx";
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

export default function StartSessionModal({ open, onClose, onCreated }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setTopic("");
    setError("");
    setLoading(false);
    onClose?.();
  };

  const submit = async (e) => {
    e?.preventDefault();
    setError("");

    const t = topic.trim();
    if (t.length < 3) {
      setError("Enter a topic of at least 3 characters.");
      return;
    }

    setLoading(true);
    try {
      const session = await chatService.startSession(t);
      setTopic("");
      setError("");
      onClose?.();
      if (onCreated) {
        onCreated(session);
      } else {
        navigate(chatRoute(session.id));
      }
    } catch (err) {
      setError(err.message || "Unable to start the session. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New tutoring session"
      description="Choose a programming topic or concept to work through."
    >
      <form onSubmit={submit} noValidate>
        <Input
          id="topic"
          label="Topic"
          placeholder="e.g., Binary Search Trees"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          autoFocus
          maxLength={200}
        />

        <div className="mb-4">
          <div className="mb-1.5 text-xs text-fg-muted">Suggested topics</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TOPICS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className={[
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-fast",
                  topic === s
                    ? "border-accent bg-accent-soft text-accent-fg"
                    : "border-line-subtle bg-surface text-fg-secondary hover:bg-hover hover:text-fg",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? "Starting…" : "Start chat"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
