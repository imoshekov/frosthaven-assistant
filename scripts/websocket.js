// websocket.js

const WebSocketHandler = {
    ws: null,
    isConnected: false,

    initialize: function() {
         if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.ws = new WebSocket('wss://frosthaven-assistant.onrender.com');

            this.ws.onopen = () => {
                this.isConnected = true;
                const sessionId = prompt("Enter session ID or leave blank to create a new one:");
                this.ws.send(JSON.stringify({ type: 'join-session', sessionId: sessionId || null }));
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
                    alert(`Joined session ${data.sessionId}`);
                    document.getElementById('session-id').textContent = `session: ${data.sessionId}`;
                }
                if (data.type === 'characters-update') {
                    characters = data.characters;
                    UIController.renderTable();
                }
            };
        }
        else{
            alert('WebSocket is not connected. Please check your connection.');
            return;
        }
    },
    getInstance: function() {
        return this.ws;
    },
    sendCharactersUpdate: function(){
        this.getInstance().send(JSON.stringify({
            type: 'characters-update',
            characters: characters
        }))
    }
};
