const config = require('./config');

const assert = require('assert');
const crypto = require('crypto');
const io = require('socket.io')(process.env.SERVER_PORT);
const Redis = require('ioredis');

const redis = new Redis();
const Grid = require('./lib/Grid');
const Snake = require('./lib/Snake');
const Food = require('./lib/Food');
const detectCollisions = require('./lib/detectCollisions');
const coinhive = require('./lib/coinhive');

const grid = new Grid(50);

io.on('connection', socket => {

	socket.on('init', async privateKey => {
		const publicKey = (() => {
			const hash = crypto.createHash('sha256');

			hash.update(privateKey, 'hex');

			return hash.digest('hex');
		})();

		const blockHashes = 250;

		const emitBalance = async () => socket.emit('balance', Math.floor(await redis.get(`balance:${publicKey}`) / blockHashes || 0));

		await emitBalance();

		console.log({ privateKey, publicKey });

		const snake = new Snake(grid.getRandomEmptyBlock());

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

		socket.on('add-block', async () => {
			if(await redis.eval(`
				local balance = redis.call('get', 'balance:${publicKey}')

				if tonumber(balance) < ${blockHashes} then
					return 0
				end

				redis.call('decrby', 'balance:${publicKey}', ${blockHashes})

				return 1
			`, 0) === 1) {
				snake.appendBlock();
				await emitBalance();
			}
		});

		socket.on('remove-block', async () => {
			if(snake.blocks.length <= 1) {
				return;
			}

			snake.blocks.splice(snake.blocks.length - 1, 1);

			await redis.incrby(`balance:${publicKey}`, blockHashes);
			await emitBalance();
		});

		socket.on('update-balance', async () => {
			const { success, balance } = await coinhive.getBalance(publicKey);

			if(success !== true)
				return;

			// const newBlocks = Math.floor(balance / blockHashes);

			// if(newBlocks <= 1)
				// return;

			await coinhive.withdraw(publicKey, balance);

			await redis.incrby(`balance:${publicKey}`, balance);
			await emitBalance();
			// for(let i = 0; i < newBlocks; i++)
				// snake.appendBlock();
		});
	});

});

const fps = 4;

setInterval(() => {
	grid.tick();

	io.emit('entities', [ ...grid.entities ]);
}, 1000 / fps);
