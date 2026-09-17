const token =
    localStorage.getItem("chatToken");

const savedUsername =
    localStorage.getItem("username");

const savedRoomCode =
    localStorage.getItem("roomCode");


// ========================================
// CHECK SESSION
// ========================================

if (
    !token ||
    !savedUsername
) {

    window.location.href = "/";

}


// ========================================
// SOCKET
// ========================================

const socket = io({

    auth: {
        token
    },

    maxHttpBufferSize:
        10 * 1024 * 1024

});


// ========================================
// ELEMENTS
// ========================================

const roomCodeElement =
    document.getElementById(
        "roomCode"
    );

const memberCount =
    document.getElementById(
        "memberCount"
    );

const membersButton =
    document.getElementById(
        "membersButton"
    );

const membersDropdown =
    document.getElementById(
        "membersDropdown"
    );

const membersList =
    document.getElementById(
        "membersList"
    );

const messages =
    document.getElementById(
        "messages"
    );

const messageForm =
    document.getElementById(
        "messageForm"
    );

const messageInput =
    document.getElementById(
        "messageInput"
    );

const messageTimer =
    document.getElementById(
        "messageTimer"
    );

const leaveButton =
    document.getElementById(
        "leaveButton"
    );

const requestsPanel =
    document.getElementById(
        "requestsPanel"
    );

const requestsList =
    document.getElementById(
        "requestsList"
    );

const requestCount =
    document.getElementById(
        "requestCount"
    );

const fileInput =
    document.getElementById(
        "fileInput"
    );

const fileButton =
    document.getElementById(
        "fileButton"
    );

const uploadStatus =
    document.getElementById(
        "uploadStatus"
    );

const uploadText =
    document.getElementById(
        "uploadText"
    );


// ========================================
// ADMIN STATE
// ========================================

let currentIsAdmin =
    localStorage.getItem(
        "isAdmin"
    ) === "true";


// ========================================
// AUTHENTICATE
// ========================================

socket.on(
    "connect",
    () => {

        socket.emit(
            "authenticate"
        );

    }
);


// ========================================
// AUTHENTICATED
// ========================================

socket.on(
    "authenticated",
    data => {

        localStorage.setItem(
            "username",
            data.username
        );


        currentIsAdmin =
            data.isAdmin;


        if (data.roomCode) {

            localStorage.setItem(
                "roomCode",
                data.roomCode
            );


            roomCodeElement.textContent =
                data.roomCode;

        }


        localStorage.setItem(
            "isAdmin",
            data.isAdmin
                ? "true"
                : "false"
        );


        requestsPanel.classList.add(
            "hidden"
        );


        messages.innerHTML =
            "";


        if (
            data.messages &&
            data.messages.length
        ) {

            data.messages.forEach(
                message => {

                    if (
                        message.type ===
                        "file"
                    ) {

                        addFileMessage(
                            message
                        );

                    } else {

                        addMessage(
                            message
                        );

                    }

                }
            );

        }


        messageInput.focus();

    }
);


// ========================================
// AUTH FAILED
// ========================================

socket.on(
    "authentication-failed",
    data => {

        alert(
            data.message
        );


        clearStorage();


        window.location.href =
            "/";

    }
);


// ========================================
// MEMBERS DROPDOWN
// ========================================

membersButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        membersDropdown.classList.toggle(
            "hidden"
        );

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            !membersButton.contains(
                event.target
            ) &&
            !membersDropdown.contains(
                event.target
            )
        ) {

            membersDropdown.classList.add(
                "hidden"
            );

        }

    }
);


// ========================================
// MEMBERS UPDATED
// ========================================

