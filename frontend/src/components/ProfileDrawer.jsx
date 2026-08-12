import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerEyebrow,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../context/AuthContext";

export default function ProfileDrawer({ open, onOpenChange }) {
  const { user, updateUsername } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(user?.username || "");
      setError("");
    }
  }, [open, user?.username]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateUsername(username);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form className="flex h-full flex-col" onSubmit={submit}>
          <DrawerHeader>
            <div>
              <DrawerEyebrow>Account</DrawerEyebrow>
              <DrawerTitle>Profile</DrawerTitle>
              <DrawerDescription>View and edit your account details</DrawerDescription>
            </div>
            <DrawerCloseButton />
          </DrawerHeader>

          <DrawerBody>
            {error && (
              <div className="mb-4 rounded-md border border-destructive bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
                maxLength={50}
                pattern="[a-zA-Z0-9_.\-]+"
                title="Letters, numbers, underscore, dot, or hyphen"
                required
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-[10px] border border-border">
              <div className="border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Account details
              </div>
              <ProfileRow label="Email" value={user?.email} />
              <ProfileRow label="User ID" value={user?.id} />
              <ProfileRow
                label="Joined"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                last
              />
            </div>
          </DrawerBody>

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || username === user?.username}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function ProfileRow({ label, value, last = false }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 text-sm ${last ? "" : "border-b border-border"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-foreground">{value ?? "—"}</span>
    </div>
  );
}
