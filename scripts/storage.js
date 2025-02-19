const DataManager = {
    // Storage keys
    CHARACTERS: 'characters',
    GRAVEYARD: 'graveyard',
    SESSION_ID: 'sessionId',

    characters: null,
    graveyard: [],
    getCharacters(index = null) {
        if (this.characters == null) {
            this.characters = JSON.parse(this.load(this.CHARACTERS)) || data.defaultCharacters;
            this.graveyard = JSON.parse(this.load(this.GRAVEYARD)) || [];
        }

        return index == null ? this.characters : this.characters[index];
    },
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

        const currentCharacterData = JSON.stringify(this.characters);
        const graveyardData = JSON.stringify(this.graveyard);
        this.set(this.CHARACTERS, currentCharacterData);
        this.set(this.GRAVEYARD, graveyardData);

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
    loadFile: async function () {
        const scenarioNumber = parseInt(document.getElementById('scenario-id').value);
        const level = parseInt(document.getElementById('scenario-level').value) 
        || parseInt(document.getElementById('scenario-level').placeholder)
        || 1;


        if (!scenarioNumber) {
            UIController.showToastNotification('Enter a valid scenario number', 3000);
            return;
        }
    
        const formattedFileNumber = String(scenarioNumber).padStart(3, '0');
        const filePath = `scenarios/${formattedFileNumber}.json`;
    
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.processScenarioData(data, level);
    
            UIController.showToastNotification(`Scenario ${scenarioNumber}, level ${level} loaded`, 2000);
        } catch (error) {
            console.error('Error loading file:', error);
            UIController.showToastNotification('Error loading scenario', 3000);
        }
    }, 
    processScenarioData: function (data, level = 1) {
        data.rooms[0].monster.forEach(monster => {
            const newCreature = {
                type: monster.name,
                level: level,
                isElite: monster?.type === 'elite' || monster?.player4 === 'elite',
            };
            UIController.addCharacter(newCreature);
        });
    }   
};


