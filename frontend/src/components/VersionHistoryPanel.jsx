import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import client from "../api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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

export default function VersionHistoryPanel({ diagramId, canEdit, onRestore }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [checkpointName, setCheckpointName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const load = () => {
    client
      .get(`/diagrams/${diagramId}/versions`)
      .then(({ data }) => setVersions(data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, diagramId]);

  const saveCheckpoint = async () => {
    setSaving(true);
    try {
      await client.post(`/diagrams/${diagramId}/versions`, { name: checkpointName || undefined });
      setCheckpointName("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmRestore = async () => {
    const versionId = pendingRestoreId;
    setPendingRestoreId(null);
    setRestoring(true);
    try {
      const { data } = await client.post(`/diagrams/${diagramId}/versions/${versionId}/restore`);
      onRestore(data);
      setOpen(false);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <button
        className="flex h-8 w-8 items-center justify-center rounded border border-border bg-[color:var(--bg-elevated)] text-foreground hover:bg-accent"
        title="Version history"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <DrawerContent>
        <DrawerHeader>
          <div>
            <DrawerEyebrow>Diagram</DrawerEyebrow>
            <DrawerTitle>Version history</DrawerTitle>
            <DrawerDescription>Snapshots taken on save, plus any checkpoints you save manually</DrawerDescription>
          </div>
          <DrawerCloseButton />
        </DrawerHeader>

        <DrawerBody>
          {canEdit && (
            <div className="mb-5 flex gap-2">
              <Input
                placeholder="Checkpoint name (optional)"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
              />
              <Button size="sm" onClick={saveCheckpoint} disabled={saving}>
                {saving ? "Saving…" : "Save checkpoint"}
              </Button>
            </div>
          )}

          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium text-foreground">{v.name || "Auto-saved"}</div>
                    <span className="text-muted-foreground">
                      {v.username || v.email} · {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoring}
                      onClick={() => setPendingRestoreId(v.id)}
                    >
                      Restore
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DrawerBody>
      </DrawerContent>

      <AlertDialog open={pendingRestoreId !== null} onOpenChange={(o) => !o && setPendingRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current diagram with this snapshot. The diagram's current state is saved as a new
              version first, so you can always undo this by restoring again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
}
