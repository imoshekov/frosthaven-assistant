const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const HEARTBEAT_INTERVAL = 15000;
const CLEANUP_INTERVAL = 60 * 60 * 1000; //1hour
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; //8hours
const SESSION_DEFAULT_DATA = {
    characters: [
        { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {},tempStats: {}, log: [] },
        { name: "Spaghetti", type: "drifter", aggressive: false, hp: 14, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {},tempStats: {}, log: [] },
        { name: "Krio Pat'ra", type: "snowflake", aggressive: false, hp: 11, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, tempStats: {}, log: [] },
        { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 9, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {},tempStats: {}, log: [] }
    ],
    elements: {
        fire: '{"elementId":"fire","path":"m 98.77778,194.73333 c -25.630363,0 -49.727202,-9.98114 -67.850807,-28.10475 C 12.803368,148.50498 2.8222266,124.40814 2.8222266,98.777777 2.8222266,73.14706 12.803368,49.050575 30.926973,30.92697 49.050578,12.803365 73.147417,2.8222231 98.77778,2.8222231 c 25.63036,0 49.7272,9.9811419 67.85081,28.1047469 18.1236,18.123605 28.10474,42.22009 28.10474,67.850807 0,25.630363 -9.98114,49.727203 -28.10474,67.850803 -18.12361,18.12361 -42.22045,28.10475 -67.85081,28.10475","fill":"url(#fire-bw)"}', 
        ice: '{"elementId":"ice","path":"m 98.77778,194.73333 c -25.630363,0 -49.727202,-9.98114 -67.850807,-28.10475 C 12.803368,148.50498 2.8222266,124.40814 2.8222266,98.777777 2.8222266,73.14706 12.803368,49.050575 30.926973,30.92697 49.050578,12.803365 73.147417,2.8222231 98.77778,2.8222231 c 25.63036,0 49.7272,9.9811419 67.85081,28.1047469 18.1236,18.123605 28.10474,42.22009 28.10474,67.850807 0,25.630363 -9.98114,49.727203 -28.10474,67.850803 -18.12361,18.12361 -42.22045,28.10475 -67.85081,28.10475","fill":"url(#ice-bw)"}', 
        air: '{"elementId":"air","path":"m 98.77778,194.73333 c -25.630363,0 -49.727202,-9.98114 -67.850807,-28.10475 C 12.803368,148.50498 2.8222266,124.40814 2.8222266,98.777777 2.8222266,73.14706 12.803368,49.050575 30.926973,30.92697 49.050578,12.803365 73.147417,2.8222231 98.77778,2.8222231 c 25.63036,0 49.7272,9.9811419 67.85081,28.1047469 18.1236,18.123605 28.10474,42.22009 28.10474,67.850807 0,25.630363 -9.98114,49.727203 -28.10474,67.850803 -18.12361,18.12361 -42.22045,28.10475 -67.85081,28.10475","fill":"url(#air-bw)"}', 
        earth: '{"elementId":"earth","path":"m 98.77778,194.73333 c -25.630363,0 -49.727202,-9.98114 -67.850807,-28.10475 C 12.803368,148.50498 2.8222266,124.40814 2.8222266,98.777777 2.8222266,73.14706 12.803368,49.050575 30.926973,30.92697 49.050578,12.803365 73.147417,2.8222231 98.77778,2.8222231 c 25.63036,0 49.7272,9.9811419 67.85081,28.1047469 18.1236,18.123605 28.10474,42.22009 28.10474,67.850807 0,25.630363 -9.98114,49.727203 -28.10474,67.850803 -18.12361,18.12361 -42.22045,28.10475 -67.85081,28.10475","fill":"url(#earth-bw)"}', 
        light: '{"elementId":"light","path":"m 98.77778,194.73333 c -25.630363,0 -49.727202,-9.98114 -67.850807,-28.10475 C 12.803368,148.50498 2.8222266,124.40814 2.8222266,98.777777 2.8222266,73.14706 12.803368,49.050575 30.926973,30.92697 49.050578,12.803365 73.147417,2.8222231 98.77778,2.8222231 c 25.63036,0 49.7272,9.9811419 67.85081,28.1047469 18.1236,18.123605 28.10474,42.22009 28.10474,67.850807 0,25.630363 -9.98114,49.727203 -28.10474,67.850803 -18.12361,18.12361 -42.22045,28.10475 -67.85081,28.10475","fill":"url(#light-bw)"}', 
        dark: '{"elementId":"dark","path":"m 98.77778,194.73333 c -25.630363,0 -49.727202,-9.98114 -67.850807,-28.10475 C 12.803368,148.50498 2.8222266,124.40814 2.8222266,98.777777 2.8222266,73.14706 12.803368,49.050575 30.926973,30.92697 49.050578,12.803365 73.147417,2.8222231 98.77778,2.8222231 c 25.63036,0 49.7272,9.9811419 67.85081,28.1047469 18.1236,18.123605 28.10474,42.22009 28.10474,67.850807 0,25.630363 -9.98114,49.727203 -28.10474,67.850803 -18.12361,18.12361 -42.22045,28.10475 -67.85081,28.10475","fill":"url(#dark-bw)"}' 
    },
    round: 1,
    graveyard: []
}

const sessions = {};

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
                case 'element-update': {
                    session.elementStates[data.elementId] = data.elementState;
                    session.lastActivity = Date.now();
                    broadcastToSession(currentSessionId, 'element-update', { elementState: data.elementState, originatingClientId: originatingClientId });
                    break;
                }
                case 'request-latest-state': {
                    session.lastActivity = Date.now();
                    ws.send(JSON.stringify({ type: 'characters-update', characters: session.characters }));
                    ws.send(JSON.stringify({ type: 'round-update', roundNumber: session.roundNumber }));
                    ws.send(JSON.stringify({ type: 'graveyard-update', graveyard: session.graveyard }));
                    Object.keys(session.elementStates).forEach((elementId) => {
                        ws.send(JSON.stringify({
                            type: 'element-update',
                            elementId,
                            elementState: session.elementStates[elementId]
                        }));
                    });
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
    let newSessionId;
    do {
        newSessionId = (Math.floor(Math.random() * 100)) + 1; //+1 because I don't like session 0
    } while (sessions[newSessionId]);
    return newSessionId;
}

function createSession(sessionId, data) {
    sessions[sessionId] = {
        clients: [],
        characters: data.characters || JSON.stringify(SESSION_DEFAULT_DATA.characters),
        roundNumber: data.roundNumber || SESSION_DEFAULT_DATA.round,
        graveyard: data.graveyard || SESSION_DEFAULT_DATA.graveyard,
        elementStates: data.elementStates || SESSION_DEFAULT_DATA.elements,
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
    if (!session) {
        return;
    }
    session.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
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

