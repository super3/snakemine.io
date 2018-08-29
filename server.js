const assert = require('assert');
const crypto = require('crypto');
const io = require('socket.io')(3055);

const config = require('./config');
const Grid = require('./lib/Grid');
const Snake = require('./lib/Snake');
const Food = require('./lib/Food');
const detectCollisions = require('./lib/detectCollisions');
const coinhive = require('./lib/coinhive');

const grid = new Grid(50);

io.on('connection', socket => {
	const snake = new Snake();

	grid.addEntity(snake);

	socket.emit('snakeId', snake.id);
	socket.emit('entities', [ ...grid.entities ]);

	socket.on('direction', direction => {
		snake.direction = direction;
	});

	socket.on('disconnect', () => {
		grid.removeEntity(snake);
	});

	const miningId = crypto.randomBytes(32).toString('base64');

	socket.emit('mining-id', process.env.COINHIVE_SITE_KEY, miningId);


	const blockHashes = 250;

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
	grid.tick();

	io.emit('entities', [ ...grid.entities ]);
}, 1000 / fps);
