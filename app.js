const path = require('path');
const express = require('express');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // browser chat client

app.get('/api/health', (req, res) =>
  res.json({ message: 'Secure Connect and Communication Platform API is running' })
);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
