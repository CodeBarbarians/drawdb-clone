import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Lock, Plus, Search, Trash2, Unlock } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ColumnOptionsPopover, NullableToggle, PkToggle } from "./ColumnControls";
import { DB_TYPES } from "../lib/dbTypes";

function TableRow({
  table,
  dbType,
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
  const typeOptions = DB_TYPES[dbType]?.columnTypes || DB_TYPES.postgresql.columnTypes;
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
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  tables,
  relationships,
  dbType,
  globalLocked,
  detached,
  onAddTable,
  onSelectTable,
  onToggleTableVisibility,
  onToggleTableLock,
  onDeleteTable,
  onDeleteRelationship,
  onUpdateTable,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const filtered = tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className={
        detached
          ? "flex h-[calc(100%-24px)] w-80 flex-col rounded-lg border border-border bg-[color:var(--bg-elevated)] shadow-xl"
          : "flex h-full w-80 flex-col border-r border-border bg-[color:var(--bg-elevated)]"
      }
    >
      <Tabs defaultValue="tables" className="flex h-full flex-col">
        <TabsList className="px-2 pt-2">
          <TabsTrigger value="tables">Tables ({tables.length})</TabsTrigger>
          <TabsTrigger value="relationships">Relationships ({relationships.length})</TabsTrigger>
        </TabsList>

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
            <Button size="sm" onClick={onAddTable}>
              + Table
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            {filtered.map((table) => (
              <TableRow
                key={table.id}
                table={table}
                dbType={dbType}
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

        <TabsContent value="relationships" className="flex flex-col gap-1 p-3">
          {relationships.map((rel) => {
            const source = tables.find((t) => t.id === rel.sourceTableId);
            const target = tables.find((t) => t.id === rel.targetTableId);
            const sourceCol = source?.columns.find((c) => c.id === rel.sourceColumnId);
            const targetCol = target?.columns.find((c) => c.id === rel.targetColumnId);
            return (
              <div
                key={rel.id}
                className="group flex items-center gap-2 rounded-md border border-border bg-[color:var(--bg-panel)] px-2 py-1.5 font-mono text-[11px]"
              >
                <span className="flex-1 truncate">
                  {target?.name || "?"}.{targetCol?.name || "?"} → {source?.name || "?"}.{sourceCol?.name || "?"}
                </span>
                <button
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  title="Delete relationship"
                  onClick={() => onDeleteRelationship(rel.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {relationships.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No relationships yet.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
