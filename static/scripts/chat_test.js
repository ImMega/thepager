var username;
const socket = io();
var chatid;
var newdmgroup = 0;
var newchatusers = [];


window.onload = fetch('/get-user').then((res) => {
    res.json().then(async (data) => {
        if (!data.success) return document.location.href = "/login";

        username = data.username;

        document.getElementById("greeting").innerHTML = "Hi, " + data.username + "!";

        chatid = document.location.pathname.split("/")[2];

        if (chatid == "global-chat") document.getElementById("global-chat").classList.add("room-active");

        const roomsRes = await fetch('/get-rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username }) });
        const roomsJson = await roomsRes.json();
        const roomsData = roomsJson.data;
        const rooms = document.createDocumentFragment();

        if (!roomsData.length) {
            const noChatsElement = document.createElement("p");
            noChatsElement.classList.add("no-chats-text")
            noChatsElement.innerText = "You have no chats.\n You can try creating some!";

            rooms.appendChild(noChatsElement);
        }

        if (roomsData) for (var i = 0; i < roomsData.length; i++) {
            const thisRoom = roomsData[i];
            const roomElement = roomElCreate(thisRoom.id, thisRoom.name, false);

            rooms.appendChild(roomElement);
        }

        document.getElementById("room-list").append(rooms);

        if (roomsData) for (var i = 0; i < roomsData.length; i++) {
            document.getElementById(roomsData[i].id).addEventListener("click", function () { switchChat(this.id) });
        }

        if (!chatid) return;

        const chatRes = await fetch('/get-chat', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: chatid }) });
        const chatJson = await chatRes.json();

        if (chatRes.status == 404) return document.location.href = "/test";

        socket.emit("chat-user-connected", chatid, username);

        const chatbox = document.getElementById("chatbox");
        const msgsData = chatJson.data.messages;
        const msgs = document.createDocumentFragment();

        for (var i = 0; i < msgsData.length; i++) {
            const thisMsg = msgsData[i];

            if (i > 0) {
                const lastMsg = msgsData[i - 1];

                if (lastMsg.author == thisMsg.author) {
                    const msgContent = document.createElement("div");
                    msgContent.classList.add("msgcontent");
                    msgContent.innerText = thisMsg.content;

                    const lastMsgEl = msgs.children.item(msgs.children.length - 1);

                    lastMsgEl.appendChild(msgContent);
                } else {
                    const message = msgCreate(thisMsg.content, thisMsg.author, thisMsg.author == username);

                    msgs.appendChild(message);
                }
            } else {
                const message = msgCreate(thisMsg.content, thisMsg.author, thisMsg.author == username);

                msgs.appendChild(message);
            }
        }

        chatbox.append(msgs);

        chatbox.scrollTop = chatbox.scrollHeight;

        document.getElementById("chat-container").style.opacity = 1;
    });
});

document.onkeydown = (e) => {
    if (document.getElementById("new-chat-dialog").open) return;
    if (e.keyCode == 13 && !e.repeat) return sendMsg();
}

socket.on("chat-message", msg => {
    const chatbox = document.getElementById("chatbox");

    if (chatbox.children.length > 0) {
        const lastMsg = chatbox.children.item(chatbox.children.length - 1);

        if (lastMsg.children.item(0).innerHTML == msg.author) {
            const msgContent = document.createElement("div");
            msgContent.classList.add("msgcontent");
            msgContent.innerText = msg.message;

            lastMsg.appendChild(msgContent);

            chatbox.scrollTop = chatbox.scrollHeight;
        } else {
            const message = msgCreate(msg.message, msg.author, false);

            chatbox.appendChild(message);

            chatbox.scrollTop = chatbox.scrollHeight;
        }
    } else {
        const message = msgCreate(msg.message, msg.author, false);

        chatbox.appendChild(message);

        chatbox.scrollTop = chatbox.scrollHeight;
    }

    if (chatid == "global-chat") return;

    const oldNode = document.getElementById(chatid);

    if (oldNode.isSameNode(document.getElementById("room-list").firstChild)) return;

    const newNode = oldNode.cloneNode(true);

    document.getElementById("room-list").prepend(newNode);

    oldNode.remove();

    document.getElementById(chatid).addEventListener("click", function () { switchChat(this.id) });
});

function msgCreate(message, author, themselves) {
    const msgElement = document.createElement("div");
    const authorElement = document.createElement("div");
    const contentElement = document.createElement("div");

    msgElement.classList.add("chatmsg");
    authorElement.classList.add("msgauthor");
    contentElement.classList.add("msgcontent");
    if (themselves) msgElement.classList.add("msgself");

    authorElement.innerText = author;
    contentElement.innerText = message;

    msgElement.append(authorElement, contentElement);

    return msgElement;
}

