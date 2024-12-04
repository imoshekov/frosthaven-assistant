class Log {
    static PART = Object.freeze({
        hp: 'HP',
        add: 'Add',
        set: 'Set', // manually set HP
        init: 'init',
        round: 'round',
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
            return (new Log(this.logParts)).toJON();
        }
    }
}