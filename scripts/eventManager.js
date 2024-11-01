const EventManager = {
    toggleDone(event) {
        if (event.target.type !== "checkbox") {
            return;
        }
        const checkbox = event.target;
        if (checkbox.checked) {
            checkbox.parentElement.classList.add('done');
        } else {
            checkbox.parentElement.classList.remove('done');
        }
    
        const allItems = document.querySelectorAll('#todoList li label');
        const allDone = Array.from(allItems).every(item => item.classList.contains('done'));
    
        const todoList = document.getElementById('todoList');
        if (allDone) {
            todoList.style.display = 'none';
        } else {
            todoList.style.display = 'block';
        }
    },
    toggleColor(element, event) {
        const elementId = element.id;
        const path = element.querySelector('path');
        const pathFill = path.getAttribute('fill');
    
        if (!pathFill || pathFill === `url(#${elementId}-bw)`) {
            path.setAttribute('fill', `url(#${elementId}-color)`);
            return;
        }
        if (pathFill === `url(#${elementId}-color)`) {
            if(event?.type === 'click'){
                path.setAttribute('fill', `url(#${elementId}-bw)`);
                return;
            }
            path.setAttribute('fill', `url(#${elementId}-half)`);
            return;
        }
        if (pathFill === `url(#${elementId}-half)`) {
            path.setAttribute('fill', `url(#${elementId}-bw)`);
            return;
        }
        return;
    },
    toggleTodoVisibility() {
        const todoList = document.getElementById('todoList');
        todoList.style.display = (todoList.style.display === "none" || todoList.style.display === '') ? "block" : "none";
    },
    handleFocusEvents() {
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
    },
    nextRound() {
        characters.forEach(c => {
            c.initiative = 0;
        });
    
        this.sortCreatures();
        UIControls.renderTable();
    
        const elements = document.querySelectorAll('.elements-wrapper svg');
        elements.forEach(e => {
            const fill = e.querySelector('path')?.getAttribute('fill');
            if (!fill) {
                return;
            }
            if (fill.includes('half') || fill.includes('color')) {
                EventManager.toggleColor(e);
            }
        });
    },
    removeCreature(index) {
        characters.splice(index, 1);
        UIControls.renderTable();
    },
    sortCreatures() {
        characters.sort((a, b) => a.initiative - b.initiative);
    },
    updateStat(index, stat, value) {
        const parsedValue = parseInt(value);
    
        if (stat !== 'initiative') {
            characters[index][stat] = parsedValue;
            return;
        }
        //changing initiative is applied to all monsters of the selected type
        const typeToUpdate = characters[index].type;
        characters.forEach(character => {
            if (character.type === typeToUpdate) {
                character.initiative = parsedValue;
            }
        });
    } 
}