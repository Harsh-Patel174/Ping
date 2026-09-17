const socket = io();


// ========================================
// ELEMENTS
// ========================================

const usernameScreen =
    document.getElementById("usernameScreen");

const roomScreen =
    document.getElementById("roomScreen");

const usernameForm =
    document.getElementById("usernameForm");

const joinRoomForm =
    document.getElementById("joinRoomForm");

const usernameInput =
    document.getElementById("username");

const roomCodeInput =
    document.getElementById("roomCode");

const createRoomButton =
    document.getElementById("createRoomButton");

const welcomeText =
    document.getElementById("welcomeText");

const errorMessage =
    document.getElementById("errorMessage");

const statusMessage =
    document.getElementById("statusMessage");


let username = "";


// ========================================
// USERNAME
// ========================================

usernameForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const enteredUsername =
            usernameInput.value.trim();


        if (!enteredUsername) {
            return;
        }


        username =
            enteredUsername.slice(0, 30);


        welcomeText.textContent =
            `Hey, ${username} 👋`;


        usernameScreen.classList.add(
            "hidden"
        );


        roomScreen.classList.remove(
            "hidden"
        );


        roomCodeInput.focus();

    }
);


// ========================================
// CREATE ROOM
// ========================================

createRoomButton.addEventListener(
    "click",
    () => {

        clearMessages();


        if (!username) {
            return;
        }


        createRoomButton.disabled =
            true;


        createRoomButton.textContent =
            "Creating...";


        socket.emit(
            "create-room",
            {
                username
            }
        );

    }
);


// ========================================
// JOIN ROOM
// ========================================

joinRoomForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        clearMessages();


        const roomCode =
            roomCodeInput.value
                .trim()
                .toUpperCase();


        if (!roomCode) {

            showError(
                "Please enter a room code."
            );

            return;
        }


        if (roomCode.length !== 6) {

            showError(
                "Room code must contain 6 characters."
            );

            return;
        }


        socket.emit(
            "request-join-room",
            {

                username,

                roomCode

            }
        );

    }
);


// ========================================
// ROOM CREATED
// ========================================

socket.on(
    "room-created",
    data => {

        localStorage.setItem(
            "username",
            data.username
        );


        localStorage.setItem(
            "roomCode",
            data.roomCode
        );


        localStorage.setItem(
            "isAdmin",
            "true"
        );


        localStorage.setItem(
            "chatToken",
            data.token
        );


        window.location.href =
            `/chat.html?room=${data.roomCode}`;

    }
);


// ========================================
// JOIN REQUEST SENT
// ========================================

socket.on(
    "join-request-result",
    data => {

        if (!data.success) {

            showError(
                data.message
            );


            createRoomButton.disabled =
                false;


            createRoomButton.textContent =
                "Create New Room";


            return;
        }


        if (data.token) {

            localStorage.setItem(
                "chatToken",
                data.token
            );

        }


        statusMessage.textContent =
            data.message;


        roomCodeInput.disabled =
            true;


        const joinButton =
            joinRoomForm.querySelector(
                "button"
            );


        joinButton.disabled =
            true;


        joinButton.textContent =
            "Waiting for approval...";

    }
);


// ========================================
// JOIN APPROVED
// ========================================

socket.on(
    "join-approved",
    data => {

        localStorage.setItem(
            "username",
            data.username
        );


        localStorage.setItem(
            "roomCode",
            data.roomCode
        );


        localStorage.setItem(
            "isAdmin",
            "false"
        );


        localStorage.setItem(
            "chatToken",
            data.token
        );


        window.location.href =
            `/chat.html?room=${data.roomCode}`;

    }
);


// ========================================
// JOIN DENIED
// ========================================

socket.on(
    "join-denied",
    data => {

        roomCodeInput.disabled =
            false;


        const joinButton =
            joinRoomForm.querySelector(
                "button"
            );


        joinButton.disabled =
            false;


        joinButton.textContent =
            "Join Room";


        showError(
            data.message
        );

    }
);


// ========================================
// ERROR
// ========================================

socket.on(
    "error-message",
    data => {

        showError(
            data.message
        );

    }
);


// ========================================
// HELPERS
// ========================================

function showError(message) {

    errorMessage.textContent =
        message;

    statusMessage.textContent =
        "";

}


function clearMessages() {

    errorMessage.textContent =
        "";

    statusMessage.textContent =
        "";

}