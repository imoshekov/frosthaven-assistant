const characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
    { name: "Петра Скуъртенщайн", type: "deathwalker", aggressive: false, hp: 6, attack: 0, movement: 0, initiative: 0, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
];
let attacker = null;
let defender = null;

function addCharacter() {
    const type = document.getElementById('type').value.toLowerCase();
    const level = parseInt(document.getElementById('level').value);
    const elite = document.getElementById('elite-monster').checked;
    let name = `${type} (${document.getElementById('standee-number').value.toLowerCase()})`;
    const monsterData = data.monsters.find(monster => monster.name === type);
    let selectedMonster = monsterData.stats[level];
    if (elite) {
        name = 'ELITE ' + name;
        selectedMonster = monsterData.stats.find(x => x.type === 'elite' && x.level === level);
    }
    let initMovement = monsterData.baseStat?.movement;
    if (!initMovement) {
        initMovement = selectedMonster.movement;
    }
    const initiative = 0;
    const defaultAttack = selectedMonster.attack;
    const defaultMovement = elite ? selectedMonster.movement : initMovement;
    const defaultHP = selectedMonster.health;
    const isAgressive = true;

    const newCreature = {
        name,
        type,
        aggressive: isAgressive,
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
        const icon = creature.aggressive ? 'https://gloomhaven-secretariat.de/assets/images/monster/enemy.png' : `https://gloomhaven-secretariat.de/assets/images/${charType}/icons/fh-${creature.type}.svg`;
        const row = `<tr class='${creature.type}-row creature-row'>
                    <td>
						<input type="number" class="initiative" value="${creature.initiative}" onchange="updateStat(${index}, 'initiative', this.value); sortCreaturesByInitiative(); renderTable();" />
					</td>
                    <td>
                        <div>
                           <img src='https://gloomhaven-secretariat.de/assets/images/${charType}/thumbnail/fh-${creature.type}.png'>
                        <div>
                        <b>${creature.name}</b>
                    </td>
                    <td>
                        <div>
                             <img src='${icon}'>
                        <div>
                    </td>
                    <td><input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}" onchange="updateStat(${index}, 'hp', this.value)" /></td>
                    <td><input type="number" class="attack" value="${creature.attack}" onchange="updateStat(${index}, 'attack', this.value)" /></td>
                    <td><input type="number" class="movement" value="${creature.movement}" onchange="updateStat(${index}, 'movement', this.value)" /></td>
                    <td>
                    	<span class="attack-btn" data-creature-idx="${index}" onclick="handleAttack(this)">
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

function handleAttack(buttonElement) {
    const imgElement = buttonElement.querySelector('#attack-img');

    // First click: switch to target.svg
    if (attacker === null) {
        document.querySelectorAll('.attack-btn #attack-img').forEach(function(img) {
            let parentButton = img.parentElement.parentElement;
            if (characters[parentButton.dataset.creatureIdx].hp <= 0) {
                parentButton.style.visibility = 'hidden';
            } else {
                img.src = 'https://gloomhaven-secretariat.de/assets/images/action/target.svg';
            }
        });

        buttonElement.style.visibility = 'hidden';
        attacker = buttonElement.dataset.creatureIdx;
    }
    // Second click: show modal
    else {
        defender = buttonElement.dataset.creatureIdx;
        openModal();
    }
}

function openModal() {
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    attacker = defender = null;
    document.querySelectorAll('.attack-btn').forEach(function(button) {
        button.style.visibility = '';
        button.querySelector('#attack-img').src = 'https://gloomhaven-secretariat.de/assets/images/action/attack.svg';
    });
    document.getElementById('attack-input').value = 0;
    document.getElementById('modal').style.display = 'none';
}

function applyDamage(dmgInput) {
    characters[defender].hp -= parseInt(dmgInput.value);
    console.log(characters[attacker].name + " attacked " + characters[defender].name + " for " + dmgInput.value + " damage.");
    if (characters[defender].hp <= 0) {
        characters[defender].hp = 0;
        removeCreature(defender);
    } else {
        document.getElementById(`char-hp-${defender}`).value = characters[defender].hp;
    }
    closeModal();
}

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