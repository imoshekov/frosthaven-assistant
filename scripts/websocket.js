const WebSocketHandler = {
    ws: null,

    initialize: function() {
        if (!this.ws) {
            this.ws = new WebSocket('wss://frosthaven-assistant.onrender.com');
            
            this.ws.onopen = () => {
                const sessionId = prompt("Enter session ID or leave blank to create a new one:");
                this.ws.send(JSON.stringify({ type: 'join-session', sessionId: sessionId || null }));
            };

            // Listen for incoming WebSocket messages to handle session join confirmation
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'session-joined') {
                    document.getElementById('session-id').textContent = `session: ${data.sessionId}`;
                }
                if (data.type === 'characters-update') {
                    characters = data.characters;
                    UIController.renderTable();
                }
            };
        }
    },

    getInstance: function() {
        return this.ws;
    }
};