socket.on(
    "members-updated",
    data => {

        memberCount.textContent =
            data.count;


        membersList.innerHTML =
            "";


        if (
            !data.members.length
        ) {

            membersList.innerHTML =
                `<div class="empty-list">
                    No members
                </div>`;

            return;
        }


        data.members.forEach(
            member => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "member-item";


                // ==========================
                // MEMBER NAME
                // ==========================

                const name =
                    document.createElement(
                        "div"
                    );


                name.className =
                    "member-name";


                if (
                    member.sessionId ===
                    data.adminId
                ) {

                    const crown =
                        document.createElement(
                            "span"
                        );


                    crown.className =
                        "admin-crown";


                    crown.textContent =
                        "👑";


                    name.appendChild(
                        crown
                    );

                }


                const nameText =
                    document.createElement(
                        "span"
                    );


                nameText.textContent =
                    member.username;


                name.appendChild(
                    nameText
                );


                // ==========================
                // YOU
                // ==========================

                if (
                    member.sessionId ===
                    token
                ) {

                    const you =
                        document.createElement(
                            "span"
                        );


                    you.className =
                        "you-label";


                    you.textContent =
                        "You";


                    name.appendChild(
                        you
                    );

                }


                item.appendChild(
                    name
                );


                // ==========================
                // REMOVE
                // ==========================

                if (
                    currentIsAdmin &&
                    member.sessionId !==
                    token
                ) {

                    const removeButton =
                        document.createElement(
                            "button"
                        );


                    removeButton.className =
                        "remove-member-button";


                    removeButton.type =
                        "button";


                    removeButton.textContent =
                        "Remove";


                    removeButton.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();


                            const confirmed =
                                confirm(
                                    `Remove ${member.username} from the room?`
                                );


                            if (
                                !confirmed
                            ) {
                                return;
                            }


                            socket.emit(
                                "remove-member",
                                {
                                    sessionId:
                                        member.sessionId
                                }
                            );

                        }
                    );


                    item.appendChild(
                        removeButton
                    );

                }


                membersList.appendChild(
                    item
                );

            }
        );

    }
);


// ========================================
// SEND TEXT MESSAGE
// ========================================

messageForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const message =
            messageInput.value.trim();


        if (!message) {
            return;
        }


        const disappearAfter =
            Number(
                messageTimer.value
            );


        socket.emit(
            "send-message",
            {

                message,

                disappearAfter:
                    disappearAfter === 0
                        ? null
                        : disappearAfter

            }
        );


        messageInput.value =
            "";

        messageInput.focus();

    }
);


// ========================================
// RECEIVE TEXT MESSAGE
// ========================================

socket.on(
    "new-message",
    message => {

        addMessage(
            message
        );

    }
);


// ========================================
// ADD TEXT MESSAGE
// ========================================

function addMessage(message) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message-wrapper";


    if (
        message.sessionId ===
        token
    ) {

        wrapper.classList.add(
            "own"
        );

    }


    const username =
        document.createElement(
            "div"
        );


    username.className =
        "message-username";


    username.textContent =
        message.username;


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        message.message;


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        formatTime(
            message.createdAt
        );


    meta.appendChild(
        time
    );


    if (
        message.disappearAfter
    ) {

        const timer =
            document.createElement(
                "span"
            );


        timer.className =
            "expire-label";


        timer.textContent =
            `⏱ ${message.disappearAfter}s`;


        meta.appendChild(
            timer
        );

    }


    wrapper.appendChild(
        username
    );


    wrapper.appendChild(
        bubble
    );


    wrapper.appendChild(
        meta
    );


    wrapper.dataset.messageId =
        message.id;


    messages.appendChild(
        wrapper
    );


    scrollToBottom();

}


// ========================================
// FILE BUTTON
// ========================================

fileButton.addEventListener(
    "click",
    () => {

        fileInput.click();

    }
);


// ========================================
// FILE SELECTED
// ========================================

