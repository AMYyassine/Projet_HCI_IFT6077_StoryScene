import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  applyNodeChanges,
} from "@xyflow/react";
import type {
  Connection,
  Edge,
  Node as FlowNode,
  NodeChange,
} from "@xyflow/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  GitBranch,
  HelpCircle,
  Link2,
  LoaderCircle,
  Maximize2,
  PanelRightClose,
  Plus,
  Redo2,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { demoWorkspace } from "./demo";
import {
  ancestors,
  branchWorkspace,
  clone,
  currentStory,
  deleteScene,
  descendants,
  newWorkspace,
  normalizedMood,
  parseWorkspace,
  replaceSceneText,
  uid,
} from "./model";
import type { ArtKind, Paragraph, Scene, Story, Workspace } from "./model";
import { SceneNode } from "./SceneNode";
import { StoryEditor } from "./StoryEditor";
import { MoodDock } from "./MoodDock";
import { useDirectDrag } from "./useDirectDrag";
import { ThreadEdge } from "./ThreadEdge";
import { Person } from "./SceneArt";
import {
  aiStatus,
  analyzeImpact,
  generateStory,
  loadWorkspace,
  rewriteScene,
  saveWorkspace,
} from "./api";
import type { AIStatus, Impact } from "./api";
import "@xyflow/react/dist/style.css";
import "./styles.css";

const STORAGE = "storyscene-workspace-v1";
function initialWorkspace() {
  try {
    const saved = localStorage.getItem(STORAGE);
    if (saved) return parseWorkspace(saved);
  } catch {
    /* Leave recovery available through exported files. */
  }
  return demoWorkspace();
}
function ActNode({ data }: { data: Record<string, unknown> }) {
  return <div className="act-label">{String(data.label)}</div>;
}
const nodeTypes = { scene: SceneNode, act: ActNode };
const edgeTypes = { thread: ThreadEdge };
type Modal =
  "import" | "settings" | "help" | "branch" | "connect" | "impact" | null;
type Proposal = { sceneId: string; kind: "delete" | "text"; text: string };
type History = { past: Workspace[]; future: Workspace[] };

