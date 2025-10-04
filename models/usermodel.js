const mongoose = require("mongoose");

// NOTE: do not call mongoose.connect() here. Connection is handled by the application entrypoint.
const userSchema = new mongoose.Schema({
  Username: String,
  email: String,
  age: Number,
  password: String,
});

module.exports = mongoose.model("User", userSchema);
