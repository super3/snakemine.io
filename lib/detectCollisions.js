module.exports = entities => {
	const map = {};

	const collisions = [];

	for(const entity of entities) {
		if(entity.type === 'food') {
			const key = `${entity.x}-${entity.y}`;

			if(key in map) {
				collisions.push([ map[key], entity ]);
			}

			map[key] = entity;
		}

		if(entity.type === 'snake') {
			for(const block of entity.blocks) {
				const key = `${block.x}-${block.y}`;

				if(key in map) {
					collisions.push([ map[key], entity ]);
				}

				map[key] = entity;
			}
		}
	}

	return collisions;
};
