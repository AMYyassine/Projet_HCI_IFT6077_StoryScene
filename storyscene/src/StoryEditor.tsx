import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ancestors, descendants, uid } from "./model";
import type { Story, Paragraph } from "./model";

const key = new PluginKey<MarkRange[]>("storyscene-underlines");
type MarkRange = {
  paragraphId: string;
  quote: string;
  kind: "direct" | "inherited" | "downstream";
};
const ParagraphNode = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*",
  addAttributes: () => ({
    id: {
      default: null,
      parseHTML: (el) => el.getAttribute("data-paragraph-id"),
      renderHTML: (attrs) => ({ "data-paragraph-id": attrs.id }),
    },
  }),
  parseHTML: () => [{ tag: "p" }],
  renderHTML: ({ HTMLAttributes }) => ["p", HTMLAttributes, 0],
});
const Underlines = Extension.create({
  name: "sourceUnderlines",
  addProseMirrorPlugins() {
    return [
      new Plugin<MarkRange[]>({
        key,
        state: {
          init: () => [],
          apply: (tr, previous) => tr.getMeta(key) ?? previous,
        },
        props: {
          decorations(state) {
            const ranges = key.getState(state) ?? [];
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "paragraph") return;
              const relevant = ranges.filter(
                (r) => r.paragraphId === node.attrs.id,
              );
              for (const r of relevant) {
                const offset = node.textContent.indexOf(r.quote);
                if (offset >= 0 && r.quote.length)
                  decorations.push(
                    Decoration.inline(
                      pos + 1 + offset,
                      pos + 1 + offset + r.quote.length,
                      {
                        class: `source-underline ${r.kind}`,
                        title:
                          r.kind === "direct"
                            ? "This scene"
                            : r.kind === "inherited"
                              ? "What this scene inherits"
                              : "What depends on this scene",
                      },
                    ),
                  );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const tr = state.tr;
          const ids = new Set<string>();
          state.doc.descendants((node, pos) => {
            if (node.type.name === "paragraph") {
              if (!node.attrs.id || ids.has(node.attrs.id)) {
                const id = uid();
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
                ids.add(id);
              } else ids.add(node.attrs.id);
            }
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
const content = (paragraphs: Paragraph[]) => ({
  type: "doc",
  content: paragraphs.map((p) => ({
    type: "paragraph",
    attrs: { id: p.id },
    content: p.text ? [{ type: "text", text: p.text }] : [],
  })),
});

export function StoryEditor({
  story,
  selectedId,
  onChange,
}: {
  story: Story;
  selectedId: string;
  onChange: (paragraphs: Paragraph[]) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false,
        bold: false,
        italic: false,
        strike: false,
        code: false,
        link: false,
        underline: false,
      }),
      ParagraphNode,
      Underlines,
    ],
    content: content(story.paragraphs),
    editorProps: {
      attributes: { "aria-label": "Story manuscript", spellcheck: "true" },
    },
    onUpdate: ({ editor: e }) => {
      const ps: Paragraph[] = [];
      e.state.doc.forEach((n) =>
        ps.push({ id: n.attrs.id || uid(), text: n.textContent }),
      );
      onChangeRef.current(ps);
    },
  });
  useEffect(() => {
    if (!editor) return;
    const ps: Paragraph[] = [];
    editor.state.doc.forEach((n) =>
      ps.push({ id: n.attrs.id, text: n.textContent }),
    );
    if (JSON.stringify(ps) !== JSON.stringify(story.paragraphs))
      editor.commands.setContent(content(story.paragraphs), {
        emitUpdate: false,
      });
  }, [editor, story.paragraphs]);
  useEffect(() => {
    if (!editor) return;
    const before = new Set(ancestors(story, selectedId)),
      after = new Set(descendants(story, selectedId));
    const ranges: MarkRange[] = story.scenes
      .flatMap((s) =>
        s.anchors.map((a) => ({
          ...a,
          kind:
            s.id === selectedId
              ? ("direct" as const)
              : before.has(s.id)
                ? ("inherited" as const)
                : after.has(s.id)
                  ? ("downstream" as const)
                  : null,
        })),
      )
      .filter((a): a is MarkRange => a.kind !== null);
    editor.view.dispatch(editor.state.tr.setMeta(key, ranges));
  }, [editor, story, selectedId]);
  useEffect(() => {
    if (!editor) return;
    const id = story.scenes.find((s) => s.id === selectedId)?.anchors[0]
      ?.paragraphId;
    const element = Array.from(editor.view.dom.querySelectorAll("p")).find(
      (el) => el.dataset.paragraphId === id,
    );
    const scroll = editor.view.dom.closest(".manuscript-scroll");
    if (element && scroll) {
      const er = element.getBoundingClientRect(),
        sr = scroll.getBoundingClientRect();
      if (er.top < sr.top || er.bottom > sr.bottom)
        scroll.scrollTo({
          top: scroll.scrollTop + er.top - sr.top - 50,
          behavior: "smooth",
        });
    }
  }, [editor, selectedId]);
  return <EditorContent editor={editor} />;
}
