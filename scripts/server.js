const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const sessions = {};
let characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 7, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
];
let roundNumber = 1;
let elementStates = {};


// Create an HTTP server
const server = http.createServer((req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://imoshekov.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
    } else if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server is awake and running');
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Attach WebSocket server to the same HTTP server
const wss = new WebSocket.Server({ server });

// Set up the ping-pong mechanism to keep WebSocket connections alive
const heartbeatInterval = 30000;
wss.on('connection', (ws) => {
    let currentSessionId = null;

    // Mark the connection as alive and listen for pongs
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join-session') {
            let sessionId = data.sessionId;
            let isNewSession = false;
            // Initialize session if it doesn't exist
            if (!sessionId || !sessions[sessionId]) {
                sessionId = sessionId || Math.floor(Math.random() * 100);
                sessions[sessionId] = [];
                isNewSession = true;
            }
            currentSessionId = sessionId;
            sessions[sessionId].push(ws);
            console.log(`New client joined session ${sessionId}, total clients: ${sessions[sessionId].length}`);
            ws.send(JSON.stringify({
                type: 'session-joined',
                sessionId: sessionId,
                clientsCount: sessions[sessionId].length,
                isNewSession: isNewSession
            }));
            if (sessions[sessionId].length > 1) {
                //update clients with current state of synced elemenets
                ws.send(JSON.stringify({ type: 'characters-update', characters: characters }));
                ws.send(JSON.stringify({ type: 'round-update', roundNumber: roundNumber }));
                Object.keys(elementStates).forEach(elementId => {
                    ws.send(JSON.stringify({
                        type: 'element-update',
                        elementId: elementId,
                        elementState: elementStates[elementId]
                    }));
                });
            }
        }
        if (data.type === 'characters-update') {
            characters = data.characters;
            broadcastToSession(currentSessionId, 'characters-update', { characters });
        }
        
        if (data.type === 'round-update') {
            roundNumber = data.roundNumber;
            broadcastToSession(currentSessionId,'round-update', { roundNumber: data.roundNumber });
        }
        
        if (data.type === 'element-update') {
            const { elementId, elementState } = data;
            elementStates[elementId] = elementState;
            broadcastToSession(currentSessionId,'element-update', { elementState });
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

function broadcastToSession(sessionId, type, data) {
    if (sessionId && sessions[sessionId]) {
        sessions[sessionId].forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type, ...data }));
            }
        });
    }
}

// Set up a regular interval to check if clients are still alive
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
    });
}, heartbeatInterval);

// Start the HTTP & WebSocket server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