function roomElCreate(roomid, name, newMsg) {
    const currentChatId = document.location.pathname.split("/")[2];

    const roomElement = document.createElement("div");
    const nameElement = document.createElement("div");
    const newMsgElement = document.createElement("div");

    roomElement.classList.add("room");
    nameElement.classList.add("room-name");
    newMsgElement.classList.add("new-message-indicator");
    if (roomid == currentChatId) roomElement.classList.add("room-active");

    roomElement.id = roomid;
    nameElement.innerText = name;

    roomElement.append(nameElement);

    if (newMsg) roomElement.append(newMsgElement);

    return roomElement;
}

function sendMsg() {
    const chatbox = document.getElementById("chatbox");
    const msgInput = document.getElementById("chatinput");

    if (!msgInput.value) return;

    const chatid = document.location.pathname.split("/")[2];

    socket.emit("send-message", chatid, msgInput.value);

    if (chatbox.children.length > 0) {
        const lastMsg = chatbox.children.item(chatbox.children.length - 1);

        if (lastMsg.children.item(0).innerHTML == username) {
            const msgContent = document.createElement("div");
            msgContent.classList.add("msgcontent");
            msgContent.innerText = msgInput.value;

            lastMsg.appendChild(msgContent);

            chatbox.scrollTop = chatbox.scrollHeight;
        } else {
            const message = msgCreate(msgInput.value, username, true);

            chatbox.appendChild(message);

            chatbox.scrollTop = chatbox.scrollHeight;
        }
    } else {
        const message = msgCreate(msgInput.value, username, true);

        chatbox.appendChild(message);

        chatbox.scrollTop = chatbox.scrollHeight;
    }

    msgInput.value = '';

    if (chatid == "global-chat") return;
    
    const oldNode = document.getElementById(chatid);

    if (oldNode.isSameNode(document.getElementById("room-list").firstChild)) return;

    const newNode = oldNode.cloneNode(true);

    document.getElementById("room-list").prepend(newNode);

    oldNode.remove();

    document.getElementById(chatid).addEventListener("click", function () { switchChat(this.id) });
}

function logout() {
    fetch("/logout").then(() => document.location.href = "/login");
}

function switchChat(chatid) {
    document.location.href = "/chat/" + chatid;
}

// Chat creation functions
function newChatUserCreate(user) {
    const userElement = document.createElement("button");
    userElement.classList.add("users-box-entry");
    userElement.innerHTML = user + "&nbsp;&nbsp;X"

    userElement.addEventListener("click", function () {
        const index = newchatusers.indexOf(user);
        if (index > -1) newchatusers.splice(index, 1);console.log(newchatusers)
        if (!newdmgroup) document.getElementById("add-user-button").disabled = false;

        this.remove();
    });

    return userElement;
}

function openNewChatDialog() {
    document.getElementById('new-chat-dialog').showModal();
    newchatusers = [];
}

function newChatSwitchDm() {
    if (!newdmgroup) return;
    document.getElementById("dm-button").classList.add("dm-chat-button-selected");
    document.getElementById("chat-button").classList.remove("dm-chat-button-selected");

    newdmgroup = 0;
    newchatusers = [];
    document.getElementById("users-box").innerHTML = "";
    document.getElementById("chat-name-input").value = "";
    document.getElementById("chat-name-text").hidden = true;
    document.getElementById("chat-name-input-box").classList.add("full-hidden");
}

function newChatSwitchChat() {
    if (newdmgroup) return;
    document.getElementById("dm-button").classList.remove("dm-chat-button-selected");
    document.getElementById("chat-button").classList.add("dm-chat-button-selected");

    newdmgroup = 1;
    newchatusers = [];
    document.getElementById("users-box").innerHTML = "";
    document.getElementById("add-user-button").disabled = false;
    document.getElementById("chat-name-text").hidden = false;
    document.getElementById("chat-name-input-box").classList.remove("full-hidden");
}

async function newChatAddUser() {
    const userInput = document.getElementById("user-input");
    const userWarningText = document.getElementById("user-warning-text");

    if (newchatusers.includes(userInput.value)) {
        userInput.value = "";
        userWarningText.innerText = "User is already added";
        userWarningText.hidden = false;

        setTimeout(() => {
            userWarningText.hidden = true
        }, 5000);
        return;
    }

    const user = await fetch('/verify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: userInput.value }) });
    const userJson = await user.json();
    const userExists = userJson.exists;

    if (userExists) {
        const userElement = newChatUserCreate(userInput.value);

        newchatusers.push(userInput.value);console.log(newchatusers)
        userInput.value = "";

        document.getElementById("users-box").append(userElement);

        if (!newdmgroup) document.getElementById("add-user-button").disabled = true;
    } else {userWarningText.innerText = "User does not exist"
        userWarningText.hidden = false;
        userInput.value = "";

        setTimeout(() => {
            userWarningText.hidden = true
        }, 5000);
    }
}