import { useEffect, useState } from "react";
import { History } from "lucide-react";

import client from "../api/client";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function ActivityPanel({ diagramId }) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const load = () => {
      client
        .get(`/diagrams/${diagramId}/activity`)
        .then(({ data }) => active && setActivity(data))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [open, diagramId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-border bg-[color:var(--bg-elevated)] text-foreground hover:bg-accent"
          title="Activity"
        >
          <History className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-80 w-72 flex-col gap-2 overflow-y-auto">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recent activity</span>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No edits yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {activity.map((a, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{a.email}</span>{" "}
                <span className="text-muted-foreground">
                  {a.message} · {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
