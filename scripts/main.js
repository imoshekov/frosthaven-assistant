const characters = JSON.parse(DataManager.load('characters'))
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
    UIController.sortCreatures();
    UIController.renderTable();
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
        DataManager.log(characters[defender].name + " has armor " + characters[defender].armor);
        dmg -= characters[defender].armor;
    }
    if (characters[defender].conditions?.poison && dmg > 0) {
        DataManager.log(characters[defender].name + " is poisoned");
        dmg += 1;
    }
    if (characters[defender].retaliate > 0) {
        DataManager.log(characters[defender].name + " has retaliated for " + characters[defender].retaliate);
        attackerDmg += characters[defender].retaliate;
        // shield mitigation doesn't apply to retaliate
    }

    dmg = calculateDamage(defender, dmg);
    attackerDmg = calculateDamage(attacker, attackerDmg);
    DataManager.log(`${characters[attacker].name} dealt #${dmg} damage to ${characters[defender].name}# (retaliate: ${attackerDmg})`);

    updateHpWithDamage(defender, dmg);
    updateHpWithDamage(attacker, attackerDmg);
    closeAttackModal();
}

function calculateDamage(charIdx, dmg) {
    let charConditions = characters[charIdx]?.conditions;
    if (charConditions?.brittle && dmg > 0) {
        dmg *= 2;
        DataManager.log(characters[charIdx].name + " is brittle");
        charConditions.brittle = false;
    }
    if (charConditions?.ward && dmg > 0) {
        dmg = Math.floor(dmg / 2);
        DataManager.log(characters[charIdx].name + " has ward");
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
        DataManager.log(`${characters[charIdx].name} has been killed and removed from the game.`);
        UIController.removeCreature(charIdx);
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
 

// Render default characters when page loads
window.onload = function () {
    UIController.populateMonsterTypeDropdown();
    UIController.renderTable();
    UIController.handleFocusEvents();
    //saving to local storage every X seconds.
    setInterval(() => DataManager.save(), 10000);
    document.getElementById('battle-log').innerHTML = DataManager.load('battle-log');
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