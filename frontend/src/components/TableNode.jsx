import { memo } from "react";
import { Handle, Position } from "reactflow";
import { X } from "lucide-react";

import { ColumnOptionsPopover, NullableToggle, PkToggle } from "./ColumnControls";
import { DB_TYPES } from "../lib/dbTypes";

function TableNode({ data }) {
  const { table, dbType, onUpdateTable, onDeleteTable, onAddColumn, onUpdateColumn, onDeleteColumn } = data;
  const typeOptions = DB_TYPES[dbType]?.columnTypes || DB_TYPES.postgresql.columnTypes;

  return (
    <div className="table-node" style={{ borderLeftColor: table.color }}>
      <div className="table-node__header">
        <input
          className="table-node__name nodrag"
          value={table.name}
          onChange={(e) => onUpdateTable(table.id, { name: e.target.value })}
        />
        <button className="table-node__delete nodrag" title="Delete table" onClick={() => onDeleteTable(table.id)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="table-node__columns">
        {table.columns.map((col) => (
          <div className="table-node__row" key={col.id}>
            <Handle type="target" position={Position.Left} id={col.id} className="table-node__handle" />
            <input
              className="table-node__col-name nodrag"
              value={col.name}
              onChange={(e) => onUpdateColumn(table.id, col.id, { name: e.target.value })}
            />
            <select
              className="table-node__col-type nodrag"
              value={col.type}
              onChange={(e) => onUpdateColumn(table.id, col.id, { type: e.target.value })}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <NullableToggle
              column={col}
              onToggle={() => onUpdateColumn(table.id, col.id, { notNull: !col.notNull })}
              className="h-5 w-5 text-[10px]"
            />
            <PkToggle
              column={col}
              onToggle={() => onUpdateColumn(table.id, col.id, { pk: !col.pk })}
              className="h-5 w-5"
            />
            <ColumnOptionsPopover
              table={table}
              column={col}
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
              triggerClassName="h-5 w-5"
            />
            <button
              className="table-node__col-delete nodrag"
              title="Delete column"
              onClick={() => onDeleteColumn(table.id, col.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Handle type="source" position={Position.Right} id={col.id} className="table-node__handle" />
          </div>
        ))}
      </div>

      <button className="table-node__add-col nodrag" onClick={() => onAddColumn(table.id)}>
        + Add column
      </button>
    </div>
  );
}

export default memo(TableNode);
