import { memo } from "react";
import { NodeResizer } from "reactflow";
import { X } from "lucide-react";

const MIN_AREA_WIDTH = 160;
const MIN_AREA_HEIGHT = 120;

function AreaNode({ data, selected }) {
  const { area, onUpdateArea, onDeleteArea } = data;

  return (
    <div
      className="area-node"
      style={{
        width: area.width,
        height: area.height,
        borderColor: area.color,
        backgroundColor: `${area.color}1a`,
      }}
    >
      <NodeResizer
        color={area.color}
        isVisible={selected}
        minWidth={MIN_AREA_WIDTH}
        minHeight={MIN_AREA_HEIGHT}
        onResize={(_, params) =>
          onUpdateArea(area.id, {
            width: params.width,
            height: params.height,
            position: { x: params.x, y: params.y },
          })
        }
      />
      <div className="area-node__header">
        <input
          type="color"
          className="area-node__swatch nodrag"
          value={area.color}
          onChange={(e) => onUpdateArea(area.id, { color: e.target.value })}
          title="Area color"
        />
        <input
          className="area-node__name nodrag"
          value={area.name}
          onChange={(e) => onUpdateArea(area.id, { name: e.target.value })}
        />
        <button className="area-node__delete nodrag" title="Delete area" onClick={() => onDeleteArea(area.id)}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default memo(AreaNode);
