import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";

import client from "../api/client";
import BottomBar from "../components/BottomBar";
import ExportModal from "../components/ExportModal";
import ImportModal from "../components/ImportModal";
import MenuBar from "../components/MenuBar";
import Sidebar from "../components/Sidebar";
import TableNode from "../components/TableNode";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { generateSQL } from "../lib/sqlExport";
import { computeProblems } from "../lib/problems";
import { makeColumn, makeTable, nextId } from "../lib/dbTypes";

const nodeTypes = { table: TableNode };
const HISTORY_LIMIT = 50;

function tableToNode(table, dbType, handlers) {
  return {
    id: table.id,
    type: "table",
    position: table.position || { x: 100, y: 100 },
    hidden: !!table.hidden,
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

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [showGrid, setShowGrid] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem("autoSave") !== "false");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const rfInstance = useRef(null);
  const modelRef = useRef({ tables: [], relationships: [] });

  const updateTable = useCallback((tableId, patch) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === tableId ? { ...n, data: { ...n.data, table: { ...n.data.table, ...patch } } } : n))
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

  const handlers = useMemo(
    () => ({ onUpdateTable: updateTable, onDeleteTable: deleteTable, onAddColumn: addColumn, onUpdateColumn: updateColumn, onDeleteColumn: deleteColumn }),
    [updateTable, deleteTable, addColumn, updateColumn, deleteColumn]
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
    setNodes((nds) =>
      nds.map((n) =>
        n.id === tableId
          ? { ...n, hidden: !n.data.table.hidden, data: { ...n.data, table: { ...n.data.table, hidden: !n.data.table.hidden } } }
          : n
      )
    );
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

  const problems = useMemo(
    () => computeProblems(nodes.map((n) => n.data.table), buildDiagramModel().relationships),
    [nodes, buildDiagramModel]
  );

  if (loading) return <div className="editor-loading">Loading diagram…</div>;

  return (
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
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onDeleteSelected={deleteSelected}
        onDuplicateSelected={duplicateSelected}
        onSelectAll={selectAll}
        onZoomIn={() => rfInstance.current?.zoomIn()}
        onZoomOut={() => rfInstance.current?.zoomOut()}
        onFitView={() => rfInstance.current?.fitView()}
        onToggleFullscreen={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showMiniMap={showMiniMap}
        onToggleMiniMap={() => setShowMiniMap((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        autoSave={autoSave}
        onToggleAutoSave={() =>
          setAutoSave((v) => {
            localStorage.setItem("autoSave", String(!v));
            return !v;
          })
        }
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowAbout={() => setShowAbout(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tables={nodes.map((n) => n.data.table)}
          relationships={buildDiagramModel().relationships}
          dbType={dbType}
          onAddTable={addTable}
          onSelectTable={selectTable}
          onToggleTableVisibility={toggleTableVisibility}
          onDeleteTable={deleteTable}
          onDeleteRelationship={deleteRelationship}
          onUpdateTable={updateTable}
          onAddColumn={addColumn}
          onUpdateColumn={updateColumn}
          onDeleteColumn={deleteColumn}
        />
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
              onlyRenderVisibleElements
              fitView
            >
              {showGrid && <Background />}
              <Controls />
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
        onViewChange={setView}
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
    </div>
  );
}
