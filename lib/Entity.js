const EventEmitter = require('events');

let id = 0;

module.exports = class Entity extends EventEmitter {
	constructor(type) {
		super();

		this.type = type;
		this.id = id++;
	}

	tick() {
		this.emit('tick');
	}

	die() {

	}
};
