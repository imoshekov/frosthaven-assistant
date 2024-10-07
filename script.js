var data;
let characters = [
    { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } },
    { name: "Spaghetti", type: "drifter", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } },
    { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } },
    { name: "Петра Скуъртенщайн", type: "deathwalker", aggressive: false, hp: 10, attack: 0, movement: 0, range: 0, initiative: 0, defaultStats: { hp: 10, attack: 0, movement: 0, range: 0, initiative: 0 } }
];

function addCharacter() {
    const type = document.getElementById('type').value.toLowerCase();
    const level = parseInt(document.getElementById('level').value);
    const elite = document.getElementById('elite-monster').checked;
    let name = `${type} (${document.getElementById('standee-number').value.toLowerCase()})`;
    let monsterData = data.monsters.find(monster => monster.name === type);
    let selectedMonster = monsterData.stats[level];
    if (elite) {
        name = 'ELITE ' + name;
        selectedMonster = monsterData.stats.find(x => x.type === 'elite' && x.level === level);
    }
    const initiative = 0;
    const defaultAttack = selectedMonster.attack;
    const defaultMovement = elite ? selectedMonster.movement : monsterData.baseStat?.movement;
    const defaultHP = selectedMonster.health;
    const defaultRange = 0;
    const isAgressive = true;

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
                    <td>
                        <button class="attack" onclick="removeCreature(${index})">X</button>
                    </td>
                </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
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

function loadData() {
    fetch('https://raw.githubusercontent.com/imoshekov/frosthaven-assistant/refs/heads/main/data.json')
        .then(response => response.json())
        .then(fetchedData => {
            data = fetchedData;
            populateMonsterTypeDropdown();
        })
        .catch(error => console.error('Error fetching data:', error));

}

function initValues() {
    // Get the select element
    const selectElement = document.getElementById('type');

    // Attach a change event listener to the select element
    selectElement.addEventListener('change', function () {
        // Get the selected option value
        const selectedValue = this.value;

        // Run some JavaScript code when an option is selected
        console.log(`You selected: ${selectedValue}`);
    });
}

// Render default characters when page loads
window.onload = function () {
    loadData();
    renderTable();
    populateModifyByTypeDropdown();
    initValues();
};