var username;

const socket = io();

var chatid;

window.onload = fetch('/get-user').then((res) => {
    res.json().then(async (data) => {
        if (!data.success) return document.location.href = "/login";

        username = data.username;

        document.getElementById("greeting").innerHTML = "Hi, " + data.username + "!";

        chatid = document.location.pathname.split("/")[2];

        document.getElementById("roomid").innerHTML = chatid;

        const roomsRes = await fetch('/get-rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: "Yamega" }) });
        const roomsJson = await roomsRes.json();
        const roomsData = roomsJson.data;
        const rooms = document.createDocumentFragment();

        for (var i = 0; i < roomsData.length; i++) {
            const thisRoom = roomsData[i];
            const roomElement = roomElCreate(thisRoom.id, thisRoom.name, false);

            rooms.appendChild(roomElement);
        }

        document.getElementById("room-list").append(rooms);

        for (var i = 0; i < roomsData.length; i++) {
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
    if(e.keyCode == 13 && !e.repeat) return sendMsg();
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
        console.log("aa")
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
    document.location.href = "/test/" + chatid;
}