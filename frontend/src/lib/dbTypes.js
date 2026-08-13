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
  mariadb: {
    label: "MariaDB",
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
      "UUID",
    ],
  },
  mssql: {
    label: "SQL Server",
    columnTypes: [
      "INT",
      "BIGINT",
      "SMALLINT",
      "NVARCHAR(255)",
      "NVARCHAR(MAX)",
      "BIT",
      "DATE",
      "DATETIME2",
      "DECIMAL(10,2)",
      "UNIQUEIDENTIFIER",
    ],
  },
  oracle: {
    label: "Oracle",
    columnTypes: [
      "NUMBER",
      "NUMBER(10,2)",
      "VARCHAR2(255)",
      "CLOB",
      "CHAR(1)",
      "DATE",
      "TIMESTAMP",
    ],
  },
};

export const DEFAULT_DB_TYPE = "postgresql";

// Preset swatches for table color-tagging — a fixed palette (rather than a
// free-form picker) keeps colors consistent and easy to tell apart when a
// diagram has many tables categorized by color.
export const TABLE_COLOR_PALETTE = [
  "#2f6feb",
  "#e8590c",
  "#2f9e44",
  "#e64980",
  "#7048e8",
  "#f08c00",
  "#1098ad",
  "#c92a2a",
  "#495057",
];

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
    indexes: [],
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

export function makeEnum(name = "new_enum", overrides = {}) {
  return {
    id: nextId("enum"),
    name,
    values: [],
    ...overrides,
  };
}

export function makeIndex(overrides = {}) {
  return {
    id: nextId("idx"),
    name: "",
    columnIds: [],
    unique: false,
    ...overrides,
  };
}

export function makeSubjectArea(name = "Area", overrides = {}) {
  return {
    id: nextId("area"),
    name,
    color: "#2f6feb",
    position: { x: 60, y: 60 },
    width: 320,
    height: 220,
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

// A column only guarantees uniqueness on its own if it's flagged unique, or if
// it's a PK and the *only* PK column on its table — a column that's merely
// part of a composite PK does not, by itself, identify a single row.
export function isEffectivelyUnique(column, table) {
  if (!column) return false;
  if (column.unique) return true;
  if (!column.pk) return false;
  const pkCount = table?.columns?.filter((c) => c.pk).length ?? 1;
  return pkCount === 1;
}

// Mirrors how most ER tools infer cardinality from key flags: a unique/PK
// column can hold at most one matching row on its side of the relationship.
export function inferCardinality(sourceUnique, targetUnique) {
  if (sourceUnique && targetUnique) return "one_to_one";
  if (sourceUnique && !targetUnique) return "one_to_many";
  if (!sourceUnique && targetUnique) return "many_to_one";
  return "one_to_many";
}

export function defaultRelationshipName(sourceTable, sourceColumn, targetTable) {
  return `fk_${targetTable?.name || "table"}_${sourceColumn?.name || "id"}_${sourceTable?.name || "table"}`;
}

// The type <Select> in both the sidebar and the table node offers the
// dialect's built-in column types plus any user-defined enum as a pickable
// type — a column's type is simply set to the enum's name, same as any
// other type string.
export function typeOptionsFor(dbType, enums = []) {
  const base = DB_TYPES[dbType]?.columnTypes || DB_TYPES.postgresql.columnTypes;
  return [...base, ...enums.map((e) => e.name)];
}
