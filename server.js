const config = require('./config');

const debug = require('debug')('snake');
const assert = require('assert');
const crypto = require('crypto');
const axios = require('axios');
const io = require('socket.io')(process.env.SERVER_PORT);

const redis = require('./lib/redis');
const Grid = require('./lib/Grid');
const Snake = require('./lib/Snake');
const Food = require('./lib/Food');
const detectCollisions = require('./lib/detectCollisions');
const coinhive = require('./lib/coinhive');

const grid = new Grid(50);

const blockHashes = 250;

io.on('connection', socket => {
	socket.on('init', async privateKey => {
		const publicKey = (() => {
			const hash = crypto.createHash('sha256');

			hash.update(privateKey, 'hex');

			return hash.digest('hex');
		})();

		console.log({ privateKey, publicKey });

		const snake = new Snake(grid.getRandomEmptyBlock());

		snake.publicKey = publicKey;

		grid.addEntity(snake);

		socket.emit('snakeId', snake.id);
		socket.emit('entities', [ ...grid.entities ]);

		socket.on('direction', direction => {
			snake.lastInput = Date.now();
			snake.direction = direction;
		});

		socket.on('disconnect', async () => {
			await snake.die();
			grid.removeEntity(snake);
		});

		socket.emit('mining-id', process.env.COINHIVE_SITE_KEY);

		socket.on('add-block', async () => {
			snake.appendBlockFromBalance();
		});

		socket.on('remove-block', async () => {
			snake.popBlock();
		});

		snake.on('tick', async () => {
			socket.emit('balance', Math.floor(await redis.get(`balance:${publicKey}`) / blockHashes || 0))
		});

		socket.on('update-balance', async () => {
			const { success, balance } = await coinhive.getBalance(publicKey);

			if(success !== true)
				return;

			await coinhive.withdraw(publicKey, balance);

			await redis.incrby(`balance:${publicKey}`, balance);
		});

		socket.on('withdraw-zcash', async address => {
			const hashes = await redis.getset(`balance:${publicKey}`, 0);

			debug('address', address);
			debug(`Withdrawing ${hashes} hashes`);

			try {
				const ticker = (await axios.get('https://poloniex.com/public?command=returnTicker')).data;

				const xmrPrice = ticker['USDT_XMR'].last;
				const zecPrice = ticker['USDT_ZEC'].last;

				debug('XMR', xmrPrice);
				debug('ZEC', zecPrice);

				const { difficulty, last_reward } = (await axios.get('https://moneroblocks.info/api/get_stats')).data;

				debug('difficulty', difficulty);
				debug('last_reward', last_reward);

				const xmr = last_reward / difficulty * hashes / Math.pow(10, 12);
				const usd = xmr * xmrPrice;
				const zec = usd / zecPrice;

				debug('$ (XMR)', xmr);
				debug('$ (USD)', usd);
				debug('$ (ZEC)', zec);

				await axios.get(`${process.env.ZFAUCET_URL}/api/external/withdraw`, {
					params: {
						key: process.env.ZFAUCET_PRIVATE_KEY,
						address,
						amount: zec
					}
				});
			} catch(err) {
				debug(err);
				debug('Adding hashes back to balance');

				await redis.incrby(`balance:${publicKey}`, hashes);
			}
		});
	});
});

const fps = 5;

setInterval(async () => {
	await grid.tick();

	io.emit('entities', [ ...grid.entities ]);
	io.emit('server-balance', (await redis.get('server-balance')) / blockHashes);
	io.emit('server-food', (await redis.get('server-food')) / blockHashes);
}, 1000 / fps);
