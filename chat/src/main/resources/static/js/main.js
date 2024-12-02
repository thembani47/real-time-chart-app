"use strict";

// DOM Elements
const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');
const connectingElement = document.querySelector('.connecting');
const leaveButton = document.querySelector('#leaveButton');

let stompClient = null;
let username = null;

// Avatar Colors
const colors = [
    '#ee82ee',  // Violet
    '#6a5acd',  // SlateBlue
    '#ffa500',  // Orange
    '#ff5652',  // Red
    '#ffc107',  // Yellow
    '#ff85af',  // Pink
    '#FF9800',  // Deep Orange
    '#39bbb0'   // Teal
];

// Connect to WebSocket
function connect(event) {
    event.preventDefault(); // Prevent default form submission
    username = document.querySelector('#name').value.trim();

    if (username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
}

// WebSocket Connection Established
function onConnected() {
    // Subscribe to the public topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Notify server about new user joining
    stompClient.send("/app/chat.saveUser", {}, JSON.stringify({ sender: username, type: 'JOIN' }));

    connectingElement.classList.add('hidden');
}

// WebSocket Connection Error
function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh the page to try again!';
    connectingElement.style.color = '#ff0000';
    connectingElement.classList.remove('hidden');
}

// Send Message to WebSocket
function sendMessage(event) {
    event.preventDefault(); // Prevent form submission
    const messageContent = messageInput.value.trim();

    if (messageContent && stompClient) {
        const chatMessage = {
            sender: username,
            content: messageContent,
            type: 'CHAT',
            timestamp: new Date().toLocaleTimeString()
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = ''; // Clear input field
    }
}

// Handle Incoming Message
function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);

    const messageElement = document.createElement('li');
    const textElement = document.createElement('p');
    const messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    // Display JOIN or LEAVE messages
    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = `${message.sender} joined!`;
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = `${message.sender} left!`;
    } else {
        messageElement.classList.add('chat-message');

        // Create avatar
        const avatarElement = document.createElement('i');
        const avatarText = document.createTextNode(message.sender[0]);
        avatarElement.appendChild(avatarText);
        avatarElement.style.backgroundColor = getAvatarColor(message.sender);
        messageElement.appendChild(avatarElement);

        // Display username
        const usernameElement = document.createElement('span');
        const usernameText = document.createTextNode(message.sender);
        usernameElement.appendChild(usernameText);
        messageElement.appendChild(usernameElement);

        // Add timestamp
        const timestampElement = document.createElement('span');
        timestampElement.classList.add('timestamp');
        const timestampText = document.createTextNode(` (${message.timestamp || new Date().toLocaleTimeString()})`);
        timestampElement.appendChild(timestampText);
        messageElement.appendChild(timestampElement);
    }

    messageElement.appendChild(textElement);
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight; // Scroll to the bottom
}

// Get Avatar Color
function getAvatarColor(messageSender) {
    let hash = 0;
    for (let i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

// Handle Leave Button Click
function leaveChat() {
    if (stompClient) {
        const chatMessage = {
            sender: username,
            type: 'LEAVE'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));

        // Disconnect from WebSocket
        stompClient.disconnect();

        // Reset UI
        chatPage.classList.add('hidden');
        usernamePage.classList.remove('hidden');

        // Clear the message area and input
        messageArea.innerHTML = '';
        messageInput.value = '';
        connectingElement.classList.remove('hidden');
        connectingElement.textContent = 'Connecting...';
    }
}

// Event Listeners
usernameForm.addEventListener('submit', connect);
messageForm.addEventListener('submit', sendMessage);
leaveButton.addEventListener('click', leaveChat); // Handle leave button
