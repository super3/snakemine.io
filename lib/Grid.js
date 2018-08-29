const detectCollisions = require('./detectCollisions');

module.exports = class Grid {
	constructor(size) {
		this.entities = new Set();

		this.size = this.width = this.height = size;
	}

	addEntity(entity) {
		entity.grid = this;
		this.entities.add(entity);
	}

	removeEntity(entity) {
		entity.grid = undefined;
		this.entities.delete(entity);
	}

	tick() {
		for(const entity of this.entities) {
			entity.tick();

			const { x, y } = entity.blocks[0];

			if(x === -1 || x === this.width || y === -1 || y === this.height) {
				this.removeEntity(entity);

				if(entity.type === 'snake') {
					for(const food of entity.toFood()) {
						entities.add(food);
					}
				}
			}
		}

		for(const [ a, b ] of detectCollisions(this.entities)) {
			if(!(entities.has(a) && entities.has(b))) {
				// entities may have been deleted
				continue;
			}

			if(a.type === 'food' && b.type === 'food') {
				continue;
			}

			if((a.type === 'snake' && b.type === 'food') || (a.type === 'food' && b.type === 'snake')) {
				const [ snake, food ] = a.type === 'snake' ? [ a, b ] : [ b, a ];

				snake.appendBlock();
				entities.delete(food);
			}

			if(a.type === 'snake' && b.type === 'snake') {
				if(a === b) {
					// snake crossing itself
					continue;
				}

				if(a.blocks.length === b.blocks.length) {
					// snakes of equal length
					continue;
				}

				const aHead = a.blocks[0];
				const bHead = b.blocks[0];

				if(b.blocks.slice(1).some(block => block.x === aHead.x && block.y === aHead.y)) {
					entities.delete(a);
					entities.add(...a.toFood());

					for(const food of a.toFood()) {
						entities.add(food);
					}

					continue;
				}

				if(a.blocks.slice(1).some(block => block.x === bHead.x && block.y === bHead.y)) {
					entities.delete(b);

					for(const food of b.toFood()) {
						entities.add(food);
					}

					continue;
				}
			}
		}
	}
}