function App() {
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const story = currentStory(workspace);
  const [selectedId, setSelectedId] = useState("s7");
  const scene =
    story.scenes.find((s) => s.id === selectedId) ?? story.scenes[0];
  const [inspector, setInspector] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [saveState, setSaveState] = useState("Opening project…");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchScope, setBranchScope] = useState<"scene" | "act">("scene");
  const [sourceText, setSourceText] = useState("");
  const [actCount, setActCount] = useState(3);
  const [sceneCount, setSceneCount] = useState(10);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [removeText, setRemoveText] = useState(true);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [editText, setEditText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [aiRewrite, setAiRewrite] = useState<{
    text: string;
    explanation: string;
  } | null>(null);
  const [event, setEvent] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const [linkType, setLinkType] = useState<"causes" | "prepares">("causes");
  const [linkReason, setLinkReason] = useState("");
  const [showDependencies, setShowDependencies] = useState(true);
  const [fitRequest, setFitRequest] = useState(0);
  const fitRef = useRef<null | (() => void)>(null);
  const saveQueue = useRef(Promise.resolve());
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const branch = workspace.branches.find(
    (b) => b.id === workspace.activeBranchId,
  )!;
  const activeSceneId = scene?.id ?? "";
  const selectedSourceText =
    scene?.anchors.map((a) => a.quote).join("\n\n") ?? "";
  const affected = proposal ? descendants(story, proposal.sceneId) : [];
  const wordCount = story.paragraphs
    .map((p) => p.text)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  useEffect(() => {
    let live = true;
    Promise.allSettled([aiStatus(), loadWorkspace()]).then(
      ([config, saved]) => {
        if (!live) return;
        if (config.status === "fulfilled") setStatus(config.value);
        if (
          saved.status === "fulfilled" &&
          saved.value &&
          !localStorage.getItem(STORAGE)
        ) {
          try {
            setWorkspace(parseWorkspace(JSON.stringify(saved.value)));
          } catch {
            setToast(
              "The server project could not be opened. The demonstration is available.",
            );
          }
        }
        setReady(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      let browserSaved = false;
      try {
        localStorage.setItem(STORAGE, JSON.stringify(workspace));
        browserSaved = true;
      } catch {
        setToast(
          "Browser storage is full. Export your project to keep a copy.",
        );
      }
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(async () => {
          try {
            await saveWorkspace(workspace);
            setSaveState("Saved on this computer");
          } catch {
            setSaveState(
              browserSaved
                ? "Saved in this browser"
                : "Not saved — please export",
            );
          }
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [workspace, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setEditText(selectedSourceText);
    setAiRewrite(null);
    setInstruction("");
    setEvent("");
  }, [activeSceneId, workspace.activeBranchId, selectedSourceText]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]",
        ) ?? [],
      );
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setModal(null);
        return;
      }
      if (e.key === "Tab") {
        const all = focusable(),
          first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal, busy]);
  useEffect(() => {
    if (fitRequest) fitRef.current?.();
  }, [fitRequest]);

  const commit = useCallback((transform: (w: Workspace) => Workspace) => {
    const before = workspaceRef.current;
    const next = transform(clone(before));
    setHistory((h) => ({
      past: [...h.past.slice(-39), clone(before)],
      future: [],
    }));
    workspaceRef.current = next;
    setWorkspace(next);
  }, []);
  const updateStory = useCallback(
    (transform: (s: Story) => Story) =>
      commit((w) => {
        const b = w.branches.find((b) => b.id === w.activeBranchId)!;
        b.story = transform(b.story);
        return w;
      }),
    [commit],
  );
  const updateScene = useCallback(
    (id: string, change: Partial<Scene>, review = false) =>
      updateStory((s) => {
        const downstream = new Set(review ? descendants(s, id) : []);
        s.scenes = s.scenes.map((sc) =>
          sc.id === id
            ? { ...sc, ...change, needsReview: review || sc.needsReview }
            : downstream.has(sc.id)
              ? { ...sc, needsReview: true }
              : sc,
        );
        return s;
      }),
    [updateStory],
  );
  const undo = () => {
    if (!history.past.length) return;
    const prev = history.past.at(-1)!;
    setHistory({
      past: history.past.slice(0, -1),
      future: [workspace, ...history.future],
    });
    setWorkspace(prev);
  };
  const redo = () => {
    if (!history.future.length) return;
    const next = history.future[0];
    setHistory({
      past: [...history.past, workspace],
      future: history.future.slice(1),
    });
    setWorkspace(next);
  };
  const openModal = (m: Modal) => {
    setError("");
    setImpact(null);
    setModal(m);
  };
  const inspect = useCallback((id: string) => {
    setSelectedId(id);
    setInspector(true);
  }, []);
  const drop = useCallback(
    (id: string, kind: string, value: string, x: number) => {
      const s = currentStory(workspaceRef.current);
      const target = s.scenes.find((sc) => sc.id === id);
      if (!target) return;
      if (kind === "character" && s.characters.some((c) => c.id === value)) {
        const already = target.cast.some((c) => c.characterId === value);
        updateScene(
          id,
          {
            cast: already
              ? target.cast.map((c) =>
                  c.characterId === value ? { ...c, x } : c,
                )
              : [
                  ...target.cast,
                  {
                    characterId: value,
                    action: "Add an action for this character.",
                    x,
                  },
                ],
          },
          !already,
        );
        setToast(
          already
            ? "Character position updated."
            : "Character added. Review the source text and dependent scenes.",
        );
      } else if (kind === "mood") {
        try {
          const raw = JSON.parse(value);
          const valid = Object.fromEntries(
            Object.entries(raw).filter(
              ([key, n]) =>
                s.moods.some((m) => m.id === key) &&
                typeof n === "number" &&
                n >= 0 &&
                n <= 100,
            ),
          ) as Record<string, number>;
          if (Object.keys(valid).length) {
            updateScene(id, { mood: valid });
            setToast(
              "Mood blend applied. Use “Propose rewrite” to reflect it in the prose.",
            );
          }
        } catch {
          /* Invalid external drag payload is ignored. */
        }
      }
      setSelectedId(id);
    },
    [updateScene],
  );

  const directDrag = useDirectDrag(drop);
  const startDrag = directDrag.start;
  const relatedIds = useMemo(
    () =>
      new Set([
        ...ancestors(story, activeSceneId),
        ...descendants(story, activeSceneId),
      ]),
    [story, activeSceneId],
  );
  const layoutNodes = useMemo(() => {
    const nodes: FlowNode[] = [];
    let y = 0;
    story.acts.forEach((act, actIndex) => {
      const scenes = story.scenes.filter((s) => s.actId === act.id);
      const rows = Math.max(1, Math.ceil(scenes.length / 4));
      const height = 50 + rows * 210;
      const width = 1040;
      nodes.push({
        id: act.id,
        type: "act",
        position: { x: 0, y },
        data: {
          label: `ACT ${String(actIndex + 1).padStart(2, "0")}  ·  ${act.title}`,
        },
        style: {
          width,
          height,
          background: "rgba(249,248,246,.74)",
          border: "1px solid #e9e5e2",
          borderRadius: 18,
        },
        draggable: false,
        selectable: false,
      });
      scenes.forEach((sc, i) =>
        nodes.push({
          id: sc.id,
          type: "scene",
          parentId: act.id,
          extent: "parent",
          dragHandle: ".scene-drag-handle",
          position: story.positions[sc.id] ?? {
            x: 24 + (i % 4) * 252,
            y: 42 + Math.floor(i / 4) * 210,
          },
          data: {
            scene: sc,
            story,
            index: story.scenes.findIndex((s) => s.id === sc.id),
            active: sc.id === activeSceneId,
            related: relatedIds.has(sc.id),
            select: setSelectedId,
            inspect,
            drop,
            startDrag,
          },
        }),
      );
      y += height + 22;
    });
    return nodes;
  }, [story, activeSceneId, relatedIds, inspect, drop, startDrag]);
  const [nodes, setNodes] = useState<FlowNode[]>(layoutNodes);
  useEffect(() => setNodes(layoutNodes), [layoutNodes]);
  const edges = useMemo(() => {
    const edges: Edge[] = story.scenes.slice(1).map((sc, i) => ({
      id: `order-${i}`,
      source: story.scenes[i].id,
      target: sc.id,
      type: "thread",
      style: { stroke: "#cdc7d3", strokeWidth: 1.4, strokeDasharray: "4 5" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#cdc7d3" },
      selectable: false,
      zIndex: 0,
    }));
    if (showDependencies)
      for (const link of story.links) {
        const focus =
          link.source === activeSceneId || link.target === activeSceneId;
        edges.push({
          id: link.id,
          source: link.source,
          target: link.target,
          type: "thread",
          label: focus ? link.type : undefined,
          style: {
            stroke: focus ? "#8b72aa" : "#b8a6c6",
            strokeWidth: focus ? 2.4 : 1.3,
            opacity: focus ? 1 : 0.45,
          },
          labelStyle: { fill: "#79618d", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "#fbfaf8" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: focus ? "#8b72aa" : "#b8a6c6",
          },
          zIndex: focus ? 3 : 1,
          data: { reason: link.reason },
        });
      }
    return edges;
  }, [story, activeSceneId, showDependencies]);
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );
  const editParagraphs = useCallback(
    (paragraphs: Paragraph[]) =>
      updateStory((s) => {
        const invalid = s.scenes
          .filter((sc) =>
            sc.anchors.some(
              (a) =>
                !paragraphs
                  .find((p) => p.id === a.paragraphId)
                  ?.text.includes(a.quote),
            ),
          )
          .map((sc) => sc.id);
        const review = new Set(
          invalid.flatMap((id) => [id, ...descendants(s, id)]),
        );
        return {
          ...s,
          paragraphs,
          scenes: s.scenes.map((sc) =>
            review.has(sc.id) ? { ...sc, needsReview: true } : sc,
          ),
        };
      }),
    [updateStory],
  );
  const exportProject = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "storyscene"}.storyscene.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Project exported with all story versions.");
  };
  const importProject = async (file: File) => {
    try {
      if (file.size > 10_000_000)
        throw new Error("Please choose a project smaller than 10 MB.");
      const w = parseWorkspace(await file.text());
      commit(() => w);
      setSelectedId(currentStory(w).scenes[0]?.id ?? "");
      setModal(null);
      setToast("Project imported. Undo restores the previous project.");
      setTimeout(() => setFitRequest((n) => n + 1), 150);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const generate = async () => {
    setBusy("Mapping your story into scenes…");
    setError("");
    try {
      const result = await generateStory(sourceText, actCount, sceneCount);
      commit(() => newWorkspace(result));
      setSelectedId(result.scenes[0]?.id ?? "");
      setModal(null);
      setToast(
        "AI mapping imported. Review the proposed scenes and dependencies.",
      );
      setTimeout(() => setFitRequest((n) => n + 1), 150);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const propose = (kind: "delete" | "text") => {
    if (!scene) return;
    setProposal({ sceneId: scene.id, kind, text: editText });
    setRemoveText(true);
    openModal("impact");
  };
  const runAnalysis = async () => {
    if (!scene) return;
    setBusy("Checking narrative consequences…");
    setError("");
    try {
      setImpact(
        await analyzeImpact(
          story,
          proposal?.sceneId ?? scene.id,
          proposal
            ? proposal.kind === "delete"
              ? `Remove this scene${removeText ? " and its source passage" : ""}.`
              : `Replace its source prose with: ${proposal.text}`
            : "Review this scene against its current cast, actions, events, moods and source text. Explain continuity risks.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const applyProposal = () => {
    if (!proposal) return;
    try {
      if (proposal.kind === "text") {
        const result = replaceSceneText(story, proposal.sceneId, proposal.text);
        updateStory(() => result);
        setToast(
          "Scene text replaced. Dependent scenes are marked for review.",
        );
      } else {
        updateStory((s) => {
          const removed = s.scenes.find((sc) => sc.id === proposal.sceneId)!;
          let next = deleteScene(s, proposal.sceneId);
          if (removeText) {
            next.paragraphs = next.paragraphs.map((p) => ({
              ...p,
              text: removed.anchors
                .filter((a) => a.paragraphId === p.id)
                .reduce((t, a) => t.replace(a.quote, ""), p.text),
            }));
            next.scenes = next.scenes.map((sc) =>
              sc.anchors.some(
                (a) =>
                  !next.paragraphs
                    .find((p) => p.id === a.paragraphId)
                    ?.text.includes(a.quote),
              )
                ? { ...sc, needsReview: true }
                : sc,
            );
          }
          return next;
        });
        setInspector(false);
        setSelectedId(
          story.scenes.find((s) => s.id !== proposal.sceneId)?.id ?? "",
        );
        setToast("Scene removed. Undo is available.");
      }
      setModal(null);
      setProposal(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const runRewrite = async () => {
    if (!scene) return;
    setBusy("Writing a proposal…");
    setError("");
    try {
      setAiRewrite(
        await rewriteScene(
          story,
          scene.id,
          instruction.trim() ||
            "Reflect the current characters, individual actions, events and blended atmosphere while preserving the plot.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const moveScene = (direction: number) => {
    if (!scene) return;
    updateStory((s) => {
      const siblings = s.scenes.filter((sc) => sc.actId === scene.actId);
      const i = siblings.findIndex((sc) => sc.id === scene.id);
      const other = siblings[i + direction];
      if (!other) return s;
      const a = s.scenes.findIndex((sc) => sc.id === scene.id),
        b = s.scenes.findIndex((sc) => sc.id === other.id);
      [s.scenes[a], s.scenes[b]] = [s.scenes[b], s.scenes[a]];
      delete s.positions[scene.id];
      delete s.positions[other.id];
      return s;
    });
  };
  const addScene = () => {
    const id = uid(),
      pid = uid();
    const actId = scene?.actId ?? story.acts[0]?.id;
    if (!actId) return;
    updateStory((s) => {
      const text = "Write what happens in this scene.";
      s.paragraphs.push({ id: pid, text });
      const sc: Scene = {
        id,
        actId,
        title: "Untitled scene",
        mainAction: "A new possibility.",
        cast: [],
        anchors: [{ paragraphId: pid, quote: text }],
        events: [],
        mood: {},
        art: "desk",
        needsReview: true,
      };
      const last = s.scenes.map((sc) => sc.actId).lastIndexOf(actId);
      s.scenes.splice(last + 1, 0, sc);
      return s;
    });
    setSelectedId(id);
    setInspector(true);
  };

  return (
    <div
      className="app-shell"
      onClickCapture={(e) => {
        if (directDrag.suppress.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {directDrag.overlay}
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">
            <BookOpen size={21} />
          </span>
          storyscene<span className="local-badge">LOCAL STUDIO</span>
        </a>
        <div className="project-heading">
          <span className="project-title">{story.title}</span>
          <ChevronDown size={13} />
          <span className="save-status">
            <i />
            {saveState}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            title="Help"
            aria-label="Open help"
            onClick={() => openModal("help")}
          >
            <HelpCircle size={18} />
          </button>
          <button
            className="icon-button"
            title="AI settings"
            aria-label="AI settings"
            onClick={() => openModal("settings")}
          >
            <Settings2 size={18} />
          </button>
          <button className="button" onClick={exportProject}>
            <Download size={14} /> Export
          </button>
          <button
            className="button primary"
            onClick={() => openModal("import")}
          >
            <Plus size={15} /> New story
          </button>
        </div>
      </header>
      <div className="workspace-bar">
        <div className="breadcrumbs">
          <BookOpen size={14} />
          <span>My stories</span>
          <span className="slash">/</span>
          <strong>{story.title}</strong>
        </div>
        <div className="version-controls">
          <GitBranch size={14} />
          <select
            aria-label="Story version"
            value={workspace.activeBranchId}
            onChange={(e) => {
              commit((w) => ({ ...w, activeBranchId: e.target.value }));
              setInspector(false);
            }}
          >
            {workspace.branches.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            className="text-button"
            onClick={() => {
              setBranchName(`Version ${workspace.branches.length + 1}`);
              openModal("branch");
            }}
          >
            Create a version
          </button>
          <span className="toolbar-divider" />
          <button
            className="icon-button"
            aria-label="Undo"
            disabled={!history.past.length}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Redo"
            disabled={!history.future.length}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>
      <main className="studio">
        <section className="manuscript-panel">
          <div className="panel-heading">
            <div>
              <FileText size={15} />
              <h2>Manuscript</h2>
            </div>
            <span className="muted">{wordCount} words</span>
          </div>
          <div className="source-legend">
            <span>
              <i className="direct" />
              This scene
            </span>
            <span>
              <i className="inherited" />
              Inherited
            </span>
            <span>
              <i className="downstream" />
              Consequences
            </span>
          </div>
          <div className="manuscript-scroll">
            <div className="manuscript-intro">
              <span className="eyebrow">YOUR STORY, CONNECTED</span>
              <h1>{story.title}</h1>
              <p>Every scene begins with a few words.</p>
            </div>
            <StoryEditor
              story={story}
              selectedId={activeSceneId}
              onChange={editParagraphs}
            />
            <div className="manuscript-end">
              <span /> END OF MANUSCRIPT <span />
            </div>
          </div>
          <div className="manuscript-footer">
            <span className="violet-dot" />
            {scene
              ? `Scene ${story.scenes.indexOf(scene) + 1} linked to ${scene.anchors.length} passage${scene.anchors.length !== 1 ? "s" : ""}`
              : "Select a scene to trace its words"}
            <span className="editable-label">Editable</span>
          </div>
        </section>
        <section className="storyboard-panel">
          <div className="panel-heading storyboard-heading">
            <div>
              <span className="tiny-grid">▦</span>
              <h2>Story canvas</h2>
              <span className="count-badge">
                {story.acts.length} acts · {story.scenes.length} scenes
              </span>
            </div>
            <div>
              <button
                className={`toggle-button ${showDependencies ? "on" : ""}`}
                onClick={() => setShowDependencies(!showDependencies)}
              >
                <Link2 size={13} /> Story threads
              </button>
              <button
                className="icon-button"
                aria-label="Fit all scenes"
                onClick={() => setFitRequest((n) => n + 1)}
              >
                <Maximize2 size={15} />
              </button>
              <button className="button small" onClick={addScene}>
                <Plus size={13} /> Scene
              </button>
            </div>
          </div>
          <div className="canvas-wrap">
            <div className="canvas-guide">
              <span className="live-dot" /> A little space to see the whole
              story.<span>Move · connect · imagine</span>
            </div>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStop={(_e, node) =>
                updateStory((s) => ({
                  ...s,
                  positions: { ...s.positions, [node.id]: node.position },
                }))
              }
              onConnect={(c) => {
                if (c.source === c.target) return;
                setConnection(c);
                setLinkReason("");
                openModal("connect");
              }}
              onEdgeClick={(_e, edge) => {
                const link = story.links.find((l) => l.id === edge.id);
                if (link) {
                  setSelectedId(link.source);
                  setInspector(true);
                  setToast(link.reason);
                }
              }}
              onInit={(instance) => {
                fitRef.current = () => {
                  void instance.fitView({ padding: 0.09, duration: 350 });
                };
              }}
              fitView
              fitViewOptions={{ padding: 0.09 }}
              minZoom={0.2}
              maxZoom={1.7}
              deleteKeyCode={null}
              nodesConnectable
              connectionRadius={25}
              proOptions={{ hideAttribution: true }}
              panOnScroll
              selectionOnDrag={false}
              onPaneClick={() => setInspector(false)}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#dfd9d6"
              />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) =>
                  n.type === "group"
                    ? "#f1eeeb"
                    : n.id === activeSceneId
                      ? "#a38abb"
                      : "#d5cdc4"
                }
                maskColor="rgba(248,246,243,.7)"
              />
            </ReactFlow>
            <div className="canvas-legend">
              <span>
                <i className="order-line" />
                Reading order
              </span>
              <span>
                <i className="dependency-line" />
                Narrative dependency
              </span>
            </div>
            {inspector && scene && (
              <aside className="inspector">
                <div className="inspector-header">
                  <span className="eyebrow">
                    SCENE{" "}
                    {String(story.scenes.indexOf(scene) + 1).padStart(2, "0")}
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => setInspector(false)}
                    aria-label="Close scene editor"
                  >
                    <PanelRightClose size={18} />
                  </button>
                </div>
                <div className="inspector-content">
                  <input
                    className="title-input"
                    key={`${scene.id}-${scene.title}-title`}
                    aria-label="Scene title"
                    defaultValue={scene.title}
                    onBlur={(e) =>
                      e.target.value.trim() &&
                      e.target.value !== scene.title &&
                      updateScene(scene.id, { title: e.target.value.trim() })
                    }
                  />
                  <div className="scene-location">
                    <select
                      aria-label="Scene act"
                      value={scene.actId}
                      onChange={(e) =>
                        updateStory((s) => {
                          const moving = s.scenes.find(
                            (sc) => sc.id === scene.id,
                          )!;
                          moving.actId = e.target.value;
                          s.scenes = s.acts.flatMap((a) =>
                            s.scenes.filter((sc) => sc.actId === a.id),
                          );
                          delete s.positions[scene.id];
                          return s;
                        })
                      }
                    >
                      {story.acts.map((a, i) => (
                        <option key={a.id} value={a.id}>
                          Act {i + 1} · {a.title}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      aria-label="Move scene earlier"
                      onClick={() => moveScene(-1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move scene later"
                      onClick={() => moveScene(1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  {scene.needsReview && (
                    <div className="review-note">
                      <AlertCircle size={14} />
                      <span>
                        Content changed. Review this scene and its dependencies.
                      </span>
                      <button
                        className="text-button"
                        disabled={scene.anchors.some(
                          (a) =>
                            !story.paragraphs
                              .find((p) => p.id === a.paragraphId)
                              ?.text.includes(a.quote),
                        )}
                        onClick={() =>
                          updateStory((s) => ({
                            ...s,
                            scenes: s.scenes.map((sc) =>
                              sc.id === scene.id
                                ? { ...sc, needsReview: false }
                                : sc,
                            ),
                          }))
                        }
                      >
                        Reviewed
                      </button>
                    </div>
                  )}
                  <label className="field-label">
                    Main action
                    <textarea
                      key={`${scene.id}-${scene.mainAction}-action`}
                      defaultValue={scene.mainAction}
                      onBlur={(e) =>
                        e.target.value !== scene.mainAction &&
                        updateScene(
                          scene.id,
                          { mainAction: e.target.value },
                          true,
                        )
                      }
                      rows={2}
                    />
                  </label>
                  <div className="section-label">
                    CHARACTERS <span>{scene.cast.length} present</span>
                  </div>
                  {scene.cast.map((member) => {
                    const c = story.characters.find(
                      (c) => c.id === member.characterId,
                    )!;
                    return (
                      <div className="cast-row" key={c.id}>
                        <span className="mini-portrait">
                          <Person character={c} portrait />
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <input
                            aria-label={`${c.name}'s action`}
                            key={`${scene.id}-${c.id}-${member.action}`}
                            defaultValue={member.action}
                            onBlur={(e) =>
                              e.target.value !== member.action &&
                              updateScene(
                                scene.id,
                                {
                                  cast: scene.cast.map((m) =>
                                    m.characterId === c.id
                                      ? { ...m, action: e.target.value }
                                      : m,
                                  ),
                                },
                                true,
                              )
                            }
                          />
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${c.name} from scene`}
                          onClick={() => {
                            updateScene(
                              scene.id,
                              {
                                cast: scene.cast.filter(
                                  (m) => m.characterId !== c.id,
                                ),
                              },
                              true,
                            );
                            setToast(
                              `${c.name} removed. Review the source passage and dependent scenes.`,
                            );
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                  <p className="field-hint">
                    Drag someone from the character tray into this scene.
                  </p>
                  <div className="section-label">ATMOSPHERE</div>
                  <div className="scene-mood-tags">
                    {Object.entries(normalizedMood(scene.mood)).map(
                      ([id, n]) => {
                        const m = story.moods.find((m) => m.id === id);
                        return (
                          m && (
                            <span key={id}>
                              <i style={{ background: m.color }} />
                              {m.name} {n}%
                            </span>
                          )
                        );
                      },
                    )}
                    {!Object.keys(scene.mood).length && (
                      <span className="muted">No mood yet</span>
                    )}
                  </div>
                  <label className="field-label">
                    Illustration setting
                    <select
                      value={scene.art}
                      onChange={(e) =>
                        updateScene(scene.id, {
                          art: e.target.value as ArtKind,
                        })
                      }
                    >
                      {[
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
                      ].map((a) => (
                        <option key={a} value={a}>
                          {a[0].toUpperCase() + a.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="section-label">EVENTS</div>
                  {scene.events.map((ev, i) => (
                    <div className="event-item" key={i}>
                      <span>{ev}</span>
                      <button
                        className="icon-button"
                        aria-label={`Remove event ${i + 1}`}
                        onClick={() =>
                          updateScene(
                            scene.id,
                            { events: scene.events.filter((_, j) => i !== j) },
                            true,
                          )
                        }
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (event.trim()) {
                        updateScene(
                          scene.id,
                          { events: [...scene.events, event.trim()] },
                          true,
                        );
                        setEvent("");
                      }
                    }}
                  >
                    <input
                      aria-label="New scene event"
                      placeholder="Something happens…"
                      value={event}
                      onChange={(e) => setEvent(e.target.value)}
                    />
                    <button
                      className="icon-button"
                      aria-label="Add event"
                      disabled={!event.trim()}
                    >
                      <Plus size={16} />
                    </button>
                  </form>
                  <div className="section-label">
                    LINKED PASSAGE{" "}
                    <span>
                      {scene.anchors.length} source
                      {scene.anchors.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <textarea
                    className="prose-input"
                    aria-label="Replacement scene prose"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                  />
                  <button
                    className="button full"
                    disabled={
                      !editText.trim() ||
                      editText ===
                        scene.anchors.map((a) => a.quote).join("\n\n")
                    }
                    onClick={() => propose("text")}
                  >
                    Preview text replacement <ArrowRight size={13} />
                  </button>
                  {scene.anchors.some(
                    (a) =>
                      !story.paragraphs
                        .find((p) => p.id === a.paragraphId)
                        ?.text.includes(a.quote),
                  ) && (
                    <div className="remap-block">
                      <p className="field-hint">
                        A source quotation changed. Select its current paragraph
                        to remap this scene.
                      </p>
                      <select
                        aria-label="Remap source paragraph"
                        defaultValue=""
                        onChange={(e) => {
                          const p = story.paragraphs.find(
                            (p) => p.id === e.target.value,
                          );
                          if (p) {
                            updateScene(scene.id, {
                              anchors: [{ paragraphId: p.id, quote: p.text }],
                              needsReview: true,
                            });
                            setEditText(p.text);
                          }
                        }}
                      >
                        <option value="" disabled>
                          Choose a source paragraph…
                        </option>
                        {story.paragraphs
                          .filter((p) => p.text.trim())
                          .map((p, i) => (
                            <option key={p.id} value={p.id}>
                              {i + 1}. {p.text.slice(0, 55)}…
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  <div className="section-label">
                    AI WRITING PARTNER{" "}
                    <span>
                      {status?.configured ? "Connected" : "Setup needed"}
                    </span>
                  </div>
                  <textarea
                    aria-label="Rewrite instruction"
                    placeholder="E.g. Make this moment more hesitant, while keeping the same revelation."
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="button primary full"
                    disabled={!!busy}
                    onClick={runRewrite}
                  >
                    <Sparkles size={14} />
                    {busy === "Writing a proposal…"
                      ? "Writing…"
                      : "Propose rewrite"}
                  </button>
                  {aiRewrite && (
                    <div className="rewrite-proposal">
                      <strong>Proposed prose</strong>
                      <p>{aiRewrite.text}</p>
                      <small>{aiRewrite.explanation}</small>
                      <button
                        className="button full"
                        onClick={() => {
                          setEditText(aiRewrite.text);
                          setProposal({
                            sceneId: scene.id,
                            kind: "text",
                            text: aiRewrite.text,
                          });
                          openModal("impact");
                        }}
                      >
                        Review before applying
                      </button>
                    </div>
                  )}
                  {error && !modal && <p className="error-message">{error}</p>}
                  <div className="section-label">STORY THREADS</div>
                  {story.links
                    .filter(
                      (l) => l.source === scene.id || l.target === scene.id,
                    )
                    .map((l) => (
                      <div className="thread-row" key={l.id}>
                        <div>
                          <strong>
                            {l.source === scene.id ? "→" : "←"}{" "}
                            {
                              story.scenes.find(
                                (sc) =>
                                  sc.id ===
                                  (l.source === scene.id ? l.target : l.source),
                              )?.title
                            }
                          </strong>
                          <p>{l.reason}</p>
                          <small>{l.type}</small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Remove dependency"
                          onClick={() =>
                            updateStory((s) => ({
                              ...s,
                              links: s.links.filter((link) => link.id !== l.id),
                            }))
                          }
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  <button
                    className="button full"
                    onClick={() => {
                      setProposal(null);
                      openModal("impact");
                    }}
                  >
                    Review narrative impact
                  </button>
                  <div className="inspector-bottom">
                    <button
                      className="text-button"
                      onClick={() => {
                        setBranchScope("scene");
                        setBranchName(`After ${scene.title}`);
                        openModal("branch");
                      }}
                    >
                      <GitBranch size={13} /> Branch here
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => propose("delete")}
                    >
                      <Trash2 size={13} /> Delete scene
                    </button>
                  </div>
                </div>
              </aside>
            )}
          </div>
          <MoodDock
            startDrag={startDrag}
            key={workspace.id}
            onSavePreset={(preset) =>
              updateStory((s) => ({
                ...s,
                moodPresets: [...s.moodPresets, preset],
              }))
            }
            story={story}
            selectedTitle={scene?.title ?? "the selected scene"}
            onApply={(m) =>
              scene && drop(scene.id, "mood", JSON.stringify(m), 50)
            }
            onCharacter={(id) => scene && drop(scene.id, "character", id, 50)}
            onAddMood={(m) =>
              updateStory((s) => ({ ...s, moods: [...s.moods, m] }))
            }
            onAddCharacter={(c) =>
              updateStory((s) => ({ ...s, characters: [...s.characters, c] }))
            }
          />
          <div className="statusbar">
            <span>
              <span className="status-dot" />
              {status?.configured
                ? `${status.provider === "groq" ? "Groq" : "Ollama"} connected`
                : "Demonstration · AI not configured"}
            </span>
            <span>
              Click a scene to follow its words. Double-click to explore.
            </span>
            <button className="text-button" onClick={() => openModal("help")}>
              Quick guide <ArrowRight size={11} />
            </button>
          </div>
        </section>
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={16} />
          {toast}
          <button
            aria-label="Dismiss notification"
            className="icon-button"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className={`modal ${modal === "impact" ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            ref={modalRef}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              disabled={!!busy}
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "import" && (
              <>
                <span className="modal-symbol">
                  <BookOpen size={24} />
                </span>
                <h2 id="modal-title">A new story starts here.</h2>
                <p className="modal-subtitle">
                  Bring your words. Shape the way they unfold.
                </p>
                <label className="field-label">
                  Your manuscript
                  <textarea
                    aria-label="New story manuscript"
                    placeholder="Paste a story here. Separate paragraphs with a blank line…"
                    rows={8}
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                  />
                </label>
                <div className="count-inputs">
                  <label className="field-label">
                    Acts
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={actCount}
                      onChange={(e) => setActCount(+e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Scenes in total
                    <input
                      type="number"
                      min={actCount}
                      max={40}
                      value={sceneCount}
                      onChange={(e) => setSceneCount(+e.target.value)}
                    />
                  </label>
                  <p>
                    Each act groups several scenes. You can rearrange them
                    afterwards.
                  </p>
                </div>
                <div className="info-box">
                  <Sparkles size={16} />
                  <span>
                    {status?.configured
                      ? "Your manuscript will be sent to the configured AI provider for analysis."
                      : "Add your API key in backend/.env to generate a scene map. The demonstration works without a key."}{" "}
                    This prototype accepts up to 40,000 characters.
                  </span>
                </div>
                <button
                  className="button primary full large"
                  disabled={
                    !!busy ||
                    sourceText.trim().length < 40 ||
                    sourceText.length > 40000 ||
                    !Number.isInteger(actCount) ||
                    !Number.isInteger(sceneCount) ||
                    actCount < 1 ||
                    actCount > 8 ||
                    sceneCount < actCount ||
                    sceneCount > 40
                  }
                  onClick={generate}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}{" "}
                  Generate my story canvas
                </button>
                <div className="modal-secondary">
                  <button
                    className="text-button"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={14} /> Open a project file
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      commit(() => demoWorkspace());
                      setSelectedId("s7");
                      setModal(null);
                      setFitRequest((n) => n + 1);
                    }}
                  >
                    Explore the demo
                  </button>
                </div>
              </>
            )}
            {modal === "settings" && (
              <>
                <span className="modal-symbol">
                  <Settings2 size={23} />
                </span>
                <h2 id="modal-title">Your AI connection</h2>
                <p className="modal-subtitle">
                  The studio runs on your computer. AI calls go through your
                  local Python server.
                </p>
                <div className="connection-card">
                  <span
                    className={`connection-dot ${status?.configured ? "connected" : ""}`}
                  />
                  <div>
                    <strong>
                      {status?.provider === "ollama" ? "Ollama" : "Groq"}
                    </strong>
                    <p>{status?.model || "openai/gpt-oss-120b"}</p>
                  </div>
                  <span className="count-badge">
                    {status?.configured ? "Configured" : "Not configured"}
                  </span>
                </div>
                <ol className="setup-steps">
                  <li>
                    Copy <code>backend/.env.example</code> to{" "}
                    <code>backend/.env</code>.
                  </li>
                  <li>
                    Add your key as <code>GROQ_API_KEY=your_key</code>.
                  </li>
                  <li>
                    Restart the app with <code>npm run dev</code>.
                  </li>
                </ol>
                <p className="field-hint">
                  Your key stays on the local server. It is never stored in the
                  browser or exported with your story. To use a local model
                  later, set AI_PROVIDER=ollama and OLLAMA_MODEL in the same
                  file.
                </p>
                <button
                  className="button full"
                  onClick={async () => {
                    try {
                      setStatus(await aiStatus());
                      setToast("Connection configuration refreshed.");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Refresh connection
                </button>
                <div className="info-box">
                  Scene pictures are original animated SVG illustrations. Text
                  generation does not generate images.
                </div>
              </>
            )}
            {modal === "help" && (
              <>
                <span className="modal-symbol">
                  <Sparkles size={23} />
                </span>
                <h2 id="modal-title">Make the story your own.</h2>
                <p className="modal-subtitle">
                  A few small gestures. A whole world of possibilities.
                </p>
                <div className="help-list">
                  <div>
                    <span>01</span>
                    <p>
                      <strong>Follow the words.</strong> Select a scene. Violet
                      underlines show its source; amber shows inherited context;
                      teal shows downstream dependencies.
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>
                      <strong>Move the cast.</strong> Drag a character into an
                      illustration. Drag again to reposition. Open the scene to
                      remove someone or edit their action.
                    </p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>
                      <strong>Mix a feeling.</strong> Select several colors,
                      adjust their weights, then drag the blend onto a scene.
                      Click Apply blend for a keyboard-friendly alternative.
                    </p>
                  </div>
                  <div>
                    <span>04</span>
                    <p>
                      <strong>Connect the cause.</strong> Drag from a scene’s
                      right connector to another scene’s left connector. Give
                      the relationship a reason. Dotted lines show reading
                      order.
                    </p>
                  </div>
                  <div>
                    <span>05</span>
                    <p>
                      <strong>Try another path.</strong> Create a version from a
                      scene or act. Each version holds an independent copy. Use
                      Undo, compare the manuscript, and export all versions
                      together.
                    </p>
                  </div>
                </div>
                <div className="info-box">
                  Moving a card changes its layout. The scene editor’s up/down
                  arrows change reading order. Existing links provide a
                  structural check; AI analysis is a suggestion and may miss
                  dependencies.
                </div>
                <button
                  className="button primary full"
                  onClick={() => setModal(null)}
                >
                  Back to my story <ArrowRight size={14} />
                </button>
              </>
            )}
            {modal === "branch" && (
              <>
                <span className="modal-symbol">
                  <GitBranch size={23} />
                </span>
                <h2 id="modal-title">What if it happened differently?</h2>
                <p className="modal-subtitle">
                  Create an independent version. The current version remains
                  available.
                </p>
                <label className="field-label">
                  Version name
                  <input
                    autoFocus
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="A different ending"
                  />
                </label>
                <label className="field-label">
                  Start the alternative from
                  <select
                    value={branchScope}
                    onChange={(e) =>
                      setBranchScope(e.target.value as "scene" | "act")
                    }
                  >
                    <option value="scene">
                      Scene: {scene?.title ?? "Beginning"}
                    </option>
                    <option value="act">
                      Act:{" "}
                      {story.acts.find((a) => a.id === scene?.actId)?.title ??
                        "Beginning"}
                    </option>
                  </select>
                </label>
                <div className="branch-preview">
                  <GitBranch size={20} />
                  <div>
                    <strong>{branch.name}</strong>
                    <p>↳ {branchName || "Your new version"}</p>
                  </div>
                </div>
                <p className="field-hint">
                  The whole story is copied to preserve context. The selected
                  scene or act is recorded as the branching point; earlier
                  scenes remain editable.
                </p>
                <button
                  className="button primary full"
                  disabled={!branchName.trim()}
                  onClick={() => {
                    commit((w) =>
                      branchWorkspace(
                        w,
                        branchName.trim(),
                        branchScope === "scene"
                          ? `Scene: ${scene?.title ?? "Beginning"}`
                          : `Act: ${story.acts.find((a) => a.id === scene?.actId)?.title ?? "Beginning"}`,
                      ),
                    );
                    setModal(null);
                    setToast(
                      "Version created. Changes now belong to this version.",
                    );
                  }}
                >
                  <GitBranch size={14} /> Create version
                </button>
              </>
            )}
            {modal === "connect" && connection && (
              <>
                <span className="modal-symbol">
                  <Link2 size={23} />
                </span>
                <h2 id="modal-title">Give this thread a meaning.</h2>
                <p className="modal-subtitle">
                  {story.scenes.find((s) => s.id === connection.source)?.title}{" "}
                  <ArrowRight size={13} />{" "}
                  {story.scenes.find((s) => s.id === connection.target)?.title}
                </p>
                <label className="field-label">
                  Relationship
                  <select
                    value={linkType}
                    onChange={(e) =>
                      setLinkType(e.target.value as "causes" | "prepares")
                    }
                  >
                    <option value="causes">
                      Causes — makes the next event possible
                    </option>
                    <option value="prepares">
                      Prepares — introduces context used later
                    </option>
                  </select>
                </label>
                <label className="field-label">
                  Why does this scene depend on the first?
                  <textarea
                    rows={3}
                    value={linkReason}
                    onChange={(e) => setLinkReason(e.target.value)}
                    placeholder="The key found here opens the door in the next scene."
                  />
                </label>
                <button
                  className="button primary full"
                  disabled={!linkReason.trim()}
                  onClick={() => {
                    updateStory((s) => ({
                      ...s,
                      links: [
                        ...s.links,
                        {
                          id: uid(),
                          source: connection.source!,
                          target: connection.target!,
                          type: linkType,
                          reason: linkReason.trim(),
                        },
                      ],
                    }));
                    setModal(null);
                  }}
                >
                  Connect scenes
                </button>
              </>
            )}
            {modal === "impact" && (
              <>
                <span className="modal-symbol">
                  <Link2 size={23} />
                </span>
                <h2 id="modal-title">
                  {proposal
                    ? proposal.kind === "delete"
                      ? "Before this scene disappears…"
                      : "Follow the ripple."
                    : "A closer look at the story."}
                </h2>
                <p className="modal-subtitle">
                  {proposal
                    ? "Review the consequences before applying your change."
                    : "Review the current scene and the story threads connected to it."}
                </p>
                {proposal?.kind === "delete" && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={removeText}
                      onChange={(e) => setRemoveText(e.target.checked)}
                    />{" "}
                    Also remove this scene’s quoted passages from the manuscript
                  </label>
                )}
                {proposal?.kind === "text" && (
                  <div className="text-comparison">
                    <div>
                      <span>BEFORE</span>
                      <p>
                        {story.scenes
                          .find((s) => s.id === proposal.sceneId)
                          ?.anchors.map((a) => a.quote)
                          .join("\n\n")}
                      </p>
                    </div>
                    <div>
                      <span>PROPOSED</span>
                      <p>{proposal.text}</p>
                    </div>
                  </div>
                )}
                <div className="section-label">
                  EXISTING DEPENDENCY CHECK <span>No AI required</span>
                </div>
                <div className="impact-list">
                  {(proposal
                    ? affected
                    : descendants(story, activeSceneId)
                  ).map((id) => {
                    const s = story.scenes.find((s) => s.id === id);
                    return (
                      s && (
                        <div key={id}>
                          <AlertCircle size={15} />
                          <div>
                            <strong>{s.title}</strong>
                            <p>
                              {story.links
                                .filter((l) => l.target === id)
                                .map((l) => l.reason)
                                .join(" ")}
                            </p>
                          </div>
                        </div>
                      )
                    );
                  })}
                  {!(proposal ? affected : descendants(story, activeSceneId))
                    .length && (
                    <p className="muted">
                      No downstream scenes in the current dependency graph.
                      Other narrative consequences may still exist.
                    </p>
                  )}
                </div>
                <div className="info-box">
                  This check follows the links already recorded in the project.
                  It does not prove that the story remains coherent. Affected
                  scenes will be marked for your review.
                </div>
                <button
                  className="button full"
                  disabled={!!busy}
                  onClick={runAnalysis}
                >
                  {busy ? (
                    <LoaderCircle size={14} className="spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}{" "}
                  Ask AI to review the consequences
                </button>
                {impact && (
                  <div className="ai-report">
                    <div className="section-label">
                      AI SUGGESTION · REVIEW REQUIRED
                    </div>
                    <p>{impact.summary}</p>
                    {impact.affected.map((a, i) => (
                      <div key={i}>
                        <strong>
                          {story.scenes.find((s) => s.id === a.sceneId)?.title}
                        </strong>
                        <p>{a.reason}</p>
                        <small>{a.suggestion}</small>
                      </div>
                    ))}
                    {impact.uncertainties.length > 0 && (
                      <p className="field-hint">
                        Uncertainties: {impact.uncertainties.join(" ")}
                      </p>
                    )}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    className="button"
                    disabled={!!busy}
                    onClick={() => setModal(null)}
                  >
                    Keep editing
                  </button>
                  {proposal && (
                    <button
                      className={`button ${proposal.kind === "delete" ? "danger-button" : "primary"}`}
                      disabled={!!busy}
                      onClick={applyProposal}
                    >
                      {proposal.kind === "delete" ? (
                        <Trash2 size={14} />
                      ) : (
                        <Check size={14} />
                      )}{" "}
                      {proposal.kind === "delete"
                        ? "Remove scene"
                        : "Apply replacement"}
                    </button>
                  )}
                </div>
              </>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {busy && (
              <p className="busy-message">
                <LoaderCircle className="spin" size={14} />
                {busy}
              </p>
            )}
          </section>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="visually-hidden"
        aria-label="Import project file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importProject(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
export default function Storyscene() {
  return (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  );
}
