const characters = JSON.parse(loadData('characters'))
    || [
        { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 7, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
        { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
        { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
        { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
    ];

let conditionTarget = null;
let attacker = null;
let defender = null;

function addCharacter() {
    const type = document.getElementById('type').value.toLowerCase();
    if (!type) {
        alert('Select monster type first')
        return;
    }
    const level = parseInt(document.getElementById('level').value);
    const isElite = document.getElementById('elite-monster').checked;
    let name = `${type} ${document.getElementById('standee-number').value.toLowerCase()}`;
    const monsterData = data.monsters.find(monster => monster.name === type);
    let selectedMonster = monsterData.stats[level];

    if (isElite) {
        name = '@ ' + name;
        selectedMonster = monsterData.stats.find(x => x.type === 'elite' && x.level === level);
    }
    let initMovement = monsterData.baseStat?.movement;
    if (!initMovement) {
        initMovement = selectedMonster.movement;
    }
    const initiative = 0;
    const defaultAttack = parseInt(selectedMonster?.attack) || 0;
    const defaultMovement = Math.max(initMovement, selectedMonster?.movement || 0);
    const defaultHP = parseInt(selectedMonster?.health) || 0;
    //by default currently supported only adding monsters
    const isAgressive = true;
    const defaultArmor = selectedMonster?.actions?.find(x => x.type === 'shield')?.value || 0;
    const defaultRetaliate = selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value || 0;

    const newCreature = {
        name,
        type,
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
    sortCreaturesByInitiative();
    renderTable();
}

function renderTable() {
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
                            onchange="updateStat(${index}, 'initiative', this.value); sortCreaturesByInitiative(); renderTable();" />
                        <div class='nameplate'>
                            <div class='character-skin' onclick="openConditions(event, ${index})">
                                <img class='profile' src='images/${charType}/thumbnail/fh-${creature.type}.png'>
                                <div class='name'>
                                    <img class='${iconClass}' src='${iconSrc}'>
                                     <b>${creature.name}</b>
                                </div>
                            </div>

                            <div class='character-attributes'>
                            <div class='stats'>
                                <div class='char-hp stat-child'>
                                    <img src="images/life-bar.png"/>
                                    <input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}"
                                        onchange="updateStat(${index}, 'hp', this.value)" />
                                </div>
                                <div class='char-attack stat-child'>
                                    <img src="images/battle.png"/>
                                    <input type="number" class="attack" value="${creature.attack}"
                                        onchange="updateStat(${index}, 'attack', this.value)" />
                                </div>
                                <div class='char-movement stat-child'>
                                    <img src="images/footprint.png"/>
                                    <input type="number" class="movement" value="${creature.movement}"
                                        onchange="updateStat(${index}, 'movement', this.value)" />

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
                        <button class="remove-btn" onclick="removeCreature(${index})">X</button>
                    </div>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function populateMonsterTypeDropdown() {
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

function nextRound() {
    characters.forEach(c => {
        c.initiative = 0;
    });

    sortCreaturesByInitiative();
    renderTable();
}

function handleFocusEvents() {
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
}

function handleAttack(event, buttonElement) {
    const creatureIdx = buttonElement.dataset.creatureIdx;
    if (attacker === null) {
        // player character, can attack only monsters
        if (characters.every(function (char) { return !char.aggressive; })) {
            alert('No monsters to attack');
            return;
        }
        const isAggressive = characters[creatureIdx].aggressive;
        hideFriends(isAggressive);
        attacker = creatureIdx;
        return;
    }
    // Second click: show modal

    defender = creatureIdx;
    openModal('modal-attack');
    document.getElementById('attack-combatants').innerHTML = `${characters[attacker].name} &gt; ${characters[defender].name}`;
    loadConditionsInAttackModal();
    event.stopPropagation();

}

function hideFriends(isMonster) {
    document.querySelectorAll('[data-creature-idx]').forEach(function (button) {
        const isTargetAggressive = characters[button.dataset.creatureIdx].aggressive;
        const targetIcon = button.getElementsByClassName('target-image')[0];
        const attackIcon = button.getElementsByClassName('attack-image')[0];
        attackIcon.style.display = 'none';
        const isFriendlyToSelf = (isMonster && isTargetAggressive) || (!isMonster && !isTargetAggressive);
        targetIcon.style.display = isFriendlyToSelf ? 'none' : 'block';
    });
}

function openConditions(event, charIdx) {
    conditionTarget = charIdx;
    let target = characters[charIdx];
    document.getElementById('condition-armor').value = target.armor;
    document.getElementById('condition-retaliate').value = target.retaliate;
    document.getElementById('condition-poison').checked = target.conditions?.poison || false;
    document.getElementById('condition-brittle').checked = target.conditions?.brittle || false;
    document.getElementById('condition-ward').checked = target.conditions?.ward || false;
    openModal('modal-conditions');
    event.stopPropagation();
}

function loadConditionsInAttackModal() {
    const container = document.getElementById('attack-conditions');
    container.innerHTML = '';
    let target = characters[defender];
    if (target.armor > 0) {
        addImg(container, 'shield', target.armor);
    }
    if (target.retaliate > 0) {
        addImg(container, 'retaliate', target.retaliate);
    }

    if (Object.keys(target.conditions).length === 0) {
        for (let [key, value] of Object.entries(target.conditions)) {
            if (value) {
                const img = document.createElement('img');
                img.src = `images/condition/${key}.svg`;
                container.appendChild(img);
            }
        }
    }
}

function addImg(container, name, value) {
    const img = document.createElement('img');
    img.src = `images/action/${name}.svg`;
    container.appendChild(document.createTextNode(value));
    container.appendChild(img);
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeAttackModal() {
    attacker = null;
    defender = null;
    document.querySelectorAll('.attack-btn').forEach(function (button) {
        const targetIcon = button.getElementsByClassName('target-image')[0];
        const attackIcon = button.getElementsByClassName('attack-image')[0];
        targetIcon.style.display = 'none';
        attackIcon.style.display = 'block';
    });
    document.getElementById('attack-input').value = 0;
    document.getElementById('modal-attack').style.display = 'none';
}

function applyDamage(dmgInput) {
    let dmg = parseInt(dmgInput.value);
    let attackerDmg = 0;

    if (characters[defender].armor > 0) {
        addLog(characters[defender].name + " has armor " + characters[defender].armor);
        dmg -= characters[defender].armor;
    }
    if (characters[defender].conditions?.poison && dmg > 0) {
        addLog(characters[defender].name + " is poisoned");
        dmg += 1;
    }
    if (characters[defender].retaliate > 0) {
        addLog(characters[defender].name + " has retaliated for " + characters[defender].retaliate);
        attackerDmg += characters[defender].retaliate;
        // shield mitigation doesn't apply to retaliate
    }

    dmg = calculateDamage(defender, dmg);
    attackerDmg = calculateDamage(attacker, attackerDmg);
    addLog(`${characters[attacker].name} dealt #${dmg} damage to ${characters[defender].name}# (retaliate: ${attackerDmg})`);

    updateHpWithDamage(defender, dmg);
    updateHpWithDamage(attacker, attackerDmg);
    closeAttackModal();
}

function calculateDamage(charIdx, dmg) {
    let charConditions = characters[charIdx]?.conditions;
    if (charConditions?.brittle && dmg > 0) {
        dmg *= 2;
        addLog(characters[charIdx].name + " is brittle");
        charConditions.brittle = false;
    }
    if (charConditions?.ward && dmg > 0) {
        dmg = Math.floor(dmg / 2);
        addLog(characters[charIdx].name + " has ward");
        charConditions.ward = false;
    }

    return dmg;
}

function updateHpWithDamage(charIdx, dmg) {
    if (dmg <= 0) {
        return;
    }
    characters[charIdx].hp -= dmg;
    if (characters[charIdx].hp <= 0) {
        characters[charIdx].hp = 0;
        addLog(`${characters[charIdx].name} has been killed and removed from the game.`);
        removeCreature(charIdx);
    } else {
        document.getElementById(`char-hp-${charIdx}`).value = characters[charIdx].hp;
    }

}

function applyCondition() {
    const armor = parseInt(document.getElementById('condition-armor').value);
    const retaliate = parseInt(document.getElementById('condition-retaliate').value);
    const poison = document.getElementById('condition-poison').checked;
    const brittle = document.getElementById('condition-brittle').checked;
    const ward = document.getElementById('condition-ward').checked;

    characters[conditionTarget].armor = armor;
    characters[conditionTarget].retaliate = retaliate;
    characters[conditionTarget].conditions = {
        poison,
        brittle,
        ward
    };
    closeConditionsModal();

}

function incrementInput(inputId) {
    const inputElement = document.getElementById(inputId);
    inputElement.value = parseInt(inputElement.value, 10) + 1;
}

function closeConditionsModal() {
    document.getElementById('modal-conditions').style.display = 'none';
}

function updateStat(index, stat, value) {
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
}

function removeCreature(index) {
    characters.splice(index, 1);
    renderTable();
}

function sortCreaturesByInitiative() {
    characters.sort((a, b) => a.initiative - b.initiative);
}
const logContainer = document.getElementById('battle-log');
logContainer.innerHTML = loadData('battle-log');

function addLog(event) {
    const logLimit = 50;
    const li = document.createElement('li');

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('log-time');
    timeSpan.textContent = `${new Date().toLocaleTimeString()} - `;

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
        // Fallback if no hash-wrapped text
    } else {
        eventSpan.textContent = event;
    }

    li.appendChild(timeSpan);
    li.appendChild(eventSpan);

    logContainer.insertBefore(li, logContainer.firstChild);

    if (logContainer.childElementCount > logLimit) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function loadData(key) {
    return localStorage.getItem(key);
}

function resetSaved() {
    localStorage.clear();
    location.reload();
}

function saveData() {
    document.getElementById('loading-spinner').style.visibility = 'visible';

    const currentCharacterData = JSON.stringify(characters);
    localStorage.setItem('characters', currentCharacterData);

    const battleLogInnerHtml = document.getElementById('battle-log').innerHTML;
    localStorage.setItem('battle-log', battleLogInnerHtml);

    //totally useless timeout, it is just to please merx3 as he requested a loading spinner
    setTimeout(() => {
        document.getElementById('last-saved-timestamp').innerHTML = `Last saved: ${new Date().toLocaleTimeString()}`;
        document.getElementById('loading-spinner').style.visibility = 'hidden';
    }, 1000);
}

function toggleDone(event) {
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
}

function toggleTodoVisibility() {
    const todoList = document.getElementById('todoList');
    todoList.style.display = (todoList.style.display === "none" || todoList.style.display === '') ? "block" : "none";
}


function toggleColor(element) {
    const elementId = element.id;
    const path = element.querySelector('path');
    const pathFill = path.getAttribute('fill');

    if (!pathFill || pathFill === `url(#${elementId}-bw)`) {
        path.setAttribute('fill', `url(#${elementId}-color)`);
        return;
    }
    if (pathFill === `url(#${elementId}-color)`) {
        path.setAttribute('fill', `url(#${elementId}-half)`);
        return;
    }
    if (pathFill === `url(#${elementId}-half)`) {
        path.setAttribute('fill', `url(#${elementId}-bw)`);
        return;
    }
    return;
}

// Render default characters when page loads
window.onload = function () {
    populateMonsterTypeDropdown();
    renderTable();
    handleFocusEvents();
    //saving to local storage every X seconds.
    setInterval(saveData, 10000);
};

// Close modal if clicking outside of modal content
window.onclick = function (event) {
    const attackModal = document.getElementById('modal-attack');
    const conditionModal = document.getElementById('modal-conditions');

    if (attackModal.style.display === "block" && !attackModal.querySelector('.modal-content').contains(event.target)) {
        closeAttackModal();
    }
    if (conditionModal.style.display === "block" && !conditionModal.querySelector('.modal-content').contains(event.target)) {
        closeConditionsModal();
    }
};