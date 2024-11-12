
let characters = JSON.parse(DataManager.load('characters'))
    || [
        { name: "Bonera Bonerchick", type: "boneshaper", aggressive: false, hp: 7, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } },
        { name: "Spaghetti", type: "drifter", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
        { name: "Bufalina", type: "banner-spear", aggressive: false, hp: 12, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 10, attack: 0, movement: 0, initiative: 0 } },
        { name: "Petra Squirtenstein", type: "deathwalker", aggressive: false, hp: 8, attack: 0, movement: 0, initiative: 0, armor: 0, retaliate: 0, conditions: {}, defaultStats: { hp: 6, attack: 0, movement: 0, initiative: 0 } }
    ];

let conditionTarget = null;
let attackTarget = null;

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
    UIController.sortCreatures();
    UIController.renderTable();
}

function handleAttack(event, buttonElement) {
    attackTarget = buttonElement.dataset.creatureIdx;
    openModal('modal-attack');
    document.getElementById('attack-combatants').innerHTML = `&#9876;&#65039; ${characters[attackTarget].name}`;
    loadConditionsInAttackModal();
    event.stopPropagation();
}

function openConditions(event, charIdx) {
    conditionTarget = charIdx;
    let target = characters[charIdx];
    document.getElementById('condition-armor').value = target.armor;
    document.getElementById('condition-retaliate').value = target.retaliate;
    document.getElementById('condition-poison').checked = target.conditions?.poison || false;
    document.getElementById('condition-brittle').checked = target.conditions?.brittle || false;
    document.getElementById('condition-ward').checked = target.conditions?.ward || false;
    preventExclusiveConditions();
    openModal('modal-conditions');
    event.stopPropagation();
}

