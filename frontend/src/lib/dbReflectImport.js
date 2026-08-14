import { makeColumn, makeEnum, makeIndex, makeTable, nextId } from "./dbTypes";
import { normalizeType } from "./dbImport";

/**
 * Converts the raw table/column/FK/index metadata returned by the backend's
 * /reflect endpoint into this app's native diagram model — the same shape
 * `parseImport` produces for SQL/DBML sources, so it can go through the same
 * merge/replace path as any other import.
 */
export function buildModelFromReflection(reflected, dbType) {
  const tableByName = new Map();
  const columnsByTable = new Map();

  const tables = (reflected.tables || []).map((table, index) => {
    const columns = table.columns.map((col) => {
      const autoIncrement = !!col.autoincrement;
      return makeColumn({
        name: col.name,
        type: normalizeType(col.type, dbType),
        pk: (table.primary_key || []).includes(col.name),
        notNull: col.nullable === false,
        autoIncrement,
        // An autoincrement column's "default" from introspection is just the
        // driver's internal sequence/identity expression (e.g. Postgres's
        // nextval(...)) — the SQL generator already emits SERIAL/AUTO_INCREMENT
        // for such columns, so carrying this over would duplicate it.
        defaultValue: autoIncrement ? "" : col.default || "",
      });
    });
    const columnByName = new Map(columns.map((c) => [c.name, c]));

    // A single-column unique constraint/index is represented as a flag on
    // the column itself, matching how the editor's own UI models it —
    // composite ones become an explicit index below instead.
    for (const uc of table.unique_constraints || []) {
      if (uc.columns.length === 1) {
        const c = columnByName.get(uc.columns[0]);
        if (c) c.unique = true;
      }
    }
    for (const idx of table.indexes || []) {
      if (idx.unique && idx.columns.length === 1) {
        const c = columnByName.get(idx.columns[0]);
        if (c) c.unique = true;
      }
    }

    const indexes = (table.indexes || [])
      .filter((idx) => idx.columns.length > 1)
      .map((idx) =>
        makeIndex({
          name: idx.name || "",
          unique: !!idx.unique,
          columnIds: idx.columns.map((cn) => columnByName.get(cn)?.id).filter(Boolean),
        })
      )
      .filter((idx) => idx.columnIds.length > 0);

    const built = makeTable({
      name: table.name,
      position: { x: 60 + (index % 5) * 380, y: 60 + Math.floor(index / 5) * 340 },
      columns,
      indexes,
    });
    tableByName.set(table.name, built);
    columnsByTable.set(table.name, columnByName);
    return built;
  });

  const relationships = [];
  for (const table of reflected.tables || []) {
    const targetTable = tableByName.get(table.name);
    if (!targetTable) continue;
    for (const fk of table.foreign_keys || []) {
      const sourceTable = tableByName.get(fk.referred_table);
      if (!sourceTable) continue;
      // Composite foreign keys can't be represented by this app's
      // single-column relationship model — same limitation the DBML/SQL
      // importer has (it also only takes the first field of each endpoint).
      const targetColumn = columnsByTable.get(table.name)?.get(fk.constrained_columns[0]);
      const sourceColumn = columnsByTable.get(fk.referred_table)?.get(fk.referred_columns[0]);
      if (!targetColumn || !sourceColumn) continue;

      relationships.push({
        id: nextId("rel"),
        sourceTableId: sourceTable.id,
        sourceColumnId: sourceColumn.id,
        targetTableId: targetTable.id,
        targetColumnId: targetColumn.id,
      });
    }
  }

  const enums = (reflected.enums || []).map((e) => makeEnum(e.name, { values: e.values || [] }));

  return { tables, relationships, enums, subjectAreas: [] };
}
