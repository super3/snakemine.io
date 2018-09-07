const Entity = require('./Entity');
const Food = require('./Food');
const redis = require('./redis');

module.exports = class Snake extends Entity {
	constructor({ x = 12, y = 12, grid, direction = 'up' }) {
		super('snake');

		this.blocks = [
			{ x, y, direction }
		];

		this.counter = 0;
		this.direction = direction;
	}

	appendBlock() {
		const lastBlock = this.blocks[this.blocks.length - 1];

		const block = ({
			'up': () => ({
				x: lastBlock.x + 1,
				y: lastBlock.y,
				direction: 'up'
			}),
			'down': () => ({
				x: lastBlock.x - 1,
				y: lastBlock.y,
				direction: 'down'
			}),
			'left': () => ({
				x: lastBlock.x,
				y: lastBlock.y + 1,
				direction: 'left'
			}),
			'right': () => ({
				x: lastBlock.x,
				y: lastBlock.y - 1,
				direction: 'right'
			})
		})[lastBlock.direction]();

		this.blocks.push(block);
	}

	tick() {
		for(let i = this.blocks.length - 1; i >= 1; i--) {
			this.blocks[i].direction = this.blocks[i - 1].direction;
		}

		this.blocks[0].direction = this.direction;

		for(const block of this.blocks) {
			({
				'up': () => --block.x,
				'down': () => ++block.x,
				'left': () => --block.y,
				'right': () => ++block.y
			})[block.direction]();
		}
	}

	async die() {
		const blockHashes = 250;

		for(const block of this.blocks.splice(1)) {
			if(Math.floor(Math.random() * 2) === 1) {
				this.grid.addEntity(new Food(block));
			} else {
				if(Math.floor(Math.random() * 2) === 1) {
					await redis.incrby('server-balance', blockHashes);
				} else {
					await redis.incrby('server-food', blockHashes);
				}
			}
		}

		Object.assign(this.blocks[0], this.grid.getRandomEmptyBlock());
	}
};