function loadConditionsInAttackModal() {
    const container = document.getElementById('attack-conditions');
    container.innerHTML = '';
    let target = characters[attackTarget];
    const pierceImg = document.getElementById("pierce-img");
    const pierceInput = document.getElementById("pierce-input");

    if (target.armor > 0) {
        addImg(container, 'shield', target.armor);
        pierceImg.style.display = "inline-block";
        pierceInput.style.display = "inline-block";
    }
    else {
        pierceImg.style.display = "none";
        pierceInput.style.display = "none";
    }
    if (target.retaliate > 0) {
        addImg(container, 'retaliate', target.retaliate);
    }

    if (Object.keys(target.conditions).length > 0) {
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
    const paragraph = document.createElement("p");
    paragraph.textContent = value;
    container.appendChild(paragraph);
    container.appendChild(img);
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeAttackModal() {
    attackTarget = null;
    document.getElementById('attack-input').value = 0;
    document.getElementById('pierce-input').value = 0;
    document.getElementById('modal-attack').style.display = 'none';
    document.getElementById('attack-result').innerHTML = '';
}

function updateAttackResult() {
    let dmg = getAttackResult(false);
    let resultElement = document.getElementById('attack-result');

    if (dmg <= 0) {
        resultElement.innerHTML = '';
    } else {
        resultElement.innerHTML = 'Total: ' + dmg;
    }
}

function applyDamage() {
    let dmg = getAttackResult();
    if (dmg > 0) {
        DataManager.log(`${characters[attackTarget].name}# was attacked for #${dmg} damage`);
    }
    updateHpWithDamage(attackTarget, dmg);
    closeAttackModal();
}

function getAttackResult(showLog = true) {
    let dmg = parseInt(document.getElementById('attack-input').value);

    if (characters[attackTarget].armor > 0) {
        let pierce = parseInt(document.getElementById('pierce-input')?.value) || 0;
        let effectiveArmor = Math.max(characters[attackTarget].armor - pierce, 0);

        if (effectiveArmor > 0) {
            dmg -= effectiveArmor;
        }

        if (showLog && dmg > 0) {
            const message = effectiveArmor
                ? `${characters[attackTarget].name} has ${effectiveArmor} armor` + (pierce ? ` after ${pierce} pierce` : '')
                : `${characters[attackTarget].name}'s armor was fully pierced`;
            DataManager.log(message);
        }
    }
    if (characters[attackTarget].conditions?.poison && dmg > 0) {
        dmg += 1;
        showLog && DataManager.log(characters[attackTarget].name + " is poisoned");
    }

    return calculateDmgMultipliers(attackTarget, dmg, showLog);
}

function calculateDmgMultipliers(charIdx, dmg, showLog = true) {
    let charConditions = characters[charIdx].conditions;
    if (charConditions?.brittle && dmg > 0) {
        dmg *= 2;
        showLog && DataManager.log(characters[charIdx].name + " is brittle");
    }
    if (charConditions?.ward && dmg > 0) {
        dmg = Math.floor(dmg / 2);
        showLog && DataManager.log(characters[charIdx].name + " has ward");
    }

    return dmg;
}

function updateHpWithDamage(charIdx, dmg) {
    if (dmg <= 0) {
        return;
    }

    const character = characters[charIdx];
    character.hp = Math.max(0, character.hp - dmg);
    document.getElementById(`char-hp-${charIdx}`).value = character.hp;
    if (character.aggressive && character.hp <= 0) {
        DataManager.log(`${character.name} has been killed and removed from the game.`);
        UIController.removeCreature(charIdx);
    }
    let characterConditions = character.conditions;
    if (characterConditions?.brittle || characterConditions?.ward) {
        characterConditions.brittle = false;
        characterConditions.ward = false;
    }
}

function applyCondition(allTypesAffected) {
    const armorValue = parseInt(document.getElementById('condition-armor').value);
    const retaliateValue = parseInt(document.getElementById('condition-retaliate').value);
    const poison = document.getElementById('condition-poison').checked;
    const brittle = document.getElementById('condition-brittle').checked;
    const ward = document.getElementById('condition-ward').checked;

    UIController.updateStat(conditionTarget, 'armor', armorValue, allTypesAffected);
    UIController.updateStat(conditionTarget, 'retaliate', retaliateValue, allTypesAffected);
    characters[conditionTarget].conditions = {
        poison,
        brittle,
        ward
    };
    showConditions(conditionTarget);
    closeConditionsModal();
}

function showConditions(charIdx) {
    const target = characters[charIdx];

    showConditionsForType(target.type, 'armor');
    showConditionsForType(target.type, 'retaliate');
    if (Object.keys(target.conditions).length === 0) {
        document.getElementById(`char-condition-${charIdx}`).style.visibility = 'hidden';
    }
    for (const condition in target.conditions) {
        const conditionImg = document.getElementById(`char-${condition}-${charIdx}`);
        if (conditionImg) {
            conditionImg.style.visibility = target.conditions[condition] ? 'visible' : 'hidden';
        }
    }
}

function showConditionsForType(typeToUpdate, condition) {
    characters.forEach(((character, index) => {
        if (character.type === typeToUpdate) {
            const container = document.getElementById(`char-${condition}-${index}`);
            if (container && character[condition] > 0) {
                container.style.visibility = 'visible';
                container.querySelector(`.${condition}-number`).value = character[condition];
            } else if (container) {
                container.style.visibility = 'hidden';
            }
        }
    }));
}

function incrementInput(inputId) {
    const inputElement = document.getElementById(inputId);
    inputElement.value = parseInt(inputElement.value, 10) + 1;
}

function closeConditionsModal() {
    document.getElementById('modal-conditions').style.display = 'none';
}

function preventExclusiveConditions() {
    const brittle = document.getElementById("condition-brittle");
    const ward = document.getElementById("condition-ward");
    brittle.addEventListener("change", () => brittle.checked && (ward.checked = false));
    ward.addEventListener("change", () => ward.checked && (brittle.checked = false));
}

let previousCharactersSnapshot = JSON.stringify(characters);

// Render default characters when page loads
window.onload = function () {
    UIController.populateMonsterTypeDropdown();
    UIController.renderTable();
    UIController.handleFocusEvents();
    //saving to local storage every X seconds.
    setInterval(() => DataManager.save(), 10000);
    setInterval(() => {
        const currentCharacters = JSON.stringify(characters);

        if (currentCharacters !== previousCharactersSnapshot) {
            // Update the snapshot to the current state
            previousCharactersSnapshot = currentCharacters;

            if (UIController.allIniativeSet()) {
                WebSocketHandler.getInstance().send(JSON.stringify({
                    type: 'characters-update',
                    characters: characters
                }));
            }
        }
    }, 1000);
    document.getElementById('battle-log').innerHTML = DataManager.load('battle-log');
};

const attackModal = document.getElementById('modal-attack');
const conditionModal = document.getElementById('modal-conditions');


// Close modal if clicking outside of modal content
window.onclick = function (event) {
    if (attackModal.style.display === "block" && !attackModal.querySelector('.modal-content').contains(event.target)) {
        closeAttackModal();
    }
    if (conditionModal.style.display === "block" && !conditionModal.querySelector('.modal-content').contains(event.target)) {
        closeConditionsModal();
    }
};

// Close modal with Escape
window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeAttackModal();
        closeConditionsModal();
    }
});