import { Eye, EyeOff } from "lucide-react";

import { getUserColor } from "../lib/userColor";

export default function PresenceBar({ users, currentUserId, followUserId, onFollow, onStopFollowing }) {
  const others = users.filter((u) => u.user_id !== currentUserId);
  if (others.length === 0) return null;

  return (
    <div className="flex w-56 flex-col gap-1 rounded-md border border-border bg-[color:var(--bg-elevated)] p-1.5 shadow-lg">
      <span className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {others.length} {others.length === 1 ? "person" : "people"} viewing
      </span>
      {others.map((u) => {
        const isFollowing = followUserId === u.user_id;
        // Guests are anonymous (a typed-in name, no account) — they can follow
        // other viewers, but nothing stable identifies them for others to
        // follow back, so they're never a follow target themselves.
        const followable = !u.is_guest;
        const primary = u.is_guest ? u.email : u.username || u.email;
        return (
          <div key={u.user_id} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: getUserColor(u.user_id) }}
            >
              {primary[0]?.toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col truncate" title={u.email}>
              <span className="truncate">
                {primary}
                {u.is_guest ? " (viewer)" : ""}
              </span>
              {!u.is_guest && u.username && (
                <span className="truncate text-[9px] text-muted-foreground">{u.email}</span>
              )}
            </span>
            {followable && (
              <button
                className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                  isFollowing
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                title={isFollowing ? "Stop following" : `Follow ${primary}`}
                onClick={() => (isFollowing ? onStopFollowing() : onFollow(u.user_id))}
                disabled={!u.viewport}
              >
                {isFollowing ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isFollowing ? "Stop" : "Follow"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
