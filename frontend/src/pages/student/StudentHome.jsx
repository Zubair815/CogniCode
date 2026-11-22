import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import StartSessionModal from "../../components/chat/StartSessionModal.jsx";
import { chatRoute } from "../../constants/routes.js";

export default function StudentHome() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const tracks = [
    {
      title: "Data Structures",
      level: "Intermediate",
      progress: 68,
      topics: ["Trees", "Heaps", "Graphs"],
    },
    {
      title: "Algorithms & Complexity",
      level: "Advanced",
      progress: 42,
      topics: ["Dynamic Programming", "Greedy", "Backtracking"],
    },
    {
      title: "Systems & Memory",
      level: "Introductory",
      progress: 15,
      topics: ["Pointers", "Memory Allocation", "Concurrency"],
    },
  ];

  return (
    <AppLayout activeCds={32}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Practice tracks
          </h1>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            New session
          </Button>
        </div>

        <Card padding="p-0">
          <div className="divide-y divide-line-subtle">
            {tracks.map((track) => (
              <div
                key={track.title}
                className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-fg">{track.title}</span>
                    <span className="text-xs text-fg-muted">{track.level}</span>
                  </div>
                  <p className="mt-1 text-xs text-fg-secondary">
                    {track.topics.join(" · ")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${track.progress}%` }}
                    />
                  </div>
                  <span className="w-9 text-right font-mono text-xs text-fg-secondary">
                    {track.progress}%
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
                    Practice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <StartSessionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={(session) => navigate(chatRoute(session.id))}
        />
      </div>
    </AppLayout>
  );
}
