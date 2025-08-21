import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
// const { data } = require('../../data/data.js');
const PORT = process.env.PORT || 8080;
const HEARTBEAT_INTERVAL = 15000;
const CLEANUP_INTERVAL = 60 * 60 * 1000; //1hour
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; //8hours
const SESSION_DEFAULT_DATA = {
    characters: {},
     elementStates: {
            fire: 'none',
            ice: 'none',
            earth: 'none',
            air: 'none',
            light: 'none',
            dark: 'none'
        },
    round: 1,
    graveyard: []
}

const sessions = {};

// Create HTTP server
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://imoshekov.github.io');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200/frosthaven-assistant');
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
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.clientId = Math.random().toString(36).slice(2, 10);
    let currentSessionId = null;

    // Mark connection as alive and listen for pongs
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log(`Client ${ws.clientId} sent a pong response.`);
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const originatingClientId = ws.clientId;
        if (data.type === 'join-session') {
            let sessionId = data.sessionId || generateUniqueSessionId();
            let session = getSession(sessionId);

            if (!session) {
                // Pass the sessionId to create a session
                session = createSession(sessionId, data);
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
        }
        else {
            const session = getSession(currentSessionId);
            if (!session) {
                return;
            }
            switch (data.type) {
                case 'characters-update': {
                    session.characters = data.characters;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'characters-update', { characters: data.characters, originatingClientId: originatingClientId });
                    break;
                }
                case 'graveyard-update': {
                    session.graveyard = data.graveyard;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'graveyard-update', { graveyard: data.graveyard, originatingClientId: originatingClientId });
                    break;
                }
                case 'round-update': {
                    session.roundNumber = data.roundNumber;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'round-update', { roundNumber: data.roundNumber, originatingClientId: originatingClientId });
                    break;
                }
                case 'elements-update': {
                    session.elementStates = data.elements; // store whole array
                    session.lastActivity = Date.now();

                    broadcastToSession(currentSessionId, 'elements-update', {
                        elements: data.elements,
                        originatingClientId
                    });
                    break;
                }


                case 'request-latest-state': {
                    session.lastActivity = Date.now();
                    ws.send(JSON.stringify({
                        type: 'characters-update',
                        characters: session.characters
                    }));
                    ws.send(JSON.stringify({
                        type: 'round-update',
                        roundNumber: session.roundNumber
                    }));
                    // Send latest graveyard if needed
                    // ws.send(JSON.stringify({ type: 'graveyard-update', graveyard: session.graveyard }));
                    const elementsArray = Object.keys(session.elementStates).map(key => ({
                        type: key,
                        state: session.elementStates[key]
                    }));
                    ws.send(JSON.stringify({
                        type: 'elements-update',
                        elements: elementsArray,
                        originatingClientId: ws.clientId
                    }));

                    break;
                }

                case 'add-monster': {
                    session.characters.push(data.monster);
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'add-monster', { monster: data.monster, originatingClientId: originatingClientId });
                    break;
                }
                case 'initiative-reset': {
                    session.characters.forEach(character => {
                        character.initiative = data.value;
                    });

                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'initiative-reset', { value: data.value, originatingClientId: originatingClientId });
                    break;
                }
                default: {
                    console.log(`Unknown message type: ${data.type}`);
                    break;
                }
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

function generateUniqueSessionId() {
    return Object.keys(sessions).length + 1;
}

function createSession(sessionId, data) {
    let elementStates = {};
    if (Array.isArray(data.elementStates)) {
        data.elementStates.forEach(el => {
            elementStates[el.type] = el.state;
        });
    } else {
        elementStates = SESSION_DEFAULT_DATA.elementStates;
    }

    sessions[sessionId] = {
        clients: [],
        characters: data.characters || [],
        roundNumber: data.roundNumber || 1,
        graveyard: data.graveyard || [],
        elementStates: elementStates,
        lastActivity: Date.now(),
    };

   console.log(`Session ${sessionId} created.`);

    return sessions[sessionId];
}

function getSession(sessionId) {
    return sessions[sessionId] || null;
}

function broadcastToSession(sessionId, type, data) {
    const session = getSession(sessionId);
    if (!session) return;

    const originatingClientId = data.originatingClientId;

    session.clients.forEach((client) => {
        // Skip the client that sent the update
        if (client.readyState === WebSocket.OPEN && client.clientId !== originatingClientId) {
            const payload = { type, ...data };
            client.send(JSON.stringify(payload));

            console.log(
                `Client ${client.clientId} in session ${sessionId} received update of type ${type}`
            );
        }
    });
}


// Ping-Pong mechanism to keep connections alive
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log(`Client ${ws.clientId} did not respond to the ping and will be terminated.`);
            ws.terminate();
        } else {
            ws.isAlive = false;
            ws.ping();
        }
    });
}, HEARTBEAT_INTERVAL);

// Periodic cleanup of inactive sessions
setInterval(() => {
    const now = Date.now();

    Object.keys(sessions).forEach((sessionId) => {
        const session = sessions[sessionId];

        if (now - session.lastActivity > SESSION_TIMEOUT) {
            console.log(`Session ${sessionId} has been inactive beyound the session timeout limit. Cleaning up.`);

            // Close all WebSocket connections in this session
            session.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.close(1001, "Session expired due to inactivity.");
                }
            });

            delete sessions[sessionId];
        }
    });
}, CLEANUP_INTERVAL);


// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

