const bcrypt = require('bcryptjs');
const db = require('../database');

const authController = {
  login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required.'
        });
      }

      const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.'
        });
      }

      const isMatch = bcrypt.compareSync(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.'
        });
      }

      // Establish session
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      req.session.adminFullName = admin.full_name;

      return res.json({
        success: true,
        message: 'Login successful.',
        admin: {
          id: admin.id,
          username: admin.username,
          fullName: admin.full_name
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during login.'
      });
    }
  },

  logout(req, res) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Failed to logout.'
        });
      }
      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  },

  getCurrentAdmin(req, res) {
    if (req.session && req.session.adminId) {
      return res.json({
        authenticated: true,
        admin: {
          id: req.session.adminId,
          username: req.session.adminUsername,
          fullName: req.session.adminFullName
        }
      });
    }
    return res.json({ authenticated: false });
  }
};

module.exports = authController;
