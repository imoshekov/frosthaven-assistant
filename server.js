const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join-session') {
            const sessionId = data.sessionId || Math.random().toString(36).substr(2, 9);
            ws.send(JSON.stringify({ type: 'session-joined', sessionId }));
        } else if (data.type === 'update-number') {
            // Broadcast the updated number to all other clients
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update-number', value: data.value }));
                }
            });
        }
    });
});