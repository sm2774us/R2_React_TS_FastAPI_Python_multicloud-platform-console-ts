import type { LiveStatus } from "../hooks/useLiveSocket";

const LABEL: Record<LiveStatus, string> = {
  connecting: "connecting…",
  open: "live",
  closed: "reconnecting…"
};

export function LiveBadge({ status }: { status: LiveStatus }) {
  return (
    <span className={`live-dot live-${status}`} data-testid="live-badge">
      ● {LABEL[status]}
    </span>
  );
}
