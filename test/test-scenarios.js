/**
 * Automated verification for Lab 4 - Secure Connect and Communication Platform.
 * Start the server first (npm start), then run: npm test
 */
require('dotenv').config({ quiet: true });
const ioClient = require('socket.io-client');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const PASSWORD = 'Password@123';
const unique = Date.now();

let passed = 0;
let failed = 0;

const request = async (method, path, { body, token, headers = {} } = {}) => {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers
    },
    body: body && JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, res };
};

const check = (name, condition, detail = '') => {
  if (condition) {
    passed++;
    console.log(`\x1b[32m  PASS\x1b[0m ${name}${detail ? `  ->  ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`\x1b[31m  FAIL\x1b[0m ${name}${detail ? `  ->  ${detail}` : ''}`);
  }
};

const section = (title) => console.log(`\n${title}`);

const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = ioClient(BASE_URL, { auth: { token }, reconnection: false });
    socket.on('joined_room_ack', () => resolve(socket)); // first ack = auto-joined "general"
    socket.on('connect_error', reject);
  });

const waitFor = (socket, event, predicate = () => true, ms = 4000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), ms);
    socket.on(event, function handler(data) {
      if (!predicate(data)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    });
  });

const signupAndLogin = async (username) => {
  const email = `${username}_${unique}@example.com`;
  const signup = await request('POST', '/api/auth/signup', { body: { username: `${username}_${unique}`, email, password: PASSWORD } });
  const login = await request('POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  return { email, signup, login, token: login.body.token, username: `${username}_${unique}` };
};

const run = async () => {
  console.log(`\nLab 4 verification - target ${BASE_URL}`);

  // ---------------------------------------------------------- Signup and Login
  section('1. Signup and Login');
  const alice = await signupAndLogin('alice');
  check('Signup returns 201 and "User registered"', alice.signup.status === 201 && alice.signup.body.message === 'User registered');
  check('Signup response has id, username, email and no password',
    alice.signup.body.id && alice.signup.body.username === alice.username && alice.signup.body.email === alice.email && !('password' in alice.signup.body));

  const duplicate = await request('POST', '/api/auth/signup', { body: { username: 'someone_else', email: alice.email, password: PASSWORD } });
  check('Duplicate email is rejected with 409', duplicate.status === 409, duplicate.body.message);

  const badInput = await request('POST', '/api/auth/signup', { body: { username: 'x', email: 'not-an-email', password: '123' } });
  check('Invalid signup data is rejected with 400', badInput.status === 400, badInput.body.message);

  check('Login returns 200, "Login successful" and a JWT', alice.login.status === 200 && alice.login.body.message === 'Login successful' && alice.login.body.token?.split('.').length === 3);

  const wrong = await request('POST', '/api/auth/login', { body: { email: alice.email, password: 'WrongPassword!' } });
  check('Wrong password is rejected with 401', wrong.status === 401, wrong.body.message);

  // ---------------------------------------------------------- JWT + protected routes
  section('2. JWT Authentication and Protected Routes');
  const noToken = await request('GET', '/api/notes');
  check('Notes without a token -> 403 "No token provided"', noToken.status === 403 && noToken.body.message === 'No token provided');

  const badToken = await request('GET', '/api/notes', { token: 'not.a.token' });
  check('Notes with an invalid token -> 401', badToken.status === 401, badToken.body.message);

  const profile = await request('GET', '/api/auth/profile', { token: alice.token });
  check('Profile with a valid token -> 200 (no password hash)', profile.status === 200 && profile.body.username === alice.username && !('password' in profile.body));

  const setCookie = alice.login.res.headers.getSetCookie?.()[0] ?? '';
  const viaCookie = await request('GET', '/api/auth/profile', { headers: { Cookie: setCookie.split(';')[0] } });
  check('JWT in the "token" cookie is accepted too', setCookie.startsWith('token=') && viaCookie.status === 200);

  // ---------------------------------------------------------- Notes API
  section('3. Secure Notes API');
  const created = await request('POST', '/api/notes', { token: alice.token, body: { title: 'My First Note', content: 'This is my first note of web dev -III' } });
  check('Create note -> 201 with _id, owner, timestamps', created.status === 201 && created.body._id && created.body.owner && created.body.createdAt);
  const noteId = created.body._id;

  await request('POST', '/api/notes', { token: alice.token, body: { title: 'My Second Note', content: 'This is my second note of web dev -III' } });
  const list = await request('GET', '/api/notes', { token: alice.token });
  check('List notes -> 200 array with both notes, oldest first',
    list.status === 200 && Array.isArray(list.body) && list.body.length === 2 && list.body[0].title === 'My First Note');

  const one = await request('GET', `/api/notes/${noteId}`, { token: alice.token });
  check('Get one note -> 200', one.status === 200 && one.body._id === noteId);

  const updated = await request('PUT', `/api/notes/${noteId}`, { token: alice.token, body: { title: 'My First Note (Updated)' } });
  check('Update note -> 200', updated.status === 200 && updated.body.title === 'My First Note (Updated)');

  const bob = await signupAndLogin('bob');
  const bobNotes = await request('GET', '/api/notes', { token: bob.token });
  check('Another user sees none of Alice\'s notes', bobNotes.status === 200 && bobNotes.body.length === 0);

  const stolen = await request('GET', `/api/notes/${noteId}`, { token: bob.token });
  check('Reading another user\'s note -> 403', stolen.status === 403, stolen.body.message);
  const stolenEdit = await request('PUT', `/api/notes/${noteId}`, { token: bob.token, body: { title: 'hacked' } });
  check('Editing another user\'s note -> 403', stolenEdit.status === 403);
  const stolenDelete = await request('DELETE', `/api/notes/${noteId}`, { token: bob.token });
  check('Deleting another user\'s note -> 403', stolenDelete.status === 403);

  const badId = await request('GET', '/api/notes/123', { token: alice.token });
  check('Malformed note id -> 400', badId.status === 400);

  const deleted = await request('DELETE', `/api/notes/${noteId}`, { token: alice.token });
  const gone = await request('GET', `/api/notes/${noteId}`, { token: alice.token });
  check('Delete note -> 200, then 404', deleted.status === 200 && gone.status === 404);

  // ---------------------------------------------------------- RBAC
  section('4. Role-Based Access Control');
  const dashAsUser = await request('GET', '/api/admin/dashboard', { token: alice.token });
  check('Normal user on admin route -> 403', dashAsUser.status === 403, dashAsUser.body.message);

  const sneaky = await request('POST', '/api/auth/signup', { body: { username: `sneaky_${unique}`, email: `sneaky_${unique}@example.com`, password: PASSWORD, role: 'admin' } });
  const sneakyLogin = await request('POST', '/api/auth/login', { body: { email: `sneaky_${unique}@example.com`, password: PASSWORD } });
  const sneakyDash = await request('GET', '/api/admin/dashboard', { token: sneakyLogin.body.token });
  check('Signing up with role "admin" does NOT grant admin', sneaky.status === 201 && sneakyDash.status === 403);

  let adminToken = null;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminLogin = await request('POST', '/api/auth/login', { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    adminToken = adminLogin.body.token;
    const dash = await request('GET', '/api/admin/dashboard', { token: adminToken });
    check('Admin on admin dashboard -> 200', dash.status === 200 && typeof dash.body.totalUsers === 'number', `users: ${dash.body.totalUsers}`);
    const users = await request('GET', '/api/admin/users', { token: adminToken });
    check('Admin can list users, hashes never exposed', users.status === 200 && Array.isArray(users.body) && users.body.every((u) => !('password' in u)));
  } else {
    console.log('  (skipped admin checks: ADMIN_EMAIL / ADMIN_PASSWORD not set in .env)');
  }

  // ---------------------------------------------------------- Chat
  section('5. Real-Time Chat (Socket.IO)');
  const rejected = await new Promise((resolve) => {
    const socket = ioClient(BASE_URL, { reconnection: false });
    socket.on('connect', () => { socket.disconnect(); resolve(null); });
    socket.on('connect_error', (err) => { socket.disconnect(); resolve(err.message); });
  });
  check('Socket without a token is rejected', rejected === 'No token provided', rejected);

  const sockA = await connectSocket(alice.token);
  const sockB = await connectSocket(bob.token);
  check('Two authenticated clients connected', sockA.connected && sockB.connected);

  const joined = waitFor(sockB, 'joined_room_ack', (d) => d.room === 'lab4-room');
  sockB.emit('join_room', { room: 'lab4-room' });
  await joined;
  sockA.emit('join_room', { room: 'lab4-room' });
  await waitFor(sockA, 'joined_room_ack', (d) => d.room === 'lab4-room');

  const incoming = waitFor(sockB, 'receive_message', (m) => m.sender !== 'System');
  sockA.emit('send_message', { room: 'lab4-room', message: 'Hey team, backend is ready', sender: 'FakeName' });
  const msg = await incoming;
  check('Message is delivered to the other client in real time', msg.message === 'Hey team, backend is ready' && msg.room === 'lab4-room');
  check('Sender comes from the JWT, a spoofed name is ignored', msg.sender === alice.username, msg.sender);

  sockB.emit('send_message', { room: 'room-i-never-joined', message: 'sneaky' });
  const errorMsg = await waitFor(sockB, 'error_message');
  check('Cannot post to a room you have not joined', /Join room/.test(errorMsg.message));

  // ---------------------------------------------------------- Events
  section('6. Event-Driven Features (EventEmitter)');
  if (adminToken) {
    const dash = await request('GET', '/api/admin/dashboard', { token: adminToken });
    const e = dash.body.events;
    check('Listeners counted signups, logins, notes and chat activity',
      e.signups >= 3 && e.logins >= 3 && e.notesCreated >= 2 && e.notesDeleted >= 1 && e.chatMessages >= 1 && e.chatConnections >= 2,
      JSON.stringify(e));
  } else {
    console.log('  (skipped: needs the admin account)');
  }
  console.log('  Check the server terminal for the [EVENT: ...] log lines.');

  sockA.disconnect();
  sockB.disconnect();
};

run()
  .catch((err) => {
    failed++;
    console.error('\nTest run aborted:', err.message);
  })
  .finally(() => {
    console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
    process.exit(failed === 0 ? 0 : 1);
  });
