import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import { instructorService } from "../../services/instructorService.js";

export default function Reflections() {
  const [topic, setTopic] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [mistake, setMistake] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [reflections, setReflections] = useState([
    {
      id: "ref-1",
      topic: "Recursion & Call Stack",
      date: "Nov 17, 2026",
      takeaway:
        "The base case must precede recursive calls, and every call creates an activation record on the stack.",
      mistakeToAvoid:
        "Omitting the return keyword when propagating recursive return values back up the call chain.",
    },
    {
      id: "ref-2",
      topic: "Binary Search Trees",
      date: "Nov 15, 2026",
      takeaway:
        "Inorder traversal of a valid BST yields values in non-decreasing sorted order.",
      mistakeToAvoid:
        "Only checking immediate child pointers rather than enforcing min/max bounds on subtree descendants.",
    },
    {
      id: "ref-3",
      topic: "Linked List Reversal",
      date: "Nov 12, 2026",
      takeaway:
        "Three-pointer iteration (prev, curr, next) redirects nodes without losing the reference to the remaining list.",
      mistakeToAvoid:
        "Overwriting curr.next before saving the original next pointer in a temporary variable.",
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
            takeaway: r.learned_today,
            mistakeToAvoid: r.mistake_to_avoid,
          }));
          setReflections(mapped);
        }
      } catch {
        // Keep default sample reflections
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
      date: "Today",
      takeaway,
      mistakeToAvoid: mistake,
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
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Reflections
        </h1>

        <Card title="New reflection">
          {savedSuccess && (
            <Alert tone="success" className="mb-4">
              Reflection saved.
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              id="reflection-topic"
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Graph Cycle Detection"
              required
            />

            <Textarea
              id="reflection-takeaway"
              label="What did you learn?"
              value={takeaway}
              onChange={(e) => setTakeaway(e.target.value)}
              rows={2}
              placeholder="Summarize the key invariant in your own words…"
              required
            />

            <Textarea
              id="reflection-mistake"
              label="Mistake to avoid next time"
              value={mistake}
              onChange={(e) => setMistake(e.target.value)}
              rows={2}
              placeholder="e.g., Assuming the input array was sorted before binary search…"
              required
            />

            <div className="flex justify-end">
              <Button variant="primary" type="submit">
                Save reflection
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Past reflections" padding="p-0">
          <div className="divide-y divide-line-subtle">
            {reflections.map((item) => (
              <div key={item.id} className="p-5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-fg">{item.topic}</h3>
                  <span className="text-xs text-fg-muted">{item.date}</span>
                </div>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium text-fg">Takeaway: </span>
                    <span className="text-fg-secondary">{item.takeaway}</span>
                  </p>
                  <p>
                    <span className="font-medium text-fg">Avoid: </span>
                    <span className="text-fg-secondary">{item.mistakeToAvoid}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
