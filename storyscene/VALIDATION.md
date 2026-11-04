# Delivery validation — 0.1.0

Checked on 2 November 2026. This document records observed results, not a claim of complete coverage.

## Automated checks

- `npm run build`: passed (TypeScript and Vite production build).
- `npm test`: 7 tests passed.
- `backend/.venv/bin/python -m pytest -q`: 6 tests passed.
- A real browser-exported project containing two independent versions and a saved mood blend was accepted by the backend's Pydantic `Workspace` schema. Both versions contained ten scenes; their edited scene passages differed as intended.

The Python test runner emitted one third-party deprecation warning about Starlette's current HTTPX test client. It did not fail a test. Vite reported an empty optional React chunk after dependency splitting; the build succeeded.

## Browser checks performed

- Ten scene cards and three act labels render alongside the manuscript.
- Selecting a scene scrolls the manuscript to its quotation; direct, inherited and downstream passages receive distinct underlines.
- Dragging Adam from the tray into `Coming home` adds him at the drop position and marks the scene for review.
- Dragging a mood blend onto a scene applies it and displays feedback.
- Dragging a scene connector to another connector opens the relationship editor; a typed causal explanation can be saved.
- Creating `A quieter ending` produces a separate selectable version.
- Replacing scene 7's prose first shows before/after text and three downstream consequences. Explicit acceptance updates that version's manuscript.
- Switching back to `Original story` restores its original scene 7 text.
- A saved mood preset and both versions survive a browser reload.
- Export produces a valid JSON project containing the versions and mood preset.

## Boundaries of verification

- Browser checks ran against the frontend with browser-storage fallback. The managed preview could not resolve the local Python virtual-environment executable. API validation and SQLite persistence were checked separately through the Python test client; browser-to-live-Python integration was not verified in that preview environment.
- No real Groq key was supplied, so no live generation, impact-analysis or rewrite response was tested. Generation routing was tested with a deterministic provider stub; missing-key behavior was also tested.
- The Ollama adapter was not tested against a running model.
- Windows launch scripts are included, but execution was checked on Linux, not on a Windows machine.
- Accessibility and usability have not yet been evaluated with participants. Connection handles can be small when all scenes are fitted into the canvas; zoom in for precise linking.

The frontend, domain model and API are functional prototype code. The limitations above should remain visible when presenting the project in class.
