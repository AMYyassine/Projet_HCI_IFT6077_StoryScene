export type ArtKind =
  | "house"
  | "garden"
  | "attic"
  | "letter"
  | "photo"
  | "desk"
  | "cafe"
  | "confession"
  | "farewell"
  | "train";
export type Character = {
  id: string;
  name: string;
  color: string;
  role: string;
};
export type Paragraph = { id: string; text: string };
export type Anchor = { paragraphId: string; quote: string };
export type Mood = { id: string; name: string; color: string };
export type CastMember = { characterId: string; action: string; x: number };
export type Scene = {
  id: string;
  actId: string;
  title: string;
  mainAction: string;
  cast: CastMember[];
  anchors: Anchor[];
  events: string[];
  mood: Record<string, number>;
  art: ArtKind;
  needsReview: boolean;
};
export type Link = {
  id: string;
  source: string;
  target: string;
  type: "causes" | "prepares";
  reason: string;
};
export type Story = {
  title: string;
  paragraphs: Paragraph[];
  characters: Character[];
  acts: { id: string; title: string }[];
  scenes: Scene[];
  links: Link[];
  moods: Mood[];
  moodPresets: { id: string; name: string; mix: Record<string, number> }[];
  positions: Record<string, { x: number; y: number }>;
};
export type Branch = {
  id: string;
  name: string;
  createdAt: string;
  forkLabel: string;
  story: Story;
};
export type Workspace = {
  schemaVersion: 1;
  id: string;
  activeBranchId: string;
  branches: Branch[];
};
export const uid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
export const clone = <T>(value: T): T => structuredClone(value);
export const currentStory = (workspace: Workspace) =>
  workspace.branches.find((b) => b.id === workspace.activeBranchId)!.story;
