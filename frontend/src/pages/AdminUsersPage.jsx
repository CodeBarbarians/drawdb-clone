import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";
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
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
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
} from "../components/ui/drawer";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

function AddUserDrawer({ open, onOpenChange, onCreated }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername("");
      setEmail("");
      setPassword("");
      setIsAdmin(false);
      setError("");
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await client.post("/admin/users", {
        username: username || null,
        email,
        password,
        is_admin: isAdmin,
      });
      onCreated(data);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user");
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
              <DrawerEyebrow>Admin</DrawerEyebrow>
              <DrawerTitle>Add User</DrawerTitle>
              <DrawerDescription>Create a new account</DrawerDescription>
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
              <Label htmlFor="new-username">Username (optional)</Label>
              <Input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
                maxLength={50}
                pattern="[a-zA-Z0-9_.\-]+"
                title="Letters, numbers, underscore, dot, or hyphen"
              />
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="new-is-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
              <Label htmlFor="new-is-admin" className="cursor-pointer">
                Grant admin access
              </Label>
            </div>
          </DrawerBody>

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create User"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showAddUser, setShowAddUser] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/admin/users", {
        params: { page: targetPage, page_size: PAGE_SIZE },
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const deleteUser = async (id) => {
    try {
      await client.delete(`/admin/users/${id}`);
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load(page);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete user");
    }
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="admin">
      <header className="admin__header">
        <div className="admin__title">
          <Button variant="ghost" size="icon" title="Back to dashboard" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1>User Management</h1>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddUser(true)}>
          <Plus className="h-3.5 w-3.5" /> Add User
        </Button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="admin__empty">Loading…</p>
      ) : users.length === 0 ? (
        <p className="admin__empty">No users found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Diagrams</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const expanded = expandedIds.has(u.id);
              const hasDiagrams = u.diagrams && u.diagrams.length > 0;
              return (
                <Fragment key={u.id}>
                  <tr>
                    <td className="admin-table__expand">
                      {hasDiagrams && (
                        <button
                          className="admin-table__expand-btn"
                          title={expanded ? "Collapse diagrams" : "Expand diagrams"}
                          onClick={() => toggleExpanded(u.id)}
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </td>
                    <td>{u.username || "—"}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.is_admin ? "admin-badge--admin" : ""}`}>
                        {u.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td>{u.diagrams?.length ?? 0}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="admin-table__actions">
                      {u.id !== currentUser?.id && (
                        <Button variant="ghost" size="icon" title="Delete user" onClick={() => setPendingDeleteId(u.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded &&
                    hasDiagrams &&
                    u.diagrams.map((d) => (
                      <tr key={d.id} className="admin-table__diagram-row">
                        <td></td>
                        <td className="admin-table__diagram-name">{d.name}</td>
                        <td></td>
                        <td>
                          <span className="admin-badge">{d.db_type}</span>
                        </td>
                        <td></td>
                        <td>{new Date(d.updated_at).toLocaleDateString()}</td>
                        <td className="admin-table__actions">
                          <Button variant="ghost" size="icon" title="Open diagram" onClick={() => navigate(`/editor/${d.id}`)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && users.length > 0 && (
        <div className="admin-pagination">
          <span className="admin-pagination__info">
            Page {page} of {totalPages} · {total} user{total === 1 ? "" : "s"}
          </span>
          <div className="admin-pagination__controls">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user along with all of their diagrams and related activity. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteUser(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddUserDrawer
        open={showAddUser}
        onOpenChange={setShowAddUser}
        onCreated={() => {
          if (page === 1) load(1);
          else setPage(1);
        }}
      />
    </div>
  );
}
