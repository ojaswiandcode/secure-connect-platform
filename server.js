require('dotenv').config({ quiet: true });
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const seedAdmin = require('./config/seedAdmin');
const initChatSocket = require('./socket/chat');
require('./events/eventEmitter'); // registers all event listeners

const PORT = process.env.PORT || 5000;

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  }

  await connectDB();
  await seedAdmin();

  const server = http.createServer(app);
  initChatSocket(new Server(server));

  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log('[server] Socket.IO ready for connections');
  });
};

start().catch((err) => {
  console.error(`[Startup failed] ${err.message}`);
  process.exit(1);
});
