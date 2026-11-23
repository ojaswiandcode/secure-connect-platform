const mongoose = require('mongoose');

// Connects to MongoDB; the caller decides what to do if it fails
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_connect_db';
  const conn = await mongoose.connect(uri);
  console.log(`[MongoDB] Connected to ${conn.connection.host}/${conn.connection.name}`);
};

module.exports = connectDB;
