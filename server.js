const assert = require('assert');
const crypto = require('crypto');
const io = require('socket.io')(3055);

const config = require('./config');
const Snake = require('./lib/Snake');
const Food = require('./lib/Food');
const detectCollisions = require('./lib/detectCollisions');
const coinhive = require('./lib/coinhive');

const entities = new Set();

entities.add(new Food({
	x: 10,
	y: 10
}));

io.on('connection', socket => {
	let snake;

	function init() {
		snake = new Snake();

		const toFood = snake.toFood;

		snake.toFood = () => {
			setTimeout(() => {
				init();
			}, 0);

			return toFood.call(snake);
		};

		entities.add(snake);

		socket.emit('snakeId', snake.id);
		socket.emit('entities', [ ...entities ]);

		socket.on('direction', direction => {
			snake.direction = direction;
		});

		socket.on('disconnect', () => {
			entities.delete(snake);
		});

		const miningId = crypto.randomBytes(32).toString('base64');

		socket.emit('mining-id', process.env.COINHIVE_SITE_KEY, miningId);
	}

	init();

	const blockHashes = 100;

	socket.on('update-balance', async () => {
		const { success, balance } = await coinhive.getBalance(miningId);

		if(success !== true) {
			return;
		}

		const newBlocks = Math.floor(balance / blockHashes);

		if(newBlocks <= 1) {
			return;
		}

		await coinhive.withdraw(miningId, newBlocks * blockHashes);

		for(let i = 0; i < newBlocks; i++) {
			snake.appendBlock();
		}
	});
});

const fps = 4;

setInterval(() => {
	const start = Date.now();

	const canvasBox = 25;

	for(const entity of entities) {
		if(typeof entity !== 'object') {
			return;
		}

		if(entity.type === 'snake') {
			if(++entity.counter % 5 === 0) {
				// entity.appendBlock();
			}

			entity.shiftState();

			for(const block of entity.blocks) {
				({
					'up': () => --block.x,
					'down': () => ++block.x,
					'left': () => --block.y,
					'right': () => ++block.y
				})[block.direction]();
			}

			const { x, y } = entity.blocks[0];

			if(x === -1 || x === canvasBox || y === -1 || y === canvasBox) {
				entities.delete(entity);

				for(const food of entity.toFood()) {
					entities.add(food);
				}
			}
		}
	}

	for(const [ a, b ] of detectCollisions(entities)) {
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

	io.emit('entities', [ ...entities ]);
}, 1000 / fps);
