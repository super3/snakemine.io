let id = 0;

module.exports = class Entity {
	constructor(type) {
		this.type = type;
		this.id = id++;
	}
};
