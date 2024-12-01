class Log {
    static PART = Object.freeze({
        hp: 'HP',
        add: 'Add',
        set: 'Set', // manually set HP
        init: 'init',
        attack: 'Attack',
        result: 'Result',
        shield: 'shield',
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
        return { ...this.#logBuilder };
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
        const hpMsg = `${this.logParts[Log.PART.hp] || '??'}: `;
        const deathMsg = this.logParts[Log.PART.die] ? `(Died) ` : '';
        const dmgModifiersMsg = this.getModifiers();
        const initiativeMsg = this.logParts[Log.PART.init] || '99';

        return `${hpMsg}${deathMsg}${this.getAction()}${this.getModifiers()}${this.getAttackResult()}, ${initiativeMsg}`;
    }

    getAction() {
        const log = this.logParts;
        switch (true) {
            case Log.PART.add in log:
                return Log.PART.add; // adding always has full HP
            case Log.PART.set in log:
                return Log.PART.set; // set to custom value
            case Log.PART.attack in log:
                return Log.PART.attack + ' ' + log[Log.PART.attack];
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
        if (Log.PART.shield in log) {
            msgParts.push('<img src="images/fh/action/shield.svg"> ' + log[Log.PART.shield]);
        }
        if (Log.PART.poison in log) {
            msgParts.push('<img src="images/fh/condition/poison.svg"> 1');
        }
        if (Log.PART.brittle in log) {
            msgParts.push('<img src="images/fh/condition/brittle.svg"> x2');
        }
        if (Log.PART.ward in log) {
            msgParts.push('<img src="images/fh/condition/ward.svg"> /2');
        }
        const modifiers = msgParts.join(', ');

        return modifiers ? ` [${modifiers}]` : '';
    }

    getAttackResult() {
        const log = this.logParts;
        let resultParts = [];
        if (Log.PART.result in log) {
            resultParts.push(' = '  + log[Log.PART.result]);
        }
        if (Log.PART.retaliate in log) {
            resultParts.push('(<img src="images/fh/action/retaliate.svg"/>' + log[Log.PART.retaliate] + ')');
        }

        return resultParts.join(' ');
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
            return new Log(this.logParts);
        }
    }

    //region UI Methods
    static lastLogClicked = null;

    static openSidebar(target) {
        this.clearLogButton();
        const sidebar = document.getElementById('monster-battle-log');

        // Get the clicked image's position
        const imgRect = target.getBoundingClientRect();
        const scrollTop = window.scrollY;
        const scrollLeft = window.scrollX;

        // Position the sidebar relative to the clicked image
        sidebar.style.top = `${imgRect.top + scrollTop - 5}px`;
        sidebar.style.left = `${imgRect.right + scrollLeft - 38}px`;
        sidebar.classList.remove('hidden');
        // sidebar.style.transform = 'translateX(0%)'; // Slide into view
        sidebar.style.animation = '0.3s left-enter'; // Slide into view

        // Populate the sidebar content
        const sidebarContent = document.getElementById('battle-log-content');
        const imgId = target.id;
        sidebarContent.innerHTML = `<p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p><p>Logs for ${imgId}</p>`;
        target.style.visibility = 'hidden';
        this.lastLogClicked = target;
    }

    static closeSidebar() {
        const sidebar = document.getElementById('monster-battle-log');
        // sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.animation = '0.5s left-leave'; // Slide out of view
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