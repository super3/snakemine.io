const io = require('socket.io')(3055);

const Snake = require('./lib/Snake');
const detectCollisions = require('./lib/detectCollisions');

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
	const canvasBox = 24;

	for(const entity of entities) {
		if(entity.type === 'snake') {
			if(++entity.counter % 5 === 0) {
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

			if(x === 0 || x >= canvasBox || y === 0 || y >= canvasBox) {
				entities.delete(entity);
				entities.add(...entity.toFood());
			}
		}
	}

	for(const [ a, b ] of detectCollisions(entities)) {
		if(!(entities.has(a) && entities.has(b))) {
			// entities may have been deleted
			return;
		}

		if(a.type === 'food' && b.type === 'food') {
			return;
		}

		if(a.type === 'snake' && b.type === 'snake') {
			if(a === b) {
				// snake crossing itself
				return;
			}

			if(a.blocks.length === b.blocks.length) {
				// snakes of equal length
				return;
			}

			if(a.blocks.length > b.blocks.length) {
				// snake a is bigger
				entities.delete(b);
				entities.add(...b.toFood());
			}

			if(a.blocks.length < b.blocks.length) {
				// snake b is bigger
				entites.delete(a);
				entites.add(...a.toFood());
			}
		}
	}

	io.emit('entities', [ ...entities ]);
}, 1000 / fps);
