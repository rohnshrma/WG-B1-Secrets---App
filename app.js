import { configDotenv } from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import bcrypt from "bcryptjs";

configDotenv();

const app = express();

connectDB();

// user schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
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
      var salt = await bcrypt.genSalt(11);
      var hash = await bcrypt.hash(password, salt);

      const newUser = new User({
        email: username,
        password: hash,
      });

      const savedUser = await newUser.save();
      console.log("Saved User", savedUser);
      res.render("secrets");
    } catch (err) {
      res.status(400).json({ error: "Error Creating new user" });
    }
  });
// -- /login
app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(async function (req, res) {
    const { username, password } = req.body;

    let existingUser;
    try {
      existingUser = await User.findOne({ email: username });
      console.log("Existing user =>", existingUser);

      if (!existingUser) {
        return res
          .status(404)
          .json({ Error: "User not found with this email" });
      }

      var result = await bcrypt.compare(password, existingUser.password);

      if (result) {
        res.render("secrets");
      } else {
        res.status(400).json({ Error: "Incorrect password! Try Again!" });
      }
    } catch (err) {
      res.status(400).json({ Error: "Something went wrong!" });
    }
  });

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port", process.env.PORT);
});
