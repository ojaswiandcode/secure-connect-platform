const EventEmitter = require('events');

// Names of every domain event in one place (no typos in strings)
const EVENTS = Object.freeze({
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  NOTE_CREATED: 'note_created',
  NOTE_DELETED: 'note_deleted',
  CHAT_CONNECTED: 'chat_connected',
  CHAT_MESSAGE: 'chat_message'
});

// Counters kept up to date by the listeners below (shown on the admin dashboard)
const stats = {
  signups: 0,
  logins: 0,
  notesCreated: 0,
  notesDeleted: 0,
  chatConnections: 0,
  chatMessages: 0
};

class PlatformEventEmitter extends EventEmitter {}
const appEvents = new PlatformEventEmitter();

const log = (label, details) =>
  console.log(`[EVENT: ${label}] [${new Date().toISOString()}] ${details}`);

appEvents.on(EVENTS.USER_REGISTERED, (user) => {
  stats.signups++;
  log('USER_REGISTERED', `${user.username} <${user.email}> (role: ${user.role})`);
});

appEvents.on(EVENTS.USER_LOGGED_IN, (user) => {
  stats.logins++;
  log('USER_LOGGED_IN', `${user.username} <${user.email}> (role: ${user.role})`);
});

appEvents.on(EVENTS.NOTE_CREATED, (note) => {
  stats.notesCreated++;
  log('NOTE_CREATED', `"${note.title}" (id: ${note._id}, owner: ${note.owner})`);
});

appEvents.on(EVENTS.NOTE_DELETED, (note) => {
  stats.notesDeleted++;
  log('NOTE_DELETED', `"${note.title}" (id: ${note._id}, owner: ${note.owner})`);
});

appEvents.on(EVENTS.CHAT_CONNECTED, ({ username }) => {
  stats.chatConnections++;
  log('CHAT_CONNECTED', `${username} opened a chat connection`);
});

appEvents.on(EVENTS.CHAT_MESSAGE, ({ room, sender }) => {
  stats.chatMessages++;
  log('CHAT_MESSAGE', `${sender} sent a message in room "${room}"`);
});

module.exports = { appEvents, EVENTS, stats };
