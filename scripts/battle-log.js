class Log {
    static PART = Object.freeze({
        hp: 'hp',
        add: 'Add',
        set: 'Set', // manually set HP
        init: 'init',
        round: 'round',
        attack: 'Attack',
        result: 'result',
        shield: 'shield',
        pierce: 'pierce',
        brittle: 'brittle',
        retaliate: 'retaliate',
        poison: 'poison',
        wound: 'wound',
        ward: 'ward',
        heal: 'Heal', // Healing not yet implemented, but added for future use
        die: 'Die',
        timestamp: 'timestamp' // internal setter
    });
    static TABLE_COLUMNS = [
        { id: 'round', name: 'Round'},
        { id: 'name', name: 'Name'},
        { id: 'hp', name: 'HP'},
        { id: 'action', name: 'Action'},
        { id: 'modifiers', name: 'Modifiers', formatter: (cell) => gridjs.html(`${cell}`) },
        { id: 'initiative', name: 'Initiative'},
        { id: 'time', name: 'Time'}
    ];

    #characterName = '';
    #logParts = {};

    static builder() {
        this.#logBuilder.logParts = {};

        return this.#logBuilder;
    }

    constructor(logParts, characterName = null) {
        this.logParts = logParts;
        this.characterName = characterName;
    }

    static getLogData(characterIdxs = null) {
        const characters = [ ...DataManager.getCharacters(), ...DataManager.graveyard];
        const logs = characters
            .filter(character => character.log.length > 0)
            .filter((c, index) => characterIdxs == null || characterIdxs.includes(index))
            .map(
            character => character.log.map(
                logJSON => new Log(logJSON, character.name)
            )).flat();
        logs.sort((log1, log2) => log2.getTimeStamp() - log1.getTimeStamp());

        return logs.map(log => log.toTableRowData());
    }

    static getLoggedCharacters() {
        const characters = [ ...DataManager.getCharacters(), ...DataManager.graveyard ];

        return characters.filter(character => character.log.length > 0)
            .map((character, index) => ({ text: character.name, value: index }));
    }

    toJON() {
        return this.logParts;
    }

    toTableRowData() {
        const deathMsg = this.logParts[Log.PART.die] ? ' (Died)' : '';
        const time = this.logParts[Log.PART.timestamp] || Date.now();

        return {
            round: this.logParts[Log.PART.round] || '-',
            name: this.characterName || '-',
            hp: (this.logParts[Log.PART.hp] || '0') + deathMsg,
            action: this.getAction(),
            modifiers: this.getModifiers(),
            initiative: this.logParts[Log.PART.init] || '99',
            time: new Date(time).toLocaleTimeString().substring(0, 8)
        };
    }

    getAction() {
        const log = this.logParts;
        switch (true) {
            case Log.PART.add in log:
                return Log.PART.add; // adding always has full HP
            case Log.PART.set in log:
                return Log.PART.set; // set to custom value
            case Log.PART.attack in log:
                return Log.PART.attack + ' ' + log[Log.PART.result];
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

        return modifiers ? ` ${modifiers} ${retaliate}` : '';
    }

    getTimeStamp() {
        return this.logParts[Log.PART.timestamp];
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
        round(value) {
            this.logParts[Log.PART.round] = value;
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
            this.logParts[Log.PART.timestamp] = Date.now();
            return (new Log(this.logParts)).toJON();
        }
    }
}