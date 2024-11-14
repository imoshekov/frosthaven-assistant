const WebSocketHandler = {
    ws: null,
    isConnected: false,

    initialize: async function () {
        try {
            // this.ws = new WebSocket('wss://frosthaven-assistant.onrender.com');
            this.ws = new WebSocket('ws://localhost:8080');

            this.ws.onopen = () => {
                const sessionId = prompt("Enter session ID or leave blank to create a new one:");
                // if (sessionId === null) {
                //     return;
                // }
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

                if (data.type === 'session-joined') {
                    const message = `session: ${data.sessionId}, ${data.clientsCount} client(s) connected.`;
                    document.getElementById('session-id').textContent = message;
                    const toast = document.getElementById('toast-notification');
                    toast.textContent = message;
                    toast.classList.add('show');

                    setTimeout(() => {
                        toast.classList.remove('show');
                    }, 5000);
                }
                if (data.type === 'characters-update') {
                    characters = data.characters;
                    UIController.renderTable();
                }
            };

        } catch (error) {
            console.error("Error waking up the server:", error.message);
        }
    },
    getInstance: function () {
        return this.ws;
    },
    sendCharactersUpdate: function () {
        this.getInstance().send(JSON.stringify({
            type: 'characters-update',
            characters: characters
        }))
    }
};