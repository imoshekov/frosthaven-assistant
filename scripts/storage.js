

const DataManager = {
    load(key) {
        return localStorage.getItem(key);
    },
    set(key, value){
        localStorage.setItem(key, value);
    },
    clear(key){
        localStorage.removeItem(key);
    },
    saveGame() {
        document.getElementById('loading-spinner').style.visibility = 'visible';

        const currentCharacterData = JSON.stringify(characters);
        this.set('characters', currentCharacterData);

        const battleLogInnerHtml = document.getElementById('battle-log').innerHTML;
        this.set('battle-log', battleLogInnerHtml);

        //totally useless timeout, it is just to please merx3 as he requested a loading spinner (merx3 is pleased ;])
        setTimeout(() => {
            document.getElementById('last-saved-timestamp').innerHTML = `Last local save: ${new Date().toLocaleTimeString()}`;
            document.getElementById('loading-spinner').style.visibility = 'hidden';
        }, 1000);
    },
    resetGame() {
        localStorage.clear();
        location.reload();
    },
    log(event) {
        const timestamp = new Date().toLocaleTimeString();
        // Render the log locally
        this.renderLog(event, timestamp);

        if (WebSocketHandler.isConnected) {
            WebSocketHandler.sendLogUpdate(event, timestamp);
        }
    },
    renderLog(event, timestamp) {
        const logLimit = 250;
        const li = document.createElement('li');

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('log-time');
        timeSpan.textContent = `${timestamp} - `;

        const eventSpan = document.createElement('span');
        eventSpan.classList.add('log-event');

        const hashMatch = event.match(/#(.*?)#/);

        if (hashMatch) {
            const parts = event.split(hashMatch[0]);
            const beforeHash = parts[0];
            const afterHash = parts[1] || '';

            const hashSpan = document.createElement('span');
            hashSpan.textContent = hashMatch[1];
            hashSpan.classList.add('log-bold');

            eventSpan.textContent = beforeHash;
            eventSpan.appendChild(hashSpan);
            eventSpan.appendChild(document.createTextNode(afterHash));
        } else {
            eventSpan.textContent = event;
        }

        li.appendChild(timeSpan);
        li.appendChild(eventSpan);

        const logContainer = document.getElementById('battle-log');
        logContainer.insertBefore(li, logContainer.firstChild);

        if (logContainer.childElementCount > logLimit) {
            logContainer.removeChild(logContainer.lastChild);
        }
    },
    loadFile: function () {
        const fileNumber = prompt("Enter the session number:");
        if (!fileNumber) {
            UIController.showToastNotification('Enter a valid session number', 3000);
            return;
        }
    
        const level = 1; // Default level, can be modified as needed
        const formattedFileNumber = String(fileNumber).padStart(3, '0');
        const filePath = `scenarios/${formattedFileNumber}.json`;
    
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => this.processScenarioData(data, level))
            .catch(error => {
                console.error('Error loading file:', error);
                UIController.showToastNotification('Error loading scenario', 3000);
            });
    }, 
    processScenarioData: function (data, level = 1) {
        data.rooms[0].monster.forEach(monster => {
            const newCreature = {
                type: monster.name,
                standee: 'X',
                level: level,
                isElite: monster?.player4 === 'elite',
            };
            UIController.addCharacter(newCreature);
        });
    }   
};


