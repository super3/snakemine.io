const Entity = require('./Entity');

module.exports = class Food extends Entity {
	constructor({ x, y }) {
		super('food');

		this.x = x;
		this.y = y;
	}
};
