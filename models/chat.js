const mongoose = require("mongoose");

module.exports = mongoose.model("Chats", new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    isDm: { type: Boolean, required: true },
    users: { type: [String], required: true },
    messages: { type: [], required: true },
    lastMsgTimestamp: { type: Number, required: true },
    owner: { type: String, required: false },
    admins: { type: [String], required: false }
}));