# Storyscene

A local storytelling studio for an HCI / Human–AI Interaction course project. An editable manuscript lives on the left; animated scene cards, grouped into acts, live on the right. All interface text, examples, documentation and code are in English.

## Start on Windows

Install **Node.js 22.12+ (or 24 LTS)** and **Python 3.11+** first. Extract the ZIP, open the `storyscene` folder in VS Code, then open its terminal.

```powershell
npm ci
py -3 -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
Copy-Item backend/.env.example backend/.env
npm run dev
```

Open the local URL printed by Vite, normally **http://127.0.0.1:5173**. Keep the terminal open. Press **Ctrl+C** to stop both servers. There is no account, hosting service or deployment step.

Alternatively, after installing Node and Python, double-click `SETUP_WINDOWS.cmd` once, then `START_WINDOWS.cmd` whenever you want to work. The setup script preserves an existing `.env` file.

The ten-scene demonstration works **without an API key**. You can move cards, add characters, mix atmospheres, edit prose, inspect known dependencies and create versions immediately.

### Connect Groq

Edit `backend/.env` locally:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Restart `npm run dev`. The studio's AI settings button shows whether configuration is present. This is a configuration check, not a successful model-call test. Never paste your key into the frontend or commit the real `.env` file. The sample file contains no credentials.

Use **New story**, paste your narrative and choose the number of acts and the **total** number of scenes. The AI proposes a mapping. The server validates counts, references and exact source quotations before importing it. This prototype accepts up to 40,000 characters and 40 scenes; provider token limits can require shorter excerpts. It is not yet a full-length novel ingestion pipeline.

The configured provider receives the manuscript and relevant project context when you request generation, analysis or rewriting. Moving a card, editing locally, mixing moods, saving and branching do not call an online model.

### Switch to Ollama later

