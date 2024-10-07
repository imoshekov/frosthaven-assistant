var data;
let creatures = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } },
    { name: "Петра Скуъртенщайн", type: "deathwalker", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } }
];

function addCharacter() {
    const name = document.getElementById('name').value;
    const type = document.getElementById('type').value.toLowerCase();
    const initiative = parseInt(document.getElementById('initiative-base').value);
    const defaultAttack = parseInt(document.getElementById('attack-base').value);
    const defaultMovement = parseInt(document.getElementById('movement-base').value);
    const defaultHP = parseInt(document.getElementById('hp-base').value);
    const defaultRange = parseInt(document.getElementById('range-base').value);
    const isAgressive = document.getElementById('aggressive').checked;

    const newCreature = {
        name,
        type,
        aggressive: isAgressive,
        hp: defaultHP,
        attack: defaultAttack,
        movement: defaultMovement,
        range: defaultRange,
        initiative,
        defaultStats: {
            hp: defaultHP,
            attack: defaultAttack,
            movement: defaultMovement,
            range: defaultRange,
            initiative
        }
    };

    creatures.push(newCreature);
    sortCreaturesByInitiative();
    renderTable();
    populateModifyByTypeDropdown();
}

function renderTable() {
    const tableBody = document.getElementById('creaturesTable');
    tableBody.innerHTML = '';
    creatures.forEach((creature, index) => {
        const charType = creature.aggressive ? 'monster' : 'character';
        const icon = creature.aggressive ? 'https://gloomhaven-secretariat.de/assets/images/monster/enemy.png' : `https://gloomhaven-secretariat.de/assets/images/${charType}/icons/fh-${creature.type}.svg`;
        const row = `<tr class='${creature.type}-row creature-row'>
                    <td>
                        <div>
                            <img src='https://gloomhaven-secretariat.de/assets/images/${charType}/thumbnail/fh-${creature.type}.png'>
                        <div>
                        <b>${creature.name}</b>
                    </td>
                    <td>
                        <div class='creature-type'>
                            <img src='${icon}'>
                            <span>${creature.type}</span>
                        <div>
                    </td>
                    <td><input type="number" class="initiative" value="${creature.initiative}" onchange="updateStat(${index}, 'initiative', this.value); sortCreaturesByInitiative(); renderTable();" /></td>
                    <td><input type="number" class="hp" value="${creature.hp}" onchange="updateStat(${index}, 'hp', this.value)" /></td>
                    <td><input type="number" class="attack" value="${creature.attack}" onchange="updateStat(${index}, 'attack', this.value)" /></td>
                    <td><input type="number" class="movement" value="${creature.movement}" onchange="updateStat(${index}, 'movement', this.value)" /></td>
                    <td><input type="number" class="range" value="${creature.range}" onchange="updateStat(${index}, 'range', this.value)" /></td>
                    <td>
                        <button class="initiative" onclick="resetToDefault(${index})">Reset</button>
                        <button class="attack" onclick="removeCreature(${index})">X</button>
                    </td>
                </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function updateStat(index, stat, value) {
    creatures[index][stat] = parseInt(value);
}

function removeCreature(index) {
    creatures.splice(index, 1);
    renderTable();
    populateModifyByTypeDropdown();
}

function sortCreaturesByInitiative() {
    creatures.sort((a, b) => a.initiative - b.initiative);
}

function modifyByType() {
    const type = document.getElementById('typeModifier').value;
    const hpModifier = parseInt(document.getElementById('hpModifier').value);
    const attackModifier = parseInt(document.getElementById('attackModifier').value);
    const movementModifier = parseInt(document.getElementById('movementModifier').value);
    const rangeModifier = parseInt(document.getElementById('rangeModifier').value);
    const initiativeModifier = parseInt(document.getElementById('initiativeModifier').value);

    creatures.forEach(creature => {
        if (creature.type === type) {
            creature.hp += hpModifier;
            creature.attack += attackModifier;
            creature.movement += movementModifier;
            creature.range += rangeModifier;
            creature.initiative = initiativeModifier;
        }
    });

    sortCreaturesByInitiative();
    renderTable();
}

function resetToDefault(index) {
    const defaultStats = creatures[index].defaultStats;
    creatures[index].hp = defaultStats.hp;
    creatures[index].attack = defaultStats.attack;
    creatures[index].movement = defaultStats.movement;
    creatures[index].range = defaultStats.range;
    creatures[index].initiative = defaultStats.initiative;
    a
    renderTable();
}


function populateModifyByTypeDropdown() {
    const typeDropdown = document.getElementById('typeModifier');
    typeDropdown.innerHTML = ''; // Clear existing options

    // Get unique creature types
    const uniqueTypes = [...new Set(creatures.filter(creature => creature.aggressive).map(creature => creature.type))];

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
}

function loadData() {
    fetch('https://raw.githubusercontent.com/imoshekov/frosthaven-assistant/refs/heads/main/data.json')
        .then(response => response.json())
        .then(fetchedData => {
            data = fetchedData;
            populateMonsterTypeDropdown();
        })
        .catch(error => console.error('Error fetching data:', error));

}

// Render default characters when page loads
window.onload = function () {
    loadData();
    renderTable();
    populateModifyByTypeDropdown();
};