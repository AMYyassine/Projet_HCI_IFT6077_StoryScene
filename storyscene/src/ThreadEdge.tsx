import { BaseEdge, EdgeLabelRenderer } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

// Route across the space between cards, preserving the illustrations beneath.
export function ThreadEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const close =
    Math.abs(sourceY - targetY) < 12 &&
    targetX > sourceX &&
    targetX - sourceX < 75;
  const midY =
    Math.abs(targetY - sourceY) > 100
      ? (sourceY + targetY) / 2
      : Math.min(sourceY, targetY) - 120;
  const sx = sourceX + 14,
    tx = targetX - 14;
  const path = close
    ? `M${sourceX},${sourceY} L${targetX},${targetY}`
    : `M${sourceX},${sourceY} L${sx},${sourceY} L${sx},${midY} L${tx},${midY} L${tx},${targetY} L${targetX},${targetY}`;
  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ ...style, strokeLinejoin: "round", strokeLinecap: "round" }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="thread-label nodrag nopan"
            style={{
              transform: `translate(-50%,-50%) translate(${(sourceX + targetX) / 2}px,${close ? sourceY : midY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
