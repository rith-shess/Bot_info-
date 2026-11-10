const express = require('express');
const path = require('path');
const router = express.Router();
const { requireAuth, redirectIfAuthenticated } = require('../middleware/auth');
const config = require('../config');

// Dashboard view (protected)
router.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(config.paths.views, 'index.html'));
});

// Login view (public for non-logged in)
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(config.paths.views, 'login.html'));
});

// Logout endpoint for view links
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;
