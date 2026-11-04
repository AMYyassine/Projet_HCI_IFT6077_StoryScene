import sqlite3
from pathlib import Path
from .models import Workspace


class ProjectStore:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(path) as connection:
            connection.execute('CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)')

    def save(self, project: Workspace):
        with sqlite3.connect(self.path) as connection:
            connection.execute('INSERT INTO workspace (id, document) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET document=excluded.document, updated_at=CURRENT_TIMESTAMP', (project.model_dump_json(),))

    def load(self):
        with sqlite3.connect(self.path) as connection:
            row = connection.execute('SELECT document FROM workspace WHERE id=1').fetchone()
        return Workspace.model_validate_json(row[0]) if row else None
