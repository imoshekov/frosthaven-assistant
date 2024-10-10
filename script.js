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
        const row = `<div class='creature-row ${creature.type}-row ${creature.isElite ? 'elite' : ''} ${creature.aggressive ? '' : 'friendly'} '>
                        <div class='creature-column'>
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
                                    <object type="image/svg+xml" data="images/hp.svg"></object>
                                    <input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}"
                                        onchange="updateStat(${index}, 'hp', this.value)" />
                                </div>
                                <div class='char-attack stat-child'>
                                    <object type="image/svg+xml" data="images/attack.svg"></object>
                                    <input type="number" class="attack" value="${creature.attack}"
                                        onchange="updateStat(${index}, 'attack', this.value)" />
                                </div>
                                <div class='char-movement stat-child'>
                                    <object type="image/svg+xml" data="images/movement.svg"></object>
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
    if (conditions[defender]) {
        for (let [key, value] of Object.entries(conditions[defender])) {
            if (value > 0) {
                const img = document.createElement('img');
                if (key == 'armor') {
                    key = 'shield';
                }

                if (key === 'shield' || key === 'retaliate') {
                    container.appendChild(document.createTextNode(value));
                    img.src = `images/action/${key}.svg`;
                } else {
                    img.src = `images/condition/${key}.svg`;
                }
                container.appendChild(img);
            }
        }
    }
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeAttackModal() {
    attacker = defender = null;
    document.querySelectorAll('.attack-btn').forEach(function (button) {
        button.style.visibility = '';
        button.querySelector('#attack-img').src = 'images/action/attack.svg';
    });
    document.getElementById('attack-input').value = 0;
    document.getElementById('modal-attack').style.display = 'none';
}

function applyDamage(dmgInput) {
    let dmg = parseInt(dmgInput.value);
    let attackerDmg = 0;

    if (conditions[defender]?.armor > 0) {
        console.log(characters[defender].name + " has armor " + conditions[defender].armor);
        dmg -= conditions[defender].armor;
    }
    if (conditions[defender]?.poison && dmg > 0) {
        console.log(characters[defender].name + " is poisoned");
        dmg += 1;
    }
    if (conditions[defender]?.retaliate > 0) {
        console.log(characters[defender].name + " has retaliated for " + conditions[defender].retaliate);
        attackerDmg += conditions[defender].retaliate;
        // shield mitigation doesn't apply to retaliate
    }

    console.log(characters[attacker].name + " dealt " + dmg + " damage to " + characters[defender].name + "(retaliate: " + attackerDmg + ")");
    dmg = calculateDamage(defender, dmg);
    attackerDmg = calculateDamage(attacker, attackerDmg);

    updateHpWithDamage(defender, dmg);
    updateHpWithDamage(attacker, attackerDmg);
    closeAttackModal();
}

function calculateDamage(charIdx, dmg) {
    if (conditions[charIdx]?.brittle && dmg > 0) {
        dmg *= 2;
        conditions[charIdx].brittle = false;
    }
    if (conditions[charIdx]?.ward && dmg > 0) {
        dmg = Math.floor(dmg / 2);
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

    conditions[conditionTarget] = {
        armor,
        retaliate,
        poison,
        brittle,
        ward
    };
    closeConditionsModal();
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
