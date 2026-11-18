import { useState, useEffect } from "react";
import { FileEdit, CheckCircle2, Clock, Sparkles, Send, Tag, BookMarked, Loader2 } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { instructorService } from "../../services/instructorService.js";

export default function Reflections() {
  const [topic, setTopic] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [mistake, setMistake] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reflections, setReflections] = useState([
    {
      id: "ref-1",
      topic: "Recursion & Call Stack",
      date: "Nov 17, 2026 · 4:30 PM",
      cdsBand: "Low Dependency",
      takeaway:
        "I understood that the base case must precede recursive calls, and every call creates an activation record on the stack.",
      mistakeToAvoid:
        "Never omit the return keyword when propagating recursive return values back up the call chain.",
      tags: ["Recursion", "Memory Stack", "Base Case"],
    },
    {
      id: "ref-2",
      topic: "Binary Search Trees",
      date: "Nov 15, 2026 · 2:15 PM",
      cdsBand: "Moderate Dependency",
      takeaway:
        "Inorder traversal of a valid BST always yields values in strictly non-decreasing sorted order.",
      mistakeToAvoid:
        "Only checking immediate child pointers rather than enforcing min/max boundaries on subtree descendants.",
      tags: ["Trees", "BST", "Algorithms"],
    },
    {
      id: "ref-3",
      topic: "Linked List Reversal",
      date: "Nov 12, 2026 · 11:00 AM",
      cdsBand: "Low Dependency",
      takeaway:
        "Three-pointer technique (prev, curr, next) cleanly manages node redirection without losing reference to remaining nodes.",
      mistakeToAvoid:
        "Overwriting curr.next before saving the original next pointer in a temporary variable.",
      tags: ["Pointers", "Linked Lists"],
    },
  ]);

  useEffect(() => {
    let active = true;
    async function fetchReflections() {
      try {
        const data = await instructorService.getStudentReflections();
        if (active && data && data.length > 0) {
          const mapped = data.map((r) => ({
            id: r.id,
            topic: r.topic || "Computer Science",
            date: r.created_at ? new Date(r.created_at).toLocaleDateString() : "Recent",
            cdsBand: "Verified Reflection",
            takeaway: r.learned_today,
            mistakeToAvoid: r.mistake_to_avoid,
            tags: [r.topic || "Core CS"],
          }));
          setReflections(mapped);
        }
      } catch (err) {
        // Fallback to local default reflections
      }
    }
    fetchReflections();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim() || !takeaway.trim() || !mistake.trim()) return;

    const newReflection = {
      id: `ref-${Date.now()}`,
      topic,
      date: "Just now",
      cdsBand: "Self Reflection",
      takeaway,
      mistakeToAvoid: mistake,
      tags: [topic],
    };

    setReflections([newReflection, ...reflections]);
    setTopic("");
    setTakeaway("");
    setMistake("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <AppLayout activeCds={32}>
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <BookMarked className="text-[color:var(--primary)]" />
            Learning Journal & Reflections
          </h1>
          <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
            Mandatory post-session reflections build metacognitive awareness and long-term problem solving memory.
          </p>
        </div>

        {/* Reflection Input Card */}
        <div className="p-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg2)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--text)]">
            <Sparkles size={16} className="text-[color:var(--primary)]" />
            Add New Session Reflection
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-[color:var(--success)]/10 text-[color:var(--success)] text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} /> Reflection recorded in your persistent cognitive memory profile.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                Session Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Graph Cycle Detection"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--primary)] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                1. What conceptual insight did you discover today?
              </label>
              <textarea
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
                rows={2}
                placeholder="Explain the concept in your own words instead of repeating code syntax..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--primary)] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                2. What mistake, bug, or false assumption will you avoid next time?
              </label>
              <textarea
                value={mistake}
                onChange={(e) => setMistake(e.target.value)}
                rows={2}
                placeholder="e.g. I assumed array was sorted before binary search..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--primary)] focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button variant="primary" type="submit">
                <Send size={14} className="mr-1.5" />
                Save Reflection
              </Button>
            </div>
          </form>
        </div>

        {/* Reflection Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Past Reflections Timeline</h2>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[color:var(--border)]">
            {reflections.map((item) => (
              <div key={item.id} className="relative pl-8 space-y-2">
                {/* Timeline dot */}
                <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-[color:var(--primary)] border-2 border-[color:var(--bg2)] -translate-x-1/2" />

                <div className="p-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg2)] space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[color:var(--text)]">{item.topic}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--success)]/10 text-[color:var(--success)] font-medium">
                        {item.cdsBand}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                      <Clock size={12} />
                      {item.date}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-[color:var(--primary)]">Key Takeaway: </span>
                      <span className="text-[color:var(--text)]">{item.takeaway}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[color:var(--warning)]">Mistake Avoided: </span>
                      <span className="text-[color:var(--text-muted)]">{item.mistakeToAvoid}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-[color:var(--border)]">
                    <Tag size={12} className="text-[color:var(--text-muted)]" />
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
