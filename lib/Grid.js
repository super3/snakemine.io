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
			if(typeof entity === 'undefined') {
				return;
			}

			entity.tick();

			if(entity.type === 'snake') {
				const { x, y } = entity.blocks[0];

				if(x === -1 || x === this.width || y === -1 || y === this.height) {
					entity.die();
				}
			}
		}

		for(const [ a, b ] of detectCollisions(this.entities)) {
			if(!(this.entities.has(a) && this.entities.has(b))) {
				// this.entities may have been deleted
				continue;
			}

			if(a.type === 'food' && b.type === 'food') {
				continue;
			}

			if((a.type === 'snake' && b.type === 'food') || (a.type === 'food' && b.type === 'snake')) {
				const [ snake, food ] = a.type === 'snake' ? [ a, b ] : [ b, a ];

				snake.appendBlock();
				this.entities.delete(food);
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
					this.entities.delete(a);
					this.entities.add(...a.toFood());

					for(const food of a.toFood()) {
						this.entities.add(food);
					}

					continue;
				}

				if(a.blocks.slice(1).some(block => block.x === bHead.x && block.y === bHead.y)) {
					this.entities.delete(b);

					for(const food of b.toFood()) {
						this.entities.add(food);
					}

					continue;
				}
			}
		}
	}
}
