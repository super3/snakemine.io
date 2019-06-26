| NOTE: The service we used for cryptocurrency mining (Coinhive) for this game shut down, so this no longer works. |
| --- |

# [snakemine.io](https://snakemine.io)
Snake with cryptocurrency mining.

## Requirements

* Node (tested on v10+)
* NPM
* Redis
* Nginx (production only)

```
git clone https://github.com/ovsoinc/snake.git
```

```
cd snake
```

```
npm install
```

```
nano .env
```

	COINHIVE_SITE_KEY=xxx
	COINHIVE_PRIVATE_KEY=xxx
	SERVER_PORT=3055
	BLOCK_HASHES=250

```
redis-cli set server-food 500
```

```
node server
```
