import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { Ellipsis, AlertCircle, Plus } from "lucide-react";
import type { Scene, Story } from "./model";
import { SceneBackground, Person } from "./SceneArt";
import type { StartDrag } from "./useDirectDrag";

export type SceneNodeData = {
  scene: Scene;
  story: Story;
  index: number;
  active: boolean;
  related: boolean;
  select: (id: string) => void;
  inspect: (id: string) => void;
  drop: (id: string, kind: string, value: string, x: number) => void;
  startDrag: StartDrag;
};
export type FlowScene = Node<SceneNodeData, "scene">;
export function SceneNode({ data }: NodeProps<FlowScene>) {
  const {
    scene,
    story,
    index,
    active,
    related,
    select,
    inspect,
    drop,
    startDrag,
  } = data;
  const moods = Object.entries(scene.mood)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <div
      className={`scene-card ${active ? "active" : ""} ${related ? "related" : ""}`}
      onClick={() => select(scene.id)}
    >
      <Handle type="target" position={Position.Left} className="scene-handle" />
      <div className="scene-drag-handle">
        <span className="scene-number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="scene-title">{scene.title}</span>
        {scene.needsReview && (
          <AlertCircle
            size={12}
            className="review-indicator"
            aria-label="Needs review"
          />
        )}
        <button
          className="icon-button nodrag"
          aria-label={`Edit ${scene.title}`}
          onClick={(e) => {
            e.stopPropagation();
            inspect(scene.id);
          }}
        >
          <Ellipsis size={16} />
        </button>
      </div>
      <div
        className="scene-stage nodrag"
        data-scene-id={scene.id}
        onDoubleClick={() => inspect(scene.id)}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("drop-active");
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove("drop-active")}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drop-active");
          const kind = e.dataTransfer.getData("storyscene-kind"),
            value = e.dataTransfer.getData("storyscene-value");
          const rect = e.currentTarget.getBoundingClientRect();
          if (kind && value)
            drop(
              scene.id,
              kind,
              value,
              Math.max(
                15,
                Math.min(85, ((e.clientX - rect.left) / rect.width) * 100),
              ),
            );
        }}
      >
        <SceneBackground kind={scene.art} />
        {scene.cast.map((member) => {
          const c = story.characters.find((c) => c.id === member.characterId);
          return (
            c && (
              <button
                key={c.id}
                className="scene-person nodrag"
                style={{ left: `${member.x}%` }}
                draggable={false}
                onPointerDown={(e) => startDrag(e, "character", c.id, c.name)}
                aria-label={`${c.name}: ${member.action}. Drag to position.`}
                title={`${c.name} · ${member.action}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData("storyscene-kind", "character");
                  e.dataTransfer.setData("storyscene-value", c.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  inspect(scene.id);
                }}
              >
                <Person character={c} />
              </button>
            )
          );
        })}
        {!scene.cast.length && (
          <div className="empty-cast">Drop a character here</div>
        )}
        <div
          className="scene-mood-wash"
          style={{
            background:
              story.moods.find((m) => m.id === moods[0]?.[0])?.color ||
              "transparent",
          }}
        />
      </div>
      <div className="scene-caption">
        <span>{scene.mainAction}</span>
        <button
          className="icon-button nodrag"
          onClick={(e) => {
            e.stopPropagation();
            inspect(scene.id);
          }}
          aria-label={`Add an event to ${scene.title}`}
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="scene-mood-strip">
        {moods.map(([id, weight]) => (
          <span
            key={id}
            style={{
              background: story.moods.find((m) => m.id === id)?.color,
              flex: weight,
            }}
          />
        ))}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="scene-handle"
      />
    </div>
  );
}
