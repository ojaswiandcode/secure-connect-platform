const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const { appEvents, EVENTS } = require('../events/eventEmitter');

const RESERVED_USERNAMES = ['system', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

// Cookie lives exactly as long as the JWT
const setTokenCookie = (res, token) => {
  const { exp } = jwt.decode(token);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: exp * 1000 - Date.now()
  });
};

// POST /api/auth/signup  (public). Role is always "user".
const signup = async (req, res) => {
  const { username, email, password } = req.body ?? {};

  if (![username, email, password].every(isText)) {
    return res.status(400).json({ message: 'username, email and password are required' });
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  if (RESERVED_USERNAMES.includes(username.trim().toLowerCase())) {
    return res.status(400).json({ message: 'This username is reserved' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await User.exists({ $or: [{ email: normalizedEmail }, { username: username.trim() }] });
  if (exists) return res.status(409).json({ message: 'User with this email or username already exists' });

  const user = await User.create({
    username: username.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10)
  });

  appEvents.emit(EVENTS.USER_REGISTERED, user);
  res.status(201).json({ message: 'User registered', id: user._id, username: user.username, email: user.email });
};

// POST /api/auth/login  (public). Returns the JWT and also sets it as a cookie.
const login = async (req, res) => {
  const { email, password } = req.body ?? {};
  if (![email, password].every(isText)) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  const passwordMatches = user && (await bcrypt.compare(password, user.password));
  if (!passwordMatches) return res.status(401).json({ message: 'Invalid email or password' });

  const token = signToken(user);
  setTokenCookie(res, token);

  appEvents.emit(EVENTS.USER_LOGGED_IN, user);
  res.json({ message: 'Login successful', token });
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/profile  (JWT required)
const getProfile = (req, res) => res.json(req.user);

module.exports = { signup, login, logout, getProfile };
