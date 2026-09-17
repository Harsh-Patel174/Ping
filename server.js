const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    maxHttpBufferSize: 10 * 1024 * 1024
});

const PORT = process.env.PORT || 3000;

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ========================================
// DATA
// ========================================

const rooms = new Map();

const sessions = new Map();


// ========================================
// FILE SETTINGS
// ========================================

const MAX_FILE_SIZE =
    10 * 1024 * 1024;


// ========================================
// ALLOWED FILE TYPES
// ========================================

const allowedMimeTypes = new Set([

    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",

    // Documents
    "application/pdf",

    // Text
    "text/plain",
    "text/csv",

    // Microsoft
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Archives
    "application/zip",
    "application/x-zip-compressed"

]);


// ========================================
// ROOM CODE
// ========================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (let i = 0; i < 6; i++) {

            code += characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];

        }

    } while (
        rooms.has(code)
    );

    return code;
}


// ========================================
// SESSION TOKEN
// ========================================

function generateSessionToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


// ========================================
// GET SESSION
// ========================================

function getSession(socket) {

    const token =
        socket.handshake.auth?.token;

    if (!token) {
        return null;
    }

    return sessions.get(token) || null;
}


// ========================================
// UPDATE MEMBERS
// ========================================

function updateMembers(roomCode) {

    const room =
        rooms.get(roomCode);

    if (!room) {
        return;
    }

    io.to(roomCode).emit(
        "members-updated",
        {
            members:
                room.members,

            count:
                room.members.length,

            adminId:
                room.adminSessionId
        }
    );

}


// ========================================
// UPDATE JOIN REQUESTS
// ========================================

function updateJoinRequests(roomCode) {

    const room =
        rooms.get(roomCode);

    if (!room) {
        return;
    }

    const adminSession =
        sessions.get(
            room.adminSessionId
        );

    if (!adminSession) {
        return;
    }

    const adminSocket =
        io.sockets.sockets.get(
            adminSession.socketId
        );

    if (!adminSocket) {
        return;
    }

    adminSocket.emit(
        "join-requests-updated",
        {
            requests:
                room.requests
        }
    );

}


// ========================================
// REMOVE MEMBER
// ========================================

function removeMemberFromRoom(
    roomCode,
    sessionId,
    showMessage = true
) {

    const room =
        rooms.get(roomCode);

    if (!room) {
        return null;
    }

    const member =
        room.members.find(
            user =>
                user.sessionId ===
                sessionId
        );

    if (!member) {
        return null;
    }

    room.members =
        room.members.filter(
            user =>
                user.sessionId !==
                sessionId
        );


    if (showMessage) {

        io.to(roomCode).emit(
            "system-message",
            {
                message:
                    `${member.username} left the room.`
            }
        );

    }


    updateMembers(roomCode);

    return member;

}


// ========================================
// DELETE ROOM
// ========================================

function deleteRoom(roomCode) {

    const room =
        rooms.get(roomCode);

    if (!room) {
        return;
    }


    io.to(roomCode).emit(
        "room-deleted",
        {
            message:
                "The admin left. This room and all messages have been deleted."
        }
    );


    for (
        const [sessionId, session]
        of sessions
    ) {

        if (
            session.roomCode ===
            roomCode ||

            session.pendingRoomCode ===
            roomCode
        ) {

            sessions.delete(
                sessionId
            );

        }

    }


    rooms.delete(
        roomCode
    );


    console.log(
        `Room ${roomCode} deleted.`
    );

}


// ========================================
// SOCKET CONNECTION
// ========================================

