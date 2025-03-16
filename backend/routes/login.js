const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../models/userModel'); // Ensure this points to your SQLite connection

const router = express.Router();

router.post('/', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }
  
  const sql = "SELECT * FROM users WHERE email = ?";
  db.get(sql, [email], (err, user) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Internal server error.");
    }
    if (!user) {
      return res.status(401).send("Invalid credentials.");
    }
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error("Bcrypt error:", err);
        return res.status(500).send("Error verifying password.");
      }
      if (result) {
        // Set the session with the user info
        req.session.user = { id: user.id, name: user.name, email: user.email };
        // Redirect to the dashboard/home page
        return res.redirect('/index.html');
      } else {
        return res.status(401).send("Invalid credentials.");
      }
    });
  });
});

module.exports = router;
