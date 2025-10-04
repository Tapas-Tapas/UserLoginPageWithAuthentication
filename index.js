// const express = require('express')
// const app = express()
// const port = 3000
// var bcrypt = require('bcryptjs');
// const cookieParser = require('cookie-parser')
// const jwt = require('jsonwebtoken')
// const path=require('path')
// const User=require('./models/usermodel')

// //middleware
// app.use(cookieParser())
// app.use(express.static(path.join(__dirname, 'public')))
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.set('view engine', 'ejs')

// app.get('/', (req, res) => {
//   res.render('index' )
// })

// app.post('/create', async (req, res) => {
//     const {Username,email,age,password}=req.body;
//     const hashedPassword=await bcrypt.hash(password,10); //hashing password
//     const user=new User({
//         Username,
//         email,
//         age,
//         password:hashedPassword
//     });
//     await user.save();
//     let token=jwt.sign({id:user._id},'jwtsecretkey'); //generating token
//     res.cookie('token',token,{
//         httpOnly:true,
//         expires:new Date(Date.now()+60*1000) //cookie expires in 1 min
//     });
//     // res.redirect('/');
//     res.send(user);
// });

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`)
// })
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "jwtsecretkey";

// Optional MongoDB connection (set MONGODB_URI in .env)
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.warn("MongoDB connect failed:", err.message));
} else {
  console.warn(
    "MONGODB_URI not provided — continue without DB or set it in .env"
  );
}

// Expect a Mongoose model at ./models/usermodel.js
let User = null;
try {
  User = require("./models/usermodel");
} catch (err) {
  console.warn(
    "User model not found at ./models/usermodel.js — make sure to add one if you want DB persistence"
  );
}

// Middleware
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// session middleware (server-side session storage). For production use a store like Redis.
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev_session_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60,
    },
  })
);
app.set("view engine", "ejs");

// JWT authentication middleware - checks cookie first then Authorization header
function authenticateJWT(req, res, next) {
  // Prefer server session
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  // Fallback: allow JWT in Authorization header for API clients
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = payload;
    next();
  });
}

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

// remove client-side secret; session-based auth will be used
app.get("/register", (req, res) => res.render("register"));
app.get("/login", (req, res) => res.render("login"));

// Register
app.post("/register", async (req, res) => {
  try {
    const { Username, email, age, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    if (!User) {
      // simple in-memory fallback if no User model
      return res.status(500).json({
        error:
          "User model not available. Add ./models/usermodel.js or configure DB.",
      });
    }

    const existing = await User.findOne({ email }).exec();
    if (existing)
      return res
        .status(409)
        .json({ error: "User with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ Username, email, age, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    // Save minimal session info server-side
    req.session.user = { id: user._id, email: user.email };
    return res
      .status(201)
      .json({
        message: "User created",
        user: { id: user._id, email: user.email },
      });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    if (!User)
      return res.status(500).json({
        error:
          "User model not available. Add ./models/usermodel.js or configure DB.",
      });

    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    // Save session server-side; client will keep only session cookie
    req.session.user = { id: user._id, email: user.email };
    return res.json({ message: "Logged in" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Protected example
app.get("/dashboard", authenticateJWT, async (req, res) => {
  if (!User)
    return res.status(500).json({ error: "User model not available." });
  const user = await User.findById(req.user.id)
    .select("-password")
    .lean()
    .exec();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.render("dashboard", { user });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.clearCookie("sid");
    res.clearCookie("token");
    return res.json({ message: "Logged out" });
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(port, () => console.log(`Server listening on port ${port}`));

module.exports = app;
