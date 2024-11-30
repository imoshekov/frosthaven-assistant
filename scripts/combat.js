let conditionTarget = null;
let attackTarget = null;

//region UI controls
function openConditions(event, charIdx) {
    conditionTarget = charIdx;
    let target = characters[charIdx];
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
        if(control.type === 'number'){
            value = parseInt(control.value) || 0;
        }

        UIController.updateStat(conditionTarget, stat, value, allTypesAffected, isCondition, isTemporary);
        if (isCondition) {
            conditionValues[stat] = value;
        }
    });

    characters[conditionTarget].conditions = conditionValues;
    characters.forEach((_, index) => showConditions(index));

    if (WebSocketHandler.isConnected) {
        WebSocketHandler.sendCharactersUpdate();
    }

    closeConditionsModal();
}

function loadConditionsInAttackModal() {
    const container = document.getElementById('attack-conditions');
    container.innerHTML = '';
    let target = characters[attackTarget];
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

function showBattleLog(index) {
    hideBattleLogs();
    const logElement = document.getElementById(`battle-log-${index}`);
    if (logElement) {
        logElement.classList.add('show');
    }
}

function hideBattleLogs() {
    const logElements = document.getElementById('creaturesTable').querySelectorAll('.corner-image-hover');
    logElements.forEach(logElement => logElement.classList.remove('show'));
}
//endregion


//region Combat actions
function handleAttack(event, buttonElement) {
    attackTarget = buttonElement.dataset.creatureIdx;
    openModal('modal-attack');
    document.getElementById('attack-combatants').innerHTML = `${characters[attackTarget].name}`;
    loadConditionsInAttackModal();
    event.stopPropagation();
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
    updateHpWithDamage(attackTarget, dmg);
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

function getAttackResult(showLog = true) {
    let dmg = parseInt(document.getElementById('attack-input').value);

    if (characters[attackTarget].armor > 0 || characters[attackTarget].tempStats?.armor > 0) {
        let pierce = parseInt(document.getElementById('pierce-input')?.value) || 0;
        let effectiveArmor = Math.max((characters[attackTarget].armor + (characters[attackTarget].tempStats?.armor || 0)) - pierce, 0);

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
    let attackLogMsg = `${character.name} #was attacked for ${dmg} damage#. Was ${character.hp},`;
    character.hp = Math.max(0, character.hp - dmg);
    document.getElementById(`char-hp-${charIdx}`).value = character.hp;
    attackLogMsg += ` now ${character.hp}`;
    DataManager.log(attackLogMsg)
    UIController.showToastNotification(attackLogMsg.replaceAll('#',''), 7000);
    let characterConditions = character.conditions;
    if (characterConditions?.brittle || characterConditions?.ward) {
        characterConditions.brittle = false;
        characterConditions.ward = false;
    }
    showConditions(charIdx);
    if (character.aggressive && character.hp <= 0) {
        DataManager.log(`${character.name} has been killed and removed from the game.`);
        UIController.showToastNotification(`${character.name} has been killed`,3000);
        UIController.removeCreature(charIdx);
    }
    if(WebSocketHandler.isConnected){
        WebSocketHandler.sendCharactersUpdate();
    }
}

function showConditionsForType(typeToUpdate, condition) {
    characters.forEach(((character, index) => {
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
