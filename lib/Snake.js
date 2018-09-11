const Entity = require('./Entity');
const Food = require('./Food');
const redis = require('./redis');

module.exports = class Snake extends Entity {
	constructor({ x = 12, y = 12, grid, direction = 'up' }) {
		super('snake');

		this.blocks = [
			{ x, y, direction }
		];

		this.lastInput = Date.now();
		this.counter = 0;
		this.direction = direction;
	}

	appendBlockFromBalance() {
		this.appendBlockFromBalanceNextTick = true;
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

	popBlock() {
		this.popBlockNextTick = true;
	}

	async tick() {
		this.emit('tick');

		if(this.appendBlockFromBalanceNextTick === true) {
			if(await redis.eval(`
				local balance = redis.call('get', 'balance:${this.publicKey}')

				if tonumber(balance) < ${process.env.BLOCK_HASHES} then
					return 0
				end

				redis.call('decrby', 'balance:${this.publicKey}', ${process.env.BLOCK_HASHES})

				return 1
			`, 0) === 1) {
				this.appendBlock();
			}

			this.appendBlockFromBalanceNextTick = false;
		}

		if(this.popBlockNextTick === true) {
			if(this.blocks.length > 1) {
				this.blocks.splice(this.blocks.length - 1, 1);
				await redis.incrby(`balance:${this.publicKey}`, process.env.BLOCK_HASHES);
			}

			this.popBlockNextTick = false;
		}

		if(this.lastInput < Date.now() - (30 * 1000)) {
			await this.die();
			this.grid.removeEntity(this);
		}

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
		for(const block of this.blocks.splice(1)) {
			if(Math.floor(Math.random() * 2) === 1 && block.x >= 0 && block.x < this.grid.width && block.y >= 0 && block.y < this.grid.height) {
				this.grid.addEntity(new Food(block));
			} else {
				if(Math.floor(Math.random() * 2) === 1) {
					await redis.incrby('server-balance', process.env.BLOCK_HASHES);
				} else {
					await redis.incrby('server-food', process.env.BLOCK_HASHES);
				}
			}
		}

		Object.assign(this.blocks[0], this.grid.getRandomEmptyBlock());
	}
};
