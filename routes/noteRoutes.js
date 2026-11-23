const express = require('express');
const {
  loadOwnedNote, createNote, getNotes, getNote, updateNote, deleteNote
} = require('../controllers/noteController');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken); // every notes route needs a valid JWT

router.route('/').get(getNotes).post(createNote);
router.route('/:id').all(loadOwnedNote).get(getNote).put(updateNote).delete(deleteNote);

module.exports = router;
