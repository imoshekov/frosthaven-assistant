const characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Петра Скуъртенщайн", type: "deathwalker", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "elite priest 1", type: "algox-priest", aggressive: true, eliteMonster: true, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 2, retaliate: 0 },
    { name: "priest 2", type: "algox-priest", aggressive: true, hp: 5, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
];
const conditions = [];
let conditionTarget = null;
let attacker = null;
let defender = null;

function addCharacter() {
    const type = document.getElementById('type').value.toLowerCase();
    const level = parseInt(document.getElementById('level').value);
    const isElite = document.getElementById('elite-monster').checked;
    let name = `${type} (${document.getElementById('standee-number').value.toLowerCase()})`;
    const monsterData = data.monsters.find(monster => monster.name === type);
    let selectedMonster = monsterData.stats[level];
    if (isElite) {
        name = 'ELITE ' + name;
        selectedMonster = monsterData.stats.find(x => x.type === 'elite' && x.level === level);
    }
    let initMovement = monsterData.baseStat?.movement;
    if (!initMovement) {
        initMovement = selectedMonster.movement;
    }
    const initiative = 0;
    const defaultAttack = selectedMonster.attack;
    const defaultMovement = Math.max(initMovement, selectedMonster?.movement || 0);
    const defaultHP = selectedMonster.health;
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
    populateModifyByTypeDropdown();
}

function renderTable() {
    const tableBody = document.getElementById('creaturesTable');
    tableBody.innerHTML = '';
    characters.forEach((creature, index) => {
        const charType = creature.aggressive ? 'monster' : 'character';
        let icon = creature.aggressive ? 'images/monster/enemy.png' : `images/${charType}/icons/fh-${creature.type}.svg`;
        const row = `<div class='creature-row ${creature.type}-row ${creature.eliteMonster ? 'elite-row' : 'nonelite-row'} ${creature.aggressive ? '' : 'friendly'} '>
                        <img class='background' src="${backgroundImage}"/>
                        <div class='creature-column'>
                        <input type="number" class="initiative" value="${creature.initiative}"
                            onchange="updateStat(${index}, 'initiative', this.value); sortCreaturesByInitiative(); renderTable();" />
                        <div class='nameplate'>
                            <div class='character-skin' onclick="openConditions(event, ${index})">
                                <img class='profile' src='images/${charType}/thumbnail/fh-${creature.type}.png'>
                                <div class='name'>
                                    <img class='class-icon' src='${icon}'>
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
                                <button class="attack remove-btn" onclick="removeCreature(${index})">X</button>
                            </div>
                        </div>
                        </div>
                    </div>`;
        tableBody.insertAdjacentHTML('beforeend', row);
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
    document.getElementById('condition-armor').value = characters[charIdx].armor;
    document.getElementById('condition-retaliate').value = characters[charIdx].retaliate;
    document.getElementById('condition-poison').checked = conditions[charIdx]?.poison || false;
    document.getElementById('condition-brittle').checked = conditions[charIdx]?.brittle || false;
    document.getElementById('condition-ward').checked = conditions[charIdx]?.ward || false;
    openModal('modal-conditions');
    event.stopPropagation();
}

function loadConditionsInAttackModal() {
    const container = document.getElementById('attack-conditions');
    container.innerHTML = '';
    if (characters[defender].armor > 0) {
        addImg(container, 'shield', characters[defender].armor);
    }
    if (characters[defender].retaliate > 0) {
        addImg(container, 'retaliate', characters[defender].retaliate);
    }
    if (conditions[defender]) {
        for (let [key, value] of Object.entries(conditions[defender])) {
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
        console.log(characters[defender].name + " has armor " + characters[defender].armor);
        dmg -= characters[defender].armor;
    }
    if (conditions[defender]?.poison && dmg > 0) {
        console.log(characters[defender].name + " is poisoned");
        dmg += 1;
    }
    if (characters[defender].retaliate > 0) {
        console.log(characters[defender].name + " has retaliated for " + characters[defender].retaliate);
        attackerDmg += characters[defender].retaliate;
        // shield mitigation doesn't apply to retaliate
    }

    dmg = calculateDamage(defender, dmg);
    attackerDmg = calculateDamage(attacker, attackerDmg);
    console.log(characters[attacker].name + " dealt " + dmg + " damage to " + characters[defender].name + "(retaliate: " + attackerDmg + ")");

    updateHpWithDamage(defender, dmg);
    updateHpWithDamage(attacker, attackerDmg);
    closeAttackModal();
}

function calculateDamage(charIdx, dmg) {
    if (conditions[charIdx]?.brittle && dmg > 0) {
        dmg *= 2;
        console.log(characters[charIdx].name + " is brittle");
        conditions[charIdx].brittle = false;
    }
    if (conditions[charIdx]?.ward && dmg > 0) {
        dmg = Math.floor(dmg / 2);
        console.log(characters[charIdx].name + " has ward");
        conditions[charIdx].ward = false;
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
    conditions[conditionTarget] = {
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

function updateStat(index, stat, value) {
    characters[index][stat] = parseInt(value);
}

function removeCreature(index) {
    characters.splice(index, 1);
    renderTable();
    populateModifyByTypeDropdown();
}

function sortCreaturesByInitiative() {
    characters.sort((a, b) => a.initiative - b.initiative);
}

function modifyByType() {
    const type = document.getElementById('typeModifier').value;
    const initiativeModifier = parseInt(document.getElementById('initiativeModifier').value);

    characters.forEach(creature => {
        if (creature.type === type) {
            creature.initiative = initiativeModifier;
        }
    });

    sortCreaturesByInitiative();
    renderTable();
}

function populateModifyByTypeDropdown() {
    const typeDropdown = document.getElementById('typeModifier');
    typeDropdown.innerHTML = ''; // Clear existing options

    // Get unique creature types
    const uniqueTypes = [...new Set(characters.filter(creature => creature.aggressive).map(creature => creature.type))];

    // Create and append option elements to the dropdown
    uniqueTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.text = type.charAt(0) + type.slice(1);
        typeDropdown.appendChild(option);
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

function resetAll() {
    characters.forEach(c => {
        c.initiative = null;
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

// Render default characters when page loads
window.onload = function () {
    populateMonsterTypeDropdown();
    renderTable();
    populateModifyByTypeDropdown();
    handleFocusEvents();
};