import { Parser } from "@dbml/core";
import { makeColumn, makeTable, nextId } from "./dbTypes";

const parser = new Parser();

export const IMPORT_FORMATS = {
  dbml: { label: "DBML", dbType: null },
  json: { label: "JSON (drawdb-clone)", dbType: null },
  postgres: { label: "PostgreSQL (SQL)", dbType: "postgresql" },
  mysql: { label: "MySQL (SQL)", dbType: "mysql" },
  mssql: { label: "SQL Server (SQL)", dbType: "postgresql" },
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
};

function normalizeType(rawType, dbType) {
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
    return { tables: parsed.tables, relationships: parsed.relationships || [] };
  }

  let database;
  try {
    database = parser.parse(source, format);
  } catch (err) {
    throw new Error(formatParseError(err));
  }
  const schema = database.schemas[0];
  if (!schema) throw new Error("No schema found in imported source");

  const tableIdByName = new Map();
  const tables = schema.tables.map((table, index) => {
    const built = makeTable({
      name: table.name,
      color: table.headerColor || "#2f6feb",
      position: { x: 60 + (index % 5) * 380, y: 60 + Math.floor(index / 5) * 340 },
      columns: table.fields.map((field) =>
        makeColumn({
          name: field.name,
          type: normalizeType(field.type?.type_name || String(field.type), dbType),
          pk: !!field.pk,
          notNull: !!field.not_null,
          unique: !!field.unique,
          autoIncrement: !!field.increment,
          defaultValue: extractDefault(field.dbdefault),
          note: field.note?.value || "",
        })
      ),
    });
    tableIdByName.set(table.name, built);
    return built;
  });

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

  return { tables, relationships };
}
