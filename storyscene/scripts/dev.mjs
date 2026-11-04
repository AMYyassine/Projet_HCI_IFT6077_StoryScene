import { spawn } from "node:child_process";
import { existsSync, createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const venvPython = path.join(
  root,
  "backend",
  ".venv",
  isWindows ? "Scripts/python.exe" : "bin/python",
);
const children = [];
const log = createWriteStream(path.join(root, "backend", "server.log"), {
  flags: "w",
});
if (existsSync(venvPython)) {
  const backend = spawn(
    venvPython,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    { cwd: path.join(root, "backend"), stdio: ["ignore", "pipe", "pipe"] },
  );
  backend.stdout.on("data", (data) => {
    process.stdout.write(data);
    log.write(data);
  });
  backend.stderr.on("data", (data) => {
    process.stderr.write(data);
    log.write(data);
  });
  backend.on("error", (error) => {
    const message = `Local API could not start: ${error.message}\n`;
    process.stderr.write(message);
    log.write(message);
  });
  backend.on("exit", (code) => {
    if (code)
      console.warn(
        `Local API exited (${code}). See backend/server.log. The browser demo remains available.`,
      );
  });
  children.push(backend);
} else {
  console.warn(
    "Backend environment not found. Starting browser demo only. Follow README.md to enable local SQLite storage and AI.",
  );
  log.write(
    "Backend environment not found. Create backend/.venv before starting the app.\n",
  );
}
const host =
  process.env.SITES_MANAGED_LINUX_CONTAINER === "1" ? "0.0.0.0" : "127.0.0.1";
const ui = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/vite/bin/vite.js"),
    "--host",
    host,
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: "inherit" },
);
children.push(ui);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  children.forEach((p) => p.kill());
}
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
ui.on("exit", (code) => {
  stop();
  process.exit(code ?? 0);
});
