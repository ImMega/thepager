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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// express middlewares
app.use(express.json());
app.use('/static', express.static(__dirname + '/static/'));

function getTokenCookie(cookie) {
    const cookies = cookie.split("; ");
    const tokenFind = cookies.find(c => c.startsWith("token="));
    const token = tokenFind ? tokenFind.split("=")[1] : false;

    return token;
}

// express routes
app.get('/', (req, res) => {
    const token = getTokenCookie(req.headers.cookie);

    if (!token) return res.redirect("/login");

    const data = jwt.verify(token, process.env.SECRET);

    if (!data) return res.json({ success: false, message: "Session invalid." })
    
    res.redirect("/chat");
});

app.get('/chat', (req, res) => {
    res.sendFile('/pages/main.html', { root: __dirname });
});

app.get('/chat/:chatid', (req, res) => {
    res.sendFile('/pages/main.html', { root: __dirname });
});

app.get('/login', (req, res) => {
    const token = getTokenCookie(req.headers.cookie);

    if (!token) return res.sendFile('/pages/index.html', { root: __dirname });

    const data = jwt.verify(token, process.env.SECRET);
    
    res.redirect("/chat")
});

// API end-points
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
    const token = getTokenCookie(req.headers.cookie);

    if (!token) return res.json({ success: false });

    const data = jwt.verify(token, process.env.SECRET);

    res.json({ success: true, username: data.username });
});

app.post('/verify-user', async (req, res) => {
    const { username } = req.body;

    let userData;
    try {
        userData = await userModel.findOne({ username: username })
    } catch(err) { console.log(err); return res.json({ success: false }); }

    if (userData) {
        res.json({ success: true, exists: true });
    } else {
        res.json({ success: true, exists: false });
    }
});

app.post('/get-chat', async (req, res) => {
    const token = getTokenCookie(req.headers.cookie);

    if (!token) return res.sendFile('/pages/index.html', { root: __dirname });

    const data = jwt.verify(token, process.env.SECRET);

    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ success: false, message: "Must provide chat ID" });

    let chatData;
    try {
        chatData = await chatModel.findOne({ id: chatId });
    } catch(err) { console.log(err); return res.json({ success: false }); }

    if (!chatData) return res.status(404).json({ success: false, message: "Chat doesn't exist" });
    if (chatId != "global-chat" && !chatData.users.includes(data.username)) return res.status(403).json({ success: false, message: "You don't have access to this chat" });

    return res.json({ success: true, data: chatData, name: chatData.isDm ? chatData.name.replace(", ", "").replace(data.username, "") : chatData.name });
});

app.post('/create-chat', async (req, res) => {
    const token = getTokenCookie(req.headers.cookie);

    if (!token) return res.sendFile('/pages/index.html', { root: __dirname });

    const data = jwt.verify(token, process.env.SECRET);

    let { name, users, isDm } = req.body;
    users.unshift(data.username);
    const currentDate = new Date();
    if (isDm) name = name.replace(", ", "").replace(data.username, "");

    try {
        let id;
        while (!id) {
            const generatedId = Math.random().toString(16).slice(2);

            const chatCheck = await chatModel.findOne({ id: generatedId });

            if (!chatCheck) id = generatedId;
        }

        const chat = await chatModel.create({ id: id, name: isDm ? data.username + ", " + users[1] : name, isDm: isDm, users: users, lastMsgTimestamp: currentDate.getTime(), owner: isDm ? undefined : data.username, admins: isDm ? undefined : [data.username] });
        chat.save();

        await userModel.findOneAndUpdate({ username: data.username }, { $push: { chats: { id: id, lastSeen: currentDate.getTime() } } });

        res.json({ success: true, data: { id: chat.id, name: isDm ? chat.name.replace(", ", "").replace(data.username, "") : chat.name, isDm: chat.isDm }, message: "Chat created" });
    } catch(err) { console.log(err); return res.json({ success: false }); }
});

