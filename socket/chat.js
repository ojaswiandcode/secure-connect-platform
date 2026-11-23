const User = require('../models/User');
const { verifyToken, tokenFromHeaders } = require('../utils/token');
const { appEvents, EVENTS } = require('../events/eventEmitter');

const DEFAULT_ROOM = 'general';
const ROOM_NAME = /^[\w-]{1,30}$/;
const MAX_MESSAGE_LENGTH = 500;

const systemMessage = (room, message) => ({
  sender: 'System',
  message,
  room,
  timestamp: new Date().toISOString()
});

const joinRoom = (socket, room) => {
  const { username } = socket.data.user;
  socket.join(room);
  console.log(`${socket.id} joined room ${room}`);
  socket.to(room).emit('receive_message', systemMessage(room, `${username} has joined the room.`));
  socket.emit('joined_room_ack', { status: 'success', room, username, message: `You joined room: ${room}` });
};

const initChatSocket = (io) => {
  // Only logged-in users can connect. The username always comes from the JWT.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || tokenFromHeaders(socket.handshake.headers);
      if (!token) return next(new Error('No token provided'));

      const payload = verifyToken(token);
      const user = await User.findById(payload.id).select('username role');
      if (!user) return next(new Error('User no longer exists'));

      socket.data.user = { id: user.id, username: user.username, role: user.role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { username } = socket.data.user;
    console.log(`User connected: ${socket.id}`);
    appEvents.emit(EVENTS.CHAT_CONNECTED, { username });

    joinRoom(socket, DEFAULT_ROOM);

    // Client -> Server: { room }
    socket.on('join_room', (data) => {
      const room = typeof data?.room === 'string' ? data.room.trim() : '';
      if (!ROOM_NAME.test(room)) {
        return socket.emit('error_message', { message: 'Invalid room name (letters, numbers, - and _ only)' });
      }
      joinRoom(socket, room);
    });

    // Client -> Server: { room, message }. Everyone in the room receives "receive_message".
    socket.on('send_message', (data) => {
      const room = data?.room || DEFAULT_ROOM;
      const text = typeof data?.message === 'string' ? data.message.trim() : '';

      if (!text) return;
      if (!socket.rooms.has(room)) {
        return socket.emit('error_message', { message: `Join room "${room}" before sending messages` });
      }

      const payload = {
        sender: username,
        message: text.slice(0, MAX_MESSAGE_LENGTH),
        room,
        timestamp: new Date().toISOString()
      };

      console.log(`[${room}] ${payload.sender}: ${payload.message}`);
      appEvents.emit(EVENTS.CHAT_MESSAGE, payload);
      io.to(room).emit('receive_message', payload);
    });

    // "disconnecting" still knows which rooms the socket was in
    socket.on('disconnecting', () => {
      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.to(room).emit('receive_message', systemMessage(room, `${username} has left the room.`));
      });
    });

    socket.on('disconnect', (reason) => console.log(`User disconnected: ${socket.id} (${reason})`));
  });
};

module.exports = initChatSocket;
