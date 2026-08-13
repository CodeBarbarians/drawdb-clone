import { memo } from "react";
import { Handle, Position, useStore } from "reactflow";
import { Key, Lock, Unlock, X } from "lucide-react";

import { ColumnOptionsPopover } from "./ColumnControls";
import { typeOptionsFor } from "../lib/dbTypes";

// Below this zoom level, individual columns are just a few pixels tall and
// unreadable/unusable anyway. Rendering full inputs/selects/popovers for
// every column of every table is what makes opening any menu or popover
// noticeably slow on large diagrams (100+ tables forces the browser to lay
// out thousands of interactive controls no one can currently see). Swapping
// to a plain-text compact row below this threshold cuts that DOM weight
// while keeping one Handle per column so edges stay anchored correctly.
const COMPACT_ZOOM_THRESHOLD = 0.6;

function useIsCompact() {
  return useStore((s) => s.transform[2] < COMPACT_ZOOM_THRESHOLD, (a, b) => a === b);
}

function TableNode({ data }) {
  const {
    table,
    dbType,
    tableWidth,
    enums,
    globalLocked,
    onUpdateTable,
    onDeleteTable,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    onToggleLock,
  } = data;
  const typeOptions = typeOptionsFor(dbType, enums);
  const locked = table.locked || globalLocked;
  const compact = useIsCompact();
  const widthStyle = tableWidth ? { width: `${tableWidth}px` } : undefined;

  if (compact) {
    return (
      <div className="table-node" style={{ borderLeftColor: table.color, ...widthStyle }}>
        <div className="table-node__header">
          <span className="table-node__name table-node__name--static">{table.name}</span>
        </div>
        <div className="table-node__columns">
          {table.columns.map((col) => (
            <div className="table-node__row table-node__row--compact" key={col.id}>
              <Handle type="target" position={Position.Left} id={col.id} className="table-node__handle" />
              <span className="table-node__col-name table-node__col-name--static">{col.name}</span>
              <Handle type="source" position={Position.Right} id={col.id} className="table-node__handle" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="table-node" style={{ borderLeftColor: table.color, ...widthStyle }}>
      <div className="table-node__header">
        <input
          className="table-node__name nodrag"
          value={table.name}
          readOnly={locked}
          onChange={(e) => onUpdateTable(table.id, { name: e.target.value })}
        />
        <button
          className="table-node__delete nodrag"
          title={table.locked ? "Unlock table" : "Lock table"}
          onClick={() => onToggleLock(table.id)}
        >
          {table.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
        <button
          className="table-node__delete nodrag"
          title="Delete table"
          disabled={locked}
          onClick={() => onDeleteTable(table.id)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="table-node__columns">
        {table.columns.map((col) => (
          <div className="table-node__row" key={col.id}>
            <Handle type="target" position={Position.Left} id={col.id} className="table-node__handle" />
            <span className="table-node__col-name table-node__col-name--static" title={col.name}>
              {col.name}
            </span>
            <span className="table-node__col-flag-slot">{col.pk && <Key className="h-3 w-3 text-amber-400" />}</span>
            <span className="table-node__col-type table-node__col-type--static">{col.type}</span>
            <span className="table-node__col-flag-slot">
              {!col.notNull && <span style={{ color: "var(--accent)" }}>?</span>}
            </span>
            <ColumnOptionsPopover
              table={table}
              column={col}
              typeOptions={typeOptions}
              enums={enums}
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
              triggerClassName="h-5 w-5"
              disabled={locked}
              showCoreFields
            />
            <button
              className="table-node__col-delete nodrag"
              title="Delete column"
              disabled={locked}
              onClick={() => onDeleteColumn(table.id, col.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Handle type="source" position={Position.Right} id={col.id} className="table-node__handle" />
          </div>
        ))}
      </div>

      <button className="table-node__add-col nodrag" disabled={locked} onClick={() => onAddColumn(table.id)}>
        + Add column
      </button>
    </div>
  );
}

export default memo(TableNode);
