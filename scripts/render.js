const UIControls = {
    renderTable() {
        const tableBody = document.getElementById('creaturesTable');
        tableBody.innerHTML = '';
        characters.forEach((creature, index) => {
            const charType = creature.aggressive ? 'monster' : 'character';
            const iconSrc = creature.aggressive ? 'images/monster/enemy.png' : `images/${charType}/icons/fh-${creature.type}.svg`;
            const iconClass = creature.aggressive ? 'monster-icon' : 'character-icon';
            const row = `<div class='creature-row ${creature.type}-row ${creature.eliteMonster ? 'elite-row' : 'nonelite-row'} ${creature.aggressive ? '' : 'friendly'} '>
                            <img class='background' src="${backgroundImage}"/>
                            <div class='creature-column'>
                            <input type="number" class="initiative" value="${creature.initiative}"
                                onchange="EventManager.updateStat(${index}, 'initiative', this.value); EventManager.sortCreatures(); UIControls.renderTable();" />
                            <div class='nameplate'>
                                <div class='character-skin' onclick="openConditions(event, ${index})">
                                    <img class='profile' src='images/${charType}/thumbnail/fh-${creature.type}.png'>
                                    <div class='name'>
                                        <img class='${iconClass}' src='${iconSrc}'>
                                         <b>${creature.name}</b>
                                    </div>
                                </div>
    
                                <div class='character-attributes'>
                                <div class='stats'>
                                    <div class='char-hp stat-child'>
                                        <img src="images/life-bar.png"/>
                                        <input id="char-hp-${index}" type="number" class="hp" value="${creature.hp}"
                                            onchange="EventManager.updateStat(${index}, 'hp', this.value)" />
                                    </div>
                                    <div class='char-attack stat-child'>
                                        <img src="images/battle.png"/>
                                        <input type="number" class="attack" value="${creature.attack}"
                                            onchange="EventManager.updateStat(${index}, 'attack', this.value)" />
                                    </div>
                                    <div class='char-movement stat-child'>
                                        <img src="images/footprint.png"/>
                                        <input type="number" class="movement" value="${creature.movement}"
                                            onchange="EventManager.updateStat(${index}, 'movement', this.value)" />
    
                                    </div>
                                </div>
                                <div class='action-buttons'>
                                    <span class="attack-btn" data-creature-idx="${index}" onclick="handleAttack(event, this)">
                                        <button>
                                            <img class='attack-image' id="attack-img-${index}" src='images/action/attack.svg'>
                                            <img class='target-image' id="target-img-${index}" src='images/action/target.svg'>
                                        </button>
                                    </span>
                                </div>
                            </div>
                            <button class="remove-btn" onclick="removeCreature(${index})">X</button>
                        </div>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    },
    populateMonsterTypeDropdown() {
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
}