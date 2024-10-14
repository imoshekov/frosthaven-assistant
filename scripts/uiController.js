const UIController = {
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
    toggleColor(element, event) {
        const elementId = element.id;
        const path = element.querySelector('path');
        const pathFill = path.getAttribute('fill');
    
        if (!pathFill || pathFill === `url(#${elementId}-bw)`) {
            path.setAttribute('fill', `url(#${elementId}-color)`);
            return;
        }
        if (pathFill === `url(#${elementId}-color)`) {
            if(event?.type === 'click'){
                path.setAttribute('fill', `url(#${elementId}-bw)`);
                return;
            }
            path.setAttribute('fill', `url(#${elementId}-half)`);
            return;
        }
        if (pathFill === `url(#${elementId}-half)`) {
            path.setAttribute('fill', `url(#${elementId}-bw)`);
            return;
        }
        return;
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
    
        this.sortCreatures();
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
    },
    removeCreature(index) {
        characters.splice(index, 1);
        this.renderTable();
    },
    sortCreatures() {
        characters.sort((a, b) => a.initiative - b.initiative);
    },
    updateStat(index, stat, value) {
        const parsedValue = parseInt(value);
    
        if (stat !== 'initiative') {
            characters[index][stat] = parsedValue;
            return;
        }
        //changing initiative is applied to all monsters of the selected type
        const typeToUpdate = characters[index].type;
        characters.forEach(character => {
            if (character.type === typeToUpdate) {
                character.initiative = parsedValue;
            }
        });
    },
    renderTable() {
        const tableBody = document.getElementById('creaturesTable');
        tableBody.innerHTML = '';
        characters.forEach((creature, index) => {
            const charType = creature.aggressive ? 'monster' : 'character';
            const iconSrc = creature.aggressive ? 'images/monster/enemy.png' : `images/${charType}/icons/fh-${creature.type}.svg`;
            const iconClass = creature.aggressive ? 'monster-icon' : 'character-icon';
            const row = `<div class='creature-row ${creature.type}-row ${creature.eliteMonster ? 'elite-row' : 'nonelite-row'} ${creature.aggressive ? '' : 'friendly'} '>
                            <img class='background' src="${backgroundImage}"/>
                            <div class='creature-column'>
                            <input type="number" class="initiative" value="${creature.initiative}"
                                onchange="UIController.updateStat(${index}, 'initiative', this.value); UIController.sortCreatures(); UIController.renderTable();" />
                            <div class='nameplate'>
                                <div class='character-skin' onclick="openConditions(event, ${index})">
                                    <img class='profile' src='images/${charType}/thumbnail/fh-${creature.type}.png'>
                                    <div class='name'>
                                        <img class='${iconClass}' src='${iconSrc}'>
                                         <b>${creature.name}</b>
                                    </div>
                                </div>
    
                                <div class='character-attributes'>
                                <div class='conditions'>
                                    <!-- TODO: Add poison, brittle, ward icons dynamically here -->
                                    <div id='char-armor-${index}' class='condition-child'>
                                        <img src="images/shield-outline.svg" />
                                        <div class="condition-number armor-number"><!-- dynamic content --></div>
                                    </div>
                                    <div id='char-retaliate-${index}' class='condition-child'>
                                        <img src="images/fist-outline.svg" />
                                        <div class="condition-number retaliate-number"><!-- dynamic content --></div>
                                    </div>
                                </div>
                                <div class='stats'>
                                    <div class='char-hp stat-child'>
                                        <img src="images/life-bar.png"/>
                                        <input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}"
                                            onchange="UIController.updateStat(${index}, 'hp', this.value)" />
                                    </div>
                                    <div class='char-attack stat-child'>
                                        <img src="images/battle.png"/>
                                        <input type="number" class="attack" value="${creature.attack}"
                                            onchange="UIController.updateStat(${index}, 'attack', this.value)" />
                                    </div>
                                    <div class='char-movement stat-child'>
                                        <img src="images/footprint.png"/>
                                        <input type="number" class="movement" value="${creature.movement}"
                                            onchange="UIController.updateStat(${index}, 'movement', this.value)" />
    
                                    </div>
                                </div>
                                <div class='action-buttons'>
                                    <span class="attack-btn" data-creature-idx="${index}" onclick="handleAttack(event, this)">
                                        <button>
                                            <img class='attack-image' id="attack-img-${index}" src='images/action/attack.svg'>
                                            <img class='target-image' id="target-img-${index}" src='images/action/target.svg'>
                                        </button>
                                    </span>
                                </div>
                            </div>
                            <button class="remove-btn" onclick="UIController.removeCreature(${index})">X</button>
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
    } 
}