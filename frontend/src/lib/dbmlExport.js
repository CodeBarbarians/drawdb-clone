function formatDefault(value) {
  if (/^-?\d+(\.\d+)?$/.test(value) || /^(true|false|null)$/i.test(value)) return value;
  return `'${value.replace(/'/g, "\\'")}'`;
}

function columnToDBML(column) {
  const settings = [];
  if (column.pk) settings.push("pk");
  if (column.autoIncrement) settings.push("increment");
  if (column.notNull && !column.pk) settings.push("not null");
  if (column.unique && !column.pk) settings.push("unique");
  if (column.defaultValue) settings.push(`default: ${formatDefault(column.defaultValue)}`);
  if (column.note) settings.push(`note: '${column.note.replace(/'/g, "\\'")}'`);

  const settingsText = settings.length > 0 ? ` [${settings.join(", ")}]` : "";
  return `  ${column.name} ${column.type}${settingsText}`;
}

function tableToDBML(table) {
  const body = table.columns.map(columnToDBML).join("\n");
  return `Table ${table.name} {\n${body}\n}`;
}

function referentialActionSettings(rel) {
  const parts = [];
  if (rel.updateConstraint && rel.updateConstraint !== "No action") {
    parts.push(`update: ${rel.updateConstraint.toLowerCase()}`);
  }
  if (rel.deleteConstraint && rel.deleteConstraint !== "No action") {
    parts.push(`delete: ${rel.deleteConstraint.toLowerCase()}`);
  }
  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

function relationshipToDBML(rel, tablesById) {
  const targetTable = tablesById.get(rel.targetTableId);
  const sourceTable = tablesById.get(rel.sourceTableId);
  if (!targetTable || !sourceTable) return null;

  const targetColumn = targetTable.columns.find((c) => c.id === rel.targetColumnId);
  const sourceColumn = sourceTable.columns.find((c) => c.id === rel.sourceColumnId);
  if (!targetColumn || !sourceColumn) return null;

  return `Ref: ${targetTable.name}.${targetColumn.name} > ${sourceTable.name}.${sourceColumn.name}${referentialActionSettings(rel)}`;
}

export function generateDBML(diagram) {
  const tables = diagram?.tables || [];
  const relationships = diagram?.relationships || [];
  if (tables.length === 0) return "// No tables yet. Add a table to get started.";

  const tablesById = new Map(tables.map((t) => [t.id, t]));
  const tableBlocks = tables.map(tableToDBML);
  const refs = relationships.map((rel) => relationshipToDBML(rel, tablesById)).filter(Boolean);

  return [...tableBlocks, ...refs].join("\n\n");
}
