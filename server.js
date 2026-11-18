const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT ?? 7900;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'ideas.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function parseTags(raw) {
  if (!raw) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

function serializeTags(tags) {
  if (typeof tags === 'string') return tags.trim();
  if (!Array.isArray(tags)) return '';
  return tags.map(t => String(t).trim()).filter(Boolean).join(',');
}

function rowToIdea(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: parseTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/ideas
app.get('/api/ideas', (req, res) => {
  const rows = db.prepare('SELECT * FROM ideas ORDER BY updated_at DESC').all();
  res.json(rows.map(rowToIdea));
});

// GET /api/ideas/:id
app.get('/api/ideas/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(rowToIdea(row));
});

// POST /api/ideas
app.post('/api/ideas', (req, res) => {
  const { title, description = '', tags = [] } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const stmt = db.prepare(
    'INSERT INTO ideas (title, description, tags) VALUES (?, ?, ?)'
  );
  const result = stmt.run(title.trim(), String(description ?? '').trim(), serializeTags(tags));
  const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(rowToIdea(row));
});

// PUT /api/ideas/:id
app.put('/api/ideas/:id', (req, res) => {
  const { title, description = '', tags = [] } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const existing = db.prepare('SELECT id FROM ideas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(
    `UPDATE ideas SET title = ?, description = ?, tags = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title.trim(), String(description ?? '').trim(), serializeTags(tags), req.params.id);

  const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id);
  res.json(rowToIdea(row));
});

// DELETE /api/ideas/:id
app.delete('/api/ideas/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM ideas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM ideas WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`Idea Bank running at http://localhost:${PORT}`);
});
