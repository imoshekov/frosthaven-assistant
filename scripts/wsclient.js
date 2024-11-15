const WebSocketHandler = {
    ws: null,
    isConnected: false,
    sessionId: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,

    initialize: async function () {
        try {
            this.connect();
        } catch (error) {
            console.error("WebSocketHandler initialization error:", error.message);
        }
    },
    connect: function () {
        this.ws = new WebSocket(
            window.location.hostname.includes('github.io') ?
                'wss://frosthaven-assistant.onrender.com'
                : 'ws://localhost:8080'
        );

        this.ws.onopen = () => {
            if (!this.sessionId) {
                this.sessionId = prompt("Enter session ID or leave blank to create a new one:") || null;
            }
            this.ws.send(JSON.stringify({ type: 'join-session', sessionId: this.sessionId }));
            this.isConnected = true;
            this.reconnectAttempts = 0; 
        };

        this.ws.onerror = () => {
            this.isConnected = false;
            UIController.showToastNotification("Unable to connect to the server. Retrying...");
            UIController.hideToastNotification(3000);
            this.tryReconnect();
        };

        this.ws.onclose = () => {
            if (this.isConnected) {
                UIController.showToastNotification("The connection was closed. Trying to reconnect.");
            }
            this.isConnected = false;
            this.tryReconnect();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "session-joined":
                    this.handleSessionJoined(data);
                    break;
                case "characters-update":
                    this.handleCharacterUpdate(data);
                    break;
                case "round-update":
                    this.handleRoundUpdate(data);
                    break;
                case "element-update":
                    this.handleElementUpdate(data);
                    break;
                default:
                    console.warn("Unknown message type:", data.type);
            }
        };
    },
    tryReconnect: function () {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => {
                this.connect();
            }, 3000); 
        } else {
            UIController.showToastNotification("Failed to reconnect after multiple attempts. Please refresh the page or check your connection.");
            UIController.hideToastNotification(5000);
        }
    },
    getInstance: function () {
        return this.ws;
    },
    sendCharactersUpdate: function () {
        this.ws.send(JSON.stringify({
            type: 'characters-update',
            characters: characters
        }))
    },
    sendRoundNumber: function (roundNumberValue) {
        this.ws.send(JSON.stringify({
            type: 'round-update',
            roundNumber: roundNumberValue
        }));
    },
    sendElementState: function (elementId, elementState) {
        this.ws.send(JSON.stringify({
            type: 'element-update',
            elementId: elementId,
            elementState: elementState,
        }));
    },
    handleSessionJoined: function (data) {
        const message = `Session: ${data.sessionId}, ${data.clientsCount} client(s) connected.`;
        this.sessionId = data.sessionId;
        document.getElementById('session-id').textContent = message;
        UIController.showToastNotification(message);
        UIController.hideToastNotification(3000);
    },
    handleCharacterUpdate: function (data) {
        characters = data.characters;
        UIController.renderTable();
    },
    handleRoundUpdate: function (data) {
        document.getElementById('round-number').value = data.roundNumber;
    },
    handleElementUpdate: function (data) {
        const elementState = JSON.parse(data.elementState)
        const element = document.getElementById(elementState.elementId);

        if (element) {
            const pathElement = element.querySelector('path');
            pathElement.setAttribute('d', elementState.path);
            pathElement.setAttribute('fill', elementState.fill);
        }
    }
};