fileInput.addEventListener(
    "change",
    async () => {

        const file =
            fileInput.files[0];


        if (!file) {
            return;
        }


        const MAX_FILE_SIZE =
            10 * 1024 * 1024;


        if (
            file.size >
            MAX_FILE_SIZE
        ) {

            alert(
                "File is too large. Maximum size is 10 MB."
            );


            fileInput.value =
                "";


            return;

        }


        showUploadStatus(
            `Sending ${file.name}...`
        );


        try {

            const fileData =
                await file.arrayBuffer();


            const disappearAfter =
                Number(
                    messageTimer.value
                );


            socket.emit(
                "send-file",
                {

                    fileName:
                        file.name,

                    fileType:
                        file.type,

                    fileSize:
                        file.size,

                    fileData,

                    disappearAfter:
                        disappearAfter === 0
                            ? null
                            : disappearAfter

                },

                response => {

                    hideUploadStatus();


                    if (
                        !response ||
                        !response.success
                    ) {

                        alert(
                            response?.message ||
                            "Could not send file."
                        );

                    }

                }
            );


        } catch (error) {

            console.error(
                "File error:",
                error
            );


            hideUploadStatus();


            alert(
                "Could not read the file."
            );

        }


        fileInput.value =
            "";

    }
);


// ========================================
// FILE MESSAGE
// ========================================

socket.on(
    "new-file",
    message => {

        addFileMessage(
            message
        );

    }
);


// ========================================
// ADD FILE MESSAGE
// ========================================

function addFileMessage(message) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message-wrapper";


    if (
        message.sessionId ===
        token
    ) {

        wrapper.classList.add(
            "own"
        );

    }


    const username =
        document.createElement(
            "div"
        );


    username.className =
        "message-username";


    username.textContent =
        message.username;


    const fileCard =
        document.createElement(
            "div"
        );


    fileCard.className =
        "file-card";


    // ====================================
    // IMAGE
    // ====================================

    if (
        message.fileType &&
        message.fileType.startsWith(
            "image/"
        )
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.className =
            "shared-image";


        const blob =
            createBlob(
                message.fileData,
                message.fileType
            );


        const imageUrl =
            URL.createObjectURL(
                blob
            );


        image.src =
            imageUrl;


        image.alt =
            message.fileName;


        image.loading =
            "lazy";


        image.addEventListener(
            "load",
            () => {

                URL.revokeObjectURL(
                    imageUrl
                );

            }
        );


        image.addEventListener(
            "click",
            () => {

                openImage(
                    message.fileData,
                    message.fileType
                );

            }
        );


        fileCard.appendChild(
            image
        );

    }


    // ====================================
    // FILE
    // ====================================

    const fileInfo =
        document.createElement(
            "div"
        );


    fileInfo.className =
        "file-info";


    const fileIcon =
        document.createElement(
            "div"
        );


    fileIcon.className =
        "file-icon";


    fileIcon.textContent =
        getFileIcon(
            message.fileType
        );


    const details =
        document.createElement(
            "div"
        );


    details.className =
        "file-details";


    const fileName =
        document.createElement(
            "div"
        );


    fileName.className =
        "file-name";


    fileName.textContent =
        message.fileName;


    const fileSize =
        document.createElement(
            "div"
        );


    fileSize.className =
        "file-size";


    fileSize.textContent =
        formatFileSize(
            message.fileSize
        );


    details.appendChild(
        fileName
    );


    details.appendChild(
        fileSize
    );


    fileInfo.appendChild(
        fileIcon
    );


    fileInfo.appendChild(
        details
    );


    fileCard.appendChild(
        fileInfo
    );


    // ====================================
    // DOWNLOAD BUTTON
    // ====================================

    const downloadButton =
        document.createElement(
            "button"
        );


    downloadButton.className =
        "download-button";


    downloadButton.type =
        "button";


    downloadButton.textContent =
        "Download";


    downloadButton.addEventListener(
        "click",
        () => {

            downloadFile(
                message.fileData,
                message.fileType,
                message.fileName
            );

        }
    );


    fileCard.appendChild(
        downloadButton
    );


    // ====================================
    // META
    // ====================================

    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        formatTime(
            message.createdAt
        );


    meta.appendChild(
        time
    );


    if (
        message.disappearAfter
    ) {

        const timer =
            document.createElement(
                "span"
            );


        timer.className =
            "expire-label";


        timer.textContent =
            `⏱ ${message.disappearAfter}s`;


        meta.appendChild(
            timer
        );

    }


    wrapper.appendChild(
        username
    );


    wrapper.appendChild(
        fileCard
    );


    wrapper.appendChild(
        meta
    );


    wrapper.dataset.messageId =
        message.id;


    messages.appendChild(
        wrapper
    );


    scrollToBottom();

}


