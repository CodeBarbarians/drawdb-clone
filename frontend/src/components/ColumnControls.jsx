import { useEffect, useRef, useState } from "react";
import { Key, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function NullableToggle({ column, onToggle, className = "h-7 w-7", disabled = false }) {
  return (
    <button
      title="Nullable"
      disabled={disabled}
      className={`nodrag flex shrink-0 items-center justify-center rounded font-mono text-xs disabled:cursor-not-allowed disabled:opacity-50 ${className} ${
        !column.notNull ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
      onClick={onToggle}
    >
      ?
    </button>
  );
}

export function PkToggle({ column, onToggle, className = "h-7 w-7", disabled = false }) {
  return (
    <button
      title="Primary key"
      disabled={disabled}
      className={`nodrag flex shrink-0 items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-50 ${className} ${
        column.pk ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
      onClick={onToggle}
    >
      <Key className="h-3.5 w-3.5" />
    </button>
  );
}

export function ColumnOptionsPopover({
  table,
  column,
  typeOptions = [],
  onUpdateColumn,
  onDeleteColumn,
  triggerClassName = "",
  disabled = false,
  showCoreFields = false,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  // React Flow's canvas pans/zooms via d3-zoom, which calls
  // stopImmediatePropagation() on pointerdown before it can bubble up to the
  // document-level listener Radix's Popover normally relies on to detect an
  // outside click. Clicking anywhere on the canvas — rather than just the
  // trigger — would otherwise never close this menu. A capture-phase
  // listener on document runs before that bubble-phase stop, so it still
  // sees the click.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild ref={triggerRef}>
        <button
          disabled={disabled}
          className={`nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-3">
        {showCoreFields && (
          <>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Name</span>
              <Input
                className="h-8 text-xs"
                value={column.name}
                onChange={(e) => onUpdateColumn(table.id, column.id, { name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Type</span>
              <Select value={column.type} onValueChange={(v) => onUpdateColumn(table.id, column.id, { type: v })}>
                <SelectTrigger className="h-8 font-mono text-xs">
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
            </div>
            <label className="flex items-center justify-between text-sm">
              Not null
              <Checkbox checked={column.notNull} onCheckedChange={(v) => onUpdateColumn(table.id, column.id, { notNull: !!v })} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Primary key
              <Checkbox checked={column.pk} onCheckedChange={(v) => onUpdateColumn(table.id, column.id, { pk: !!v })} />
            </label>
          </>
        )}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Default</span>
          <Input
            className="h-8 text-xs"
            value={column.defaultValue}
            onChange={(e) => onUpdateColumn(table.id, column.id, { defaultValue: e.target.value })}
            placeholder="Default"
          />
        </div>
        <label className="flex items-center justify-between text-sm">
          Unique
          <Checkbox checked={column.unique} onCheckedChange={(v) => onUpdateColumn(table.id, column.id, { unique: !!v })} />
        </label>
        <label className="flex items-center justify-between text-sm">
          Autoincrement
          <Checkbox
            checked={column.autoIncrement}
            onCheckedChange={(v) => onUpdateColumn(table.id, column.id, { autoIncrement: !!v })}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Comment</span>
          <textarea
            className="modal__sql h-16 resize-none rounded-md border border-border text-xs"
            value={column.note}
            onChange={(e) => onUpdateColumn(table.id, column.id, { note: e.target.value })}
            placeholder="Comment"
          />
        </div>
        <Button variant="destructive" size="sm" onClick={() => onDeleteColumn(table.id, column.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete field
        </Button>
      </PopoverContent>
    </Popover>
  );
}
