var username;

window.onload = fetch('/get-user').then((res) => {
    res.json().then(async (data) => {
        if (!data.success) return document.location.href = "/login";

        username = data.username;

        document.getElementById("greeting").innerHTML = "Hi, " + data.username + "!";

        const chatRes = await fetch('/get-chat');
        const chatData = await chatRes.json();

        const chatbox = document.getElementById("chatbox");
        const msgsData = chatData.data.messages;
        const msgs = document.createDocumentFragment();

        for (let i = 0; i < msgsData.length; i++) {
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

        document.getElementById("maincontainer").style.opacity = 1;
    });
});

const socket = io();

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

function sendMsg() {
    const chatbox = document.getElementById("chatbox");
    const msgInput = document.getElementById("chatinput");

    if (!msgInput.value) return;

    socket.emit("send-message", msgInput.value);

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
}

function logout() {
    fetch("/logout").then(() => document.location.href = "/login");
}