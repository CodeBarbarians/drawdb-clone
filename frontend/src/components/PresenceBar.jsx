import { Eye, EyeOff } from "lucide-react";

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
        return (
          <div key={u.user_id} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {u.email[0]?.toUpperCase()}
            </span>
            <span className="flex-1 truncate" title={u.email}>
              {u.email}
            </span>
            <button
              className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                isFollowing
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title={isFollowing ? "Stop following" : `Follow ${u.email}`}
              onClick={() => (isFollowing ? onStopFollowing() : onFollow(u.user_id))}
              disabled={!u.viewport}
            >
              {isFollowing ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {isFollowing ? "Stop" : "Follow"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
