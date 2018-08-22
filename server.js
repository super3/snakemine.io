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
		id: id++,
		counter: 0
	};

	snakes.push(snake);

	socket.emit('snakeId', snake.id);
	socket.emit('snakes', snakes);

	socket.on('direction', direction => {
		snake.blocks[0].direction = direction;
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
					x: lastBlock.x - 1,
					y: lastBlock.y,
					direction: 'up'
				}),
				'down': () => ({
					x: lastBlock.x + 1,
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

		if(snake.blocks.length >= 2) {
			(() => {
				for(let i = 0; i < snake.blocks.length - 3; i++) {
					const blocks = snake.blocks.slice(i, 2);
									console.log(blocks);

					if(blocks[0].direction !== blocks[1].direction) {
						blocks[0].direction = blocks[1].direction;

						return;
					}
				}
			})();
		}

		for(const block of snake.blocks) {
			({
				'up': () => {
					if(--block.x === 0)
						block.direction = 'down';
				},
				'down': () => {
					if(++block.x === canvasBox - 1)
						block.direction = 'up';
				},
				'left': () => {
					if(--block.y === 0)
						block.direction = 'right';
				},
				'right': () => {
					if(++block.y === canvasBox - 1)
						block.direction = 'left';
				}
			})[block.direction]();
		}
	}

	io.emit('snakes', snakes);
}, 1000 / fps);
