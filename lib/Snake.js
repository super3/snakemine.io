const Entity = require('./Entity');
const Food = require('./Food');

module.exports = class Snake extends Entity {
	constructor(direction = 'up') {
		super('snake');

		this.blocks = [
			{
				x: 12,
				y: 12,
				direction
			}
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

	toFood() {
		return this.blocks.slice(1).map(block => new Food(block));
	}
};
