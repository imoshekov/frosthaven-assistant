const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Store the latest value of the number input
let latestValue = 0;

wss.on('connection', (ws) => {
    console.log("A new client connected.");
    // Send the latest value to the newly connected client
    ws.send(JSON.stringify({ type: 'update-number', value: latestValue }));

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'update-number') {
            // Update the stored value and broadcast it to all clients
            latestValue = data.value;

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update-number', value: latestValue }));
                }
            });
        }
    });
});

console.log("WebSocket server is running on ws://localhost:8080");
