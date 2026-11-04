# HCI / HAII design notes

## Research focus

Study whether a directly manipulable scene canvas helps writers understand and control the consequences of narrative edits compared with a text-only AI editor. The contribution is the interaction and traceability model, not a claim that scene cards or block-based AI interfaces are entirely novel.

## Observable design principles

- **Continuous representation:** the source manuscript remains visible while the user manipulates scene elements.
- **Direct manipulation:** characters and blended atmospheres are placed on the illustration itself; a moving token and a highlighted target communicate the gesture.
- **Explicit mappings:** exact quotations connect a scene to its text. Narrative threads carry a type and a reason. Reading order is a separate relationship.
- **Reversibility:** undo, redo, exports and independent versions reduce the cost of trying alternatives.
- **Human control:** AI rewriting is proposed, previewed and accepted explicitly. Character changes mark scenes for review rather than automatically rewriting their future.
- **Honest uncertainty:** existing-link traversal and AI analysis are labeled separately. Neither promises that every narrative dependency is known.
- **Multiple representations:** underlines use color, but relationship labels and explanations also carry meaning. Character actions remain readable in the scene editor.

## Suggested course evaluation

Run a small formative study with the same short narrative and edit tasks in two conditions: the scene canvas and a text-only interface. Counterbalance condition order. Ask participants to remove a pivotal scene, introduce a character, modify the atmosphere, and create an alternative ending.

Measure task completion, missed dependency problems, reversals, perceived control and explanation comprehension. Use think-aloud observations to distinguish failures of the metaphor, source mapping, visual clutter and AI accuracy. Do not interpret a small classroom study as proof of broad superiority.

## What to evaluate next

1. Whether the difference between spatial card movement and narrative reordering is understood.
2. Whether inherited context and downstream consequences need different line styles in addition to underline colors.
3. Whether an AI-proposed dependency should require confirmation before it becomes part of the graph.
4. Whether branching should lock the prefix or merely record the starting point.
5. Whether many scenes need semantic zoom, collapsed acts or a chapter navigator.

No interaction logs or participant data are collected automatically in this prototype.
