const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../models/userModel');

const router = express.Router();

// Register a new user
router.post('/', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
          `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
          [name, email, hashedPassword],
          function (err) {
              if (err) {
                  return res.status(500).json({ message: "Error saving user." });
              }
              res.status(201).json({ message: "User registered successfully!" });
          }
      );
    } catch (error) {
      return res.status(500).json({ message: "Error processing registration." });
    }
});

module.exports = router;
