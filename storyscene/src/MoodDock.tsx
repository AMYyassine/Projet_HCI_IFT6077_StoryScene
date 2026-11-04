import { useState } from "react";
import { Plus, Grip, Paintbrush, X } from "lucide-react";
import { Person } from "./SceneArt";
import { normalizedMood, uid } from "./model";
import type { Story, Character, Mood } from "./model";
import type { StartDrag } from "./useDirectDrag";
export function MoodDock({
  story,
  selectedTitle,
  onApply,
  onCharacter,
  onAddMood,
  onAddCharacter,
  onSavePreset,
  startDrag,
}: {
  story: Story;
  startDrag: StartDrag;
  selectedTitle: string;
  onApply: (mood: Record<string, number>) => void;
  onCharacter: (id: string) => void;
  onAddMood: (mood: Mood) => void;
  onAddCharacter: (c: Character) => void;
  onSavePreset: (preset: {
    id: string;
    name: string;
    mix: Record<string, number>;
  }) => void;
}) {
  const [mix, setMix] = useState<Record<string, number>>({
    tension: 50,
    mystery: 30,
    hope: 20,
  });
  const presets = story.moodPresets;
  const [adding, setAdding] = useState<"mood" | "character" | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a58abc");
  const weights = normalizedMood(mix);
  const toggle = (id: string) =>
    setMix((m) =>
      m[id]
        ? Object.fromEntries(Object.entries(m).filter(([k]) => k !== id))
        : { ...m, [id]: 35 },
    );
  return (
    <div className="creative-dock">
      <section className="cast-palette">
        <div className="dock-heading">
          <span>CHARACTERS</span>
          <button
            className="icon-button"
            aria-label="Create character"
            onClick={() => {
              setAdding("character");
              setName("");
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="character-tray">
          {story.characters.map((c) => (
            <button
              className="character-chip"
              key={c.id}
              draggable={false}
              onPointerDown={(e) => startDrag(e, "character", c.id, c.name)}
              onClick={() => onCharacter(c.id)}
              title={`Drag ${c.name} into a scene, or click to add to the selected scene`}
            >
              <span className="portrait" style={{ background: `${c.color}25` }}>
                <Person character={c} portrait />
              </span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
        <span className="dock-hint">
          <Grip size={11} /> Drag into a scene
        </span>
      </section>
      <section className="mood-palette">
        <div className="dock-heading">
          <span>MOOD PALETTE</span>
          <button
            className="icon-button"
            aria-label="Create mood"
            onClick={() => {
              setAdding("mood");
              setName("");
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="mood-palette-content">
          <div className="mood-wheel" aria-label="Select moods to blend">
            {story.moods.map((m, i) => {
              const angle =
                (i / story.moods.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <button
                  key={m.id}
                  aria-label={`Toggle ${m.name}`}
                  aria-pressed={!!mix[m.id]}
                  title={m.name}
                  className={`wheel-dot ${mix[m.id] ? "chosen" : ""}`}
                  style={{
                    background: m.color,
                    left: 51 + 39 * Math.cos(angle),
                    top: 51 + 39 * Math.sin(angle),
                  }}
                  onClick={() => toggle(m.id)}
                />
              );
            })}
            <Paintbrush size={17} />
          </div>
          <div className="mood-legend">
            {story.moods.map((m) => (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={mix[m.id] ? "enabled" : ""}
              >
                <i style={{ background: m.color }} />
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="mix-palette">
        <div className="dock-heading">
          <span>YOUR BLEND</span>
          <span className="quiet">Combine atmospheres</span>
        </div>
        <div className="mix-controls">
          <div className="mix-sliders">
            {Object.entries(mix).map(([id, n]) => {
              const mood = story.moods.find((m) => m.id === id);
              return (
                mood && (
                  <label key={id}>
                    <span>
                      <i style={{ background: mood.color }} />
                      {mood.name}
                    </span>
                    <input
                      aria-label={`${mood.name} weight`}
                      type="range"
                      min="1"
                      max="100"
                      value={n}
                      onChange={(e) =>
                        setMix({ ...mix, [id]: +e.target.value })
                      }
                    />
                    <b>{weights[id]}%</b>
                  </label>
                )
              );
            })}
            {!Object.keys(mix).length && (
              <p className="muted">Choose moods on the wheel.</p>
            )}
          </div>
          <div className="blend-actions">
            <button
              className="blend-token"
              draggable={false}
              onPointerDown={(e) =>
                Object.keys(mix).length &&
                startDrag(e, "mood", JSON.stringify(mix), "Your mood blend")
              }
              onClick={() => Object.keys(mix).length && onApply({ ...mix })}
              title={`Drag onto a scene, or apply to ${selectedTitle}`}
            >
              <span
                className="blend-preview"
                style={{
                  background: `conic-gradient(${
                    Object.entries(weights)
                      .flatMap(([id], i, arr) => {
                        const start = arr
                          .slice(0, i)
                          .reduce((s, [k]) => s + weights[k], 0);
                        return `${story.moods.find((m) => m.id === id)?.color || "#aaa"} ${start}% ${start + weights[id]}%`;
                      })
                      .join(",") || "#eee"
                  })`,
                }}
              />
              <span>
                Apply blend <Grip size={12} />
              </span>
            </button>
            <button
              className="text-button"
              disabled={!Object.keys(mix).length}
              onClick={() =>
                onSavePreset({
                  id: uid(),
                  name: `Blend ${presets.length + 1}`,
                  mix: { ...mix },
                })
              }
            >
              + Save blend
            </button>
          </div>
        </div>
        {!!presets.length && (
          <div className="saved-blends">
            {presets.map((p) => (
              <button
                key={p.id}
                draggable={false}
                onPointerDown={(e) =>
                  startDrag(e, "mood", JSON.stringify(p.mix), p.name)
                }
                onClick={() => setMix(p.mix)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </section>
      {adding && (
        <div className="dock-form">
          <button
            className="icon-button"
            onClick={() => setAdding(null)}
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
          <strong>New {adding}</strong>
          <input
            aria-label={`New ${adding} name`}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            aria-label="Color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <button
            className="button primary"
            disabled={!name.trim()}
            onClick={() => {
              if (adding === "mood")
                onAddMood({ id: uid(), name: name.trim(), color });
              else
                onAddCharacter({
                  id: uid(),
                  name: name.trim(),
                  color,
                  role: "New character",
                });
              setAdding(null);
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
