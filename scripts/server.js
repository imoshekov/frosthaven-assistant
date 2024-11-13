const http = require('http');
const WebSocket = require('ws');
const PORT = 8080;

const sessions = {}; // Store sessions and connected clients
let characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 7, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
];

// Create an HTTP server
const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server is awake and running');
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Attach WebSocket server to the same HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    let currentSessionId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join-session') {
            let sessionId = data.sessionId;
            let isNewSession = false;

            if (!sessionId) {
                sessionId = Math.floor(Math.random() * 100);
                sessions[sessionId] = [];
                isNewSession = true;
            }

            currentSessionId = sessionId;
            sessions[sessionId].push(ws);
            console.log(`new client joined session ${sessionId}, total clients: ${sessions[sessionId].length}`);

            ws.send(JSON.stringify({
                type: 'session-joined',
                sessionId: sessionId,
                clientsCount: sessions[sessionId].length,
                isNewSession: isNewSession
            }));

            if (sessions[sessionId].length > 1) {
                ws.send(JSON.stringify({ type: 'characters-update', characters: characters }));
            }
        }

        if (data.type === 'characters-update') {
            characters = data.characters;

            if (currentSessionId && sessions[currentSessionId]) {
                sessions[currentSessionId].forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'characters-update', characters: characters }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        if (currentSessionId && sessions[currentSessionId]) {
            const index = sessions[currentSessionId].indexOf(ws);
            if (index !== -1) {
                sessions[currentSessionId].splice(index, 1);
            }
        }
    });
});

// Start the HTTP & WebSocket server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
