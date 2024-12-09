let conditionTarget = null;
let attackTarget = null;
let attackLog = null;

//region UI controls
function openConditions(event, charIdx) {
    conditionTarget = charIdx;
    let target = DataManager.getCharacters(charIdx);
    const conditions = {
        'condition-armor': target.armor,
        'condition-retaliate': target.retaliate,
        'condition-poison': target.conditions?.poison || false,
        'condition-wound': target.conditions?.wound || false,
        'condition-brittle': target.conditions?.brittle || false,
        'condition-ward': target.conditions?.ward || false,
        'temp-condition-retaliate': target?.tempStats?.retaliate || 0,
        'temp-condition-armor': target?.tempStats?.armor || 0
    };
    Object.entries(conditions).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });
    preventExclusiveConditions();
    openModal('modal-conditions');
    document.getElementById('condition-target').innerHTML = `${target.name}`;
    event.stopPropagation();
}

function showConditions(charIdx) {
    const target = DataManager.getCharacters(charIdx);

    showConditionsForType(target.type, 'armor');
    showConditionsForType(target.type, 'retaliate');
    if (Object.keys(target.conditions).length === 0) {
        document.getElementById(`char-condition-${charIdx}`).style.visibility = 'hidden';
    }
    for (const condition in target.conditions) {
        const conditionImg = document.getElementById(`char-${condition}-${charIdx}`);
        if (conditionImg) {
            conditionImg.style.visibility = target.conditions[condition] ? 'visible' : 'hidden';
            conditionImg.style.display = target.conditions[condition] ? 'block' : 'none';
        }
    }
}

function closeConditionsModal() {
    document.getElementById('modal-conditions').style.display = 'none';
}

function applyCondition() {
    const conditions = [
        { id: 'condition-armor', stat: 'armor', allTypesAffected: false, isCondition: false, isTemporary: false },
        { id: 'condition-retaliate', stat: 'retaliate', allTypesAffected: false, isCondition: false, isTemporary: false },
        { id: 'condition-poison', stat: 'poison', allTypesAffected: false, isCondition: true, isTemporary: false },
        { id: 'condition-wound', stat: 'wound', allTypesAffected: false, isCondition: true, isTemporary: false },
        { id: 'condition-brittle', stat: 'brittle', allTypesAffected: false, isCondition: true, isTemporary: false },
        { id: 'condition-ward', stat: 'ward', allTypesAffected: false, isCondition: true, isTemporary: false },
        { id: 'temp-condition-armor', stat: 'armor', allTypesAffected: true, isCondition: false, isTemporary: true },
        { id: 'temp-condition-retaliate', stat: 'retaliate', allTypesAffected: true, isCondition: false, isTemporary: true }
    ];

    const conditionValues = {};

    conditions.forEach(({ id, stat, allTypesAffected, isCondition, isTemporary}) => {
        let value;
        let control = document.getElementById(id);
        if(control.type === 'checkbox'){
            value = control.checked;
        }
        if(control.type === 'tel'){
            value = parseInt(control.value) || 0;
        }

        UIController.updateStat(conditionTarget, stat, value, allTypesAffected, isCondition, isTemporary);
        if (isCondition) {
            conditionValues[stat] = value;
        }
    });

    DataManager.getCharacters(conditionTarget).conditions = conditionValues;
    DataManager.getCharacters().forEach((_, index) => showConditions(index));

    if (WebSocketHandler.isConnected) {
        WebSocketHandler.sendCharactersUpdate();
    }

    closeConditionsModal();
}

function loadConditionsInAttackModal() {
    const container = document.getElementById('attack-conditions');
    container.innerHTML = '';
    let target = DataManager.getCharacters(attackTarget);
    const pierceImg = document.getElementById("pierce-img");
    const pierceInput = document.getElementById("pierce-input");

    if (target.armor > 0 || (target.tempStats?.armor || 0) > 0) {
        addImg(container, 'shield', target.armor + (target.tempStats?.armor || 0));
        pierceImg.style.display = "inline-block";
        pierceInput.style.display = "inline-block";
    }
    else {
        pierceImg.style.display = "none";
        pierceInput.style.display = "none";
    }
    if (target.retaliate > 0 || target.tempStats?.retaliate > 0) {
        addImg(container, 'retaliate', target.retaliate + (target.tempStats?.retaliate || 0));
    }

    if (Object.keys(target.conditions).length > 0) {
        for (let [key, value] of Object.entries(target.conditions)) {
            if (value) {
                const img = document.createElement('img');
                img.src = `images/fh/condition/${key}.svg`;
                container.appendChild(img);
            }
        }
    }
}

function closeAttackModal() {
    attackTarget = null;
    document.getElementById('attack-input').value = 0;
    document.getElementById('pierce-input').value = 0;
    document.getElementById('modal-attack').style.display = 'none';
    document.getElementById('attack-result').innerHTML = '';
}
//endregion


