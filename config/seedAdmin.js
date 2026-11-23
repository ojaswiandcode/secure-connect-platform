const bcrypt = require('bcrypt');
const User = require('../models/User');

// Creates the admin account from .env once. Signup can never create admins.
const seedAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('[Seed] ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin account');
    return;
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) return;

  await User.create({
    username: 'admin',
    email,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: 'admin'
  });
  console.log(`[Seed] Admin account created: ${email}`);
};

module.exports = seedAdmin;
