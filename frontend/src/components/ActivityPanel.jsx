import { useEffect, useState } from "react";
import { History } from "lucide-react";

import client from "../api/client";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerEyebrow,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

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
    <Drawer open={open} onOpenChange={setOpen}>
      <button
        className="flex h-8 w-8 items-center justify-center rounded border border-border bg-[color:var(--bg-elevated)] text-foreground hover:bg-accent"
        title="Activity"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" />
      </button>
      <DrawerContent>
        <DrawerHeader>
          <div>
            <DrawerEyebrow>Diagram</DrawerEyebrow>
            <DrawerTitle>Activity</DrawerTitle>
            <DrawerDescription>Recent edits made by collaborators</DrawerDescription>
          </div>
          <DrawerCloseButton />
        </DrawerHeader>

        <DrawerBody>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No edits yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activity.map((a, i) => (
                <li key={i} className="border-b border-border pb-3 text-sm last:border-b-0 last:pb-0">
                  <div>
                    <span className="font-medium text-foreground">{a.username || a.email}</span>
                    {a.username && <span className="ml-1.5 text-[11px] text-muted-foreground">{a.email}</span>}
                  </div>
                  <span className="text-muted-foreground">
                    {a.message} · {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
