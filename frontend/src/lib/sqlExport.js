function quoteIdent(dbType, name) {
  if (dbType === "mysql" || dbType === "mariadb") return `\`${name}\``;
  if (dbType === "mssql") return `[${name}]`;
  return `"${name}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Only Postgres has a shared named enum type — everywhere else, the enum's
// values get baked directly into the column (MySQL/MariaDB's inline ENUM(...),
// or a text type plus a CHECK constraint where there's no enum type at all).
function fallbackEnumType(dbType) {
  if (dbType === "oracle") return "VARCHAR2(255)";
  if (dbType === "mssql") return "NVARCHAR(255)";
  return "TEXT";
}

function columnDefinition(dbType, column, isOnlyPk, enums = []) {
  const parts = [quoteIdent(dbType, column.name)];
  const matchingEnum = enums.find((e) => e.name === column.type);
  let type = column.type;
  let checkClause = null;

  if (matchingEnum) {
    if (dbType === "mysql" || dbType === "mariadb") {
      type = `ENUM(${matchingEnum.values.map(quoteLiteral).join(", ")})`;
    } else if (dbType !== "postgresql") {
      type = fallbackEnumType(dbType);
      if (matchingEnum.values.length > 0) {
        checkClause = `CHECK (${quoteIdent(dbType, column.name)} IN (${matchingEnum.values.map(quoteLiteral).join(", ")}))`;
      }
    }
    // Postgres keeps `type` as the enum's own name — it's declared as a
    // shared CREATE TYPE elsewhere and referenced here like any other type.
  }

  if (column.pk && column.autoIncrement) {
    if (dbType === "postgresql") {
      type = type === "BIGINT" ? "BIGSERIAL" : "SERIAL";
    } else if (dbType === "sqlite" && isOnlyPk && type === "INTEGER") {
      parts.push("INTEGER");
      parts.push("PRIMARY KEY AUTOINCREMENT");
      return parts.join(" ");
    }
  }

  parts.push(type);

  if ((dbType === "mysql" || dbType === "mariadb") && column.pk && column.autoIncrement) {
    parts.push("AUTO_INCREMENT");
  }
  if (dbType === "mssql" && column.pk && column.autoIncrement) {
    parts.push("IDENTITY(1,1)");
  }
  if (dbType === "oracle" && column.pk && column.autoIncrement) {
    parts.push("GENERATED ALWAYS AS IDENTITY");
  }
  if (column.notNull || column.pk) parts.push("NOT NULL");
  if (column.unique && !column.pk) parts.push("UNIQUE");
  if (column.defaultValue) parts.push(`DEFAULT ${column.defaultValue}`);
  if (checkClause) parts.push(checkClause);

  return parts.join(" ");
}

function tableToSQL(dbType, table, enums) {
  const pkColumns = table.columns.filter((c) => c.pk);
  const isOnlyPk = pkColumns.length === 1;
  const skipSeparatePk =
    dbType === "sqlite" && isOnlyPk && pkColumns[0].autoIncrement && pkColumns[0].type === "INTEGER";

  const lines = table.columns.map((col) => ({ text: columnDefinition(dbType, col, isOnlyPk, enums), note: col.note }));
  if (pkColumns.length > 0 && !skipSeparatePk) {
    const pkList = pkColumns.map((c) => quoteIdent(dbType, c.name)).join(", ");
    lines.push({ text: `PRIMARY KEY (${pkList})`, note: null });
  }

  const body = lines
    .map((line, i) => {
      const comma = i < lines.length - 1 ? "," : "";
      const comment = line.note ? ` -- ${line.note}` : "";
      return `  ${line.text}${comma}${comment}`;
    })
    .join("\n");

  return `CREATE TABLE ${quoteIdent(dbType, table.name)} (\n${body}\n);`;
}

// Composite keys and general indexes share the same DDL shape across every
// dialect this app supports, so unlike columnDefinition this needs no
// per-dialect branching beyond identifier quoting.
function indexesToSQL(dbType, table) {
  return (table.indexes || [])
    .filter((idx) => idx.columnIds.length > 0)
    .map((idx, i) => {
      const cols = idx.columnIds
        .map((cid) => table.columns.find((c) => c.id === cid))
        .filter(Boolean)
        .map((c) => quoteIdent(dbType, c.name))
        .join(", ");
      if (!cols) return null;
      const name = idx.name || `idx_${table.name}_${i + 1}`;
      const uniqueKeyword = idx.unique ? "UNIQUE " : "";
      return `CREATE ${uniqueKeyword}INDEX ${quoteIdent(dbType, name)} ON ${quoteIdent(dbType, table.name)} (${cols});`;
    })
    .filter(Boolean);
}

function enumsToSQL(dbType, enums, tables) {
  if (dbType !== "postgresql" || enums.length === 0) return [];
  const usedNames = new Set();
  tables.forEach((t) => t.columns.forEach((c) => usedNames.add(c.type)));
  return enums
    .filter((e) => usedNames.has(e.name) && e.values.length > 0)
    .map((e) => `CREATE TYPE ${e.name} AS ENUM (${e.values.map(quoteLiteral).join(", ")});`);
}

function referentialActionClause(rel) {
  const parts = [];
  if (rel.updateConstraint && rel.updateConstraint !== "No action") {
    parts.push(`ON UPDATE ${rel.updateConstraint.toUpperCase()}`);
  }
  if (rel.deleteConstraint && rel.deleteConstraint !== "No action") {
    parts.push(`ON DELETE ${rel.deleteConstraint.toUpperCase()}`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function relationshipToSQL(dbType, rel, tablesById) {
  const targetTable = tablesById.get(rel.targetTableId);
  const sourceTable = tablesById.get(rel.sourceTableId);
  if (!targetTable || !sourceTable) return null;

  const targetColumn = targetTable.columns.find((c) => c.id === rel.targetColumnId);
  const sourceColumn = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
  if (!targetColumn || !sourceColumn) return null;

  const constraintName = `fk_${targetTable.name}_${targetColumn.name}_${sourceTable.name}`;
  const targetTableIdent = quoteIdent(dbType, targetTable.name);
  const targetColIdent = quoteIdent(dbType, targetColumn.name);
  const sourceTableIdent = quoteIdent(dbType, sourceTable.name);
  const sourceColIdent = quoteIdent(dbType, sourceColumn.name);
  const actionClause = referentialActionClause(rel);

  return {
    inline: `  FOREIGN KEY (${targetColIdent}) REFERENCES ${sourceTableIdent}(${sourceColIdent})${actionClause}`,
    alter: `ALTER TABLE ${targetTableIdent} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${targetColIdent}) REFERENCES ${sourceTableIdent}(${sourceColIdent})${actionClause};`,
    targetTableId: rel.targetTableId,
  };
}

export function generateSQL(diagram, dbType) {
  const tables = diagram?.tables || [];
  const relationships = diagram?.relationships || [];
  const enums = diagram?.enums || [];
  if (tables.length === 0) return "-- No tables yet. Add a table to get started.";

  const tablesById = new Map(tables.map((t) => [t.id, t]));
  const enumStatements = enumsToSQL(dbType, enums, tables);
  const statements = tables.map((table) => tableToSQL(dbType, table, enums));
  const indexStatements = tables.flatMap((table) => indexesToSQL(dbType, table));

  if (dbType === "sqlite") {
    // SQLite needs foreign keys embedded inline at table creation time.
    const relsByTarget = new Map();
    relationships.forEach((rel) => {
      const built = relationshipToSQL(dbType, rel, tablesById);
      if (!built) return;
      const list = relsByTarget.get(built.targetTableId) || [];
      list.push(built.inline);
      relsByTarget.set(built.targetTableId, list);
    });

    const rebuilt = tables.map((table) => {
      const base = tableToSQL(dbType, table, enums).replace(/\n\);$/, "");
      const fks = relsByTarget.get(table.id);
      if (!fks || fks.length === 0) return base + "\n);";
      return base + ",\n" + fks.join(",\n") + "\n);";
    });
    return [...enumStatements, ...rebuilt, ...indexStatements].join("\n\n");
  }

  const alters = relationships
    .map((rel) => relationshipToSQL(dbType, rel, tablesById))
    .filter(Boolean)
    .map((r) => r.alter);

  return [...enumStatements, ...statements, ...indexStatements, ...alters].join("\n\n");
}
