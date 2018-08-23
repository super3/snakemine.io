const io = require('socket.io')(3055);

const Snake = require('./lib/Snake');

const entities = new Set();
let id = 0;

io.on('connection', socket => {
	const snake = new Snake();

	entities.add(snake);

	socket.emit('snakeId', snake.id);
	socket.emit('entities', [ ...entities ]);

	socket.on('direction', direction => {
		snake.direction = direction;
	});

	socket.on('disconnect', () => {
		entities.delete(snake);
	});
});

const fps = 3.5;

setInterval(() => {
	const canvasBox = 25;

	for(const entity of entities) {
		if(entity instanceof Snake) {
			if(entity.counter++ % 5 === 0) {
				entity.appendBlock();
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

			if(x === 0 || x === canvasBox || y === 0 || y === canvasBox) {
				entities.delete(entity);
				entities.add(...entity.toFood());
			}
		}
	}

	io.emit('entities', [ ...entities ]);
}, 1000 / fps);
