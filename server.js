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

	socket.on('init', privateKey => {
		const publicKey = (() => {
			const hash = crypto.createHash('sha256');

			hash.update(privateKey, 'hex');

			return hash.digest('hex');
		})();

		console.log({ privateKey, publicKey });

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

		socket.emit('mining-id', process.env.COINHIVE_SITE_KEY);

		const blockHashes = 250;

		socket.on('update-balance', async () => {
			const { success, balance } = await coinhive.getBalance(publicKey);

			if(success !== true)
				return;

			const newBlocks = Math.floor(balance / blockHashes);

			if(newBlocks <= 1)
				return;

			await coinhive.withdraw(miningId, newBlocks * blockHashes);

			for(let i = 0; i < newBlocks; i++)
				snake.appendBlock();
		});
	});

});

const fps = 4;

setInterval(() => {
	grid.tick();

	io.emit('entities', [ ...grid.entities ]);
}, 1000 / fps);
