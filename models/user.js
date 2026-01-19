const mongoose = require("mongoose");

module.exports = mongoose.model("Users", new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    chats: { type: [], required: true },
    password: { type: String }
}));