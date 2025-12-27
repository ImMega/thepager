window.onload = fetch('/get-user').then((res) => {
    document.getElementById("aaaa").classList.add("show");
    res.json().then((data) => {
        if (!data.success) return;

        const userInput = document.getElementById('userinput');
        const passInput = document.getElementById('passinput');

        document.getElementById('registerbutton').hidden = true;
        document.getElementById('loginbutton').hidden = true;
        document.getElementById('logoutbutton').hidden = false;
        document.getElementById('maintext').hidden = false;
        document.getElementById('maintext').innerHTML = data.username + " logged in";
        userInput.value = "";
        passInput.value = "";

        document.getElementById("aaaa").classList.remove("show");
    });
});

document.onkeydown = (e) => {
    if (e.keyCode == 13 && !e.repeat) return login();
}

async function register()  {
    const userInput = document.getElementById('userinput');
    const passInput = document.getElementById('passinput');

    if (!userInput.value || !passInput.value) return alert("Both fields are required.");

    const response = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: userInput.value,
            password: passInput.value
        })
    });

    const data = await response.json();

    alert(data.message);
}

async function login()  {
    const userInput = document.getElementById('userinput');
    const passInput = document.getElementById('passinput');

    if (!userInput.value || !passInput.value) return alert("Both fields are required.");
        
    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: userInput.value,
            password: passInput.value
        })
    });

    const data = await response.json(); console.log(response)

    if (!data.success) return alert(data.message);

    document.getElementById('registerbutton').hidden = true;
    document.getElementById('loginbutton').hidden = true;
    document.getElementById('logoutbutton').hidden = false;
    document.getElementById('maintext').hidden = false;
    document.getElementById('maintext').innerHTML = userInput.value + " logged in";
    userInput.value = "";
    passInput.value = "";

    document.getElementById("aaaa").classList.remove("show");

    document.location.href = "/chat";
}

function logout() {
    const userInput = document.getElementById('userinput');
    const passInput = document.getElementById('passinput');

    document.getElementById('registerbutton').hidden = false;
    document.getElementById('loginbutton').hidden = false;
    document.getElementById('logoutbutton').hidden = true;
    document.getElementById('maintext').hidden = true;

    fetch('/logout');

    document.getElementById("aaaa").classList.add("show");
}