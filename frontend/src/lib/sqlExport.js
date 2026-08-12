function quoteIdent(dbType, name) {
  if (dbType === "mysql") return `\`${name}\``;
  return `"${name}"`;
}

function columnDefinition(dbType, column, isOnlyPk) {
  const parts = [quoteIdent(dbType, column.name)];
  let type = column.type;

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

  if (dbType === "mysql" && column.pk && column.autoIncrement) {
    parts.push("AUTO_INCREMENT");
  }
  if (column.notNull || column.pk) parts.push("NOT NULL");
  if (column.unique && !column.pk) parts.push("UNIQUE");
  if (column.defaultValue) parts.push(`DEFAULT ${column.defaultValue}`);

  return parts.join(" ");
}

function tableToSQL(dbType, table) {
  const pkColumns = table.columns.filter((c) => c.pk);
  const isOnlyPk = pkColumns.length === 1;
  const skipSeparatePk =
    dbType === "sqlite" && isOnlyPk && pkColumns[0].autoIncrement && pkColumns[0].type === "INTEGER";

  const lines = table.columns.map((col) => ({ text: columnDefinition(dbType, col, isOnlyPk), note: col.note }));
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
  if (tables.length === 0) return "-- No tables yet. Add a table to get started.";

  const tablesById = new Map(tables.map((t) => [t.id, t]));
  const statements = tables.map((table) => tableToSQL(dbType, table));

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
      const base = tableToSQL(dbType, table).replace(/\n\);$/, "");
      const fks = relsByTarget.get(table.id);
      if (!fks || fks.length === 0) return base + "\n);";
      return base + ",\n" + fks.join(",\n") + "\n);";
    });
    return rebuilt.join("\n\n");
  }

  const alters = relationships
    .map((rel) => relationshipToSQL(dbType, rel, tablesById))
    .filter(Boolean)
    .map((r) => r.alter);

  return [...statements, ...alters].join("\n\n");
}
