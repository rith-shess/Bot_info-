function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }

  // If this is an API call, return JSON 401
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please login to access this resource.'
    });
  }

  // Otherwise redirect to login page
  return res.redirect('/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect('/');
  }
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};
