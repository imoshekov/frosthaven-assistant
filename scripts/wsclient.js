const WebSocketHandler = {
    ws: null,
    isConnected: false,

    initialize: async function () {
        try {
            this.ws = new WebSocket(
                window.location.hostname.includes('github.io') ?
                    'wss://frosthaven-assistant.onrender.com'
                    : 'ws://localhost:8080'
            );

            this.ws.onopen = () => {
                const sessionId = prompt("Enter session ID or leave blank to create a new one:");
                this.ws.send(JSON.stringify({ type: 'join-session', sessionId: sessionId || null }));
                this.isConnected = true;
            };

            this.ws.onerror = () => {
                alert("Unable to connect to the server. It might be asleep. Please try again in a few seconds.");
                this.isConnected = false;
            };

            this.ws.onclose = () => {
                if (this.isConnected) {
                    alert("The connection was closed. Please try reconnecting.");
                }
                this.isConnected = false;
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case "session-joined": {
                        this.handleSessionJoined(data);
                        break;
                    }
                    case "characters-update": {
                        this.handleCharacterUpdate(data);
                        break;
                    }
                    case "round-update": {
                        this.handleRoundUpdate(data);
                        break;
                    }
                    case "element-update": {
                        this.handleElementUpdate(data);
                        break;
                    }
                }
            };

        } catch (error) {
            console.error("WebSocketHandler error", error.message);
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
            elementState: elementState, // Send as an object
        }));
    },
    handleSessionJoined: function (data) {
        const message = `session: ${data.sessionId}, ${data.clientsCount} client(s) connected.`;
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
