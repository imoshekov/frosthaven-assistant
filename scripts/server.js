const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const sessions = {}; // Store sessions and connected clients

characters = [];

wss.on('connection', (ws) => {
    let currentSessionId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join-session') {
            // If sessionId is provided, join it; otherwise, create a new one
            let sessionId = data.sessionId;

            // Generate a new session ID if none was provided
            if (!sessionId) {
                sessionId = Math.floor(Math.random() * 100);
                sessions[sessionId] = []; // Create a new session with no clients
            }

            // Assign this client to the session
            currentSessionId = sessionId;
            sessions[sessionId].push(ws);

            // Notify the client of the session they've joined
            ws.send(JSON.stringify({ type: 'session-joined', sessionId }));

            // Send the latest characters state to the client when they join
            ws.send(JSON.stringify({ type: 'characters-update', characters: characters }));
        }

        if (data.type === 'characters-update') {
            // Update the server's characters array with the latest from a client
            characters = data.characters;

            // Broadcast the updated characters array to all clients in the same session
            if (currentSessionId && sessions[currentSessionId]) {
                sessions[currentSessionId].forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'characters-update', characters: characters }));
                    }
                });
            }
        }
    });

    // Cleanup when a client disconnects
    ws.on('close', () => {
        if (currentSessionId && sessions[currentSessionId]) {
            const index = sessions[currentSessionId].indexOf(ws);
            if (index !== -1) {
                sessions[currentSessionId].splice(index, 1);
            }
        }
    });
});


console.log('server running...');