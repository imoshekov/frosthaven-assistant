const WebSocketHandler = {
    enableHostClientStuff: true,
    ws: null,
    isConnected: false,
    sessionId: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    pingServerInterval: 300000,
    clientId: null,
    role: null,

    initialize: async function (role) {
        try {
            DataManager.clear('sessionId');
            this.sessionId = null;
            this.role = role;
            this.connect();
        } catch (error) {
            console.error("WebSocketHandler initialization error:", error.message);
        }
    },
    connect: function () {
        this.ws = new WebSocket(
            window.location.hostname.includes('github.io') ?
                'wss://frosthaven-assistant.onrender.com'
                : 'ws://localhost:8080'
        );

        this.ws.onopen = () => {
            let sessionId = this.getSessionId();
            if (!sessionId) {
                if (this.role === 'client') {
                    this.sessionId = prompt("Enter a session id");
                }
                else if (this.role === 'host') {
                    this.sessionId = '';
                }
            }
            this.ws.send(JSON.stringify({ type: 'join-session', sessionId: this.sessionId }));
            this.isConnected = true;
            this.reconnectAttempts = 0; 
        };

        this.ws.onerror = () => {
            this.isConnected = false;
            UIController.showToastNotification("Unable to connect to the server. Retrying...");
            UIController.hideToastNotification(2000);
            this.tryReconnect();
        };

        this.ws.onclose = () => {
            if (this.isConnected) {
                UIController.showToastNotification("The connection was closed. Trying to reconnect.");
            }
            this.isConnected = false;
            this.tryReconnect();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if(data.type === "session-joined"){
                this.handleSessionJoined(data);
            }
            if(this.enableHostClientStuff && this.role === 'host'){
                return;
            }
            switch (data.type) {
                case "characters-update":
                    this.handleCharacterUpdate(data);
                    break;
                case "round-update":
                    this.handleRoundUpdate(data);
                    break;
                case "element-update":
                    this.handleElementUpdate(data);
                    break;
                case "battle-log-update":
                    this.handleBattleLogUpdate(data);
                    break;
                case "add-monster":
                    this.handleMonsterAdded(data);
                    break;
                case "initiative-reset":
                    this.handleInitiativeReset(data);
                    break;
            }
        };
    },
    getSessionId: function(){
        return this.sessionId || DataManager.load('sessionId');
    },
    tryReconnect: function () {
        if (this.reconnecting) return;
    
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnecting = true; 
            this.reconnectAttempts++;
    
            // 3 seconds is the base delay, with exponential backoff, capped at 30 seconds
            const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000} seconds`);
    
            setTimeout(() => {
                this.connect();
                this.reconnecting = false; 
            }, delay);
        } else {
            UIController.showToastNotification("Failed to reconnect after multiple attempts. Please refresh the page or check your connection.");
            UIController.hideToastNotification(3000);
        }
    },
    getInstance: function () {
        return this.ws;
    },
    keepServerAlive: function () {
        setInterval(() => {
            fetch('https://frosthaven-assistant.onrender.com/ping')
                .then(response => {
                    if (!response.ok) {
                        console.error('Server ping failed:', response.status);
                    } else {
                        document.getElementById('server-last-pinged').innerHTML = `Last server ping: ${new Date().toLocaleTimeString()}`;
                    }
                })
                .catch(error => console.error('Error pinging server:', error));
        }, this.pingServerInterval);
    },
    sendUpdateMessage: function(type, payload) {
        if (this.enableHostClientStuff && this.role === 'client') {
            return;
        }
        this.ws.send(JSON.stringify({
            type: type,
            ...payload 
        }));
    },
    sendCharactersUpdate: function () {
        this.sendUpdateMessage('characters-update', { characters: characters });
    },
    sendRoundNumber: function (roundNumberValue) {
        this.sendUpdateMessage('round-update', { roundNumber: roundNumberValue });
    },
    sendElementState: function (elementId, elementState) {
        this.sendUpdateMessage('element-update', { elementId: elementId, elementState: elementState });
    },
    sendLogUpdate: function(event, timestamp){
        this.sendUpdateMessage('battle-log-update', { event: event, timestamp: timestamp });
    },
    requestServerState: function(sessionId){
        this.ws.send(JSON.stringify({ type: 'request-latest-state', sessionId: sessionId }));
    },
    sendMonsterAdded: function(monster){
        this.sendUpdateMessage('add-monster', { monster: monster });
    },
    sendInitiativeReset: function (value = 0) {
        this.sendUpdateMessage('initiative-reset', { value: value });
    },
    handleSessionJoined: function (data) {
        const message = `Connected to session: ${data.sessionId}.`;
        this.sessionId = data.sessionId;
        DataManager.set('sessionId', data.sessionId);
        
        this.clientId = data.clientId;
        this.requestServerState(this.getSessionId());
        
        document.getElementById('session-id').textContent = `${message} ${data.clientsCount} client(s) connected. Client id: ${data.clientId}`;
        UIController.showToastNotification(message, 3000);
    },
    handleCharacterUpdate: function (data) {
        characters = data.characters;
        UIController.renderTable();
    },
    handleRoundUpdate: function (data) {
        document.getElementById('round-number').value = data.roundNumber;
    },
    handleElementUpdate: function (data) {
        const elementState = JSON.parse(data.elementState)
        const element = document.getElementById(elementState.elementId);
        const pathElement = element.querySelector('path');
        pathElement.setAttribute('d', elementState.path);     
        pathElement.setAttribute('fill', elementState.fill);

    },
    handleBattleLogUpdate: function (data){
        if (data.originatingClientId === WebSocketHandler.clientId) {
            console.log(`Ignoring own battle log event: "${data.event}"`);
            return; 
        }
        DataManager.renderLog(data.event, data.timestamp);
    },
    handleMonsterAdded: function(data){
        if (data.originatingClientId === WebSocketHandler.clientId) {
            return;
        }
        characters.push(data.monster);
        UIController.renderTable();
    },
    handleInitiativeReset: function(data){
        if (data.originatingClientId === WebSocketHandler.clientId) {
            return;
        }
        characters.forEach(c => {
            c.initiative = data.value;
        });
        UIController.renderTable();
    }
};
