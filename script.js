const characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Петра Скуъртенщайн", type: "deathwalker", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
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

    const newCreature = {
        name,
        type,
        aggressive: isAgressive,
        eliteMonster: isElite,
        hp: defaultHP,
        attack: defaultAttack,
        movement: defaultMovement,
        initiative,
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
        let icon = creature.aggressive ? 'https://gloomhaven-secretariat.de/assets/images/monster/enemy.png' : `https://gloomhaven-secretariat.de/assets/images/${charType}/icons/fh-${creature.type}.svg`;
        const row = `<tr class='${creature.type}-row creature-row'>
                    <td>
						<input type="number" class="initiative" value="${creature.initiative}" onchange="updateStat(${index}, 'initiative', this.value); sortCreaturesByInitiative(); renderTable();" />
					</td>
                    <td>
                        <div onclick="openConditions(event, ${index})">
                            <div>
                               <img src='https://gloomhaven-secretariat.de/assets/images/${charType}/thumbnail/fh-${creature.type}.png'>
                            <div>
                            <b>${creature.name}</b>
                        </div>
                    </td>
                    <td>
                        <div>
                             <img src='${icon}' ${creature.eliteMonster ? "class=\"elite-monster-icon\"":''}>
                        <div>
                    </td>
                    <td><input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}" onchange="updateStat(${index}, 'hp', this.value)" /></td>
                    <td><input type="number" class="attack" value="${creature.attack}" onchange="updateStat(${index}, 'attack', this.value)" /></td>
                    <td><input type="number" class="movement" value="${creature.movement}" onchange="updateStat(${index}, 'movement', this.value)" /></td>
                    <td>
                    	<span class="attack-btn" data-creature-idx="${index}" onclick="handleAttack(event, this)">
							<button>
							  <img id="attack-img" src='https://gloomhaven-secretariat.de/assets/images/action/attack.svg'>
							</button>
						</span>
                        <button class="attack remove-btn" onclick="removeCreature(${index})">X</button>
                    </td>
                </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function handleAttack(event, buttonElement) {
    // First click: switch to target.svg
    if (attacker === null) {
        if (buttonElement.dataset.creatureIdx < 4 ) {
            // player character, can attack only monsters
            if (characters.every(function (char) { return !char.aggressive; })) {
                alert('No monsters to attack');
                return;
            }
            document.querySelectorAll('[data-creature-idx]').forEach(function(button) {
                if (!characters[button.dataset.creatureIdx].aggressive) {
                    button.style.visibility = 'hidden';
                }
            });
        } else {
            // enemy monsters and potentially allies also, can attack anyone except self
            buttonElement.style.visibility = 'hidden';
        }

        document.querySelectorAll('.attack-btn #attack-img').forEach(function(img) {
            img.src = 'https://gloomhaven-secretariat.de/assets/images/action/target.svg';
        });
        attacker = buttonElement.dataset.creatureIdx;
    }
    // Second click: show modal
    else {
        defender = buttonElement.dataset.creatureIdx;
        openModal('modal-attack');
        document.getElementById('attack-combatants').innerHTML = `${characters[attacker].name} &gt; ${characters[defender].name}`;
        event.stopPropagation();
    }
}

function openConditions(event, charIdx) {
    conditionTarget = charIdx;
    document.getElementById('condition-armor').value = conditions[charIdx]?.armor || 0;
    document.getElementById('condition-retaliate').value = conditions[charIdx]?.retaliate || 0;
    document.getElementById('condition-poison').checked = conditions[charIdx]?.poison || false;
    document.getElementById('condition-brittle').checked = conditions[charIdx]?.brittle || false;
    document.getElementById('condition-ward').checked = conditions[charIdx]?.ward || false;
    openModal('modal-conditions');
    event.stopPropagation();
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeAttackModal() {
    attacker = defender = null;
    document.querySelectorAll('.attack-btn').forEach(function (button) {
        button.style.visibility = '';
        button.querySelector('#attack-img').src = 'https://gloomhaven-secretariat.de/assets/images/action/attack.svg';
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

function calculateDamage(charIdx, dmg)  {
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
window.onclick = function(event) {
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
        c.initiative = 0;
    });

    sortCreaturesByInitiative();
    renderTable();
}

// Render default characters when page loads
window.onload = function () {
    populateMonsterTypeDropdown();
    renderTable();
    populateModifyByTypeDropdown();
};