import { useEffect, useState } from "react";
import { Check, Copy, Unlink } from "lucide-react";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

function ModeToggle({ mode, onChange, disabled }) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {[
        { key: "readonly", label: "Read only" },
        { key: "editable", label: "Can edit" },
      ].map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.key)}
          className={`flex-1 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const ACTIVITY_PAGE_SIZE = 5;

export default function ShareDialog({
  open,
  onOpenChange,
  shareToken,
  shareMode,
  sharing,
  onEnableShare,
  onDisableShare,
  onChangeMode,
  accessList,
  activityList,
}) {
  const [copied, setCopied] = useState(false);
  const [pendingMode, setPendingMode] = useState("readonly");
  const [activityShown, setActivityShown] = useState(ACTIVITY_PAGE_SIZE);
  const url = shareToken ? `${window.location.origin}/share/${shareToken}` : "";

  useEffect(() => {
    if (open) setActivityShown(ACTIVITY_PAGE_SIZE);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(el);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Diagram</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4">
          {shareToken ? (
            <>
              <p className="text-xs text-muted-foreground">
                {shareMode === "editable"
                  ? "Anyone with this link can view it, and can edit it once they log in."
                  : "Anyone with this link can view a read-only copy. They won't need an account."}
              </p>
              <ModeToggle mode={shareMode} onChange={onChangeMode} disabled={sharing} />
              <div className="flex gap-2">
                <Input readOnly value={url} className="h-8 flex-1 text-xs" onFocus={(e) => e.target.select()} />
                <Button size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full shrink-0 border-dashed"
                onClick={onDisableShare}
                disabled={sharing}
              >
                <Unlink className="h-3.5 w-3.5" /> Disable link
              </Button>

              {shareMode === "editable" && (
                <>
                  <div className="flex flex-col gap-1 border-t border-border pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      People with access ({accessList?.length || 0})
                    </span>
                    {accessList && accessList.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {accessList.map((a) => (
                          <li key={a.email} className="flex items-center justify-between text-xs">
                            <span className="truncate">{a.email}</span>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              last seen {new Date(a.last_seen_at).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No one has logged in to edit yet.</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 border-t border-border pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Recent activity
                    </span>
                    {activityList && activityList.length > 0 ? (
                      <>
                        <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                          {activityList.slice(0, activityShown).map((a, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-medium">{a.username || a.email}</span>
                              {a.username && <span className="ml-1 text-[10px] text-muted-foreground">{a.email}</span>}{" "}
                              <span className="text-muted-foreground">
                                {a.message} · {new Date(a.created_at).toLocaleString()}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {activityShown < activityList.length && (
                          <button
                            type="button"
                            className="mt-1 self-start font-mono text-[10px] uppercase tracking-wider text-[color:var(--accent-hover)] hover:underline"
                            onClick={() => setActivityShown((n) => n + ACTIVITY_PAGE_SIZE)}
                          >
                            Show more ({activityList.length - activityShown} left)
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No edits yet.</p>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Generate a public link so anyone can view a read-only copy of this diagram — no account required.
                Choose "Can edit" to let logged-in visitors make changes too.
              </p>
              <ModeToggle mode={pendingMode} onChange={setPendingMode} disabled={sharing} />
              <Button size="sm" onClick={() => onEnableShare(pendingMode)} disabled={sharing}>
                Create share link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
