const mongoose = require("mongoose");

module.exports = mongoose.model("Chats", new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    users: { type: [String], required: true },
    messages: { type: [], required: true },
    lastMsgTimestamp: { type: Number, required: true }
}));