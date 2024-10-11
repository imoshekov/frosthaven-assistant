const characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Петра Скуъртенщайн", type: "deathwalker", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
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
                        <div class='creature-column initiative-column'>
                            <input type="number" class="initiative" value="${creature.initiative}"
                            onchange="updateStat(${index}, 'initiative', this.value); sortCreaturesByInitiative(); renderTable();" />
                        </div>
                        <div class='creature-column'>
                        <img class='background' src="${backgroundImage}"/>
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
                                <span class="attack-btn" data-creature-idx="${index}" onclick="handleAttack(this)">
                                    <button>
                                    <img id="attack-img" src='https://gloomhaven-secretariat.de/assets/images/action/attack.svg'>
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
    // First click: switch to target.svg
    if (attacker === null) {
        if (buttonElement.dataset.creatureIdx < 4) {
            // player character, can attack only monsters
            if (characters.every(function (char) { return !char.aggressive; })) {
                alert('No monsters to attack');
                return;
            }
            document.querySelectorAll('[data-creature-idx]').forEach(function (button) {
                if (!characters[button.dataset.creatureIdx].aggressive) {
                    button.style.visibility = 'hidden';
                }
            });
        } else {
            // enemy monsters and potentially allies also, can attack anyone except self
            buttonElement.style.visibility = 'hidden';
        }

        document.querySelectorAll('.attack-btn #attack-img').forEach(function (img) {
            img.src = 'images/action/target.svg';
        });
        attacker = buttonElement.dataset.creatureIdx;
    }
    // Second click: show modal
    else {
        defender = buttonElement.dataset.creatureIdx;
        openModal('modal-attack');
        document.getElementById('attack-combatants').innerHTML = `${characters[attacker].name} &gt; ${characters[defender].name}`;
        loadConditionsInAttackModal();
        event.stopPropagation();
    }
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
    attacker = defender = null;
    document.querySelectorAll('.attack-btn').forEach(function (button) {
        button.parentElement.style.visibility = '';
        button.querySelector('#attack-img').src = 'images/action/attack.svg';
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

const backgroundImage = "data:image/jpeg;base64,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";