app.post('/get-rooms', async (req, res) => {
    const { username } = req.body;

    let userData;
    let chatData;
    const chats = [];
    
    try {
        userData = await userModel.findOne({ username: username }); 
        chatData = await chatModel.find({ users: username }); 
        let modifiedData = false;
        for (let i = 0; i < chatData.length; i++) {
            if (!userData.chats.find(e => e.id == chatData[i].id)) await userData.updateOne({ $push: { chats: { id: chatData[i].id, lastSeen: 0 } } });
            if (!modifiedData) modifiedData = true;
        }

        if (modifiedData) userData = await userModel.findOne({ username: username });
    } catch(err) { console.log(err); return res.json({ success: false }); }

    chatData.forEach(chat => {
        let name = chat.name;
        if (chat.isDm) name = chat.name.replace(", ", "").replace(username, "");

        chats.push({
            id: chat.id,
            name: name,
            isDm: chat.isDm,
            lastMsgTimestamp: chat.lastMsgTimestamp,
            lastSeen: userData.chats.find(c => c.id == chat.id).lastSeen
        });
    });

    chats.sort((a, b) => new Date(b.lastMsgTimestamp) - new Date(a.lastMsgTimestamp));

    res.json({ success: true, data: chats });
});

app.get('/logout', (req, res) => {
    res.cookie('token', '', { httpOnly: true, maxAge: 0 });
    res.cookie('darkmode', '', { maxAge: 0 })
    res.json({ success: true });
});

// teapot.
app.get('/teapot', (req, res) => {
    res.sendFile('/pages/teapot.html', { root: __dirname });
});

app.get('/coffee', (req, res) => {
    res.sendFile('/pages/teapot.html', { root: __dirname });
});

// 404 handling
app.use((req, res, next) => { res.status(404).sendFile('/pages/notFound.html', { root: __dirname }) });

// socket.io implementation
const users = {};
const chats = {};

io.on("connection", (socket) => {
    const token = getTokenCookie(socket.handshake.headers.cookie);

    if (!token) return;

    const data = jwt.verify(token, process.env.SECRET);

    socket.data.username = data.username;

    users[socket.id] = { username: data.username, chatid: false }

    socket.on("chat-user-connected", (chatid, username) => {
        socket.data.currentChat = chatid;

        if (!chats[chatid]) chats[chatid] = { users: {} }

        chats[chatid].users[username] = socket.id;
        users[socket.id] = { username: username, chatid: chatid };

        socket.join(chatid);
    });

    socket.on("send-message", async (chatid, message) => {
        const currentDate = new Date();

        socket.to(chatid).emit("chat-message", { author: data.username, message: message });
        await chatModel.findOneAndUpdate({ id: chatid }, { $push: { messages: { author: data.username, content: message } }, lastMsgTimestamp: currentDate.getTime() });

        const chatData = await chatModel.findOne({ id: chatid });

        const usersSockets = Object.keys(users);
        const onlineChatUsersSockets = usersSockets.filter(socketId => { return chatData.users.includes(users[socketId].username); });
        const inactiveOnlineChatUsersSockets = onlineChatUsersSockets.filter(socketId => { return !chats[chatid].users[users[socketId].username]; });

        inactiveOnlineChatUsersSockets.forEach(socketId => socket.to(socketId).emit("direct-new-room-message", chatid));
    });

    socket.on("disconnect", async () => {
        if (!users[socket.id] || !Object.keys(chats).length) return;

        const currentDate = new Date();
        const user = users[socket.id];

        if (!user.chatid) return;

        await userModel.findOneAndUpdate({ username: user.username }, { "chats.$[i].lastSeen": currentDate.getTime() }, { arrayFilters: [{ "i.id": user.chatid }] });
        delete chats[user.chatid].users[user.username];
        delete users[socket.id];
        if (!Object.keys(chats[user.chatid].users).length) delete chats[user.chatid];
    });
});

// Database and HTTP server initialization
mongoose.connect(process.env.MONGO)
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log(err));

httpServer.listen(port, () => {
    console.log("Listening to port " + port);
});