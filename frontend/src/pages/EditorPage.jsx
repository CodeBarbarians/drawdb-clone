import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useUpdateNodeInternals,
} from "reactflow";
import "reactflow/dist/style.css";
import { Lock as LockIcon, Maximize, Wand2, ZoomIn, ZoomOut } from "lucide-react";

import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import BottomBar from "../components/BottomBar";
import ExportModal from "../components/ExportModal";
import ImportModal from "../components/ImportModal";
import MenuBar from "../components/MenuBar";
import Sidebar from "../components/Sidebar";
import TableNode from "../components/TableNode";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { generateSQL } from "../lib/sqlExport";
import { generateDBML } from "../lib/dbmlExport";
import { computeProblems } from "../lib/problems";
import { autoLayout } from "../lib/autoLayout";
import { makeColumn, makeTable, nextId } from "../lib/dbTypes";

const nodeTypes = { table: TableNode };
const HISTORY_LIMIT = 50;
const DEFAULT_ZOOM_SPEED = 1.6;

function tableToNode(table, dbType, handlers) {
  return {
    id: table.id,
    type: "table",
    position: table.position || { x: 100, y: 100 },
    hidden: !!table.hidden,
    draggable: !table.locked,
    data: { table, dbType, ...handlers },
  };
}

function relationshipToEdge(rel) {
  return {
    id: rel.id,
    source: rel.sourceTableId,
    sourceHandle: rel.sourceColumnId,
    target: rel.targetTableId,
    targetHandle: rel.targetColumnId,
    markerEnd: { type: "arrowclosed" },
  };
}

