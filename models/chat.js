const mongoose = require("mongoose");

module.exports = mongoose.model("Chats", new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    messages: { type: [], required: true }
}));