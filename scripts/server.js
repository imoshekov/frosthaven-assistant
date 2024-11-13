const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const sessions = {}; // Store sessions and connected clients

let characters = [
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
            console.log(`new client joined session ${sessionId}, total amount of clients connected: ${sessions[sessionId].length}`);

            // Notify the client of the session they've joined
            ws.send(JSON.stringify({ type: 'session-joined', sessionId }));

            // Send the latest characters state to the client when they join
            if (sessions[sessionId].length > 1) {
                ws.send(JSON.stringify({ type: 'characters-update', characters: characters }));
            }
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