//region Combat actions
function handleAttack(event, buttonElement) {
    attackTarget = buttonElement.dataset.creatureIdx;
    openModal('modal-attack');
    const character = DataManager.getCharacters(attackTarget);
    document.getElementById('attack-combatants').innerHTML = `${character.name}`;
    loadConditionsInAttackModal();
    event.stopPropagation();
}

function updateAttackResult() {
    let dmg = getAttackResult();
    let resultElement = document.getElementById('attack-result');

    if (dmg <= 0) {
        resultElement.innerHTML = '';
    } else {
        resultElement.innerHTML = 'Total: ' + dmg;
    }
}

function applyDamage() {
    attackLog = Log.builder();
    let dmg = getAttackResult();
    updateHpWithDamage(attackTarget, dmg);
    UIController.renderLogs();
    closeAttackModal();
}
//endregion


//region Helper functions
function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

function addImg(container, name, value) {
    const img = document.createElement('img');
    img.src = `images/action/${name}.svg`;
    const paragraph = document.createElement("p");
    paragraph.textContent = value;
    container.appendChild(paragraph);
    container.appendChild(img);
}

function getAttackResult() {
    let dmg = parseInt(document.getElementById('attack-input').value);
    const character = DataManager.getCharacters(attackTarget);
    attackLog?.initiative(character.initiative).attack(dmg);

    if (character.armor > 0 || character.tempStats?.armor > 0) {
        let pierce = parseInt(document.getElementById('pierce-input')?.value) || 0;
        let armor = character.armor + (character.tempStats?.armor || 0);
        let effectiveArmor = Math.max(armor - pierce, 0);
        attackLog?.pierce(pierce).shield(armor);

        if (effectiveArmor > 0) {
            dmg -= effectiveArmor;
        }
    }
    if (character.conditions?.poison && dmg > 0) {
        dmg += 1;
        attackLog?.poison(true);
    }

    return calculateDmgMultipliers(attackTarget, dmg);
}

function calculateDmgMultipliers(charIdx, dmg) {
    const character = DataManager.getCharacters(charIdx);
    const charConditions = character.conditions;
    if (charConditions?.brittle && dmg > 0) {
        dmg *= 2;
        attackLog?.brittle(true);
    }
    if (charConditions?.ward && dmg > 0) {
        dmg = Math.floor(dmg / 2);
        attackLog?.ward(true);
    }

    return dmg;
}

function updateHpWithDamage(charIdx, dmg) {
    const character = DataManager.getCharacters(charIdx);
    const retaliateDmg = character.retaliate + (character.tempStats?.retaliate || 0);
    const round = parseInt(document.getElementById("round-number").value);
    attackLog.round(round).result(dmg).retaliate(retaliateDmg);
    if (dmg <= 0) {
        // we still log the attack even if it doesn't do damage
        character.log.push(attackLog.hp(character.hp).result(0).build());
        if (WebSocketHandler.isConnected){
            WebSocketHandler.sendCharactersUpdate();
        }
        return;
    }

    let attackLogMsg = `${character.name} was attacked for ${dmg} damage. Was ${character.hp},`;
    character.hp = Math.max(0, character.hp - dmg);
    attackLog.hp(character.hp);
    document.getElementById(`char-hp-${charIdx}`).value = character.hp;
    attackLogMsg += ` now ${character.hp}`;
    UIController.showToastNotification(attackLogMsg, 5000);
    let characterConditions = character.conditions;
    if (characterConditions?.brittle || characterConditions?.ward) {
        characterConditions.brittle = false;
        characterConditions.ward = false;
    }
    showConditions(charIdx);
    if (character.aggressive && character.hp <= 0) {
        character.log.push(attackLog.die(true).build());
        UIController.showToastNotification(`${character.name} has been killed`,3000);
        UIController.killCreature(charIdx);
    } else {
        character.log.push(attackLog.build());
    }
    if (WebSocketHandler.isConnected){
        WebSocketHandler.sendGraveyardUpdate();
        WebSocketHandler.sendCharactersUpdate();
    }
}

function showConditionsForType(typeToUpdate, condition) {
    DataManager.getCharacters().forEach(((character, index) => {
        if (character.type === typeToUpdate) {
            const container = document.getElementById(`char-${condition}-${index}`);
            if (container && (character[condition] > 0 || character.tempStats[condition] > 0)) {
                container.style.visibility = 'visible';
                container.querySelector(`.${condition}-number`).value = parseInt(character[condition]) + (parseInt(character.tempStats[condition]) || 0);
            } else if (container) {
                container.style.visibility = 'hidden';
            }
        }
    }));
}

function preventExclusiveConditions() {
    const brittle = document.getElementById("condition-brittle");
    const ward = document.getElementById("condition-ward");
    brittle.addEventListener("change", () => brittle.checked && (ward.checked = false));
    ward.addEventListener("change", () => ward.checked && (brittle.checked = false));
}
//endregion
