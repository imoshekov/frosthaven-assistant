class Log {
    static PART = Object.freeze({
        hp: 'HP',
        add: 'Add',
        set: 'Set', // manually set HP
        init: 'init',
        attack: 'Attack',
        result: 'Result',
        shield: 'shield',
        pierce: 'pierce',
        brittle: 'brittle',
        retaliate: 'retaliate',
        poison: 'poison',
        wound: 'Wound',
        ward: 'ward',
        heal: 'Heal', // Heal not yet implemented, but added for future use
        die: 'Die'
    });

    logParts = {};

    static builder() {
        this.#logBuilder.logParts = {};

        return this.#logBuilder;
    }

    constructor(logParts) {
        this.logParts = logParts;
    }

    toJON() {
        return this.logParts;
    }

    /*
     * Print Format:
     * [HP]: [Add/Attack/Wound/Heal] ([Died]) [Shield] [Poison] [Brittle] [Ward] = [Result] ([Retaliate]), [Initiative]
     */
    print() {
        const hpMsg = `<span class="log-hp">${this.logParts[Log.PART.hp] || '0'}</span>: `;
        const deathMsg = this.logParts[Log.PART.die] ? `(Died) ` : '';
        const dmgModifiersMsg = this.getModifiers();
        const initiativeMsg = this.logParts[Log.PART.init] || '99';
        const initialAttack = this.logParts[Log.PART.attack] ? this.logParts[Log.PART.attack] : '';
        const logMsg = `${hpMsg}${deathMsg}${this.getAction()}${initialAttack}${this.getModifiers()}, &lt;${initiativeMsg}&gt;`;

        return `<span class="log-entry">${logMsg}</span>`;
    }

    getAction() {
        const log = this.logParts;
        switch (true) {
            case Log.PART.add in log:
                return Log.PART.add; // adding always has full HP
            case Log.PART.set in log:
                return Log.PART.set; // set to custom value
            case Log.PART.attack in log:
                return Log.PART.attack + ' ' + log[Log.PART.result] + ' = ';
            case Log.PART.heal in log:
                return Log.PART.heal + ' ' + log[Log.PART.heal];
            case Log.PART.wound in log:
                return Log.PART.wound + ' ' + log[Log.PART.wound];
            default:
                return '??';
        }
    }

    getModifiers() {
        const log = this.logParts;
        let msgParts = [];
        if (log[Log.PART.shield]) {
            msgParts.push('<img src="images/fh/action/shield.svg" class="log-img"> ' + log[Log.PART.shield]);
        }
        if (log[Log.PART.pierce]) {
            msgParts.push('<img src="images/fh/action/pierce.svg" class="log-img"> ' + log[Log.PART.pierce]);
        }
        if (log[Log.PART.poison]) {
            msgParts.push('<img src="images/fh/condition/poison.svg" class="log-img">');
        }
        if (log[Log.PART.brittle]) {
            msgParts.push('<img src="images/fh/condition/brittle.svg" class="log-img">');
        }
        if (log[Log.PART.ward]) {
            msgParts.push('<img src="images/fh/condition/ward.svg" class="log-img">');
        }
        const modifiers = msgParts.join(', ');

        let retaliate = '';
        if (log[Log.PART.retaliate]) {
            retaliate = ', (<img src="images/fh/action/retaliate.svg" class="log-img"/>' + log[Log.PART.retaliate] + ')';
        }

        return modifiers ? ` [${modifiers}]${retaliate}` : '';
    }

    static #logBuilder = {
        logParts: {},
        hp(value) {
            this.logParts[Log.PART.hp] = value;
            return this;
        },
        add(value) {
            this.logParts[Log.PART.add] = value;
            return this;
        },
        set(value) {
            this.logParts[Log.PART.set] = value;
            return this;
        },
        initiative(value) {
            this.logParts[Log.PART.init] = value;
            return this;
        },
        attack(value) {
            this.logParts[Log.PART.attack] = value;
            return this;
        },
        result(value) {
            this.logParts[Log.PART.result] = value;
            return this;
        },
        shield(value) {
            this.logParts[Log.PART.shield] = value;
            return this;
        },
        pierce(value) {
            this.logParts[Log.PART.pierce] = value;
            return this;
        },
        brittle(value) {
            this.logParts[Log.PART.brittle] = value;
            return this;
        },
        retaliate(value) {
            this.logParts[Log.PART.retaliate] = value;
            return this;
        },
        poison(value) {
            this.logParts[Log.PART.poison] = value;
            return this;
        },
        wound(value) {
            this.logParts[Log.PART.wound] = value;
            return this;
        },
        ward(value) {
            this.logParts[Log.PART.ward] = value;
            return this;
        },
        heal(value) {
            this.logParts[Log.PART.heal] = value;
            return this;
        },
        die(value) {
            this.logParts[Log.PART.die] = value;
            return this;
        },

        build() {
            return (new Log(this.logParts)).toJON();
        }
    }

    //region UI Methods
    static lastLogClicked = null;

    static positionBattleLog(index) {
        const logElement = document.getElementById(`battle-log-${index}`);
        if (logElement) {
            // reset in case was moved before
            if (logElement.classList.contains('flipped-image')) {
                logElement.classList.remove('flipped-image');
                const currentLeft = parseInt(window.getComputedStyle(logElement).left || 0, 10);
                logElement.style.left = (currentLeft + 85) + 'px';
            }

            const rect = logElement.getBoundingClientRect();
            if (rect.right + 350 > window.innerWidth) {
                // log modal out of window bounds
                logElement.classList.add('flipped-image');
                const currentLeft = parseInt(window.getComputedStyle(logElement).left || 0, 10);
                logElement.style.left = (currentLeft - 85) + 'px';
            }
        }
    }

    static openSidebar(target) {
        this.clearLogButton();
        const sidebar = document.getElementById('monster-battle-log');

        // Get the clicked image's position
        const imgRect = target.getBoundingClientRect();
        const scrollTop = window.scrollY;
        const scrollLeft = window.scrollX;
        const inverse = target.classList.contains('flipped-image');

        // Position the sidebar relative to the clicked image
        sidebar.style.top = `${imgRect.top + scrollTop + 5}px`;
        sidebar.classList.remove('hidden');
        if (!inverse) {
            sidebar.style.left = `${imgRect.right + scrollLeft - 7}px`;
            // sidebar.style.transform = 'translateX(0%)'; // Slide into view
            sidebar.style.animation = '0.5s left-enter';
            sidebar.classList.remove('inverted-transition');
        } else {
            sidebar.style.left = `${imgRect.left + scrollLeft - 360}px`;
            sidebar.classList.remove('hidden');
            sidebar.style.animation = '0.5s right-enter';
            sidebar.classList.add('inverted-transition');
        }

        // Populate the sidebar content
        const sidebarContent = document.getElementById('battle-log-content');
        const characterId = target.dataset.creatureIdx;
        const characters = UIController.showGraveyard ? DataManager.graveyard : DataManager.getCharacters();

        // show newest log first
        const characterLogs = [...characters[characterId].log].reverse();
        sidebarContent.innerHTML = characterLogs
            .map(log => new Log(log).print())
            .join('<br>');
        target.style.visibility = 'hidden';
        this.lastLogClicked = target;
    }

    static closeSidebar() {
        const sidebar = document.getElementById('monster-battle-log');
        // sidebar.style.transform = 'translateX(-100%)';
        if (!sidebar.classList.contains('inverted-transition')) {
            sidebar.style.animation = '0.5s left-leave'; // Slide out of view
            sidebar.classList.remove('inverted-transition');
        } else {
            sidebar.style.animation = '0.5s right-leave';
        }
        setTimeout(() => sidebar.classList.add('hidden'), 500);
        this.clearLogButton();
    }

    static clearLogButton() {
        if (this.lastLogClicked) {
            this.lastLogClicked.style.visibility = 'visible';
            this.lastLogClicked = null;
        }
    }

    //endregion
}