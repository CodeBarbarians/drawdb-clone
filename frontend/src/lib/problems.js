export function computeProblems(tables, relationships, enums = []) {
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
    const colIds = new Set(table.columns.map((c) => c.id));
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

    const idxNameCounts = new Map();
    (table.indexes || []).forEach((idx) => {
      if (idx.columnIds.some((cid) => !colIds.has(cid))) {
        problems.push({
          id: `${idx.id}-orphan`,
          severity: "error",
          message: `"${table.name}" has an index referencing a missing column`,
        });
      }
      if (idx.name.trim()) {
        const idxKey = idx.name.trim().toLowerCase();
        idxNameCounts.set(idxKey, (idxNameCounts.get(idxKey) || 0) + 1);
      }
    });
    idxNameCounts.forEach((count, idxKey) => {
      if (count > 1) {
        problems.push({
          id: `${table.id}-dupidx-${idxKey}`,
          severity: "error",
          message: `"${table.name}" has duplicate index name "${idxKey}"`,
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

  const enumNameCounts = new Map();
  enums.forEach((enumDef) => {
    const key = enumDef.name.trim().toLowerCase();
    enumNameCounts.set(key, (enumNameCounts.get(key) || 0) + 1);

    if (enumDef.values.length === 0) {
      problems.push({ id: `${enumDef.id}-empty`, severity: "warning", message: `Enum "${enumDef.name}" has no values` });
    }
    const valueCounts = new Map();
    enumDef.values.forEach((v) => {
      const vKey = v.trim().toLowerCase();
      valueCounts.set(vKey, (valueCounts.get(vKey) || 0) + 1);
    });
    valueCounts.forEach((count, vKey) => {
      if (count > 1) {
        problems.push({
          id: `${enumDef.id}-dupval-${vKey}`,
          severity: "warning",
          message: `Enum "${enumDef.name}" has duplicate value "${vKey}"`,
        });
      }
    });
  });
  enumNameCounts.forEach((count, key) => {
    if (count > 1) {
      problems.push({ id: `dup-enum-${key}`, severity: "error", message: `Duplicate enum name "${key}"` });
    }
  });

  return problems;
}