export function newWorkspace(story: Story): Workspace {
  return {
    schemaVersion: 1,
    id: uid(),
    activeBranchId: "original",
    branches: [
      {
        id: "original",
        name: "Original story",
        createdAt: new Date().toISOString(),
        forkLabel: "Imported story",
        story,
      },
    ],
  };
}
export function descendants(story: Story, sceneId: string): string[] {
  const visited = new Set<string>([sceneId]);
  const queue = [sceneId];
  while (queue.length) {
    const source = queue.shift()!;
    for (const link of story.links.filter((l) => l.source === source)) {
      if (!visited.has(link.target)) {
        visited.add(link.target);
        queue.push(link.target);
      }
    }
  }
  return [...visited].filter((id) => id !== sceneId);
}
export function ancestors(story: Story, sceneId: string): string[] {
  return descendants(
    {
      ...story,
      links: story.links.map((l) => ({
        ...l,
        source: l.target,
        target: l.source,
      })),
    },
    sceneId,
  );
}
export function normalizedMood(mood: Record<string, number>) {
  const total = Object.values(mood).reduce((sum, n) => sum + n, 0);
  return Object.fromEntries(
    Object.entries(mood)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => [id, Math.round((n / (total || 1)) * 100)]),
  );
}
export function branchWorkspace(
  workspace: Workspace,
  name: string,
  forkLabel: string,
): Workspace {
  const next = clone(workspace);
  const id = uid();
  next.branches.push({
    id,
    name,
    createdAt: new Date().toISOString(),
    forkLabel,
    story: clone(currentStory(workspace)),
  });
  next.activeBranchId = id;
  return next;
}
export function deleteScene(story: Story, id: string): Story {
  const affected = new Set(descendants(story, id));
  return {
    ...story,
    scenes: story.scenes
      .filter((s) => s.id !== id)
      .map((s) => (affected.has(s.id) ? { ...s, needsReview: true } : s)),
    links: story.links.filter((l) => l.source !== id && l.target !== id),
  };
}
export function replaceSceneText(
  story: Story,
  sceneId: string,
  text: string,
): Story {
  const next = clone(story);
  const scene = next.scenes.find((s) => s.id === sceneId)!;
  if (scene.anchors.length !== 1)
    throw new Error(
      "This scene spans several passages. Edit those passages in the manuscript to preserve their context.",
    );
  const anchor = scene.anchors[0];
  const paragraph = next.paragraphs.find((p) => p.id === anchor.paragraphId);
  if (!paragraph || !paragraph.text.includes(anchor.quote))
    throw new Error(
      "The source passage has changed. Remap the scene before replacing its text.",
    );
  const shared = next.scenes.some(
    (s) =>
      s.id !== sceneId &&
      s.anchors.some(
        (a) =>
          a.paragraphId === anchor.paragraphId &&
          (anchor.quote.includes(a.quote) || a.quote.includes(anchor.quote)),
      ),
  );
  if (shared)
    throw new Error(
      "This passage is shared with another scene. Edit it in the manuscript and review both scene mappings.",
    );
  paragraph.text = paragraph.text.replace(anchor.quote, text);
  anchor.quote = text;
  const affected = new Set(descendants(next, sceneId));
  next.scenes = next.scenes.map((s) =>
    s.id === sceneId || affected.has(s.id) ? { ...s, needsReview: true } : s,
  );
  return next;
}
// Import is deliberately strict: imported labels are data, never rendered as HTML.
export function parseWorkspace(text: string): Workspace {
  const w: unknown = JSON.parse(text);
  const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const str = (v: unknown): v is string => typeof v === "string";
  const fail = () => {
    throw new Error("This file is not a valid Storyscene project.");
  };
  if (
    !obj(w) ||
    w.schemaVersion !== 1 ||
    !str(w.id) ||
    !str(w.activeBranchId) ||
    !Array.isArray(w.branches) ||
    !w.branches.length
  )
    return fail();
  const unique = (items: { id: string }[]) =>
    new Set(items.map((i) => i.id)).size === items.length;
  for (const b of w.branches) {
    if (
      !obj(b) ||
      !str(b.id) ||
      !str(b.name) ||
      !str(b.createdAt) ||
      !str(b.forkLabel) ||
      !obj(b.story)
    )
      return fail();
    const s = b.story;
    if (
      !str(s.title) ||
      !Array.isArray(s.paragraphs) ||
      !Array.isArray(s.characters) ||
      !Array.isArray(s.acts) ||
      !Array.isArray(s.scenes) ||
      !Array.isArray(s.links) ||
      !Array.isArray(s.moods) ||
      !obj(s.positions)
    )
      return fail();
    if (s.moodPresets === undefined) s.moodPresets = [];
    if (!Array.isArray(s.moodPresets)) return fail();
    for (const p of s.paragraphs)
      if (!obj(p) || !str(p.id) || !str(p.text)) return fail();
    for (const c of s.characters)
      if (
        !obj(c) ||
        !str(c.id) ||
        !str(c.name) ||
        !str(c.role) ||
        !str(c.color) ||
        !/^#[0-9a-f]{6}$/i.test(c.color)
      )
        return fail();
    for (const a of s.acts)
      if (!obj(a) || !str(a.id) || !str(a.title)) return fail();
    for (const m of s.moods)
      if (
        !obj(m) ||
        !str(m.id) ||
        !str(m.name) ||
        !str(m.color) ||
        !/^#[0-9a-f]{6}$/i.test(m.color)
      )
        return fail();
    const paragraphs = new Map(
      (s.paragraphs as Paragraph[]).map((p) => [p.id, p.text]),
    );
    const castIds = new Set((s.characters as Character[]).map((c) => c.id));
    const actIds = new Set((s.acts as { id: string }[]).map((a) => a.id));
    const moodIds = new Set((s.moods as Mood[]).map((m) => m.id));
    for (const preset of s.moodPresets) {
      if (
        !obj(preset) ||
        !str(preset.id) ||
        !str(preset.name) ||
        !obj(preset.mix)
      )
        return fail();
      for (const [id, n] of Object.entries(preset.mix))
        if (
          !moodIds.has(id) ||
          typeof n !== "number" ||
          !Number.isFinite(n) ||
          n < 0 ||
          n > 100
        )
          return fail();
    }
    for (const sc of s.scenes) {
      if (
        !obj(sc) ||
        !str(sc.id) ||
        !str(sc.title) ||
        !str(sc.actId) ||
        !actIds.has(sc.actId) ||
        !str(sc.mainAction) ||
        !Array.isArray(sc.cast) ||
        !Array.isArray(sc.anchors) ||
        !Array.isArray(sc.events) ||
        !sc.events.every(str) ||
        !obj(sc.mood) ||
        typeof sc.needsReview !== "boolean" ||
        ![
          "house",
          "garden",
          "attic",
          "letter",
          "photo",
          "desk",
          "cafe",
          "confession",
          "farewell",
          "train",
        ].includes(String(sc.art))
      )
        return fail();
      for (const c of sc.cast)
        if (
          !obj(c) ||
          !str(c.characterId) ||
          !castIds.has(c.characterId) ||
          !str(c.action) ||
          typeof c.x !== "number" ||
          !Number.isFinite(c.x) ||
          c.x < 0 ||
          c.x > 100
        )
          return fail();
      if (
        new Set((sc.cast as CastMember[]).map((c) => c.characterId)).size !==
        sc.cast.length
      )
        return fail();
      for (const a of sc.anchors)
        if (
          !obj(a) ||
          !str(a.paragraphId) ||
          !paragraphs.has(a.paragraphId) ||
          !str(a.quote) ||
          !a.quote
        )
          return fail();
      for (const [id, n] of Object.entries(sc.mood))
        if (
          !moodIds.has(id) ||
          typeof n !== "number" ||
          !Number.isFinite(n) ||
          n < 0 ||
          n > 100
        )
          return fail();
    }
    const sceneIds = new Set((s.scenes as Scene[]).map((sc) => sc.id));
    if ([...sceneIds].some((id) => actIds.has(id))) return fail();
    for (const l of s.links)
      if (
        !obj(l) ||
        !str(l.id) ||
        !str(l.source) ||
        !str(l.target) ||
        !sceneIds.has(l.source) ||
        !sceneIds.has(l.target) ||
        l.source === l.target ||
        !["causes", "prepares"].includes(String(l.type)) ||
        !str(l.reason)
      )
        return fail();
    for (const p of Object.values(s.positions))
      if (
        !obj(p) ||
        typeof p.x !== "number" ||
        !Number.isFinite(p.x) ||
        typeof p.y !== "number" ||
        !Number.isFinite(p.y)
      )
        return fail();
    for (const items of [
      s.scenes,
      s.acts,
      s.characters,
      s.paragraphs,
      s.moods,
      s.links,
    ])
      if (!unique(items as { id: string }[])) return fail();
    for (const sc of s.scenes as Scene[])
      if (
        sc.anchors.some(
          (a) => !paragraphs.get(a.paragraphId)?.includes(a.quote),
        )
      )
        sc.needsReview = true;
  }
  if (
    !unique(w.branches as Branch[]) ||
    !w.branches.some((b) => b.id === w.activeBranchId)
  )
    return fail();
  return w as Workspace;
}
