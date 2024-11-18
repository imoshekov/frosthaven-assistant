

const DataManager = {
    load(key) {
        return localStorage.getItem(key);
    },
    save() {
        document.getElementById('loading-spinner').style.visibility = 'visible';

        const currentCharacterData = JSON.stringify(characters);
        localStorage.setItem('characters', currentCharacterData);

        const battleLogInnerHtml = document.getElementById('battle-log').innerHTML;
        localStorage.setItem('battle-log', battleLogInnerHtml);

        //totally useless timeout, it is just to please merx3 as he requested a loading spinner (merx3 is pleased ;])
        setTimeout(() => {
            document.getElementById('last-saved-timestamp').innerHTML = `Last local save: ${new Date().toLocaleTimeString()}`;
            document.getElementById('loading-spinner').style.visibility = 'hidden';
        }, 1000);
    },
    reset() {
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
        const fileNumber = document.getElementById('file-number').value; // Get value from input
        if (!fileNumber) {
            alert('Please enter a valid file number');
            return;
        }

        // Ensure the file number is padded correctly to 3 digits
        const formattedFileNumber = String(fileNumber).padStart(3, '0');
        const filePath = `scenarios/${formattedFileNumber}.json`; // Corrected relative path

        fetch(filePath)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${filePath}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log('Loaded scenario data:', data);
                data.rooms[0].monster.forEach(monster => {
                    // Check if the monster has player-specific properties, e.g., player2, player3, etc.
                    let newCharacter = { name: monster.name, type: monster.type || 'normal' };

                    // Iterate over the player properties dynamically
                    Object.keys(monster).forEach(key => {
                        if (key.startsWith('player')) {
                            newCharacter[key] = monster[key]; // Add player-specific properties to the character
                        }
                    });

                    const newCreature = {
                        name: newCharacter.name,
                        displayName: newCharacter.name,
                        type:newCharacter.type,
                        standee: 0,
                        aggressive: true,
                        eliteMonster: true,
                        hp: 2,
                        attack: 2,
                        movement: 2,
                        initiative: 0,
                        armor: defaultArmor,
                        retaliate: defaultRetaliate,
                        conditions: {},
                        defaultStats: {
                            hp: defaultHP,
                            attack: defaultAttack,
                            movement: defaultMovement,
                            initiative
                        }
                    }

                    // Push the new character to the characters array
                    characters.push(newCreature);
                })
                UIController.renderTable();
            })
            .catch((error) => {
                console.error('Error loading file:', error);
            });
    }
};


