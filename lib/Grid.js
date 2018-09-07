const Food = require('./Food');
const detectCollisions = require('./detectCollisions');
const redis = require('./redis');

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

	getRandomEmptyBlock() {
		const getRandomEmptyBlock = () => {
			const x = Math.floor(Math.random() * this.size);
			const y = Math.floor(Math.random() * this.size);

			for(const entity of this.entities) {
				if(entity.x === x && entity.y === y)
					return getRandomEmptyBlock();

				if(entity.blocks instanceof Array) {
					for(const block of entity.blocks) {
						if(block.x === x && block.y === y)
							return getRandomEmptyBlock();
					}
				}
			}

			return { x, y };
		};

		return getRandomEmptyBlock();
	}

	async tick() {
		for(const entity of this.entities) {
			if(typeof entity === 'undefined') {
				return;
			}

			entity.tick();

			if(entity.type === 'snake') {
				for(const block of entity.blocks) {
					const { x, y } = block;

					if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
						await entity.die();
					}
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

				const aHead = a.blocks[0];
				const bHead = b.blocks[0];

				if(aHead.x === bHead.x && aHead.y === aHead.y) {
					if(a.blocks.length < b.blocks.length) {
						await a.die();
					} else {
						await b.die();
					}

					continue;
				}

				if(b.blocks.slice(1).some(block => block.x === aHead.x && block.y === aHead.y)) {
					await a.die();

					continue;
				}

				if(a.blocks.slice(1).some(block => block.x === bHead.x && block.y === bHead.y)) {
					await b.die();

					continue;
				}
			}
		}

		const blockHashes = 250;

		if(Math.floor(Math.random() * 8) === 0) {
			if(await redis.eval(`
				local balance = redis.call('get', 'server-food')

				if tonumber(balance) < ${blockHashes} then
					return 0
				end

				redis.call('decrby', 'server-food', ${blockHashes})

				return 1
			`, 0) === 1) {
				this.addEntity(new Food(this.getRandomEmptyBlock()));
			}
		}
	}
}
