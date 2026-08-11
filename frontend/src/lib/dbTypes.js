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
