# Third-party components

The project includes original scene illustrations implemented as SVG components. It does not contain assets from the Storyteller game.

Dependencies are installed from their published packages using `npm ci` and Python requirements. Their respective package licenses apply:

- React and React DOM — MIT.
- React Flow / @xyflow/react — MIT.
- Tiptap open-source editor and ProseMirror packages — MIT.
- Lucide icons — ISC.
- Vite, TypeScript and Vitest — their published open-source licenses.
- FastAPI, Pydantic, Uvicorn, HTTPX and pytest — their published open-source licenses.
- DM Sans and Literata fonts, distributed through Fontsource — SIL Open Font License. Font license files are included in their installed packages.

Fonts are bundled locally during the build; the application does not fetch fonts from Google Fonts at runtime. Groq and Ollama are optional model providers and have their own service or model terms.
