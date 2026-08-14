import { Parser } from "@dbml/core";
import { makeColumn, makeEnum, makeIndex, makeTable, nextId } from "./dbTypes";

const parser = new Parser();

export const IMPORT_FORMATS = {
  dbml: { label: "DBML", dbType: null },
  json: { label: "JSON (drawdb-clone)", dbType: null },
  postgres: { label: "PostgreSQL (SQL)", dbType: "postgresql" },
  mysql: { label: "MySQL (SQL)", dbType: "mysql" },
  // MariaDB's DDL is close enough to MySQL's that the same parser format and
  // type aliases work unchanged.
  mariadb: { label: "MariaDB (SQL)", dbType: "mariadb", parserFormat: "mysql" },
  mssql: { label: "SQL Server (SQL)", dbType: "mssql" },
};

const TYPE_ALIASES = {
  postgresql: [
    [/^serial/i, "SERIAL"],
    [/^bigserial/i, "BIGSERIAL"],
    [/^(bigint|int8)/i, "BIGINT"],
    [/^smallint|int2/i, "SMALLINT"],
    [/^(int|integer|int4)/i, "INTEGER"],
    [/^bool/i, "BOOLEAN"],
    [/^uuid/i, "UUID"],
    [/^jsonb/i, "JSONB"],
    [/^json/i, "JSONB"],
    [/^timestamp/i, "TIMESTAMP"],
    [/^date/i, "DATE"],
    [/^(numeric|decimal)/i, "NUMERIC(10,2)"],
    [/^(varchar|character varying|nvarchar)/i, "VARCHAR(255)"],
    [/^(text|ntext)/i, "TEXT"],
  ],
  mysql: [
    [/^(bigint|int8)/i, "BIGINT"],
    [/^smallint|int2/i, "SMALLINT"],
    [/^(int|integer|int4)/i, "INT"],
    [/^bool/i, "BOOLEAN"],
    [/^json/i, "JSON"],
    [/^datetime/i, "DATETIME"],
    [/^date/i, "DATE"],
    [/^(numeric|decimal)/i, "DECIMAL(10,2)"],
    [/^(varchar|nvarchar)/i, "VARCHAR(255)"],
    [/^(text|ntext|uuid)/i, "TEXT"],
  ],
  sqlite: [
    [/^(bigint|int|integer|smallint|serial)/i, "INTEGER"],
    [/^(numeric|decimal|real|float|double)/i, "REAL"],
    [/^(bool|varchar|nvarchar|text|ntext|json|uuid|date|time)/i, "TEXT"],
  ],
  mssql: [
    [/^(bigint|int8)/i, "BIGINT"],
    [/^smallint|int2/i, "SMALLINT"],
    [/^(int|integer|int4)/i, "INT"],
    [/^bit|bool/i, "BIT"],
    [/^uniqueidentifier|uuid/i, "UNIQUEIDENTIFIER"],
    [/^datetime2|timestamp/i, "DATETIME2"],
    [/^date/i, "DATE"],
    [/^(numeric|decimal)/i, "DECIMAL(10,2)"],
    [/^(nvarchar\s*\(\s*max|text|ntext)/i, "NVARCHAR(MAX)"],
    [/^(varchar|nvarchar|character varying)/i, "NVARCHAR(255)"],
  ],
};

// MariaDB's type surface is close enough to MySQL's to reuse the same aliases.
TYPE_ALIASES.mariadb = TYPE_ALIASES.mysql;

export function normalizeType(rawType, dbType) {
  const aliases = TYPE_ALIASES[dbType] || TYPE_ALIASES.postgresql;
  for (const [pattern, canonical] of aliases) {
    if (pattern.test(rawType)) return canonical;
  }
  return dbType === "sqlite" ? "TEXT" : "TEXT";
}

function extractDefault(dbdefault) {
  if (dbdefault == null || dbdefault.value == null) return "";
  return String(dbdefault.value);
}

// @dbml/core throws a custom error whose top-level `.message` is undefined —
// the actual syntax diagnostic (with line/column) lives in `.diags[0]`. Without
// unpacking this, every parse failure surfaces as the same generic "Failed to
// parse" message regardless of cause, leaving no way to find the bad line.
function formatParseError(err) {
  const diag = err?.diags?.[0];
  if (diag) {
    const loc = diag.location?.start;
    const where = loc ? ` (line ${loc.line}, column ${loc.column})` : "";
    return `${diag.text || diag.message || "Syntax error"}${where}`;
  }
  return err?.message || "Failed to parse the provided source.";
}

/**
 * Parses DBML or SQL DDL (postgres/mysql) source into this app's diagram
 * model. Relationship direction follows dbml-core's endpoint order: the
 * "*"-relation endpoint is the FK owner (target), the "1" endpoint is the
 * referenced table (source).
 */
export function parseImport(source, format, dbType) {
  if (format === "json") {
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch {
      throw new Error("That doesn't look like valid JSON.");
    }
    if (!Array.isArray(parsed?.tables)) {
      throw new Error("Expected a drawdb-clone export with a top-level \"tables\" array.");
    }
    return {
      tables: parsed.tables,
      relationships: parsed.relationships || [],
      enums: parsed.enums || [],
      subjectAreas: parsed.subjectAreas || [],
    };
  }

  let database;
  try {
    database = parser.parse(source, IMPORT_FORMATS[format]?.parserFormat || format);
  } catch (err) {
    throw new Error(formatParseError(err));
  }
  const schema = database.schemas[0];
  if (!schema) throw new Error("No schema found in imported source");

  const tableIdByName = new Map();
  const tables = schema.tables.map((table, index) => {
    const columnIdByName = new Map();
    const built = makeTable({
      name: table.name,
      color: table.headerColor || "#2f6feb",
      position: { x: 60 + (index % 5) * 380, y: 60 + Math.floor(index / 5) * 340 },
      columns: table.fields.map((field) => {
        const col = makeColumn({
          name: field.name,
          type: normalizeType(field.type?.type_name || String(field.type), dbType),
          pk: !!field.pk,
          notNull: !!field.not_null,
          unique: !!field.unique,
          autoIncrement: !!field.increment,
          defaultValue: extractDefault(field.dbdefault),
          note: field.note?.value || "",
        });
        columnIdByName.set(field.name, col.id);
        return col;
      }),
      // Evaluated after `columns` above (object literal properties run in
      // source order), so columnIdByName is already populated here.
      indexes: (table.indexes || [])
        .map((idx) => {
          const columnIds = (idx.columns || [])
            .filter((c) => c.type === "column")
            .map((c) => columnIdByName.get(c.value))
            .filter(Boolean);
          return columnIds.length > 0 ? makeIndex({ name: idx.name || "", unique: !!idx.unique, columnIds }) : null;
        })
        .filter(Boolean),
    });
    tableIdByName.set(table.name, built);
    return built;
  });

  const enums = (schema.enums || []).map((e) => makeEnum(e.name, { values: (e.values || []).map((v) => v.name) }));

  const relationships = [];
  for (const ref of schema.refs || []) {
    const manyEnd = ref.endpoints.find((e) => e.relation === "*" || e.relation === "0..*");
    const oneEnd = ref.endpoints.find((e) => e !== manyEnd) || ref.endpoints[1];
    if (!manyEnd || !oneEnd) continue;

    const targetTable = tableIdByName.get(manyEnd.tableName);
    const sourceTable = tableIdByName.get(oneEnd.tableName);
    if (!targetTable || !sourceTable) continue;

    const targetColumn = targetTable.columns.find((c) => c.name === manyEnd.fieldNames[0]);
    const sourceColumn = sourceTable.columns.find((c) => c.name === oneEnd.fieldNames[0]);
    if (!targetColumn || !sourceColumn) continue;

    relationships.push({
      id: nextId("rel"),
      sourceTableId: sourceTable.id,
      sourceColumnId: sourceColumn.id,
      targetTableId: targetTable.id,
      targetColumnId: targetColumn.id,
    });
  }

  return { tables, relationships, enums, subjectAreas: [] };
}

/**
 * Merges a freshly-parsed import model into the diagram's current model:
 * tables are matched by name (case-insensitive) — matches keep their
 * existing id/position/color, and their columns are updated from the
 * imported definition while preserving the id of any column whose name
 * survives the update (so relationships to that column don't dangle).
 * Unmatched imported tables are appended below the existing layout ("add").
 * Existing relationships are kept unless they point at a column that an
 * update removed; imported relationships are remapped onto the resolved
 * table ids and de-duplicated against ones already kept.
 */
export function mergeModels(existingModel, importedModel) {
  const existingByName = new Map(existingModel.tables.map((t) => [t.name.trim().toLowerCase(), t]));
  const tableIdMap = new Map();
  const columnIdMap = new Map();
  const touchedIds = new Set();

  const maxY = existingModel.tables.reduce((m, t) => Math.max(m, t.position?.y || 0), 0);
  const yOffset = existingModel.tables.length ? maxY + 360 : 0;

  const mergedTables = importedModel.tables.map((t) => {
    const existing = existingByName.get(t.name.trim().toLowerCase());
    if (existing) {
      tableIdMap.set(t.id, existing.id);
      touchedIds.add(existing.id);
      const existingColsByName = new Map(existing.columns.map((c) => [c.name.trim().toLowerCase(), c]));
      const colIdRemap = new Map();
      const columns = t.columns.map((c) => {
        const match = existingColsByName.get(c.name.trim().toLowerCase());
        const finalId = match ? match.id : c.id;
        if (match) columnIdMap.set(c.id, match.id);
        colIdRemap.set(c.id, finalId);
        return match ? { ...c, id: match.id } : c;
      });
      // The imported table's own indexes still reference its pre-merge
      // column ids — remap them the same way the columns above just were,
      // or they'd silently point at ids that no longer exist on this table.
      const indexes = (t.indexes || [])
        .map((idx) => ({ ...idx, columnIds: idx.columnIds.map((cid) => colIdRemap.get(cid)).filter(Boolean) }))
        .filter((idx) => idx.columnIds.length > 0);
      return {
        ...t,
        id: existing.id,
        position: existing.position,
        color: existing.color,
        hidden: existing.hidden,
        locked: existing.locked,
        columns,
        indexes,
      };
    }
    tableIdMap.set(t.id, t.id);
    touchedIds.add(t.id);
    return { ...t, position: { x: t.position.x, y: t.position.y + yOffset } };
  });

  const keptTables = existingModel.tables.filter((t) => !touchedIds.has(t.id));

  const validColumnIds = new Set();
  for (const t of [...keptTables, ...mergedTables]) {
    for (const c of t.columns) validColumnIds.add(c.id);
  }

  const keptRelationships = existingModel.relationships.filter(
    (r) => validColumnIds.has(r.sourceColumnId) && validColumnIds.has(r.targetColumnId)
  );

  const remappedRelationships = importedModel.relationships.map((r) => ({
    ...r,
    sourceTableId: tableIdMap.get(r.sourceTableId) || r.sourceTableId,
    targetTableId: tableIdMap.get(r.targetTableId) || r.targetTableId,
    sourceColumnId: columnIdMap.get(r.sourceColumnId) || r.sourceColumnId,
    targetColumnId: columnIdMap.get(r.targetColumnId) || r.targetColumnId,
  }));

  // A relationship that already survived via keptRelationships (e.g. the
  // import re-declares an FK that hadn't changed) would otherwise be
  // duplicated as a second edge between the same two columns.
  const keyOf = (r) => `${r.sourceColumnId}:${r.targetColumnId}`;
  const keptKeys = new Set(keptRelationships.map(keyOf));
  const newRelationships = remappedRelationships.filter((r) => !keptKeys.has(keyOf(r)));

  // Enums are matched by name too — an existing enum's id/values win over an
  // imported one of the same name rather than trying to reconcile the two.
  const existingEnumNames = new Set((existingModel.enums || []).map((e) => e.name.trim().toLowerCase()));
  const newEnums = (importedModel.enums || []).filter((e) => !existingEnumNames.has(e.name.trim().toLowerCase()));

  return {
    tables: [...keptTables, ...mergedTables],
    relationships: [...keptRelationships, ...newRelationships],
    enums: [...(existingModel.enums || []), ...newEnums],
    // Subject areas are a canvas-only grouping, not something a script import
    // describes — imports never touch the existing ones.
    subjectAreas: existingModel.subjectAreas || [],
  };
}
