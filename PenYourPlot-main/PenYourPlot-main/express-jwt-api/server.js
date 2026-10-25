const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// Demo storage only. Use a database for persistent accounts.
const users = [];

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}

const secret = JWT_SECRET || 'development-only-secret-change-me';

function createToken(user) {
  return jwt.sign(
    { id: user.username },
    secret,
    { expiresIn: '24h' }
  );
}

function publicUser(user) {
  return {
    name: user.name,
    username: user.username,
    email: user.email
  };
}

function verifyToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : req.headers['x-access-token'];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const user = users.find(item => item.username === decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Register
app.post(['/register', '/api/auth/register'], async (req, res) => {
  try {
    const { name, username, email, password } = req.body || {};

    if (
      !name?.trim() ||
      !username?.trim() ||
      !email?.trim() ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: 'Name, username, email and a password of at least 8 characters are required'
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = users.find(user =>
      user.username === normalizedUsername ||
      user.email === normalizedEmail
    );

    if (existing) {
      return res.status(409).json({
        message: 'Username or email is already registered'
      });
    }

    const user = {
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12)
    };

    users.push(user);

    return res.status(201).json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
app.post(['/login', '/api/auth/login'], async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const loginId = (username || email || '').trim().toLowerCase();

    if (!loginId || !password) {
      return res.status(400).json({
        message: 'Username/email and password are required'
      });
    }

    const user = users.find(item =>
      item.username === loginId || item.email === loginId
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: 'Invalid username/email or password'
      });
    }

    return res.json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// Current logged-in user
app.get(['/me', '/api/auth/me'], verifyToken, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Keep the original protected endpoint
app.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    userId: req.user.username
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'PenYourPlot authentication API is running' });
});

// Vercel's Express runtime handles the exported app.
module.exports = app;

// Allow local development too.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
