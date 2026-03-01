import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const HEARTBEAT_INTERVAL = 15000;
const CLEANUP_INTERVAL = 60 * 60 * 1000; //1hour
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; //8hours
const SESSION_DEFAULT_DATA = {
    characters: {},
    elements: {
        fire: 'none',
        ice: 'none',
        earth: 'none',
        air: 'none',
        light: 'none',
        dark: 'none'
    },
    round: 1,
    graveyard: [],
    scenarioId: null
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
                    const fp = commandFingerprint('characters-update', data);
                    if (isDuplicateCommand(session, fp, originatingClientId)) {
                        ws.send(JSON.stringify({ type: 'command-rejected', commandType: 'characters-update' }));
                        break;
                    }
                    session.characters = data.characters;
                    session.lastActivity = Date.now();
                    session.lastCommand = { fingerprint: fp, clientId: originatingClientId };
                    broadcastToSession(currentSessionId, 'characters-update', { characters: data.characters, originatingClientId: originatingClientId });
                    break;
                }
                case 'graveyard-update': {
                    const fp = commandFingerprint('graveyard-update', data);
                    if (isDuplicateCommand(session, fp, originatingClientId)) {
                        ws.send(JSON.stringify({ type: 'command-rejected', commandType: 'graveyard-update' }));
                        break;
                    }
                    session.graveyard = data.graveyard;
                    session.lastActivity = Date.now();
                    session.lastCommand = { fingerprint: fp, clientId: originatingClientId };
                    broadcastToSession(currentSessionId, 'graveyard-update', { graveyard: data.graveyard, originatingClientId: originatingClientId });
                    break;
                }
                case 'round-update': {
                    const fp = commandFingerprint('round-update', data);
                    if (isDuplicateCommand(session, fp, originatingClientId)) {
                        ws.send(JSON.stringify({ type: 'command-rejected', commandType: 'round-update' }));
                        break;
                    }
                    session.roundNumber = data.roundNumber;
                    session.lastActivity = Date.now();
                    session.lastCommand = { fingerprint: fp, clientId: originatingClientId };
                    broadcastToSession(currentSessionId, 'round-update', { roundNumber: data.roundNumber, originatingClientId: originatingClientId });
                    break;
                }
                case 'scenario-update': {
                    const fp = commandFingerprint('scenario-update', data);
                    if (isDuplicateCommand(session, fp, originatingClientId)) {
                        ws.send(JSON.stringify({ type: 'command-rejected', commandType: 'scenario-update' }));
                        break;
                    }
                    session.scenarioId = data.scenarioId;
                    session.lastActivity = Date.now();
                    session.lastCommand = { fingerprint: fp, clientId: originatingClientId };
                    broadcastToSession(currentSessionId, 'scenario-update', { scenarioId: data.scenarioId, originatingClientId: originatingClientId });
                    break;
                }
                case 'elements-update': {
                    const fp = commandFingerprint('elements-update', data);
                    if (isDuplicateCommand(session, fp, originatingClientId)) {
                        ws.send(JSON.stringify({ type: 'command-rejected', commandType: 'elements-update' }));
                        break;
                    }
                    let newStates = {};
                    if (Array.isArray(data.elements)) {
                        data.elements.forEach(el => { newStates[el.type] = el.state; });
                    } else {
                        newStates = data.elements;
                    }
                    session.elementStates = newStates;
                    session.lastActivity = Date.now();
                    session.lastCommand = { fingerprint: fp, clientId: originatingClientId };

                    const elementsArray = Object.keys(session.elementStates).map(key => ({
                        type: key,
                        state: session.elementStates[key]
                    }));

                    broadcastToSession(currentSessionId, 'elements-update', {
                        elements: elementsArray,
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

                    ws.send(JSON.stringify({
                        type: 'scenario-update',
                        scenarioId: session.scenarioId
                    }));


                    const elementsArray = Object.keys(session.elementStates).map(key => ({
                        type: key,
                        state: session.elementStates[key]
                    }));

                    ws.send(JSON.stringify({
                        type: 'elements-update',
                        elements: elementsArray
                    }));

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
        elementStates = { ...SESSION_DEFAULT_DATA.elements };
    }

    sessions[sessionId] = {
        clients: [],
        characters: data.characters || [],
        roundNumber: data.roundNumber || 1,
        scenarioId: data.scenarioId || null,
        graveyard: data.graveyard || [],
        elementStates: elementStates,
        lastActivity: Date.now(),
        lastCommand: null,  // { fingerprint, clientId }
    };

    console.log(`Session ${sessionId} created`);
    return sessions[sessionId];
}


function getSession(sessionId) {
    return sessions[sessionId] || null;
}

/**
 * Returns a stable string fingerprint for a command based on its type and
 * meaningful payload (client identity excluded).  Returns null for message
 * types that should not be deduplicated (e.g. request-latest-state).
 */
function commandFingerprint(type, data) {
    switch (type) {
        case 'characters-update': return `${type}:${JSON.stringify(data.characters)}`;
        case 'graveyard-update':  return `${type}:${JSON.stringify(data.graveyard)}`;
        case 'round-update':      return `${type}:${data.roundNumber}`;
        case 'scenario-update':   return `${type}:${data.scenarioId}`;
        case 'elements-update':   return `${type}:${JSON.stringify(data.elements)}`;
        default:                  return null;
    }
}

/**
 * Checks whether `clientId` is allowed to run a command with the given
 * fingerprint in `session`.
 *
 * Rules:
 *   - Always allowed when there is no previous command.
 *   - Always allowed when the fingerprint differs from the last command.
 *   - Always allowed when the SAME client as the last command is sending again.
 *   - Blocked when a DIFFERENT client tries the exact same command.
 *
 * Returns true if the command should be blocked.
 */
function isDuplicateCommand(session, fingerprint, clientId) {
    if (!fingerprint) return false;
    if (!session.lastCommand) return false;
    if (session.lastCommand.fingerprint !== fingerprint) return false;
    return session.lastCommand.clientId !== clientId;
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

            console.log(`Client ${client.clientId} in session ${sessionId} received update of type ${type}`);
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

