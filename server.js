const io = require('socket.io')(3055);

const snakes = [];
let id = 0;

io.on('connection', socket => {
	const snake = {
		blocks: [
			{
				x: 5,
				y: 5,
				direction: 'up'
			}
		],
		direction: 'up',
		id: id++,
		counter: 0
	};

	snakes.push(snake);

	socket.emit('snakeId', snake.id);
	socket.emit('snakes', snakes);

	socket.on('direction', direction => {
		snake.direction = direction;
	});

	socket.on('disconnect', () => {
		snakes.splice(snakes.indexOf(snake), 1);
	});
});

const fps = 3.5;

setInterval(() => {
	const canvasBox = 10;

	for(const snake of snakes) {
		if(snake.counter++ % 5 === 0) {
			const lastBlock = snake.blocks[snake.blocks.length - 1];

			console.log(lastBlock.direction);

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

			snake.blocks.push(block);
		}

		for(let i = snake.blocks.length - 1; i >= 1; i--) {
			snake.blocks[i].direction = snake.blocks[i - 1].direction;
		}

		snake.blocks[0].direction = snake.direction;

		for(const block of snake.blocks) {
			({
				'up': () => --block.x,
				'down': () => ++block.x,
				'left': () => --block.y,
				'right': () => ++block.y
			})[block.direction]();
		}

		const { x, y } = snake.blocks[0];

		if(x === 0 || x === canvasBox || y === 0 || y === canvasBox)
			snakes.splice(snake, 1);
	}

	io.emit('snakes', snakes);
}, 1000 / fps);
