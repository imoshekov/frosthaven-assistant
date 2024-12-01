class Log {
    static ACTION = Object.freeze({
        hp: 'hp',
        init: 'init',
        attack: 'attack',
        shield: 'shield',
        brittle: 'brittle',
        retaliate: 'retaliate',
        poison: 'poison',
        wound: 'wound',
        ward: 'ward',
        heal: 'heal',
        die: 'die'
    });

    logParts = {};

    static builder() {
        return { ...this.#logBuilder };
    }

    constructor(logParts) {
        this.logParts = logParts;
    }

    static #logBuilder = {
        logParts: {},
        hp(value) {
            this.logParts[Log.ACTION.hp] = value;
            return this;
        },
        init(value) {
            this.logParts[Log.ACTION.init] = value;
            return this;
        },
        attack(value) {
            this.logParts[Log.ACTION.attack] = value;
            return this;
        },
        shield(value) {
            this.logParts[Log.ACTION.shield] = value;
            return this;
        },
        brittle(value) {
            this.logParts[Log.ACTION.brittle] = value;
            return this;
        },
        retaliate(value) {
            this.logParts[Log.ACTION.retaliate] = value;
            return this;
        },
        poison(value) {
            this.logParts[Log.ACTION.poison] = value;
            return this;
        },
        wound(value) {
            this.logParts[Log.ACTION.wound] = value;
            return this;
        },
        ward(value) {
            this.logParts[Log.ACTION.ward] = value;
            return this;
        },
        heal(value) {
            this.logParts[Log.ACTION.heal] = value;
            return this;
        },
        die(value) {
            this.logParts[Log.ACTION.die] = value;
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
        sidebarContent.innerHTML = `<p>Logs for ${imgId}</p>`;
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