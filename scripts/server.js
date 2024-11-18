const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const HEARTBEAT_INTERVAL = 15000; 
const sessions = {};
const defaultCharacters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 7, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
];

// Create HTTP server
const server = http.createServer((req, res) => {
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

// Attach WebSocket server to HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.clientId = Math.random().toString(36).slice(2, 10);
    let currentSessionId = null;

    // Mark connection as alive and listen for pongs
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join-session': {
                let sessionId = data.sessionId || Math.floor(Math.random() * 100);
                let session = getSession(sessionId);
                if (!session) {
                    createSession(sessionId);
                    session = getSession(sessionId);
                }

                currentSessionId = sessionId;
                session.clients.push(ws);
                session.lastActivity = Date.now();

                console.log(`Client ${ws.clientId} joined session ${sessionId}. Total clients: ${session.clients.length}`);

                ws.send(JSON.stringify({
                    type: 'session-joined',
                    sessionId,
                    clientsCount: session.clients.length,
                    isNewSession: session.clients.length === 1,
                    clientId: ws.clientId
                }));

                if (session.clients.length > 1) {
                    ws.send(JSON.stringify({ type: 'characters-update', characters: session.characters }));
                    ws.send(JSON.stringify({ type: 'round-update', roundNumber: session.roundNumber }));
                    Object.keys(session.elementStates).forEach((elementId) => {
                        ws.send(JSON.stringify({
                            type: 'element-update',
                            elementId,
                            elementState: session.elementStates[elementId]
                        }));
                    });
                } else {
                    console.log(`Session ${sessionId} has only one client. Not sending default data to avoid overwriting client state.`);
                }
                break;
            }
            case 'characters-update': {
                const session = getSession(currentSessionId);
                if (session) {
                    session.characters = data.characters;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'characters-update', { characters: data.characters });
                }
                break;
            }
            case 'round-update': {
                const session = getSession(currentSessionId);
                if (session) {
                    session.roundNumber = data.roundNumber;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'round-update', { roundNumber: data.roundNumber });
                }
                break;
            }
            case 'element-update': {
                const session = getSession(currentSessionId);
                if (session) {
                    session.elementStates[data.elementId] = data.elementState;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'element-update', { elementState: data.elementState });
                }
                break;
            }
            default: {
                console.log(`Unknown message type: ${data.type}`);
                break;
            }
        }
    });


    ws.on('close', () => {
        if (currentSessionId) {
            const session = getSession(currentSessionId);
            if (session) {
                const index = session.clients.indexOf(ws);
                if (index !== -1) session.clients.splice(index, 1);
                session.lastActivity = Date.now();
                console.log(`Client ${ws.clientId} left session ${currentSessionId}. Total clients: ${session.clients.length}`);
            }
        }
    });
});

// Ping-Pong mechanism to keep connections alive
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            ws.terminate();
        } else {
            ws.isAlive = false;
            ws.ping();
        }
    });
}, HEARTBEAT_INTERVAL);

function createSession(sessionId) {
    sessions[sessionId] = {
        clients: [],
        characters: JSON.parse(JSON.stringify(defaultCharacters)),
        roundNumber: 1,
        elementStates: {},
        lastActivity: Date.now(),
    };
    console.log(`Session ${sessionId} created.`);
}

function getSession(sessionId) {
    return sessions[sessionId] || null;
}

function broadcastToSession(sessionId, type, data) {
    const session = getSession(sessionId);
    if (session) {
        session.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type, ...data }));
            }
        });
    }
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
