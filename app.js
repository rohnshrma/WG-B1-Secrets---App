import { configDotenv } from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "passport";
import passportLocal from "passport-local";
const LocalStrategy = passportLocal.Strategy;

configDotenv();

const app = express();

connectDB();

// user schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true, minLength: 8 },
});

// model | collection
const User = mongoose.model("User", userSchema);

// ejs
app.set("view engine", "ejs");
// static files
app.use(express.static("public"));
// body parser
app.use(bodyParser.urlencoded({ extended: true }));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: "username" }, async function (
    username,
    password,
    cb
  ) {
    try {
      const user = await User.findOne({ username });

      console.log("strategy : user :", user);

      if (!user) {
        return cb(null, false, { message: "Incorrect email!" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("strategy : isValidPassword :", isValidPassword);
      if (!isValidPassword) {
        return cb(null, false, { message: "Incorrect Password!" });
      }

      cb(null, user, { message: "Logged In" });
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});
passport.deserializeUser(async function (id, cb) {
  try {
    const user = await User.findById(id);
    cb(null, user);
  } catch (err) {
    cb(err, null);
  }
});

// Routes
// -- /home | root
app.route("/").get(function (req, res) {
  res.render("home");
});

// -- /register
app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(async function (req, res) {
    const { username, password } = req.body;

    try {
      const exisitngUser = await User.findOne({ username });
      if (exisitngUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      var salt = await bcrypt.genSalt(11);
      var hash = await bcrypt.hash(password, salt);

      const newUser = new User({
        username: username,
        password: hash,
      });

      const savedUser = await newUser.save();
      console.log("Saved User", savedUser);
      req.login(savedUser, (err) => {
        if (err) {
          res
            .status(400)
            .json({ error: "Error logging in after  registration" });
        }
        return res.redirect("/secrets");
      });
    } catch (err) {
      return res.status(500).json({ error: "Error Creating new user" });
    }
  });
// -- /login
app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(
    passport.authenticate("local", {
      successRedirect: "/secrets",
      failureRedirect: "/login",
      failureFlash: false,
    })
  );

app.route("/secrets").get(ensureAuthenticated, function (req, res) {
  res.render("secrets");
});

app.route("/logout").get(async function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.route("/submit").get(ensureAuthenticated, function (req, res) {
  res.render("submit");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port", process.env.PORT);
});
