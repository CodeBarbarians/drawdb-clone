import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, { Background, MiniMap, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import Logo from "../components/Logo";
import PresenceBar from "../components/PresenceBar";
import TableNode from "../components/TableNode";
import { usePresence } from "../hooks/usePresence";

const nodeTypes = { table: TableNode };
const noop = () => {};
const DEFAULT_TABLE_WIDTH = 340;
const GUEST_NAME_KEY = "guestViewerName";

function GuestNamePrompt({ open, onSubmit }) {
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Dialog open={open}>
      <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Who's viewing?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Enter a name so other people viewing this diagram can see you're here.
          </p>
          <Input
            autoFocus
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={40}
          />
          <Button onClick={submit} disabled={!name.trim()}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PublicViewPage() {
  const { token } = useParams();
  const { token: authToken } = useAuth();
  const navigate = useNavigate();
  const [diagram, setDiagram] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState(() => localStorage.getItem(GUEST_NAME_KEY) || "");
  const rfInstance = useRef(null);

  const handleNameSubmit = (name) => {
    localStorage.setItem(GUEST_NAME_KEY, name);
    setGuestName(name);
  };

  const {
    users: presenceUsers,
    selfId,
    followUserId,
    setFollowUserId,
    stopFollowing,
    remoteUpdate,
  } = usePresence({ shareToken: token, guestName, enabled: !loading && !!diagram && !!guestName });

  useEffect(() => {
    if (!followUserId) return;
    const followed = presenceUsers.find((u) => u.user_id === followUserId);
    if (followed?.viewport) {
      rfInstance.current?.setViewport(followed.viewport, { duration: 200 });
    }
  }, [followUserId, presenceUsers]);

  // Someone with edit access saved while we were viewing. This page has no
  // account of its own to filter out self-saves (view-only visitors can't
  // edit), so any remoteUpdate here is by definition someone else's — pull
  // the fresh snapshot instead of leaving the canvas stale until a refresh.
  useEffect(() => {
    if (!remoteUpdate) return;
    client.get(`/public/diagrams/${token}`).then(({ data }) => setDiagram(data));
  }, [remoteUpdate, token]);

  useEffect(() => {
    let active = true;
    client
      .get(`/public/diagrams/${token}`)
      .then(({ data }) => {
        if (!active) return;
        if (data.can_edit && data.editable_diagram_id) {
          navigate(`/editor/${data.editable_diagram_id}`, { replace: true });
          return;
        }
        setDiagram(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // Re-runs after login (authToken changes) so an editable link auto-redirects
    // into the real editor once the visitor is authenticated.
  }, [token, authToken, navigate]);

  const nodes = useMemo(() => {
    const tables = diagram?.data?.tables || [];
    return tables.map((table) => ({
      id: table.id,
      type: "table",
      position: table.position || { x: 100, y: 100 },
      hidden: !!table.hidden,
      draggable: false,
      data: {
        table: { ...table, locked: true },
        dbType: diagram?.db_type,
        tableWidth: DEFAULT_TABLE_WIDTH,
        globalLocked: true,
        onUpdateTable: noop,
        onDeleteTable: noop,
        onAddColumn: noop,
        onUpdateColumn: noop,
        onDeleteColumn: noop,
        onToggleLock: noop,
      },
    }));
  }, [diagram]);

  const edges = useMemo(() => {
    const relationships = diagram?.data?.relationships || [];
    return relationships.map((rel) => ({
      id: rel.id,
      source: rel.sourceTableId,
      sourceHandle: rel.sourceColumnId,
      target: rel.targetTableId,
      targetHandle: rel.targetColumnId,
      markerEnd: { type: "arrowclosed" },
    }));
  }, [diagram]);

  if (loading) return <div className="editor-loading">Loading diagram…</div>;

  if (error || !diagram) {
    return <div className="editor-loading">This share link is invalid or has been disabled.</div>;
  }

  const isEditable = diagram.share_mode === "editable";

  return (
    <ReactFlowProvider>
      <GuestNamePrompt open={!guestName} onSubmit={handleNameSubmit} />
      <div className="editor">
        <div className="flex items-center gap-3 border-b border-border bg-[color:var(--bg-elevated)] px-4 py-2">
          <Logo size={24} />
          <span className="font-sans text-sm font-semibold">{diagram.name}</span>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            View only
          </span>
          <div className="flex-1" />
          {isEditable && (
            <>
              <span className="text-xs text-muted-foreground">Log in to make changes to this diagram</span>
              <Button size="sm" onClick={() => navigate(`/login?returnTo=/share/${token}`)}>
                Log in to edit
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="editor__canvas relative flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              minZoom={0.02}
              maxZoom={4}
              onlyRenderVisibleElements
              fitView
              onInit={(instance) => (rfInstance.current = instance)}
            >
              <Background />
              <MiniMap
                bgColor="var(--bg-elevated)"
                maskColor="rgba(15, 13, 10, 0.6)"
                nodeColor={(node) => node.data?.table?.color || "var(--accent)"}
                nodeStrokeColor="var(--border)"
              />
              <div className="absolute right-3 top-3 z-10">
                <PresenceBar
                  users={presenceUsers}
                  currentUserId={selfId}
                  followUserId={followUserId}
                  onFollow={setFollowUserId}
                  onStopFollowing={stopFollowing}
                />
              </div>
            </ReactFlow>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
