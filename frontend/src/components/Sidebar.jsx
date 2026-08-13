import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
  Upload,
} from "lucide-react";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ColumnOptionsPopover, NullableToggle, PkToggle } from "./ColumnControls";
import RelationshipDialog from "./RelationshipDialog";
import { CARDINALITIES, CARDINALITY_LABELS, CONSTRAINTS, makeIndex, TABLE_COLOR_PALETTE, typeOptionsFor } from "../lib/dbTypes";

function ColorSwatchPicker({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABLE_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          disabled={disabled}
          className={`h-5 w-5 shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${
            value === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-[color:var(--bg-panel)]" : ""
          }`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function IndexRow({ table, index, locked, onUpdateTable }) {
  const updateIndex = (patch) => {
    onUpdateTable(table.id, { indexes: table.indexes.map((i) => (i.id === index.id ? { ...i, ...patch } : i)) });
  };
  const toggleColumn = (colId) => {
    const has = index.columnIds.includes(colId);
    updateIndex({ columnIds: has ? index.columnIds.filter((c) => c !== colId) : [...index.columnIds, colId] });
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-[color:var(--bg-elevated)] p-2">
      <div className="flex items-center gap-2">
        <Input
          className="h-7 flex-1 text-xs"
          placeholder="index_name"
          value={index.name}
          readOnly={locked}
          onChange={(e) => updateIndex({ name: e.target.value })}
        />
        <label className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Checkbox checked={index.unique} disabled={locked} onCheckedChange={(v) => updateIndex({ unique: !!v })} />
          Unique
        </label>
        <button
          className="text-muted-foreground hover:text-destructive"
          title="Delete index"
          disabled={locked}
          onClick={() => onUpdateTable(table.id, { indexes: table.indexes.filter((i) => i.id !== index.id) })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {table.columns.map((c) => (
          <label key={c.id} className="flex items-center gap-1 text-xs">
            <Checkbox checked={index.columnIds.includes(c.id)} disabled={locked} onCheckedChange={() => toggleColumn(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function TableRow({
  table,
  dbType,
  enums,
  globalLocked,
  expanded,
  onToggleExpand,
  onSelectTable,
  onToggleTableVisibility,
  onToggleTableLock,
  onDeleteTable,
  onUpdateTable,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
}) {
  const typeOptions = typeOptionsFor(dbType, enums);
  const locked = table.locked || globalLocked;

  return (
    <div className="rounded-md border border-border bg-[color:var(--bg-panel)]" style={{ borderLeft: `4px solid ${table.color}` }}>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <button className="flex-1 truncate text-left font-medium" onClick={() => onSelectTable(table.id)}>
          {table.name}
        </button>
        <button
          className="text-muted-foreground hover:text-foreground"
          title={table.locked ? "Unlock table position" : "Lock table position"}
          onClick={() => onToggleTableLock(table.id)}
        >
          {table.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
        <button
          className="text-muted-foreground hover:text-foreground"
          title={table.hidden ? "Show on canvas" : "Hide from canvas"}
          onClick={() => onToggleTableVisibility(table.id)}
        >
          {table.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button className="text-muted-foreground hover:text-foreground" onClick={() => onToggleExpand(table.id)}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Name:</span>
            <Input
              className="h-7 flex-1 text-xs"
              value={table.name}
              readOnly={locked}
              onChange={(e) => onUpdateTable(table.id, { name: e.target.value })}
            />
          </label>

          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Color:</span>
            <ColorSwatchPicker
              value={table.color}
              disabled={locked}
              onChange={(color) => onUpdateTable(table.id, { color })}
            />
          </label>

          {table.columns.map((col) => (
            <div key={col.id} className="flex items-center gap-1">
              <Input
                className="h-7 flex-1 text-xs"
                value={col.name}
                readOnly={locked}
                onChange={(e) => onUpdateColumn(table.id, col.id, { name: e.target.value })}
              />
              <Select value={col.type} onValueChange={(v) => onUpdateColumn(table.id, col.id, { type: v })} disabled={locked}>
                <SelectTrigger className="h-7 w-24 px-1.5 font-mono text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs">
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NullableToggle
                column={col}
                onToggle={() => onUpdateColumn(table.id, col.id, { notNull: !col.notNull })}
                disabled={locked}
              />
              <PkToggle column={col} onToggle={() => onUpdateColumn(table.id, col.id, { pk: !col.pk })} disabled={locked} />
              <ColumnOptionsPopover
                table={table}
                column={col}
                enums={enums}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                disabled={locked}
              />
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="flex-1" disabled={locked} onClick={() => onAddColumn(table.id)}>
              <Plus className="h-3.5 w-3.5" /> Add field
            </Button>
            <Button size="sm" variant="destructive" disabled={locked} onClick={() => onDeleteTable(table.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Indexes</span>
            {(table.indexes || []).map((idx) => (
              <IndexRow key={idx.id} table={table} index={idx} locked={locked} onUpdateTable={onUpdateTable} />
            ))}
            <Button
              size="sm"
              variant="outline"
              className="border-dashed text-muted-foreground hover:text-foreground"
              disabled={locked || table.columns.length === 0}
              onClick={() => onUpdateTable(table.id, { indexes: [...(table.indexes || []), makeIndex()] })}
            >
              <Plus className="h-3.5 w-3.5" /> Add index
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RelationshipRow({ rel, tables, expanded, onToggleExpand, onUpdateRelationship, onDeleteRelationship }) {
  const source = tables.find((t) => t.id === rel.sourceTableId);
  const target = tables.find((t) => t.id === rel.targetTableId);
  const sourceCol = source?.columns.find((c) => c.id === rel.sourceColumnId);
  const targetCol = target?.columns.find((c) => c.id === rel.targetColumnId);
  const label = rel.name || `${target?.name || "?"}.${targetCol?.name || "?"} → ${source?.name || "?"}.${sourceCol?.name || "?"}`;

  const swap = () => {
    onUpdateRelationship(rel.id, {
      sourceTableId: rel.targetTableId,
      sourceColumnId: rel.targetColumnId,
      targetTableId: rel.sourceTableId,
      targetColumnId: rel.sourceColumnId,
    });
  };

  return (
    <div className="rounded-md border border-border bg-[color:var(--bg-panel)]">
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <button className="flex-1 truncate text-left font-mono text-[11px]" onClick={() => onToggleExpand(rel.id)}>
          {label}
        </button>
        <button
          className="text-muted-foreground hover:text-destructive"
          title="Delete relationship"
          onClick={() => onDeleteRelationship(rel.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button className="text-muted-foreground hover:text-foreground" onClick={() => onToggleExpand(rel.id)}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Name:</span>
            <Input
              className="h-7 flex-1 text-xs"
              value={rel.name || ""}
              onChange={(e) => onUpdateRelationship(rel.id, { name: e.target.value })}
            />
          </label>

          <div className="flex items-center gap-2 rounded-md bg-[color:var(--bg-elevated)] px-2 py-1.5 font-mono text-[11px]">
            <span className="flex-1 truncate">
              {source?.name || "?"}.{sourceCol?.name || "?"} → {target?.name || "?"}.{targetCol?.name || "?"}
            </span>
            <button className="text-muted-foreground hover:text-foreground" title="Swap source/target" onClick={swap}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">Cardinality:</span>
            <Select value={rel.cardinality} onValueChange={(v) => onUpdateRelationship(rel.id, { cardinality: v })}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARDINALITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CARDINALITY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">On update:</span>
            <Select value={rel.updateConstraint} onValueChange={(v) => onUpdateRelationship(rel.id, { updateConstraint: v })}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSTRAINTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">On delete:</span>
            <Select value={rel.deleteConstraint} onValueChange={(v) => onUpdateRelationship(rel.id, { deleteConstraint: v })}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSTRAINTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <Button size="sm" variant="destructive" onClick={() => onDeleteRelationship(rel.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete relationship
          </Button>
        </div>
      )}
    </div>
  );
}

function EnumRow({ enumDef, expanded, onToggleExpand, onUpdateEnum, onDeleteEnum }) {
  const addValue = () => onUpdateEnum(enumDef.id, { values: [...enumDef.values, ""] });
  const updateValue = (i, v) => {
    const values = enumDef.values.slice();
    values[i] = v;
    onUpdateEnum(enumDef.id, { values });
  };
  const removeValue = (i) => onUpdateEnum(enumDef.id, { values: enumDef.values.filter((_, idx) => idx !== i) });
  const moveValue = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= enumDef.values.length) return;
    const values = enumDef.values.slice();
    [values[i], values[j]] = [values[j], values[i]];
    onUpdateEnum(enumDef.id, { values });
  };

  return (
    <div className="rounded-md border border-border bg-[color:var(--bg-panel)]">
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <button className="flex-1 truncate text-left font-medium" onClick={() => onToggleExpand(enumDef.id)}>
          {enumDef.name} <span className="text-muted-foreground">({enumDef.values.length})</span>
        </button>
        <button
          className="text-muted-foreground hover:text-destructive"
          title="Delete enum"
          onClick={() => onDeleteEnum(enumDef.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button className="text-muted-foreground hover:text-foreground" onClick={() => onToggleExpand(enumDef.id)}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Name:</span>
            <Input
              className="h-7 flex-1 text-xs"
              value={enumDef.name}
              onChange={(e) => onUpdateEnum(enumDef.id, { name: e.target.value })}
            />
          </label>

          <div className="flex flex-col gap-1">
            {enumDef.values.map((v, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input className="h-7 flex-1 text-xs" value={v} onChange={(e) => updateValue(i, e.target.value)} />
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => moveValue(i, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === enumDef.values.length - 1}
                  onClick={() => moveValue(i, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => removeValue(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {enumDef.values.length === 0 && <p className="px-1 py-1 text-xs text-muted-foreground">No values yet.</p>}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="border-dashed text-muted-foreground hover:text-foreground"
            onClick={addValue}
          >
            <Plus className="h-3.5 w-3.5" /> Add value
          </Button>

          <Button size="sm" variant="destructive" onClick={() => onDeleteEnum(enumDef.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete enum
          </Button>
        </div>
      )}
    </div>
  );
}

function NoteRow({ note, tables, expanded, onToggleExpand, onUpdateNote, onLinkNote, onDeleteNote }) {
  const linkedTable = tables.find((t) => t.id === note.tableId);

  return (
    <div className="rounded-md border border-border bg-[color:var(--bg-panel)]">
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <button className="flex-1 truncate text-left font-medium" onClick={() => onToggleExpand(note.id)}>
          {note.title || "Untitled note"}
        </button>
        {linkedTable && (
          <span
            className="flex items-center gap-1 truncate rounded-full bg-[color:var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            title={`Linked to ${linkedTable.name}`}
          >
            <Link2 className="h-3 w-3" /> {linkedTable.name}
          </span>
        )}
        <button
          className="text-muted-foreground hover:text-destructive"
          title="Delete note"
          onClick={() => onDeleteNote(note.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button className="text-muted-foreground hover:text-foreground" onClick={() => onToggleExpand(note.id)}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Title:</span>
            <Input
              className="h-7 flex-1 text-xs"
              value={note.title}
              onChange={(e) => onUpdateNote(note.id, { title: e.target.value })}
            />
          </label>

          <Textarea
            className="min-h-24 text-xs"
            value={note.content}
            placeholder="Write a note…"
            onChange={(e) => onUpdateNote(note.id, { content: e.target.value })}
          />

          <label className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-mono uppercase tracking-wider text-muted-foreground">Linked table:</span>
            <Select value={note.tableId || "none"} onValueChange={(v) => onLinkNote(note.id, v === "none" ? null : v)}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <Button size="sm" variant="destructive" onClick={() => onDeleteNote(note.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete note
          </Button>
        </div>
      )}
    </div>
  );
}

function AreaRow({ area, expanded, onToggleExpand, onUpdateArea, onDeleteArea }) {
  return (
    <div className="rounded-md border border-border bg-[color:var(--bg-panel)]" style={{ borderLeft: `4px solid ${area.color}` }}>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <button className="flex-1 truncate text-left font-medium" onClick={() => onToggleExpand(area.id)}>
          {area.name || "Untitled area"}
        </button>
        <button
          className="text-muted-foreground hover:text-destructive"
          title="Delete area"
          onClick={() => onDeleteArea(area.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button className="text-muted-foreground hover:text-foreground" onClick={() => onToggleExpand(area.id)}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Name:</span>
            <Input
              className="h-7 flex-1 text-xs"
              value={area.name}
              onChange={(e) => onUpdateArea(area.id, { name: e.target.value })}
            />
          </label>

          <label className="flex items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Color:</span>
            <ColorSwatchPicker value={area.color} onChange={(color) => onUpdateArea(area.id, { color })} />
          </label>

          <Button size="sm" variant="destructive" onClick={() => onDeleteArea(area.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete area
          </Button>
        </div>
      )}
    </div>
  );
}

const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 640;
const DEFAULT_SIDEBAR_WIDTH = 320;

export default function Sidebar({
  tables,
  relationships,
  notes,
  dbType,
  globalLocked,
  detached,
  onAddTable,
  onImportFormat,
  onSelectTable,
  onToggleTableVisibility,
  onToggleTableLock,
  onDeleteTable,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
  onUpdateTable,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onAddNote,
  onUpdateNote,
  onLinkNote,
  onDeleteNote,
  enums,
  onAddEnum,
  onUpdateEnum,
  onDeleteEnum,
  areas,
  onAddArea,
  onUpdateArea,
  onDeleteArea,
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [expandedRelId, setExpandedRelId] = useState(null);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [expandedEnumId, setExpandedEnumId] = useState(null);
  const [expandedAreaId, setExpandedAreaId] = useState(null);
  const [relDialogOpen, setRelDialogOpen] = useState(false);
  const tabsListRef = useRef(null);
  const scrollTabs = (dir) => tabsListRef.current?.scrollBy({ left: dir * 96, behavior: "smooth" });
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem("sidebarWidth"));
    return stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH ? stored : DEFAULT_SIDEBAR_WIDTH;
  });
  const resizing = useRef(false);
  const filtered = tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      resizing.current = true;
      const startX = e.clientX;
      const startWidth = width;

      const handleMove = (moveEvent) => {
        if (!resizing.current) return;
        const next = startWidth + (moveEvent.clientX - startX);
        setWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, next)));
      };
      const handleUp = () => {
        resizing.current = false;
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    localStorage.setItem("sidebarWidth", String(width));
  }, [width]);

  return (
    <div
      className={
        detached
          ? "relative flex h-[calc(100%-24px)] flex-col rounded-lg border border-border bg-[color:var(--bg-elevated)] shadow-xl"
          : "relative flex h-full flex-col border-r border-border bg-[color:var(--bg-elevated)]"
      }
      style={{ width }}
    >
      <div
        className="absolute right-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none hover:bg-[color:var(--accent)]/40"
        onMouseDown={handleResizeStart}
      />
      <Tabs defaultValue="tables" className="flex h-full flex-col">
        <div className="flex items-center">
          <button
            type="button"
            className="flex h-8 w-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => scrollTabs(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <TabsList ref={tabsListRef} className="flex-1 px-1 pt-2">
            <TabsTrigger value="tables">Tables ({tables.length})</TabsTrigger>
            <TabsTrigger value="relationships">Relationships ({relationships.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="enums">Enums ({enums.length})</TabsTrigger>
            <TabsTrigger value="areas">Areas ({areas.length})</TabsTrigger>
          </TabsList>
          <button
            type="button"
            className="flex h-8 w-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => scrollTabs(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <TabsContent value="tables" className="flex flex-col gap-2 p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-dashed text-muted-foreground hover:text-foreground"
              onClick={onAddTable}
            >
              <Plus className="h-3.5 w-3.5" /> Table
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-dashed text-muted-foreground hover:text-foreground"
                  title="Bulk add / update tables from a script"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onImportFormat("postgres")}>SQL script</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onImportFormat("dbml")}>DBML script</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onImportFormat("json")}>JSON script</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-1.5">
            {filtered.map((table) => (
              <TableRow
                key={table.id}
                table={table}
                dbType={dbType}
                enums={enums}
                globalLocked={globalLocked}
                expanded={expandedId === table.id}
                onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                onSelectTable={onSelectTable}
                onToggleTableVisibility={onToggleTableVisibility}
                onToggleTableLock={onToggleTableLock}
                onDeleteTable={onDeleteTable}
                onUpdateTable={onUpdateTable}
                onAddColumn={onAddColumn}
                onUpdateColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
              />
            ))}
            {filtered.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No tables yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="relationships" className="flex flex-col gap-2 p-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 border-dashed text-muted-foreground hover:text-foreground"
            onClick={() => setRelDialogOpen(true)}
            disabled={tables.length < 2}
          >
            <Plus className="h-3.5 w-3.5" /> Add relationship
          </Button>

          <div className="flex flex-col gap-1.5">
            {relationships.map((rel) => (
              <RelationshipRow
                key={rel.id}
                rel={rel}
                tables={tables}
                expanded={expandedRelId === rel.id}
                onToggleExpand={(id) => setExpandedRelId((cur) => (cur === id ? null : id))}
                onUpdateRelationship={onUpdateRelationship}
                onDeleteRelationship={onDeleteRelationship}
              />
            ))}
            {relationships.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No relationships yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="flex flex-col gap-2 p-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 border-dashed text-muted-foreground hover:text-foreground"
            onClick={onAddNote}
          >
            <Plus className="h-3.5 w-3.5" /> Add note
          </Button>

          <div className="flex flex-col gap-1.5">
            {notes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                tables={tables}
                expanded={expandedNoteId === note.id}
                onToggleExpand={(id) => setExpandedNoteId((cur) => (cur === id ? null : id))}
                onUpdateNote={onUpdateNote}
                onLinkNote={onLinkNote}
                onDeleteNote={onDeleteNote}
              />
            ))}
            {notes.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No notes yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="enums" className="flex flex-col gap-2 p-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 border-dashed text-muted-foreground hover:text-foreground"
            onClick={onAddEnum}
          >
            <Plus className="h-3.5 w-3.5" /> Add enum
          </Button>

          <div className="flex flex-col gap-1.5">
            {enums.map((enumDef) => (
              <EnumRow
                key={enumDef.id}
                enumDef={enumDef}
                expanded={expandedEnumId === enumDef.id}
                onToggleExpand={(id) => setExpandedEnumId((cur) => (cur === id ? null : id))}
                onUpdateEnum={onUpdateEnum}
                onDeleteEnum={onDeleteEnum}
              />
            ))}
            {enums.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No enums yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="areas" className="flex flex-col gap-2 p-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 border-dashed text-muted-foreground hover:text-foreground"
            onClick={onAddArea}
          >
            <Plus className="h-3.5 w-3.5" /> Add area
          </Button>

          <div className="flex flex-col gap-1.5">
            {areas.map((area) => (
              <AreaRow
                key={area.id}
                area={area}
                expanded={expandedAreaId === area.id}
                onToggleExpand={(id) => setExpandedAreaId((cur) => (cur === id ? null : id))}
                onUpdateArea={onUpdateArea}
                onDeleteArea={onDeleteArea}
              />
            ))}
            {areas.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No subject areas yet.</p>}
          </div>
        </TabsContent>
      </Tabs>

      <RelationshipDialog open={relDialogOpen} onOpenChange={setRelDialogOpen} tables={tables} onSubmit={onAddRelationship} />
    </div>
  );
}
