import { memo } from "react";
import { EdgeLabelRenderer, Position, getSmoothStepPath } from "reactflow";

import { CARDINALITY_ENDPOINTS } from "../lib/dbTypes";

// A small pill placed just off a table's edge, naming which side of the
// relationship it is ("1" or "n") — the crow's-foot notation drawdb's plain
// default edge never showed.
function EndpointBadge({ x, y, position, label }) {
  const nudge = position === Position.Right ? 14 : position === Position.Left ? -14 : 0;
  return (
    <div
      className="relationship-edge__badge nodrag nopan"
      style={{ transform: `translate(-50%, -50%) translate(${x + nudge}px, ${y}px)` }}
    >
      {label}
    </div>
  );
}

// Custom edge for FK relationships: a right-angled, rounded-corner ERD-style
// connector (instead of React Flow's default free-floating bezier curve) with
// a brighter/thicker stroke, a "1"/"n" cardinality badge at each end, and a
// dashed overlay animated toward the target to show which way the
// relationship points.
function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });
  const [sourceLabel, targetLabel] = CARDINALITY_ENDPOINTS[data?.cardinality] || ["1", "n"];
  const flowClass = `relationship-edge__flow${selected ? " relationship-edge__flow--selected" : ""}`;
  const glowClass = `relationship-edge__glow${selected ? " relationship-edge__glow--selected" : ""}`;

  return (
    <>
      <path d={path} fill="none" strokeOpacity={0} strokeWidth={20} className="react-flow__edge-interaction" />
      <path id={id} d={path} fill="none" markerEnd={markerEnd} className={glowClass} />
      <path d={path} fill="none" className={flowClass} />
      <EdgeLabelRenderer>
        <EndpointBadge x={sourceX} y={sourceY} position={sourcePosition} label={sourceLabel} />
        <EndpointBadge x={targetX} y={targetY} position={targetPosition} label={targetLabel} />
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
