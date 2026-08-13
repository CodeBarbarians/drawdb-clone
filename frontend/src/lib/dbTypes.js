export const DB_TYPES = {
  postgresql: {
    label: "PostgreSQL",
    columnTypes: [
      "INTEGER",
      "BIGINT",
      "SMALLINT",
      "SERIAL",
      "BIGSERIAL",
      "VARCHAR(255)",
      "TEXT",
      "BOOLEAN",
      "DATE",
      "TIMESTAMP",
      "NUMERIC(10,2)",
      "UUID",
      "JSONB",
    ],
  },
  mysql: {
    label: "MySQL",
    columnTypes: [
      "INT",
      "BIGINT",
      "SMALLINT",
      "VARCHAR(255)",
      "TEXT",
      "BOOLEAN",
      "DATE",
      "DATETIME",
      "DECIMAL(10,2)",
      "JSON",
    ],
  },
  sqlite: {
    label: "SQLite",
    columnTypes: ["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"],
  },
};

export const DEFAULT_DB_TYPE = "postgresql";

let idCounter = 0;
export function nextId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function makeColumn(overrides = {}) {
  return {
    id: nextId("col"),
    name: "id",
    type: "INTEGER",
    pk: false,
    notNull: false,
    unique: false,
    autoIncrement: false,
    defaultValue: "",
    note: "",
    ...overrides,
  };
}

export function makeTable(overrides = {}) {
  return {
    id: nextId("tbl"),
    name: "new_table",
    position: { x: 100, y: 100 },
    color: "#2f6feb",
    hidden: false,
    locked: false,
    columns: [makeColumn({ name: "id", type: "INTEGER", pk: true, notNull: true, autoIncrement: true })],
    ...overrides,
  };
}

export function makeNote(overrides = {}) {
  return {
    id: nextId("note"),
    title: "Note",
    content: "",
    position: { x: 100, y: 100 },
    tableId: null,
    ...overrides,
  };
}

export const CARDINALITIES = ["one_to_one", "one_to_many", "many_to_one"];

export const CARDINALITY_LABELS = {
  one_to_one: "One to one",
  one_to_many: "One to many",
  many_to_one: "Many to one",
};

export const CONSTRAINTS = ["No action", "Restrict", "Cascade", "Set null", "Set default"];

// Mirrors how most ER tools infer cardinality from key flags: a unique/PK
// column can hold at most one matching row on its side of the relationship.
export function inferCardinality(sourceColumn, targetColumn) {
  const sourceUnique = !!(sourceColumn?.unique || sourceColumn?.pk);
  const targetUnique = !!(targetColumn?.unique || targetColumn?.pk);
  if (sourceUnique && targetUnique) return "one_to_one";
  if (sourceUnique && !targetUnique) return "one_to_many";
  if (!sourceUnique && targetUnique) return "many_to_one";
  return "one_to_many";
}

export function defaultRelationshipName(sourceTable, sourceColumn, targetTable) {
  return `fk_${targetTable?.name || "table"}_${sourceColumn?.name || "id"}_${sourceTable?.name || "table"}`;
}
