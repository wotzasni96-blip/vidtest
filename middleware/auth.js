const bcrypt = require('bcryptjs');

// Simple admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  next();
};

// Admin login handler
const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { error: 'Invalid credentials' });
  }
};

// Admin logout handler
const adminLogout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
};

module.exports = {
  requireAdmin,
  adminLogin,
  adminLogout
};