io.on(
    "connection",
    socket => {

        console.log(
            "Socket connected:",
            socket.id
        );


        // ==================================
        // AUTHENTICATE
        // ==================================

        socket.on(
            "authenticate",
            () => {

                const session =
                    getSession(socket);

                if (!session) {

                    socket.emit(
                        "authentication-failed",
                        {
                            message:
                                "Your session has expired."
                        }
                    );

                    return;
                }


                session.socketId =
                    socket.id;


                socket.data.sessionId =
                    session.sessionId;

                socket.data.roomCode =
                    session.roomCode;


                if (session.roomCode) {

                    const room =
                        rooms.get(
                            session.roomCode
                        );


                    if (!room) {

                        socket.emit(
                            "authentication-failed",
                            {
                                message:
                                    "This room no longer exists."
                            }
                        );

                        return;
                    }


                    socket.join(
                        session.roomCode
                    );


                    const existingMember =
                        room.members.find(
                            user =>
                                user.sessionId ===
                                session.sessionId
                        );


                    if (!existingMember) {

                        room.members.push(
                            {
                                sessionId:
                                    session.sessionId,

                                username:
                                    session.username
                            }
                        );

                    }


                    socket.emit(
                        "authenticated",
                        {

                            username:
                                session.username,

                            roomCode:
                                session.roomCode,

                            isAdmin:
                                session.isAdmin,

                            messages:
                                room.messages

                        }
                    );


                    updateMembers(
                        session.roomCode
                    );


                    if (
                        session.isAdmin
                    ) {

                        updateJoinRequests(
                            session.roomCode
                        );

                    }

                } else {

                    socket.emit(
                        "authenticated",
                        {

                            username:
                                session.username,

                            roomCode:
                                null,

                            isAdmin:
                                false,

                            messages:
                                []

                        }
                    );

                }

            }
        );


        // ==================================
        // CREATE ROOM
        // ==================================

        socket.on(
            "create-room",
            ({ username }) => {

                if (
                    !username ||
                    !username.trim()
                ) {

                    socket.emit(
                        "error-message",
                        {
                            message:
                                "Username is required."
                        }
                    );

                    return;
                }


                const cleanUsername =
                    username
                        .trim()
                        .slice(0, 30);


                const roomCode =
                    generateRoomCode();


                const sessionId =
                    generateSessionToken();


                const room = {

                    code:
                        roomCode,

                    adminSessionId:
                        sessionId,

                    members:
                        [],

                    requests:
                        [],

                    messages:
                        []

                };


                const session = {

                    sessionId,

                    username:
                        cleanUsername,

                    roomCode,

                    pendingRoomCode:
                        null,

                    isAdmin:
                        true,

                    socketId:
                        socket.id

                };


                rooms.set(
                    roomCode,
                    room
                );


                sessions.set(
                    sessionId,
                    session
                );


                socket.data.sessionId =
                    sessionId;

                socket.data.roomCode =
                    roomCode;


                socket.join(
                    roomCode
                );


                room.members.push(
                    {
                        sessionId,

                        username:
                            cleanUsername
                    }
                );


                socket.emit(
                    "room-created",
                    {

                        roomCode,

                        username:
                            cleanUsername,

                        isAdmin:
                            true,

                        token:
                            sessionId

                    }
                );


                updateMembers(
                    roomCode
                );


                console.log(
                    `${cleanUsername} created ${roomCode}`
                );

            }
        );


        // ==================================
        // REQUEST TO JOIN ROOM
        // ==================================

        socket.on(
            "request-join-room",
            ({ username, roomCode }) => {

                if (
                    !username ||
                    !username.trim()
                ) {

                    socket.emit(
                        "error-message",
                        {
                            message:
                                "Username is required."
                        }
                    );

                    return;
                }


                if (
                    !roomCode ||
                    !roomCode.trim()
                ) {

                    socket.emit(
                        "error-message",
                        {
                            message:
                                "Room code is required."
                        }
                    );

                    return;
                }


                const cleanUsername =
                    username
                        .trim()
                        .slice(0, 30);


                const cleanRoomCode =
                    roomCode
                        .trim()
                        .toUpperCase();


                const room =
                    rooms.get(
                        cleanRoomCode
                    );


                if (!room) {

                    socket.emit(
                        "join-request-result",
                        {
                            success:
                                false,

                            message:
                                "Room does not exist."
                        }
                    );

                    return;
                }


                const nameExists =
                    room.members.some(
                        user =>
                            user.username
                                .toLowerCase() ===
                            cleanUsername
                                .toLowerCase()
                    );


                if (nameExists) {

                    socket.emit(
                        "join-request-result",
                        {
                            success:
                                false,

                            message:
                                "That username is already in the room."
                        }
                    );

                    return;
                }


                const requestExists =
                    room.requests.some(
                        request =>
                            request.socketId ===
                            socket.id
                    );


                if (requestExists) {

                    socket.emit(
                        "join-request-result",
                        {
                            success:
                                false,

                            message:
                                "Join request already sent."
                        }
                    );

                    return;
                }


                const sessionId =
                    generateSessionToken();


                const session = {

                    sessionId,

                    username:
                        cleanUsername,

                    roomCode:
                        null,

                    pendingRoomCode:
                        cleanRoomCode,

                    isAdmin:
                        false,

                    socketId:
                        socket.id

                };


                sessions.set(
                    sessionId,
                    session
                );


                socket.data.sessionId =
                    sessionId;


                room.requests.push(
                    {

                        sessionId,

                        socketId:
                            socket.id,

                        username:
                            cleanUsername

                    }
                );


                socket.emit(
                    "join-request-result",
                    {

                        success:
                            true,

                        message:
                            "Join request sent. Waiting for admin approval.",

                        token:
                            sessionId

                    }
                );


                updateJoinRequests(
                    cleanRoomCode
                );


                console.log(
                    `${cleanUsername} requested ${cleanRoomCode}`
                );

            }
        );


        // ==================================
        // APPROVE USER
        // ==================================

        socket.on(
            "approve-user",
            ({ sessionId }) => {

                const adminSession =
                    getSession(socket);


                if (
                    !adminSession ||
                    !adminSession.isAdmin
                ) {
                    return;
                }


                const room =
                    rooms.get(
                        adminSession.roomCode
                    );


                if (!room) {
                    return;
                }


                if (
                    room.adminSessionId !==
                    adminSession.sessionId
                ) {
                    return;
                }


                const requestIndex =
                    room.requests.findIndex(
                        request =>
                            request.sessionId ===
                            sessionId
                    );


                if (
                    requestIndex === -1
                ) {
                    return;
                }


                const request =
                    room.requests[
                        requestIndex
                    ];


                room.requests.splice(
                    requestIndex,
                    1
                );


                const userSession =
                    sessions.get(
                        sessionId
                    );


                if (!userSession) {

                    updateJoinRequests(
                        room.code
                    );

                    return;
                }


                userSession.roomCode =
                    room.code;

                userSession.pendingRoomCode =
                    null;


                const userSocket =
                    io.sockets.sockets.get(
                        userSession.socketId
                    );


                if (userSocket) {

                    userSocket.emit(
                        "join-approved",
                        {

                            roomCode:
                                room.code,

                            username:
                                userSession.username,

                            isAdmin:
                                false,

                            token:
                                userSession.sessionId

                        }
                    );

                }


                updateJoinRequests(
                    room.code
                );


                io.to(room.code).emit(
                    "system-message",
                    {
                        message:
                            `${request.username} was approved to join.`
                    }
                );

            }
        );


        // ==================================
        // DENY USER
        // ==================================

        socket.on(
            "deny-user",
            ({ sessionId }) => {

                const adminSession =
                    getSession(socket);


                if (
                    !adminSession ||
                    !adminSession.isAdmin
                ) {
                    return;
                }


                const room =
                    rooms.get(
                        adminSession.roomCode
                    );


                if (!room) {
                    return;
                }


                const requestIndex =
                    room.requests.findIndex(
                        request =>
                            request.sessionId ===
                            sessionId
                    );


                if (
                    requestIndex === -1
                ) {
                    return;
                }


                room.requests.splice(
                    requestIndex,
                    1
                );


                const userSession =
                    sessions.get(
                        sessionId
                    );


                if (userSession) {

                    const userSocket =
                        io.sockets.sockets.get(
                            userSession.socketId
                        );


                    if (userSocket) {

                        userSocket.emit(
                            "join-denied",
                            {
                                message:
                                    "The admin denied your request."
                            }
                        );

                    }


                    sessions.delete(
                        sessionId
                    );

                }


                updateJoinRequests(
                    room.code
                );

            }
        );


        // ==================================
        // REMOVE MEMBER
        // ==================================

        socket.on(
            "remove-member",
            ({ sessionId }) => {

                const adminSession =
                    getSession(socket);


                if (
                    !adminSession ||
                    !adminSession.isAdmin
                ) {
                    return;
                }


                const room =
                    rooms.get(
                        adminSession.roomCode
                    );


                if (!room) {
                    return;
                }


                if (
                    room.adminSessionId !==
                    adminSession.sessionId
                ) {
                    return;
                }


                if (
                    sessionId ===
                    adminSession.sessionId
                ) {

                    socket.emit(
                        "error-message",
                        {
                            message:
                                "You cannot remove yourself."
                        }
                    );

                    return;
                }


                const member =
                    room.members.find(
                        user =>
                            user.sessionId ===
                            sessionId
                    );


                if (!member) {
                    return;
                }


                const targetSession =
                    sessions.get(
                        sessionId
                    );


                removeMemberFromRoom(
                    room.code,
                    sessionId,
                    false
                );


                if (targetSession) {

                    const targetSocket =
                        io.sockets.sockets.get(
                            targetSession.socketId
                        );


                    if (targetSocket) {

                        targetSocket.leave(
                            room.code
                        );


                        targetSocket.emit(
                            "member-removed",
                            {
                                message:
                                    "The admin removed you from the room."
                            }
                        );

                    }


                    sessions.delete(
                        sessionId
                    );

                }


                io.to(room.code).emit(
                    "system-message",
                    {
                        message:
                            `${member.username} was removed from the room.`
                    }
                );


                updateMembers(
                    room.code
                );

            }
        );


        // ==================================
        // SEND TEXT MESSAGE
        // ==================================

        socket.on(
            "send-message",
            ({ message, disappearAfter }) => {

                const session =
                    getSession(socket);


                if (
                    !session ||
                    !session.roomCode
                ) {
                    return;
                }


                const room =
                    rooms.get(
                        session.roomCode
                    );


                if (!room) {
                    return;
                }


                if (
                    !message ||
                    !message.trim()
                ) {
                    return;
                }


                const cleanMessage =
                    message
                        .trim()
                        .slice(0, 2000);


                const timer =
                    getTimer(
                        disappearAfter
                    );


                const messageData = {

                    id:
                        crypto.randomUUID(),

                    type:
                        "text",

                    username:
                        session.username,

                    sessionId:
                        session.sessionId,

                    message:
                        cleanMessage,

                    disappearAfter:
                        timer,

                    createdAt:
                        Date.now()

                };


                room.messages.push(
                    messageData
                );


                io.to(room.code).emit(
                    "new-message",
                    messageData
                );


                scheduleMessageDeletion(
                    room.code,
                    messageData
                );

            }
        );


        // ==================================
        // SEND FILE
        // ==================================

        socket.on(
            "send-file",
            (
                {
                    fileName,
                    fileType,
                    fileSize,
                    fileData,
                    disappearAfter
                },
                callback
            ) => {

                const session =
                    getSession(socket);


                if (
                    !session ||
                    !session.roomCode
                ) {

                    sendFileError(
                        socket,
                        callback,
                        "You are not inside a room."
                    );

                    return;
                }


                const room =
                    rooms.get(
                        session.roomCode
                    );


                if (!room) {

                    sendFileError(
                        socket,
                        callback,
                        "Room no longer exists."
                    );

                    return;
                }


                // Validate filename
                if (
                    !fileName ||
                    typeof fileName !==
                    "string"
                ) {

                    sendFileError(
                        socket,
                        callback,
                        "Invalid file name."
                    );

                    return;
                }


                const cleanFileName =
                    fileName
                        .trim()
                        .slice(0, 150);


                // Validate MIME type
                if (
                    !allowedMimeTypes.has(
                        fileType
                    )
                ) {

                    sendFileError(
                        socket,
                        callback,
                        "This file type is not allowed."
                    );

                    return;
                }


                // Convert incoming data to Buffer
                let buffer;


                try {

                    if (
                        Buffer.isBuffer(
                            fileData
                        )
                    ) {

                        buffer =
                            fileData;

                    } else if (
                        fileData instanceof
                        ArrayBuffer
                    ) {

                        buffer =
                            Buffer.from(
                                fileData
                            );

                    } else if (
                        fileData?.type ===
                        "Buffer" &&
                        Array.isArray(
                            fileData.data
                        )
                    ) {

                        buffer =
                            Buffer.from(
                                fileData.data
                            );

                    } else {

                        throw new Error(
                            "Invalid file data."
                        );

                    }

                } catch (error) {

                    sendFileError(
                        socket,
                        callback,
                        "Could not process the file."
                    );

                    return;
                }


                // Validate actual size
                if (
                    buffer.length >
                    MAX_FILE_SIZE
                ) {

                    sendFileError(
                        socket,
                        callback,
                        "File is too large. Maximum size is 10 MB."
                    );

                    return;
                }


                if (
                    buffer.length === 0
                ) {

                    sendFileError(
                        socket,
                        callback,
                        "The file is empty."
                    );

                    return;
                }


                const timer =
                    getTimer(
                        disappearAfter
                    );


                const fileMessage = {

                    id:
                        crypto.randomUUID(),

                    type:
                        "file",

                    username:
                        session.username,

                    sessionId:
                        session.sessionId,

                    fileName:
                        cleanFileName,

                    fileType:
                        fileType,

                    fileSize:
                        buffer.length,

                    fileData:
                        buffer,

                    disappearAfter:
                        timer,

                    createdAt:
                        Date.now()

                };


                room.messages.push(
                    fileMessage
                );


                io.to(room.code).emit(
                    "new-file",
                    fileMessage
                );


                if (callback) {

                    callback({
                        success:
                            true
                    });

                }


                scheduleMessageDeletion(
                    room.code,
                    fileMessage
                );

            }
        );


        // ==================================
        // LEAVE ROOM
        // ==================================

        socket.on(
            "leave-room",
            () => {

                const session =
                    getSession(socket);


                if (!session) {
                    return;
                }


                if (
                    session.isAdmin &&
                    session.roomCode
                ) {

                    deleteRoom(
                        session.roomCode
                    );


                    sessions.delete(
                        session.sessionId
                    );


                    return;
                }


                if (
                    session.roomCode
                ) {

                    removeMemberFromRoom(
                        session.roomCode,
                        session.sessionId,
                        true
                    );

                }


                sessions.delete(
                    session.sessionId
                );

            }
        );


        // ==================================
        // DISCONNECT
        // ==================================

        socket.on(
            "disconnect",
            () => {

                const token =
                    socket.handshake.auth?.token;


                if (!token) {
                    return;
                }


                const session =
                    sessions.get(token);


                if (!session) {
                    return;
                }


                if (
                    session.socketId !==
                    socket.id
                ) {

                    return;
                }


                // Pending request
                if (
                    session.pendingRoomCode
                ) {

                    const room =
                        rooms.get(
                            session.pendingRoomCode
                        );


                    if (room) {

                        room.requests =
                            room.requests.filter(
                                request =>
                                    request.sessionId !==
                                    session.sessionId
                            );


                        updateJoinRequests(
                            room.code
                        );

                    }

                }


                // Inside room
                if (
                    session.roomCode
                ) {

                    const room =
                        rooms.get(
                            session.roomCode
                        );


                    if (!room) {
                        return;
                    }


                    setTimeout(
                        () => {

                            const currentSession =
                                sessions.get(
                                    session.sessionId
                                );


                            if (!currentSession) {
                                return;
                            }


                            // Reconnected
                            if (
                                currentSession.socketId !==
                                socket.id
                            ) {

                                return;
                            }


                            // Admin disconnected
                            if (
                                currentSession.isAdmin
                            ) {

                                deleteRoom(
                                    currentSession.roomCode
                                );

                                return;
                            }


                            removeMemberFromRoom(
                                currentSession.roomCode,
                                currentSession.sessionId,
                                true
                            );


                            sessions.delete(
                                currentSession.sessionId
                            );

                        },

                        10000
                    );

                }

            }
        );

    }
);


// ========================================
// TIMER
// ========================================

function getTimer(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const seconds =
        Number(value);


    if (
        !Number.isFinite(seconds) ||
        seconds <= 0
    ) {

        return null;

    }


    // Prevent unreasonable values
    return Math.min(
        seconds,
        3600
    );

}


// ========================================
// DELETE MESSAGE LATER
// ========================================

function scheduleMessageDeletion(
    roomCode,
    message
) {

    if (
        !message.disappearAfter
    ) {
        return;
    }


    setTimeout(
        () => {

            const room =
                rooms.get(roomCode);


            if (!room) {
                return;
            }


            room.messages =
                room.messages.filter(
                    currentMessage =>
                        currentMessage.id !==
                        message.id
                );


            io.to(roomCode).emit(
                "message-disappeared",
                {
                    messageId:
                        message.id
                }
            );

        },

        message.disappearAfter *
        1000
    );

}


// ========================================
// FILE ERROR
// ========================================

function sendFileError(
    socket,
    callback,
    message
) {

    if (callback) {

        callback({
            success:
                false,

            message
        });

    } else {

        socket.emit(
            "file-error",
            {
                message
            }
        );

    }

}


// ========================================
// START SERVER
// ========================================

server.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);