Install Ollama and pull a model appropriate for your computer. Then change `backend/.env`:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=the_model_you_installed
```

Restart the app. The same provider adapter sends JSON-schema requests to Ollama's local `/api/chat` endpoint. Model size, context capacity and structured-output reliability still need evaluation on your hardware. The Ollama adapter is implemented but has not been tested against a running model in this delivery.

## First five minutes

1. Select **Across the table**, scene 7. The manuscript scrolls to its passage. Violet underlines identify the selected scene; amber identifies inherited context; teal identifies known downstream consequences.
2. Drag **Rose** from the character tray into that scene. A drop target and a floating label provide feedback. Characters can also be added by clicking their tray button with a scene selected.
3. Move a character within the illustration. Open the scene using its three-dot button to change individual actions or remove a character.
4. Select several moods on the circular palette, adjust their weights, and drag **Your blend** onto a scene. Save a blend to reuse it. Saved blends are included in the project file.
5. Open a scene, edit its passage and choose **Preview text replacement**. Review the existing dependency check, optionally request AI analysis, and explicitly apply the proposal.
6. Choose **Create a version**, name it and select a scene or act as the branching point. The original remains available in the version selector.

## Interaction model

| Gesture                                                | Result                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| Click a scene                                          | Select it and trace its text and dependencies                    |
| Three-dot button or double-click the scene             | Open characters, actions, events, prose and thread details       |
| Drag a card by its title                               | Change its spatial layout within the act                         |
| Up/down arrows in the scene editor                     | Change reading order within the act                              |
| Change the act dropdown                                | Move the scene into another act                                  |
| Drag a character into a scene                          | Add or reposition that character                                 |
| Drag a mood blend into a scene                         | Apply weighted atmosphere settings                               |
| Drag right connector to another scene's left connector | Create a causal or preparatory link with a human-written reason  |
| Click a dependency thread                              | Open its source scene and read its explanation                   |
| Delete scene                                           | Preview consequences, optionally remove quoted prose, then apply |
| Undo / Redo                                            | Restore project snapshots, including a deleted scene             |
| Export / Open project file                             | Exchange the full project and all versions as JSON               |

**Dotted lines** indicate reading order. **Solid lines** indicate explicit narrative dependencies. Spatial layout and reading order are intentionally separate. Mood blends are creative instructions for a rewrite; they do not change an LLM's weights or guarantee a particular emotional response.

## Saving and working as a group

- With the Python server running, the active workspace is saved to `backend/data/storyscene.db` using SQLite.
- A browser copy is also kept. If the backend is unavailable, the status reads **Saved in this browser**. Keep using the same browser origin and export before clearing its data.
- The browser copy takes precedence on reopening; a server copy is loaded when this browser has no saved project. Use one active editing tab at a time.
- Export regularly. A `.storyscene.json` file includes the manuscript, characters, acts, scenes, dependencies, layout, mood presets and versions. It never includes the API key.
- Each group member runs their own local copy. Exchange exported project files or collaborate on source code through your own Git repository. Simultaneous multiplayer editing and automatic merging are not implemented.
- A new story replaces the active workspace; **Undo** can restore it during that session. Export existing work before switching projects.

## Architecture

| Component           | Tool                      | Responsibility                                               |
| ------------------- | ------------------------- | ------------------------------------------------------------ |
| Interface           | React + TypeScript + Vite | Local application and typed state                            |
| Scene canvas        | React Flow                | Nodes, act groups, connectors, pan and zoom                  |
| Manuscript          | Tiptap / ProseMirror      | Editable paragraphs and quote decorations                    |
| Illustrations       | Original SVG + CSS        | Small animation loops and independently movable characters   |
| Direct manipulation | Pointer Events            | Drag preview, scene targeting and drop feedback              |
| Local API           | FastAPI + Pydantic        | Validation and scoped AI requests                            |
| Persistence         | SQLite + browser storage  | Durable local workspace and browser fallback                 |
| AI                  | Groq / Ollama adapter     | Structured mapping, impact suggestions and rewrite proposals |

The illustrated scenes use original schematic art inspired by the readability of storybook games. No Storyteller game assets are included. These are animated vector layers, not flattened GIFs or AI-generated images, so characters remain directly manipulable.

## Validation

```powershell
npm test
npm run build
.\backend\.venv\Scripts\python.exe -m pytest -q backend/tests
```

If running the Python tests from the project root, use the supplied `pytest.ini` so imports resolve correctly. The checks cover dependency traversal, cycles, deletion, isolated versions, scoped replacement, invalid imports, source references, SQLite round trips and API validation. A provider stub tests the generation endpoint without sending an online request. See `VALIDATION.md` for the actual delivery checks and limits.

## Current prototype limits

- AI suggestions can miss consequences. Valid JSON and exact quotations do not establish narrative coherence; the user remains the reviewer.
- Editing source prose can make quotation anchors stale. Such scenes are marked for review, and their editor offers explicit paragraph remapping. Automatic semantic realignment is not implemented.
- A scene with multiple or shared source passages cannot use one-click text replacement. Edit those passages in the manuscript and review the mappings.
- A branch copies the whole story and records its originating act or scene. Earlier scenes remain editable; there is no merge operation or side-by-side version diff yet.
- New cast members, actions, events and moods do not silently rewrite the manuscript. Use **Propose rewrite** and review the result.
- Animations are schematic; character actions are stored and sent to the AI but do not generate arbitrary new animations. Art templates cover ten settings.
- This version targets desktop browsers, preferably at least 1280×800. Small-screen and screen-reader workflows need further HCI evaluation. Reduced-motion preferences are respected.
- The API is designed for one local user and binds to loopback. It is not an authenticated public service.

## Troubleshooting

- **`npm` is not recognized:** install Node.js, then reopen the terminal.
- **`py` is not recognized:** install Python with its Windows launcher, or use `python` instead of `py -3`.
- **PowerShell blocks `npm.ps1`:** use `npm.cmd ci` and `npm.cmd run dev`, or run the supplied `.cmd` files. No execution-policy change is needed.
- **Only browser saving works:** check that `backend/.venv` exists. Read `backend/server.log` and the terminal for startup errors. Port 8000 must be available.
- **AI is not configured:** copy `.env.example` to `.env`, add the key and restart. Do not name the file `.env.txt`.
- **Rate limit / timeout / invalid model output:** use a shorter story or wait and retry. The existing project is preserved on a failed generation request.
- **A passage lost its underline:** the exact quotation no longer matches. Remap it explicitly in the scene editor.

For macOS/Linux, replace the Windows Python paths with `backend/.venv/bin/python` and create the environment with `python3 -m venv backend/.venv`. Run `npm run dev` from the project root.

Official references: [React Flow](https://reactflow.dev/), [Tiptap](https://tiptap.dev/), [FastAPI](https://fastapi.tiangolo.com/), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).
