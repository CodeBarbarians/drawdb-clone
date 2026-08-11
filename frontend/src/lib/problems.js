export function computeProblems(tables, relationships) {
  const problems = [];
  const nameCounts = new Map();

  tables.forEach((table) => {
    const key = table.name.trim().toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);

    if (!table.name.trim()) {
      problems.push({ id: `${table.id}-noname`, severity: "error", message: "Table has no name" });
    }
    if (!table.columns.some((c) => c.pk)) {
      problems.push({ id: `${table.id}-nopk`, severity: "warning", message: `"${table.name}" has no primary key` });
    }

    const colCounts = new Map();
    table.columns.forEach((col) => {
      const colKey = col.name.trim().toLowerCase();
      colCounts.set(colKey, (colCounts.get(colKey) || 0) + 1);
      if (!col.name.trim()) {
        problems.push({ id: `${col.id}-noname`, severity: "error", message: `"${table.name}" has an unnamed column` });
      }
    });
    colCounts.forEach((count, colKey) => {
      if (count > 1) {
        problems.push({
          id: `${table.id}-dupcol-${colKey}`,
          severity: "error",
          message: `"${table.name}" has duplicate column "${colKey}"`,
        });
      }
    });
  });

  nameCounts.forEach((count, key) => {
    if (count > 1) {
      problems.push({ id: `dup-table-${key}`, severity: "error", message: `Duplicate table name "${key}"` });
    }
  });

  const tableIds = new Set(tables.map((t) => t.id));
  relationships.forEach((rel) => {
    if (!tableIds.has(rel.sourceTableId) || !tableIds.has(rel.targetTableId)) {
      problems.push({ id: `${rel.id}-orphan`, severity: "error", message: "Relationship references a missing table" });
    }
  });

  return problems;
}
