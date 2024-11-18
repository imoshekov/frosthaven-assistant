const UIController = {
    addCharacter() {
        const type = document.getElementById('type').value.toLowerCase();
        if (!type) {
            alert('Select monster type first')
            return;
        }
        const standee = document.getElementById('standee-number').value;
        if (!standee) {
            alert('Select standee # first')
            return;
        }
        const level = parseInt(document.getElementById('level').value);
        const isElite = document.getElementById('elite-monster').checked;
        let baseName = `${type} ${standee}`;
        const monsterData = data.monsters.find(monster => monster.name === type);
        let selectedMonster = monsterData.stats[level];

        if (isElite) {
            baseName = '★ ' + baseName;
            selectedMonster = monsterData.stats.find(x => x.type === 'elite' && x.level === level);
        }

        const displayName = isElite ? `★ ${type}` : `${type}`;
        let initMovement = monsterData.baseStat?.movement;
        if (!initMovement) {
            initMovement = selectedMonster.movement;
        }
        const initiative = 0;
        const defaultAttack = parseInt(selectedMonster?.attack) || 0;
        const defaultMovement = Math.max(initMovement ?? 0, selectedMonster?.movement ?? 0);
        const defaultHP = parseInt(selectedMonster?.health) || 0;
        //by default currently supported only adding monsters
        const isAgressive = true;
        const defaultArmor = selectedMonster?.actions?.find(x => x.type === 'shield')?.value || 0;
        const defaultRetaliate = selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value || 0;

        const newCreature = {
            name: baseName,
            displayName: displayName,
            type,
            standee: standee,
            aggressive: isAgressive,
            eliteMonster: isElite,
            hp: defaultHP,
            attack: defaultAttack,
            movement: defaultMovement,
            initiative,
            armor: defaultArmor,
            retaliate: defaultRetaliate,
            conditions: {},
            defaultStats: {
                hp: defaultHP,
                attack: defaultAttack,
                movement: defaultMovement,
                initiative
            }
        };

        characters.push(newCreature);
        UIController.sortCreatures();
        UIController.renderTable();
    },
    renderTable() {
        const tableBody = document.getElementById('creaturesTable');
        tableBody.innerHTML = '';
        characters.forEach((creature, index) => {
            const charType = creature.aggressive ? 'monster' : 'character';
            const row =
                `<div class='creature-row ${creature.type}-row ${creature.eliteMonster ? ' elite-row' : 'nonelite-row'}
    ${creature.aggressive ? '' : 'friendly'} '>
                            <img class=' background' src="${backgroundImage}" />
<div class='creature-column'>
    <input type="number" class="initiative" value="${creature.initiative}" onchange="
        UIController.updateStat(${index}, 'initiative', this.value, true);
        UIController.renderInitiative();
        if (UIController.allIniativeSet()) {
            UIController.sortCreatures();
            UIController.renderTable();
        }
    " />
    <div class='nameplate'>
        <div class='character-skin' id="character-skin-${index}" onclick="openConditions(event, ${index})">
            <img class='profile' src='images/${charType}/thumbnail/fh-${creature.type}.png'>
            <div class="name">
                <b>${creature.aggressive ? `${creature.displayName}` : `${creature.name}`}</b>
                <b class="standee-only">${creature.aggressive ? `#${creature.standee}` : ''}</b>
            </div>
        </div>
        <div class='stats'>
            <div class='char-hp stat-child'>
                <img src="images/life-bar.png" />
                <input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}"
                    onchange="UIController.updateStat(${index}, 'hp', this.value)" />
            </div>
            <div class='char-attack stat-child'>
                <img src="images/battle.png" />
                <input type="number" class="attack" value="${creature.attack}"
                    onchange="UIController.updateStat(${index}, 'attack', this.value)" />
            </div>
            <div class='char-movement stat-child'>
                <img src="images/footprint.png" />
                <input type="number" class="movement" value="${creature.movement}"
                    onchange="UIController.updateStat(${index}, 'movement', this.value)" />
            </div>
        </div>
        <div class='character-attributes'>
            <div class="condition-row">
                <div id='char-armor-${index}' class='condition-child'>
                    <img class="condition-image" src="images/fh/action/shield.svg" />
                    <input type="number" class="condition-number armor-number"
                        onchange="UIController.updateStat(${index}, 'armor', this.value); showConditions(${index});"></input>
                </div>
                <div id='char-retaliate-${index}' class='condition-child'>
                    <img class="condition-image" src="images/fh/action/retaliate.svg" />
                    <input type="number" class="condition-number retaliate-number"
                        onchange="UIController.updateStat(${index}, 'retaliate', this.value); showConditions(${index});"></input>
                </div>
            </div>
            <div class="condition-row">
                <div id="char-condition-${index}" class="condition-images">
                    <img id="char-poison-${index}" class="condition-image" src='images/condition/poison.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'poison')">
                    <img id="char-brittle-${index}" class="condition-image" src='images/condition/brittle.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'brittle')">
                    <img id="char-ward-${index}" class="condition-image" src='images/condition/ward.svg'
                        onclick="UIController.toggleConditionVisibility(${index}, 'ward')">
                </div>
            </div>
        </div>
        <div class='action-buttons'>
            <span class="attack-btn" data-creature-idx="${index}" onclick="handleAttack(event, this)">
                <button>
                    <img class='attack-image' id="attack-img-${index}" src='images/action/attack.svg'>
                </button>
            </span>
        </div>
    </div>
    ${creature.aggressive ? `<button class="remove-btn" onclick="UIController.removeCreature(${index})">X</button>` :
                    ''}
</div>`;
            tableBody.insertAdjacentHTML('beforeend', row);
            showConditions(index);
        });
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
        return characters.every(creature => creature.initiative !== 0);
    },
    renderInitiative() {
        characters.forEach(character => {
            const initiativeInputs = document.querySelectorAll(`.creature-row.${character.type}-row .initiative`);
            initiativeInputs.forEach(input => {
                input.value = character.initiative;
            });
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
    toggleTodoVisibility() {
        const todoList = document.getElementById('todoList');
        todoList.style.display = (todoList.style.display === "none" || todoList.style.display === '') ? "block" : "none";
    },
    handleFocusEvents() {
        const masterContainer = document.getElementById('master-container');

        masterContainer.addEventListener('focusin', function (event) {
            if (event.target.matches('input[type="number"]')) {
                event.target.dataset.previousValue = event.target.value;
                event.target.value = '';
            }
        });

        masterContainer.addEventListener('focusout', function (event) {
            if (event.target.matches('input[type="number"]')) {
                if (event.target.value === '') {
                    event.target.value = event.target.dataset.previousValue;
                }
            }
        });
    },
    nextRound() {
        characters.forEach(c => {
            c.initiative = 0;
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
        }

    },
    removeCreature(index) {
        characters.splice(index, 1);
        this.renderTable();
    },
    sortCreatures() {
        characters.sort((a, b) => a.initiative - b.initiative);
    },
    updateStat(index, stat, value, massApply = false) {
        const parsedValue = parseInt(value);

        if (!massApply) {
            characters[index][stat] = parsedValue;
            return;
        }
        const typeToUpdate = characters[index].type;
        characters.forEach(character => {
            if (character.type === typeToUpdate) {
                character[stat] = parsedValue;
            }
        });
    },
    toggleConditionVisibility(index, conditionType) {
        const character = characters[index];
        character.conditions[conditionType] = !character.conditions[conditionType];
        document.getElementById(`char-${conditionType}-${index}`).style.visibility = 'hidden';
    },
    showToastNotification(message) {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.remove("hide");
        toast.classList.add('show');
    },
    hideToastNotification(timeout) {
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
