const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const sessions = {}; // Store sessions, connected clients, and characters data

// Initial character data to send when a new session is created
const initialCharacters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 7, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
];

wss.on('connection', (ws) => {
    let currentSessionId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join-session') {
            let sessionId = data.sessionId;

            // Generate a new session ID if none was provided
            if (!sessionId) {
                sessionId = Math.floor(Math.random() * 100);
                sessions[sessionId] = { clients: [], characters: [...initialCharacters] }; // Initialize session with clients and initial characters
            }

            // Assign this client to the session
            currentSessionId = sessionId;
            sessions[sessionId].clients.push(ws);

            // Notify the client of the session they've joined
            ws.send(JSON.stringify({ type: 'session-joined', sessionId }));

            // Send the latest characters state to the client
            const charactersToSend = sessions[sessionId].characters;
            ws.send(JSON.stringify({ type: 'characters-update', characters: charactersToSend }));
        }

        if (data.type === 'characters-update') {
            // Update the session's characters array with the latest from a client
            if (currentSessionId && sessions[currentSessionId]) {
                sessions[currentSessionId].characters = data.characters;

                // Broadcast the updated characters array to all clients in the same session
                sessions[currentSessionId].clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'characters-update', characters: data.characters }));
                    }
                });
            }
        }
    });

    // Cleanup when a client disconnects
    ws.on('close', () => {
        if (currentSessionId && sessions[currentSessionId]) {
            const index = sessions[currentSessionId].clients.indexOf(ws);
            if (index !== -1) {
                sessions[currentSessionId].clients.splice(index, 1);
            }
        }
    });
});

console.log('server running...');
