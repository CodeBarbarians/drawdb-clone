import { Key, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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

export function ColumnOptionsPopover({ table, column, onUpdateColumn, onDeleteColumn, triggerClassName = "", disabled = false }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={`nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-3">
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
