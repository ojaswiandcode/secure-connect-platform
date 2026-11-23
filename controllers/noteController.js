const mongoose = require('mongoose');
const Note = require('../models/Note');
const { appEvents, EVENTS } = require('../events/eventEmitter');

const isText = (value) => typeof value === 'string' && value.trim().length > 0;

// Runs before every /:id route: valid id -> note exists -> caller owns it.
const loadOwnedNote = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid note id' });

  const note = await Note.findById(id);
  if (!note) return res.status(404).json({ message: 'Note not found' });

  if (note.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: "Access denied: this note belongs to another user" });
  }

  req.note = note;
  next();
};

// POST /api/notes
const createNote = async (req, res) => {
  const { title, content } = req.body ?? {};
  if (![title, content].every(isText)) {
    return res.status(400).json({ message: 'title and content are required' });
  }

  const note = await Note.create({ title, content, owner: req.user._id });
  appEvents.emit(EVENTS.NOTE_CREATED, note);
  res.status(201).json(note);
};

// GET /api/notes  (only the caller's notes, oldest first)
const getNotes = async (req, res) => {
  const notes = await Note.find({ owner: req.user._id }).sort({ createdAt: 1 });
  res.json(notes);
};

// GET /api/notes/:id
const getNote = (req, res) => res.json(req.note);

// PUT /api/notes/:id
const updateNote = async (req, res) => {
  const { title, content } = req.body ?? {};
  if (!isText(title) && !isText(content)) {
    return res.status(400).json({ message: 'Provide a title or content to update' });
  }

  if (isText(title)) req.note.title = title;
  if (isText(content)) req.note.content = content;
  res.json(await req.note.save());
};

// DELETE /api/notes/:id
const deleteNote = async (req, res) => {
  await req.note.deleteOne();
  appEvents.emit(EVENTS.NOTE_DELETED, req.note);
  res.json({ message: 'Note deleted successfully', id: req.note._id });
};

module.exports = { loadOwnedNote, createNote, getNotes, getNote, updateNote, deleteNote };