// ========================================
// MESSAGE DISAPPEARED
// ========================================

socket.on(
    "message-disappeared",
    ({ messageId }) => {

        const message =
            document.querySelector(
                `[data-message-id="${messageId}"]`
            );


        if (message) {

            message.remove();

        }

    }
);


// ========================================
// JOIN REQUESTS
// ========================================

socket.on(
    "join-requests-updated",
    ({ requests }) => {

        if (
            !requests ||
            requests.length === 0
        ) {

            requestsPanel.classList.add(
                "hidden"
            );


            requestCount.textContent =
                "0";


            requestsList.innerHTML =
                "";


            return;

        }


        requestsPanel.classList.remove(
            "hidden"
        );


        requestCount.textContent =
            requests.length;


        requestsList.innerHTML =
            "";


        requests.forEach(
            request => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "request-item";


                const name =
                    document.createElement(
                        "div"
                    );


                name.className =
                    "request-name";


                name.textContent =
                    request.username;


                const actions =
                    document.createElement(
                        "div"
                    );


                actions.className =
                    "request-actions";


                const allow =
                    document.createElement(
                        "button"
                    );


                allow.className =
                    "allow-button";


                allow.type =
                    "button";


                allow.textContent =
                    "Allow";


                const deny =
                    document.createElement(
                        "button"
                    );


                deny.className =
                    "deny-button";


                deny.type =
                    "button";


                deny.textContent =
                    "Deny";


                allow.addEventListener(
                    "click",
                    () => {

                        allow.disabled =
                            true;

                        deny.disabled =
                            true;


                        socket.emit(
                            "approve-user",
                            {
                                sessionId:
                                    request.sessionId
                            }
                        );

                    }
                );


                deny.addEventListener(
                    "click",
                    () => {

                        allow.disabled =
                            true;

                        deny.disabled =
                            true;


                        socket.emit(
                            "deny-user",
                            {
                                sessionId:
                                    request.sessionId
                            }
                        );

                    }
                );


                actions.appendChild(
                    allow
                );


                actions.appendChild(
                    deny
                );


                item.appendChild(
                    name
                );


                item.appendChild(
                    actions
                );


                requestsList.appendChild(
                    item
                );

            }
        );

    }
);


// ========================================
// SYSTEM MESSAGE
// ========================================

socket.on(
    "system-message",
    ({ message }) => {

        const element =
            document.createElement(
                "div"
            );


        element.className =
            "system-message";


        element.textContent =
            message;


        messages.appendChild(
            element
        );


        scrollToBottom();

    }
);


// ========================================
// MEMBER REMOVED
// ========================================

socket.on(
    "member-removed",
    ({ message }) => {

        alert(
            message
        );


        clearStorage();


        window.location.href =
            "/";

    }
);


// ========================================
// FILE ERROR
// ========================================

socket.on(
    "file-error",
    ({ message }) => {

        hideUploadStatus();


        alert(
            message
        );

    }
);


// ========================================
// ROOM DELETED
// ========================================

socket.on(
    "room-deleted",
    ({ message }) => {

        messageInput.disabled =
            true;


        fileButton.disabled =
            true;


        leaveButton.disabled =
            true;


        messages.innerHTML =
            "";


        const element =
            document.createElement(
                "div"
            );


        element.className =
            "room-closed";


        element.innerHTML = `
            <div class="room-closed-icon">
                🔒
            </div>

            <h2>Room Closed</h2>

            <p>
                ${message}
            </p>
        `;


        messages.appendChild(
            element
        );


        clearStorage();


        setTimeout(
            () => {

                window.location.href =
                    "/";

            },
            3000
        );

    }
);


