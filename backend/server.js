const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middleware for parsing JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure sessions
app.use(session({
  secret: 'your_secret_key', // Replace with a secure secret in production
  resave: false,
  saveUninitialized: false
}));

// Serve static files from the frontend folder with index disabled
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));

// Initialize SQLite Database
const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error("Database error:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      location TEXT,
      colonyNumber TEXT,
      aadhar TEXT UNIQUE NOT NULL
    )`, (err) => {
      if (err) console.error("Table creation error:", err.message);
      else console.log("Users table is ready.");
    });
  }
});

/// -------------------------
// Registration Route
// -------------------------
app.post('/register', (req, res) => {
  const { fullName, email, password, confirmPassword, location, colonyNumber, aadhar } = req.body;

  // Validate all required fields
  if (!fullName || !email || !password || !confirmPassword || !location || !colonyNumber || !aadhar) {
    return res.status(400).send("All fields are required.");
  }
  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match.");
  }
  if (!/^\d{12}$/.test(aadhar)) {
    return res.status(400).send("Aadhar number must be exactly 12 digits.");
  }

  //  Check for existing email or Aadhar number
  db.get("SELECT email, aadhar FROM users WHERE email = ? OR aadhar = ?", [email, aadhar], (err, user) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Internal server error.");
    }
    if (user) {
      if (user.email === email) return res.status(400).send("Email already registered.");
      if (user.aadhar === aadhar) return res.status(400).send("Aadhar number already registered.");
    }

    //  Hash password before storing
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error("Hashing error:", err.message);
        return res.status(500).send("Error processing registration.");
      }

      //  Insert new user into database
      const sql = `INSERT INTO users (name, email, password, location, colonyNumber, aadhar) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(sql, [fullName, email, hash, location, colonyNumber, aadhar], function(err) {
        if (err) {
          console.error("Database insert error:", err.message);
          return res.status(500).send("Error inserting user.");
        }
        // Registration successful → Redirect to login page
        res.redirect('/login.html');
      });
    });
  });
});

// -------------------------
// Login Route
// -------------------------
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const sql = "SELECT * FROM users WHERE email = ?";
  db.get(sql, [email], (err, user) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error("Bcrypt error:", err);
        return res.status(500).json({ error: "Error verifying password." });
      }
      if (result) {
        req.session.user = { id: user.id, name: user.name, email: user.email };
        return res.json({ message: "Login successful", user: { id: user.id, name: user.name, email: user.email } });
      } else {
        return res.status(401).json({ error: "Invalid credentials." });
      }
    });
  });
});

// -------------------------
// Setup for Issue Reporting
// -------------------------
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Initialize SQLite database for issues
const issuesDb = new sqlite3.Database('issues.db', (err) => {
  if (err) {
    console.error("Issues DB error:", err.message);
  } else {
    console.log("Connected to Issues SQLite database.");
    issuesDb.run(`CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        location TEXT,
        latitude TEXT,
        longitude TEXT,
        imageBlob BLOB,
        voteCount INTEGER DEFAULT 0
      )`, (err) => {
        if (err) console.error("Issues table creation error:", err.message);
        else console.log("Issues table is ready.");
      });           
  }
});

// GET /reports: Return all issues as JSON
app.get('/reports', (req, res) => {
  issuesDb.all("SELECT * FROM issues ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("Error fetching reports:", err.message);
      return res.status(500).json({ error: "Error fetching reports" });
    }
    // Return an object with a 'reports' property containing the rows
    res.json({ reports: rows });
  });
});

// -------------------------
// Report an Issue Route
// -------------------------
app.post('/submitIssue', upload.single('image'), (req, res) => {
  const { title, category, description, location, latitude, longitude } = req.body;
  let imageData = null;
  if (req.file) {
    imageData = fs.readFileSync(req.file.path);
  }
  if (!title || !category || !description || !location) {
    return res.status(400).send("Title, category, description, and location are required.");
  }
  const sql = `INSERT INTO issues (title, category, description, location, latitude, longitude, imageBlob, voteCount)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)`;
  issuesDb.run(sql, [title, category, description, location, latitude, longitude, imageData], function(err) {
    if (err) {
      console.error("Error inserting issue:", err.message);
      return res.status(500).send("Error inserting issue: " + err.message);
    }
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.redirect('/report_success.html');
  });
});

// -------------------------
// Upvote Route
// -------------------------

db.run(`CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  issueId INTEGER NOT NULL,
  UNIQUE(userId, issueId)
)`, (err) => {
  if (err) console.error("Votes table creation error:", err.message);
  else console.log("Votes table is ready.");
});

// -------------------------
// Upvote Route (No login check)
// -------------------------
app.post('/upvote', (req, res) => {
  const { reportId } = req.body;
  
  // Update the vote count in the issues table using issuesDb
  issuesDb.run("UPDATE issues SET voteCount = voteCount + 1 WHERE id = ?", [reportId], function(err) {
    if (err) {
      console.error("Error updating vote count:", err.message);
      return res.status(500).json({ error: "Error updating vote count" });
    }
    // Retrieve and return the updated vote count from issuesDb
    issuesDb.get("SELECT voteCount FROM issues WHERE id = ?", [reportId], (err, row) => {
      if (err) {
        console.error("Error retrieving vote count:", err.message);
        return res.status(500).json({ error: "Error retrieving vote count" });
      }
      res.json({ voteCount: row.voteCount });
    });
  });
});

// -------------------------
// Get All Reports Route
// -------------------------
app.get('/reports', (req, res) => {
  issuesDb.all("SELECT * FROM issues ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("Error fetching reports:", err.message);
      return res.status(500).json({ error: "Error fetching reports" });
    }
    res.json({ reports: rows });
  });
});

// -------------------------
// Protected Routes and Authentication Middleware
// -------------------------
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login.html');
}

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out.");
    }
    res.redirect('/login.html');
  });
});

// Force root ("/") to always redirect to login.html
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Protected route for dashboard
app.get('/index.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API endpoint to fetch user details (for displaying in the dashboard)
app.get('/api/user', isAuthenticated, (req, res) => {
  res.json({ user: req.session.user });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
