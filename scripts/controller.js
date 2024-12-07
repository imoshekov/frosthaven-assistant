const UIController = {
    showGraveyard: false,
    battleLog: null, // https://gridjs.io/
    logSelector: null, // https://slimselectjs.com/
    addCharacter(autoInput) {
        const type = autoInput?.type || document.getElementById('type').value.toLowerCase();
        const standee = autoInput?.standee || document.getElementById('standee-number').value;
        const level = parseInt(autoInput?.level) || parseInt(document.getElementById('level').value);
        const isElite = autoInput?.isElite || document.getElementById('elite-monster').checked;
        const round = parseInt(document.getElementById("round-number").value);

        // Validate required inputs
        if (!type) return alert('Select monster type first');
        if (!standee) return alert('Select standee # first');
    
        // Fetch monster data
        const monsterData = data.monsters.find(monster => monster.name === type);
        const selectedMonster = isElite
            ? monsterData.stats.find(x => x.type === 'elite' && x.level === level)
            : monsterData.stats[level];
    
        // Generate creature names
        const { baseName, displayName } = this.generateCreatureName({ isElite, type, standee });
    
        // Derive default stats
        const initMovement = monsterData.baseStat?.movement || selectedMonster.movement;
        const defaultAttack = parseInt(selectedMonster?.attack) || 0;
        const defaultMovement = Math.max(initMovement ?? 0, selectedMonster?.movement ?? 0);
        const defaultHP = parseInt(selectedMonster?.health) || 0;
        const defaultArmor = selectedMonster?.actions?.find(x => x.type === 'shield')?.value || 0;
        const defaultRetaliate = selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value || 0;
    
        // Create new creature object
        const newCreature = {
            name: baseName,
            displayName,
            type,
            standee,
            aggressive: true, 
            eliteMonster: isElite,
            hp: defaultHP,
            attack: defaultAttack,
            movement: defaultMovement,
            initiative: 0, 
            armor: defaultArmor,
            retaliate: defaultRetaliate,
            conditions: {},
            tempStats: {},
            log: []
        };
        newCreature.log.push(Log.builder().round(round).add(true).hp(defaultHP).build());

        DataManager.getCharacters().push(newCreature);
        UIController.sortCreatures();
        UIController.renderTable();
        UIController.renderLogs();
        if(WebSocketHandler.isConnected){
            WebSocketHandler.sendMonsterAdded(newCreature);
        }
    },
    renderTable() {
        const tableBody = document.getElementById('creaturesTable');
        tableBody.innerHTML = '';
        let renderCharacters = this.showGraveyard ? DataManager.graveyard : DataManager.getCharacters();
        renderCharacters.forEach((creature, index) => {
            const charType = creature.aggressive ? 'monster' : 'character';
            const row =
               `
<div class='creature-row ${creature.type}-row ${creature.eliteMonster ? ' elite-row' : 'nonelite-row' }
    ${creature.aggressive ? '' : 'friendly' } '>
                            <img class=' background' src="${backgroundImage}" />
<div class='creature-column' >
    <input type="tel" class="initiative initiative-column ${this.showGraveyard ? 'hidden' : ''}" value="${creature.initiative}" onchange="
        UIController.updateStat(${index}, 'initiative', this.value, true);
        UIController.renderInitiative();
        if (UIController.allIniativeSet()) {
            UIController.sortCreatures();
            UIController.renderTable();
        }
    " />
    <div class='nameplate'>
        <div class='character-skin image' id="character-skin-${index}" ${this.showGraveyard ? '' : `onclick="openConditions(event, ${index})"`}>
            <img class='profile' src='images/${charType}/thumbnail/fh-${creature.type}.png'>
        </div>
        <div class='character-skin'>
            <div class="name">
                <b>${creature.aggressive ? `${creature.displayName}` : `${creature.name}`}</b>
                <b>${creature.aggressive
                    ? `<input type="tel" class="standee-only" value="${creature.standee}"
                        onchange="UIController.updateStat(${index}, 'standee', this.value); UIController.renameCreature(${index});"
                        placeholder="#" />`
                    : ''
                    }</b>
            </div>
        </div>
        <div class='stats'>
            <div class='char-hp stat-child heart-container'>
                <img id="char-heart-${index}" src="images/heart.svg" />
                <input id="char-hp-${index}" type="tel" class="hp" value="${creature.hp}"
                    onchange="UIController.updateStat(${index}, 'hp', this.value);" />
            </div>
            <div class='char-attack stat-child'>
                <img src="images/stats/attack.svg" />
                <input type="tel" class="attack" value="${creature.attack}"
                    onchange="UIController.updateStat(${index}, 'attack', this.value)" />
            </div>
            <div class='char-movement stat-child'>
                <img src="images/fh/stats/move.svg" />
                <input type="tel" class="movement" value="${creature.movement}"
                    onchange="UIController.updateStat(${index}, 'movement', this.value)" />
            </div>
        </div>
        <div class='character-attributes'>
            <div class="condition-row">
                <div id='char-armor-${index}' class='condition-child'>
                    <img class="condition-image" src="images/fh/action/shield.svg" />
                    <input type="tel" class="condition-number armor-number"
                        onchange="UIController.updateStat(${index}, 'armor', this.value); showConditions(${index});"></input>
                </div>
                <div id='char-retaliate-${index}' class='condition-child'>
                    <img class="condition-image" src="images/fh/action/retaliate.svg" />
                    <input type="tel" class="condition-number retaliate-number"
                        onchange="UIController.updateStat(${index}, 'retaliate', this.value); showConditions(${index});"></input>
                </div>
            </div>
            <div class="condition-row">
                <div id="char-condition-${index}" class="condition-images">
                    <img id="char-poison-${index}" class="condition-image" src='images/fh/condition/poison.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'poison')">
                    <img id="char-wound-${index}" class="condition-image" src='images/fh/condition/wound.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'wound')">
                    <img id="char-brittle-${index}" class="condition-image" src='images/fh/condition/brittle.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'brittle')">
                    <img id="char-ward-${index}" class="condition-image" src='images/fh/condition/ward.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'ward')">
                </div>
            </div>
        </div>
        <div class='action-buttons'>
            <span class="attack-btn ${this.showGraveyard ? 'hidden' : ''}" data-creature-idx="${index}" onclick="handleAttack(event, this)">
                <img class='attack-image' id="attack-img-${index}" src='images/crossed-swords.svg'>
            </span>
        </div>
    </div>
    ${creature.aggressive ? `<button class="remove-btn"
        onclick="UIController.removeCreature(${index})">X</button>`:''}
</div>`;
            tableBody.insertAdjacentHTML('beforeend', row);
            showConditions(index);
        });
    },
    renderLogs() {
        if (this.battleLog == null) {
            this.battleLog = new gridjs.Grid({
                columns: Log.TABLE_COLUMNS,
                search: true, sort: true, fixedHeader: true,
                pagination: { limit: 5 },
                data: Log.getLogData()
            }).render(document.getElementById("battle-log"));

            const clickNext = (el, event) => {
                el.nextElementSibling && el.nextElementSibling.click();
                event.stopPropagation();
            }
            this.logSelector = new SlimSelect({
                select: '#char-filter',
                settings: {
                    showSearch: false,
                    placeholderText: 'Select character'
                },
                data: Log.getLoggedCharacters(),
                events: {
                    afterChange: (val) => {
                        const data = Log.getLogData(val.length ? val.map(v => v.value) : null);
                        this.battleLog.updateConfig({ data }).forceRender();
                        document.querySelectorAll('.ss-main .ss-value-text').forEach(option => {
                            option.removeEventListener('click', clickNext);
                            option.addEventListener('click', (event) => clickNext(option, event));
                        });
                    }
                }
            });
        } else {
            this.battleLog.updateConfig({ data: Log.getLogData() }).forceRender();
            this.logSelector.setData(Log.getLoggedCharacters());
        }
    },
    populateMonsterTypeDropdown() {
        //populate monster types
        const typeDropdown = document.getElementById('type');
        typeDropdown.innerHTML = '';
        data.monsters.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.text = type.name
            typeDropdown.appendChild(option);
        });
        typeDropdown.value = '';
    },
    allIniativeSet() {
        return DataManager.getCharacters().every(creature => creature.initiative !== 0);
    },
    renderInitiative() {
        DataManager.getCharacters().forEach(character => {
            const initiativeInputs = document.querySelectorAll(`.creature-row.${character.type}-row .initiative`);
            initiativeInputs.forEach(input => {
                input.value = character.initiative;
            });
        });
    },
    removeCreature(index) {
        // removing a living creature simply kills it
        if (this.showGraveyard) {
            this.deleteCreature(index);
        } else {
            this.killCreature(index, true);
        }
    },
    killCreature(index, isForced = false) {
        const character = DataManager.getCharacters(index);
        if (isForced) {
            const userConfirmed = confirm(`Kill ${character.name} ?`);
            if(!userConfirmed){
                return;
            }
            character.hp = 0;
            // add a log to know when the character was killed
            const round = parseInt(document.getElementById("round-number").value);
            character.log.push(Log.builder().round(round).set(true).die(true).initiative(character.initiative).build());
        }
        DataManager.getCharacters().splice(index, 1);
        DataManager.graveyard.push(character);
        this.renderTable();
        this.renderLogs();
        if (WebSocketHandler.isConnected){
            WebSocketHandler.sendCharactersUpdate();
            WebSocketHandler.sendGraveyardUpdate();
        }
    },
    deleteCreature(index) {
        const userConfirmed = confirm(`This will permanently delete ${DataManager.graveyard[index].name} and ALL HIS LOGS from the game. Continue?`);
        if(!userConfirmed){
            return;
        }
        DataManager.graveyard.splice(index, 1);
        this.toggleGraveyard(true);
        this.renderLogs();
        if(WebSocketHandler.isConnected){
            WebSocketHandler.sendGraveyardUpdate();
        }
    },
    sortCreatures() {
        DataManager.getCharacters().sort((a, b) => a.initiative - b.initiative);
    },
    renameCreature(index) {
        let creature = DataManager.getCharacters(index);
        const { baseName, displayName } = this.generateCreatureName({
            isElite: creature.eliteMonster,
            type: creature.type,
            standee: creature.standee,
        });
        creature.name = baseName;
        creature.displayName = displayName;
        if(WebSocketHandler.isConnected){
            WebSocketHandler.sendCharactersUpdate();
        }
    },
    generateCreatureName(input) {
        const prefix = input.isElite ? '★ ' : '';
        const baseName = `${prefix}${input.type} ${input.standee}`;
        const displayName = `${prefix}${input.type}`;
        return { baseName, displayName };
    },
    updateStat(index, stat, value, massApply = false, isCondition = false, isTemporary = false) {
        const characters = this.showGraveyard ? DataManager.graveyard : DataManager.getCharacters();
        const typeToUpdate = characters[index].type;
        const targets = massApply
            ? characters.filter(character => character.type === typeToUpdate)
            : [characters[index]];

        const updateTarget = (character) => {
            if (isCondition) {
                character.conditions[stat] = value;
            } else if (isTemporary) {
                character.tempStats[stat] = value;
            } else {
                character[stat] = value;
            }
        };

        targets.forEach(updateTarget);

        if (stat === 'hp') {
            const char = characters[index];
            const round = parseInt(document.getElementById("round-number").value);
            char.log.push(Log.builder().round(round).set(true).hp(value).initiative(char.initiative).build());
            this.renderLogs();
        }

        // revive character if hp is set to more than 0
        if (this.showGraveyard && stat == 'hp' && value > 0) {
            DataManager.getCharacters().push(characters[index]);
            characters.splice(index, 1);
            this.sortCreatures();
            this.toggleGraveyard(true);
        }
        // "kill" character
        if (!this.showGraveyard && stat == 'hp' && value <= 0) {
            DataManager.graveyard.push(characters[index]);
            characters.splice(index, 1);
            this.sortCreatures();
            this.renderTable();
        }

        if (WebSocketHandler.isConnected){
            WebSocketHandler.sendCharactersUpdate();
            WebSocketHandler.sendGraveyardUpdate();
        }
    },
    toggleLowHp(threshold = 2) {
        if (UIController.showGraveyard) {
            return;
        }

        DataManager.getCharacters().forEach((character, index) => {
            const heartImg = document.getElementById(`char-heart-${index}`);

            if (character.hp <= threshold && character.hp > 0) {
                heartImg.classList.add("pulsating-heart");
            } else {
                heartImg.classList.remove("pulsating-heart");
            }
        });
    },
    toggleDone(event) {
        if (event.target.type !== "checkbox") {
            return;
        }
        const checkbox = event.target;
        if (checkbox.checked) {
            checkbox.parentElement.classList.add('done');
        } else {
            checkbox.parentElement.classList.remove('done');
        }

        const allItems = document.querySelectorAll('#todoList li label');
        const allDone = Array.from(allItems).every(item => item.classList.contains('done'));

        const todoList = document.getElementById('todoList');
        if (allDone) {
            todoList.style.display = 'none';
        } else {
            todoList.style.display = 'block';
        }
    },
    toggleColor(element) {
        const elementId = element.id;
        const path = element.querySelector('path');
        const pathData = path.getAttribute('d');
        const pathFill = path.getAttribute('fill');

        // Determine the new fill based on the current state
        let newFill;
        if (!pathFill || pathFill === `url(#${elementId}-bw)`) {
            newFill = `url(#${elementId}-color)`;
        } else if (pathFill === `url(#${elementId}-color)`) {
            newFill = `url(#${elementId}-half)`;
        } else if (pathFill === `url(#${elementId}-half)`) {
            newFill = `url(#${elementId}-bw)`;
        }

        // Update the path fill on the client
        path.setAttribute('fill', newFill);

        // Send the updated color state to the server via WebSocket
        if (WebSocketHandler.isConnected) {
            const elementState = {
                elementId: elementId,
                path: pathData,
                fill: newFill
            };
            WebSocketHandler.sendElementState(elementId, JSON.stringify(elementState));
        }
    },
    toggleControlVisibility(id, focusId) {
        const control = document.getElementById(id);
        if (control.style.display === "none" || control.style.display === '') {
            control.style.display = "block";
            if (focusId) {
                document.getElementById(focusId).focus();
            }
        } else {
            control.style.display = "none";
        }

    },
    handleFocusEvents() {
        const masterContainer = document.getElementById('master-container');

        masterContainer.addEventListener('focusin', function (event) {
            if (event.target.matches('input[type="tel"]')) {
                event.target.dataset.previousValue = event.target.value;
                event.target.value = '';
            }
        });

        masterContainer.addEventListener('focusout', function (event) {
            if (event.target.matches('input[type="tel"]')) {
                if (event.target.value === '') {
                    event.target.value = event.target.dataset.previousValue;
                }
            }
        });
    },
    nextRound() {
        DataManager.getCharacters().forEach(c => {
            c.initiative = 0;
            c.tempStats = {};
        });

        this.renderTable();

        const elements = document.querySelectorAll('.elements-wrapper svg');
        elements.forEach(e => {
            const fill = e.querySelector('path')?.getAttribute('fill');
            if (!fill) {
                return;
            }
            if (fill.includes('half') || fill.includes('color')) {
                UIController.toggleColor(e);
            }
        });
        const roundNumberElement = document.getElementById("round-number");
        const nextRound = (parseInt(roundNumberElement.value) + 1);
        roundNumberElement.value = nextRound;
        if (WebSocketHandler.isConnected) {
            WebSocketHandler.sendRoundNumber(nextRound);
            WebSocketHandler.sendInitiativeReset();
            WebSocketHandler.sendCharactersUpdate();
        }

    },
    toggleGraveyard(show) {
        // prevent rendering empty graveyard with different height
        const creaturesContainer = document.getElementById('creaturesTable');
        if (!creaturesContainer.style.minHeight) {
            const currentHeight = window.getComputedStyle(creaturesContainer).height;
            creaturesContainer.style.minHeight = currentHeight;
        }

        this.showGraveyard = show;
        this.renderTable();

        const inactiveImg = document.getElementById('graveyard-img');
        const activeImg = document.getElementById('graveyard-img-active');
        if (show) {
            inactiveImg.classList.add("hidden");
            activeImg.classList.remove("hidden");
        } else {
            inactiveImg.classList.remove("hidden");
            activeImg.classList.add("hidden");
        }

        if (show && !DataManager.graveyard.length) {
            creaturesContainer.innerText = 'NO CREATURES IN GRAVEYARD';
        }
    },
    toggleConditionVisibility(index, conditionType) {
        const character = DataManager.getCharacters(index);
        character.conditions[conditionType] = !character.conditions[conditionType];
        document.getElementById(`char-${conditionType}-${index}`).style.visibility = 'hidden';
        if(WebSocketHandler.isConnected){
            WebSocketHandler.sendCharactersUpdate();
        }
    },
    showToastNotification(message, timeout = null) {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.remove('hide');
        toast.classList.add('show');

        if (timeout) {
            setTimeout(() => {
                toast.classList.remove('show');
                toast.classList.add('hide');
            }, timeout);
        }
    },
    hideToastNotification(timeout = null) {
        const toast = document.getElementById('toast-notification');
        const hideAction = () => {
            toast.classList.remove("show");
            toast.classList.add("hide");
        };

        if (timeout) {
            setTimeout(hideAction, timeout);
        } else {
            hideAction();
        }
    }
}
