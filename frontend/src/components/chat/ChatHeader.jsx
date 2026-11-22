/**
 * ChatHeader
 * ----------
 * Compact top header for the active conversation view.
 */

import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";

export default function ChatHeader({
  topic = "",
  wsStatus = "connecting",
  attemptDetected = false,
  hintLevel = 0,
  onAskHint,
  onNewSession,
  onEnd,
  disabled = false,
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      {/* Left: Topic title + non-normal connection state */}
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-[15px] font-semibold text-fg">
          {topic || "New session"}
        </h1>
        {wsStatus === "connecting" && (
          <Badge tone="warning">Connecting…</Badge>
        )}
        {wsStatus === "closed" && (
          <Badge tone="danger">Offline</Badge>
        )}
        {attemptDetected && (
          <Badge tone="success" className="hidden md:inline-flex">
            Attempt verified
          </Badge>
        )}
      </div>

      {/* Right: Hint level & session actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="text-xs text-fg-muted px-1">
          Hint {hintLevel}/5
        </span>

        {onAskHint && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAskHint}
            disabled={disabled}
            className="hidden md:inline-flex"
          >
            Next hint
          </Button>
        )}

        {onNewSession && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewSession}
            className="hidden sm:inline-flex"
          >
            New session
          </Button>
        )}

        <Button variant="secondary" size="sm" onClick={onEnd}>
          End session
        </Button>
      </div>
    </div>
  );
}
