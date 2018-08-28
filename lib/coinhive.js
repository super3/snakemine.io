const querystring = require('querystring');
const rp = require('request-promise');

/* istanbul ignore next */
async function getBalance(pubKey) {
	console.log(process.env.COINHIVE_PRIVATE_KEY);

	const options = {
		method: 'GET',
		uri: 'https://api.coinhive.com/user/balance?' + querystring.stringify({
			secret: process.env.COINHIVE_PRIVATE_KEY,
			name: pubKey
		})
	};

	const response = await rp(options);
	return JSON.parse(response);
}

module.exports.getBalance = getBalance;

/* istanbul ignore next */
async function withdraw(pubKey, amount) {
	const body = {
		secret: process.env.COINHIVE_PRIVATE_KEY,
		name: pubKey,
		amount
	};

	console.log(body);

	const options = {
		method: 'POST',
		uri: 'https://api.coinhive.com/user/withdraw',
		form: body
	};

	const response = JSON.parse(await rp(options));

	if(response.success !== true) {
		throw new Error(response.error);
	}
}

module.exports.withdraw = withdraw;
