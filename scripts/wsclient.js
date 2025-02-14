const WebSocketHandler = {
    enableHostClientStuff: false,
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
            DataManager.clear(DataManager.SESSION_ID);
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
                    this.sessionId = parseInt(document.getElementById('session-id').value);
                }
                else if (this.role === 'host') {
                    this.sessionId = '';
                }
            }
            let joinSessionPayload = {
                type: 'join-session',
                sessionId: this.sessionId
            };
            
            if (this.role === 'host') {
                joinSessionPayload.characters = DataManager.getCharacters();
                joinSessionPayload.roundNumber =  document.getElementById('round-number').value;
                joinSessionPayload.graveyard = DataManager.graveyard;
                const elementStates = {};
                const elements = document.querySelectorAll('.elements-wrapper svg');
                elements.forEach(e => {
                    let elementState = {}
                    elementState.elementId = e.id;
                    elementState.path = e.querySelector('path').getAttribute('d');
                    elementState.fill = e.querySelector('path').getAttribute('fill') || `url(#${e.id}-bw)`;
                    elementStates[e.id] = JSON.stringify(elementState);
                })
                joinSessionPayload.elementStates = elementStates;
            }
            
            this.ws.send(JSON.stringify(joinSessionPayload));
            this.isConnected = true;
            this.reconnectAttempts = 0; 
        };

        this.ws.onerror = () => {
            this.isConnected = false;
            UIController.showToastNotification("Unable to connect to the server. Retrying...", 1000);
            this.tryReconnect();
        };

        this.ws.onclose = () => {
            if (this.isConnected) {
                UIController.showToastNotification("The connection was closed. Trying to reconnect.", 1000);
            }
            this.isConnected = false;
            this.tryReconnect();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if(data.type === "session-joined"){
                this.handleSessionJoined(data);
                return;
            }
            if (this.enableHostClientStuff && this.role === 'host'){
                return;
            }
            if (data?.originatingClientId === this.clientId){
                return;
            }
            switch (data.type) {
                case "characters-update":
                    this.handleCharacterUpdate(data);
                    break;
                case "graveyard-update":
                    this.handleGraveyardUpdate(data);
                    break;
                case "round-update":
                    this.handleRoundUpdate(data);
                    break;
                case "element-update":
                    this.handleElementUpdate(data);
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
        return this.sessionId || DataManager.load(DataManager.SESSION_ID);
    },
    tryReconnect: function () {
        if (this.reconnecting) return;
    
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnecting = true; 
            this.reconnectAttempts++;
    
            const delay = Math.min(500 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000} seconds`);
    
            setTimeout(() => {
                this.connect();
                this.reconnecting = false; 
            }, delay);
        } else {
            UIController.showToastNotification("Failed to reconnect after multiple attempts. Please refresh the page or check your connection.", 3000);
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
        this.sendUpdateMessage('characters-update', { characters: DataManager.getCharacters() });
    },
    sendGraveyardUpdate: function () {
        this.sendUpdateMessage('graveyard-update', { graveyard: DataManager.graveyard });
    },
    sendRoundNumber: function (roundNumberValue) {
        this.sendUpdateMessage('round-update', { roundNumber: roundNumberValue });
    },
    sendElementState: function (elementId, elementState) {
        this.sendUpdateMessage('element-update', { elementId: elementId, elementState: elementState });
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
        DataManager.set(DataManager.SESSION_ID, data.sessionId);
        
        this.clientId = data.clientId;
        this.requestServerState(this.getSessionId());
        
        document.getElementById('joined-session-id').textContent = `${message} ${data.clientsCount} client(s) connected. Client id: ${data.clientId}`;
        UIController.showToastNotification(message, 3000);
    },
    handleCharacterUpdate: function (data) {
        DataManager.characters = data.characters;
        UIController.sortCreatures();
        UIController.renderTable();
        UIController.renderLogs();
    },
    handleGraveyardUpdate: function (data) {
        DataManager.graveyard = data.graveyard;
        UIController.sortCreatures();
        UIController.renderTable();
        UIController.renderLogs();
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
    handleMonsterAdded: function(data){
        DataManager.getCharacters().push(data.monster);
        UIController.sortCreatures();
        UIController.renderTable();
        UIController.renderLogs();
    },
    handleInitiativeReset: function(data){
        DataManager.getCharacters().forEach(c => {
            c.initiative = data.value;
        });
        UIController.renderTable();
    }
};
