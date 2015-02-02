
var crypto = require('crypto');

module.exports = function(app){

	app.njax.crypto = {
		algorithm: 'aes-256-ctr',
		encrypt:function (data, key) {
			if (data === null)
				return null
			else if (typeof data === 'undefined')
				return undefined;
			else if (data === '')
				return '';

			var iv = crypto.randomBytes(16);

			var cipher = crypto.createCipher(app.njax.crypto.algorithm, key);//, iv);
			var encrypted = [cipher.update(data)];
			encrypted.push(cipher.final());

			return Buffer.concat([iv, Buffer.concat(encrypted)]).toString('base64');
		},

		decrypt:function (cipher, key) {
			if (cipher === null)
				return null
			else if (typeof cipher == 'undefined')
				return undefined;
			else if (cipher === '')
				return '';

			var cipher = new Buffer(cipher, 'base64');
			var iv = cipher.slice(0, 16);
			var ciphertext = cipher.slice(16);

			var decipher = crypto.createDecipher(app.njax.crypto.algorithm, key);//, iv);
			var decrypted = [decipher.update(ciphertext)];
			decrypted.push(decipher.final());

			return Buffer.concat(decrypted).toString('utf8');
		}


		/*encrypt: function (text, password) {
			var cipher = crypto.createCipher(app.njax.crypto.algorithm, password)
			var crypted = cipher.update(text, 'utf8', 'hex')
			crypted += cipher.final('hex');
			return crypted;
		},
		decrypt: function (text, password) {
			var decipher = crypto.createDecipher(app.njax.crypto.algorithm, password)
			var dec = decipher.update(text, 'hex', 'utf8')
			dec += decipher.final('utf8');
			return dec;
		}*/
	}

}

