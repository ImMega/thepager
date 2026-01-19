require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const userModel = require("./models/user");
const chatModel = require("./models/chat");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const port = 80;
const { createServer } = require("http");
const { Server } = require("socket.io");

const fs = require("fs");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());

app.get('/test', (req, res) => {
    res.sendFile('/pages/main.html', { root: __dirname });
});

app.get('/test/:chatid', async (req, res) => {
    res.sendFile('/pages/main.html', { root: __dirname });
})

app.get('/', (req, res) => {
    if (!req.headers.cookie) return res.redirect("/login");

    const cookies = req.headers.cookie.split("; ");
    const token = cookies.find(c => c.startsWith("token=")).split("=")[1];

    const data = jwt.verify(token, process.env.SECRET);

    if (!data) return res.json({ success: false, message: "Session invalid." })
    
    res.redirect("/chat");
});

app.get('/login', (req, res) => {
    if (!req.headers.cookie) return res.sendFile('/pages/index.html', { root: __dirname });

    const cookies = req.headers.cookie.split("; ");
    const token = cookies.find(c => c.startsWith("token=")).split("=")[1];

    const data = jwt.verify(token, process.env.SECRET);
    
    res.redirect("/chat")
});

app.get('/chat', async (req, res) => {
    res.sendFile('/pages/chat.html', { root: __dirname });
})

app.use('/static', express.static(__dirname + '/static/'));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const passHash = crypto.hash('sha256', password);

    try {
        let userData = await userModel.findOne({ username: username });

        if (userData) return res.json({ success: false, message: "User aleady exists." });

        const user = await userModel.create({ username: username, password: passHash });
        user.save();

        return res.json({ success: true, message: username + " user successfully registered. You can now login." });
    } catch(err) { console.log(err) }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const passHash = crypto.hash('sha256', password);

    let user;
    try {
        user = await userModel.findOne({ username: username });
    } catch(err) { console.log(err) }

    if (!user) return res.json({ success: false, message: "User does not exists. Please register." });

    if (passHash == user.password) {
        const accessToken = jwt.sign({ username: username }, process.env.SECRET);

        res.cookie('token', accessToken, { httpOnly: true, sameSite: 'strict' });
        return res.json({ success: true, message: username + " user successfully logged in." });
    } else {
        return res.json({ success: false, message: "Username or password are not correct." });
    }
});

app.get('/get-user', (req, res) => {
    if (!req.headers.cookie) return res.json({ success: false });

    const cookies = req.headers.cookie.split("; ");
    const token = cookies.find(c => c.startsWith("token=")).split("=")[1];

    const data = jwt.verify(token, process.env.SECRET);

    res.json({ success: true, username: data.username });
});

app.post('/get-chat', async (req, res) => {
    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ success: false, message: "Must provide chat ID" });

    let chatData;
    try {
        chatData = await chatModel.findOne({ id: chatId });
    } catch(err) { console.log(err); return res.json({ success: false }); }

    if (!chatData) return res.status(404).json({ success: false, message: "Chat doesn't exist" });

    return res.json({ success: true, data: chatData });
});

app.post('/get-rooms', async (req, res) => {
    const { username } = req.body;

    let userData;
    let chatData;
    const chats = [];
    console.log("a");
    try {
        userData = await userModel.findOne({ username: username });
        chatData = await chatModel.find({ id: { $in: userData.chats.map(c => c.id) } });
    } catch(err) { console.log(err); return res.json({ success: false }); }

    chatData.forEach(chat => chats.push({ id: chat.id, name: chat.name, lastMsgTimestamp: chat.lastMsgTimestamp, lastSeen: userData.chats.find(c => c.id == chat.id).lastSeen }));

    chats.sort((a, b) => new Date(b.lastMsgTimestamp) - new Date(a.lastMsgTimestamp));

    console.log(chats);
    res.json({ success: true, data: chats });
});

app.get('/logout', (req, res) => {
    res.cookie('token', '', { httpOnly: true, maxAge: 1 });
    res.json({ success: true });
});

const users = {};

io.on("connection", (socket) => {
    if (!socket.handshake.headers.cookie) return;
    
    const cookies = socket.handshake.headers.cookie.split("; ");
    const token = cookies.find(c => c.startsWith("token=")).split("=")[1];

    const data = jwt.verify(token, process.env.SECRET);

    socket.on("chat-user-connected", (chatid, username) => {
        users[socket.id] = { username: username, chatid: chatid };

        socket.join(chatid);
    });

    socket.on("send-message", async (chatid, message) => {
        const currentDate = new Date();

        socket.to(chatid).emit("chat-message", { author: data.username, message: message });
        await chatModel.findOneAndUpdate({ id: chatid }, { $push: { messages: { author: data.username, content: message } }, lastMsgTimestamp: currentDate.getTime() });
    });

    socket.on("disconnect", async () => {
        if (!users[socket.id]) return;

        const currentDate = new Date();

        await userModel.findOneAndUpdate({ username: users[socket.id].username }, { "chats.$[i].lastSeen": currentDate.getTime() }, { arrayFilters: [{ "i.id": users[socket.id].chatid }] });
        delete users[socket.id];
    });
});

mongoose.connect(process.env.MONGO)
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log(err));

httpServer.listen(port, () => {
    console.log("Listening to port " + port);
});