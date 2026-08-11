import dagre from "dagre";

// Generously overestimates each table's rendered size so dagre's spacing
// is measured against a box at least as big as the real card — an
// undersized estimate is what causes cards to visually touch or overlap.
const NODE_WIDTH = 360;
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 30;
const FOOTER_HEIGHT = 40;
const EXTRA_PADDING = 30;

function estimateHeight(table) {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + FOOTER_HEIGHT + EXTRA_PADDING;
}

/**
 * Lays out nodes with dagre based on the current relationships, then
 * returns new node objects with updated positions (everything else
 * about each node is preserved).
 */
export function autoLayout(nodes, edges, direction = "TB") {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: direction, nodesep: 140, ranksep: 220, marginx: 60, marginy: 60 });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH + EXTRA_PADDING, height: estimateHeight(node.data.table) });
  });
  edges.forEach((edge) => {
    if (edge.source !== edge.target) graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const pos = graph.node(node.id);
    if (!pos) return node;
    return { ...node, position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 } };
  });
}