// ========================================
// LEAVE ROOM
// ========================================

leaveButton.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Are you sure you want to leave?"
            );


        if (!confirmed) {
            return;
        }


        socket.emit(
            "leave-room"
        );


        clearStorage();


        window.location.href =
            "/";

    }
);


// ========================================
// COPY ROOM CODE
// ========================================

roomCodeElement.addEventListener(
    "click",
    async () => {

        const code =
            roomCodeElement.textContent
                .replace(
                    "Copy",
                    ""
                )
                .trim();


        try {

            await navigator.clipboard.writeText(
                code
            );


            roomCodeElement.innerHTML =
                `${code} <span>Copied!</span>`;


            setTimeout(
                () => {

                    roomCodeElement.innerHTML =
                        `${code} <span>Copy</span>`;

                },
                1500
            );

        } catch (error) {

            console.error(
                "Copy failed:",
                error
            );

        }

    }
);


// ========================================
// CREATE BLOB
// ========================================

function createBlob(
    data,
    type
) {

    return new Blob(
        [data],
        {
            type:
                type || "application/octet-stream"
        }
    );

}


// ========================================
// DOWNLOAD FILE
// ========================================

function downloadFile(
    data,
    type,
    fileName
) {

    const blob =
        createBlob(
            data,
            type
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        fileName;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );

}


// ========================================
// OPEN IMAGE
// ========================================

function openImage(
    data,
    type
) {

    const blob =
        createBlob(
            data,
            type
        );


    const url =
        URL.createObjectURL(
            blob
        );


    window.open(
        url,
        "_blank"
    );


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        10000
    );

}


// ========================================
// FILE ICON
// ========================================

function getFileIcon(type) {

    if (!type) {
        return "📄";
    }


    if (
        type ===
        "application/pdf"
    ) {
        return "📕";
    }


    if (
        type.startsWith(
            "image/"
        )
    ) {
        return "🖼️";
    }


    if (
        type.includes(
            "word"
        )
    ) {
        return "📝";
    }


    if (
        type.includes(
            "sheet"
        ) ||
        type.includes(
            "excel"
        )
    ) {
        return "📊";
    }


    if (
        type.includes(
            "presentation"
        ) ||
        type.includes(
            "powerpoint"
        )
    ) {
        return "📽️";
    }


    if (
        type.includes(
            "zip"
        )
    ) {
        return "🗜️";
    }


    if (
        type.startsWith(
            "text/"
        )
    ) {
        return "📄";
    }


    return "📎";

}


// ========================================
// FILE SIZE
// ========================================

function formatFileSize(
    bytes
) {

    if (
        bytes < 1024
    ) {

        return `${bytes} B`;

    }


    if (
        bytes < 1024 * 1024
    ) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }


    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;

}


// ========================================
// UPLOAD STATUS
// ========================================

function showUploadStatus(
    text
) {

    uploadText.textContent =
        text;


    uploadStatus.classList.remove(
        "hidden"
    );

}


function hideUploadStatus() {

    uploadStatus.classList.add(
        "hidden"
    );

}


// ========================================
// FORMAT TIME
// ========================================

function formatTime(
    timestamp
) {

    return new Date(
        timestamp
    ).toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


// ========================================
// SCROLL
// ========================================

function scrollToBottom() {

    messages.scrollTop =
        messages.scrollHeight;

}


// ========================================
// CLEAR STORAGE
// ========================================

function clearStorage() {

    localStorage.removeItem(
        "chatToken"
    );

    localStorage.removeItem(
        "username"
    );

    localStorage.removeItem(
        "roomCode"
    );

    localStorage.removeItem(
        "isAdmin"
    );

}