// useUpdateNodeInternals only works inside the ReactFlow tree, so this lives
// as a child of <ReactFlow> rather than being called from EditorPage itself.
// React Flow caches each handle's position and doesn't always re-measure it
// after a row's content changes (e.g. adding/removing a column), so nudge it
// to re-measure whenever a table's column count changes — otherwise handles
// can drift from their row, most visible at high zoom.
function NodeInternalsSync({ nodes, columnCountsKey }) {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      nodes.forEach((n) => updateNodeInternals(n.id));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnCountsKey]);
  return null;
}

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [dbType, setDbType] = useState("postgresql");
  const [diagramName, setDiagramName] = useState("Untitled Diagram");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [exportSql, setExportSql] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreset, setImportPreset] = useState(null);
  const [view, setView] = useState("structure");
  const [viewLoading, setViewLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem("autoSave") !== "false");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showZoomSettings, setShowZoomSettings] = useState(false);
  const [zoomSpeed, setZoomSpeed] = useState(() => {
    const stored = parseFloat(localStorage.getItem("zoomSpeed"));
    return Number.isFinite(stored) && stored > 1 ? stored : DEFAULT_ZOOM_SPEED;
  });
  const [globalLocked, setGlobalLocked] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarDetached, setSidebarDetached] = useState(false);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const rfInstance = useRef(null);
  const modelRef = useRef({ tables: [], relationships: [] });

  const updateTable = useCallback((tableId, patch) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== tableId) return n;
        const table = { ...n.data.table, ...patch };
        return { ...n, draggable: !table.locked, data: { ...n.data, table } };
      })
    );
  }, []);

  const pushHistory = useCallback(() => {
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), modelRef.current]);
    setFuture([]);
  }, []);

  const deleteTable = useCallback(
    (tableId) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== tableId));
      setEdges((eds) => eds.filter((e) => e.source !== tableId && e.target !== tableId));
    },
    [pushHistory]
  );

  const addColumn = useCallback((tableId) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === tableId
          ? { ...n, data: { ...n.data, table: { ...n.data.table, columns: [...n.data.table.columns, makeColumn({ name: "column" })] } } }
          : n
      )
    );
  }, []);

  const updateColumn = useCallback((tableId, colId, patch) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === tableId
          ? {
              ...n,
              data: {
                ...n.data,
                table: {
                  ...n.data.table,
                  columns: n.data.table.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
                },
              },
            }
          : n
      )
    );
  }, []);

  const deleteColumn = useCallback(
    (tableId, colId) => {
      pushHistory();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === tableId
            ? { ...n, data: { ...n.data, table: { ...n.data.table, columns: n.data.table.columns.filter((c) => c.id !== colId) } } }
            : n
        )
      );
      setEdges((eds) => eds.filter((e) => !(e.sourceHandle === colId || e.targetHandle === colId)));
    },
    [pushHistory]
  );

  const toggleTableLock = useCallback((tableId) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== tableId) return n;
        const table = { ...n.data.table, locked: !n.data.table.locked };
        return { ...n, draggable: !table.locked, data: { ...n.data, table } };
      })
    );
  }, []);

  const handlers = useMemo(
    () => ({
      onUpdateTable: updateTable,
      onDeleteTable: deleteTable,
      onAddColumn: addColumn,
      onUpdateColumn: updateColumn,
      onDeleteColumn: deleteColumn,
      onToggleLock: toggleTableLock,
    }),
    [updateTable, deleteTable, addColumn, updateColumn, deleteColumn, toggleTableLock]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    client.get(`/diagrams/${id}`).then(({ data }) => {
      if (!active) return;
      const tables = data.data?.tables || [];
      const relationships = data.data?.relationships || [];
      setDiagramName(data.name);
      setDbType(data.db_type);
      setNodes(tables.map((t) => tableToNode(t, data.db_type, handlers)));
      setEdges(relationships.map(relationshipToEdge));
      setPast([]);
      setFuture([]);
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, dbType } })));
  }, [dbType]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, globalLocked } })));
  }, [globalLocked]);

  // Passed to <NodeInternalsSync> below, which does the actual re-measuring
  // (that hook only works inside the ReactFlow tree, not here).
  const columnCountsKey = nodes.map((n) => `${n.id}:${n.data.table.columns.length}`).join("|");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const buildDiagramModel = useCallback(
    () => ({
      tables: nodes.map((n) => ({ ...n.data.table, position: n.position })),
      relationships: edges.map((e) => ({
        id: e.id,
        sourceTableId: e.source,
        sourceColumnId: e.sourceHandle,
        targetTableId: e.target,
        targetColumnId: e.targetHandle,
      })),
    }),
    [nodes, edges]
  );

  useEffect(() => {
    modelRef.current = buildDiagramModel();
  }, [buildDiagramModel]);

  const applyModel = useCallback(
    (model) => {
      setNodes(model.tables.map((t) => tableToNode(t, dbType, handlers)));
      setEdges(model.relationships.map(relationshipToEdge));
    },
    [dbType, handlers]
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [...f, modelRef.current]);
      applyModel(previous);
      return p.slice(0, -1);
    });
  }, [applyModel]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setPast((p) => [...p, modelRef.current]);
      applyModel(next);
      return f.slice(0, -1);
    });
  }, [applyModel]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === "remove")) pushHistory();
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [pushHistory]
  );
  const onConnect = useCallback(
    (params) => {
      pushHistory();
      setEdges((eds) => addEdge({ ...params, markerEnd: { type: "arrowclosed" } }, eds));
    },
    [pushHistory]
  );

  const addTable = () => {
    pushHistory();
    const table = makeTable({ position: { x: 80 + nodes.length * 40, y: 80 + nodes.length * 30 } });
    setNodes((nds) => [...nds, tableToNode(table, dbType, handlers)]);
  };

  const saveModel = useCallback(
    async (model, targetDbType, name) => {
      setSaving(true);
      try {
        await client.put(`/diagrams/${id}`, { name, db_type: targetDbType, data: model });
        setSavedAt(new Date().toLocaleTimeString());
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const handleSave = useCallback(
    () => saveModel(buildDiagramModel(), dbType, diagramName),
    [saveModel, buildDiagramModel, dbType, diagramName]
  );

  useEffect(() => {
    if (!autoSave || loading) return;
    const t = setTimeout(() => handleSave(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, loading, nodes, edges, dbType, diagramName]);

  const handleExport = () => setExportSql(generateSQL(buildDiagramModel(), dbType));
  const handleExportDialect = (dialect) => setExportSql(generateSQL(buildDiagramModel(), dialect));

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(buildDiagramModel(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagramName || "diagram"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDBML = () => {
    const blob = new Blob([generateDBML(buildDiagramModel())], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagramName || "diagram"}.dbml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportApply = (model, targetDbType) => {
    pushHistory();
    setDbType(targetDbType);
    setNodes(model.tables.map((t) => tableToNode(t, targetDbType, handlers)));
    setEdges(model.relationships.map(relationshipToEdge));
    setImportOpen(false);
    setImportPreset(null);
    setTimeout(() => rfInstance.current?.fitView(), 50);
    // Save the freshly-imported model directly rather than relying on
    // component state (which hasn't re-rendered yet) or the autosave debounce.
    saveModel(model, targetDbType, diagramName);
  };

  const openImport = (format) => {
    setImportPreset(format || null);
    setImportOpen(true);
  };

  const handleNew = async () => {
    const { data } = await client.post("/diagrams", {
      name: "Untitled Diagram",
      db_type: "postgresql",
      data: { tables: [], relationships: [] },
    });
    navigate(`/editor/${data.id}`);
  };

  const handleSaveAs = async () => {
    const { data } = await client.post("/diagrams", {
      name: `${diagramName} copy`,
      db_type: dbType,
      data: buildDiagramModel(),
    });
    navigate(`/editor/${data.id}`);
  };

  const handleDeleteDiagram = async () => {
    if (!confirm("Delete this diagram? This cannot be undone.")) return;
    await client.delete(`/diagrams/${id}`);
    navigate("/");
  };

  const selectTable = (tableId) => {
    const node = nodes.find((n) => n.id === tableId);
    if (!node) return;
    rfInstance.current?.setCenter(node.position.x + 170, node.position.y + 80, { zoom: 1, duration: 300 });
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === tableId })));
  };

  const toggleTableVisibility = (tableId) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === tableId
          ? { ...n, hidden: !n.data.table.hidden, data: { ...n.data, table: { ...n.data.table, hidden: !n.data.table.hidden } } }
          : n
      );
      const hiddenIds = new Set(updated.filter((n) => n.hidden).map((n) => n.id));
      setEdges((eds) => eds.map((e) => ({ ...e, hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target) })));
      return updated;
    });
  };

  const handleAutoArrange = () => {
    pushHistory();
    setNodes((nds) => autoLayout(nds, edges));
    setTimeout(() => rfInstance.current?.fitView(), 50);
  };

  // React Flow's own zoom in/out buttons apply a fixed 1.2x step with no way
  // to speed it up, so these bypass that and jump zoom level directly.
  const handleZoomIn = () => {
    const zoom = rfInstance.current?.getZoom() ?? 1;
    rfInstance.current?.zoomTo(Math.min(zoom * zoomSpeed, 4), { duration: 120 });
  };
  const handleZoomOut = () => {
    const zoom = rfInstance.current?.getZoom() ?? 1;
    rfInstance.current?.zoomTo(Math.max(zoom / zoomSpeed, 0.02), { duration: 120 });
  };

  const updateZoomSpeed = (value) => {
    const clamped = Math.min(Math.max(value, 1.05), 4);
    setZoomSpeed(clamped);
    localStorage.setItem("zoomSpeed", String(clamped));
  };

  const deleteRelationship = (relId) => {
    pushHistory();
    setEdges((eds) => eds.filter((e) => e.id !== relId));
  };

  const deleteSelected = () => {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length === 0) return;
    pushHistory();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
  };

  const duplicateSelected = () => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    pushHistory();
    const clones = selected.map((n) =>
      tableToNode(
        {
          ...n.data.table,
          id: nextId("tbl"),
          name: `${n.data.table.name}_copy`,
          columns: n.data.table.columns.map((c) => ({ ...c, id: nextId("col") })),
        },
        dbType,
        handlers
      )
    );
    clones.forEach((c) => {
      c.position = { x: c.position.x + 40, y: c.position.y + 40 };
    });
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...clones]);
  };

  const selectAll = () => setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, undo, redo]);

  const handleViewChange = useCallback(
    (next) => {
      if (next === view) return;
      setViewLoading(true);
      requestAnimationFrame(() => {
        setView(next);
        requestAnimationFrame(() => setViewLoading(false));
      });
    },
    [view]
  );

  const problems = useMemo(
    () => computeProblems(nodes.map((n) => n.data.table), buildDiagramModel().relationships),
    [nodes, buildDiagramModel]
  );

  if (loading) return <div className="editor-loading">Loading diagram…</div>;

  return (
    <ReactFlowProvider>
    <div className="editor">
      <MenuBar
        diagramName={diagramName}
        onNameChange={setDiagramName}
        savedAt={savedAt}
        onBack={() => navigate("/")}
        onNew={handleNew}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onDeleteDiagram={handleDeleteDiagram}
        onImportFormat={openImport}
        onExportSQL={handleExportDialect}
        onExportJSON={handleExportJSON}
        onExportDBML={handleExportDBML}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onDeleteSelected={deleteSelected}
        onDuplicateSelected={duplicateSelected}
        onSelectAll={selectAll}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={() => rfInstance.current?.fitView()}
        onToggleFullscreen={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showMiniMap={showMiniMap}
        onToggleMiniMap={() => setShowMiniMap((v) => !v)}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((v) => !v)}
        sidebarDetached={sidebarDetached}
        onToggleSidebarDetached={() => setSidebarDetached((v) => !v)}
        onCycleSidebar={() => {
          if (!showSidebar) {
            setShowSidebar(true);
            setSidebarDetached(false);
          } else if (!sidebarDetached) {
            setSidebarDetached(true);
          } else {
            setShowSidebar(false);
            setSidebarDetached(false);
          }
        }}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        autoSave={autoSave}
        onToggleAutoSave={() =>
          setAutoSave((v) => {
            localStorage.setItem("autoSave", String(!v));
            return !v;
          })
        }
        onShowZoomSettings={() => setShowZoomSettings(true)}
        onAutoArrange={handleAutoArrange}
        globalLocked={globalLocked}
        onToggleGlobalLock={() => setGlobalLocked((v) => !v)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowAbout={() => setShowAbout(true)}
        user={user}
        onLogout={logout}
      />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <div className={sidebarDetached ? "py-3 pl-3" : ""}>
            <Sidebar
              tables={nodes.map((n) => n.data.table)}
              relationships={buildDiagramModel().relationships}
              dbType={dbType}
              globalLocked={globalLocked}
              detached={sidebarDetached}
              onAddTable={addTable}
              onSelectTable={selectTable}
              onToggleTableVisibility={toggleTableVisibility}
              onToggleTableLock={toggleTableLock}
              onDeleteTable={deleteTable}
              onDeleteRelationship={deleteRelationship}
              onUpdateTable={updateTable}
              onAddColumn={addColumn}
              onUpdateColumn={updateColumn}
              onDeleteColumn={deleteColumn}
            />
          </div>
        )}
        <div className="editor__canvas relative flex-1">
          {/* Kept mounted under the code view (instead of unmounting) so toggling
              Structure/Code doesn't re-mount every table node on large diagrams. */}
          <div className={view === "structure" ? "h-full" : "hidden"}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(instance) => (rfInstance.current = instance)}
              nodeTypes={nodeTypes}
              minZoom={0.02}
              maxZoom={4}
              nodesDraggable={!globalLocked}
              nodesConnectable={!globalLocked}
              elementsSelectable={!globalLocked}
              onlyRenderVisibleElements
              fitView
            >
              <NodeInternalsSync nodes={nodes} columnCountsKey={columnCountsKey} />
              {showGrid && <Background />}
              <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-0.5 rounded-md border border-border bg-[color:var(--bg-elevated)] p-1 shadow-lg">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded text-foreground hover:bg-accent"
                  title="Zoom in"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded text-foreground hover:bg-accent"
                  title="Zoom out"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded text-foreground hover:bg-accent"
                  title="Fit view"
                  onClick={() => rfInstance.current?.fitView()}
                >
                  <Maximize className="h-4 w-4" />
                </button>
                {globalLocked && (
                  <div className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground" title="Canvas locked">
                    <LockIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-3 top-3 z-10 h-8 w-8"
                title="Auto arrange"
                onClick={handleAutoArrange}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
              {showMiniMap && (
                <MiniMap
                  bgColor="var(--bg-elevated)"
                  maskColor="rgba(15, 13, 10, 0.6)"
                  nodeColor={(node) => node.data?.table?.color || "var(--accent)"}
                  nodeStrokeColor="var(--border)"
                />
              )}
            </ReactFlow>
          </div>
          {view === "code" && <pre className="modal__sql absolute inset-0 h-full">{generateSQL(buildDiagramModel(), dbType)}</pre>}
          <Button
            className="absolute bottom-6 right-6 h-12 w-12 rounded-full text-lg shadow-lg"
            onClick={addTable}
            title="Add table"
          >
            +
          </Button>
        </div>
      </div>
      <BottomBar
        view={view}
        viewLoading={viewLoading}
        onViewChange={handleViewChange}
        tableCount={nodes.length}
        relationshipCount={edges.length}
        problems={problems}
      />
      {exportSql !== null && <ExportModal sql={exportSql} onClose={() => setExportSql(null)} />}
      {importOpen && (
        <ImportModal
          hasExistingTables={nodes.length > 0}
          initialFormat={importPreset}
          onImport={handleImportApply}
          onClose={() => {
            setImportOpen(false);
            setImportPreset(null);
          }}
        />
      )}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 p-4 font-mono text-xs">
            <div className="flex justify-between">
              <span>Save</span>
              <span className="text-muted-foreground">Ctrl+S</span>
            </div>
            <div className="flex justify-between">
              <span>Undo</span>
              <span className="text-muted-foreground">Ctrl+Z</span>
            </div>
            <div className="flex justify-between">
              <span>Redo</span>
              <span className="text-muted-foreground">Ctrl+Shift+Z</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>About</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-sm text-muted-foreground">
            drawdb-clone — a self-hosted ER diagram editor. Python/FastAPI backend, React frontend.
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showZoomSettings} onOpenChange={setShowZoomSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zoom Speed</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-xs text-muted-foreground">
              Controls how much each zoom-in/zoom-out click changes the zoom level. Higher = faster.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1.05"
                max="4"
                step="0.05"
                value={zoomSpeed}
                onChange={(e) => updateZoomSpeed(parseFloat(e.target.value))}
                className="flex-1 accent-[color:var(--accent)]"
              />
              <input
                type="number"
                min="1.05"
                max="4"
                step="0.05"
                value={zoomSpeed}
                onChange={(e) => updateZoomSpeed(parseFloat(e.target.value) || DEFAULT_ZOOM_SPEED)}
                className="h-8 w-16 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">Suggested: {DEFAULT_ZOOM_SPEED}×</p>
            <Button size="sm" variant="outline" onClick={() => updateZoomSpeed(DEFAULT_ZOOM_SPEED)}>
              Reset to default
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ReactFlowProvider>
  );
}
