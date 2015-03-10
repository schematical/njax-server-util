
module.exports = function(app){
	app.njax.helpers = {
		regex:{
			escape:function(str){
				return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
			},
			isHexKey:function(str){
				var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
				return checkForHexRegExp.test(str);
			}
		},
		uid:function(len) {
			var buf = []
				, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
				, charlen = chars.length;

			for (var i = 0; i < len; ++i) {
				buf.push(chars[app.njax.helpers.getRandomInt(0, charlen - 1)]);
			}

			return buf.join('');
		},
		toNamespace:function(str){
			var namespace = str;
			namespace = namespace.toLowerCase();
			namespace = namespace.replace(/[^\w\s]/gi, '');
			namespace = namespace.replace(/ /g,"_");
			return namespace;
		},

		/**
		 * Return a random int, used by `utils.uid()`
		 *
		 * @param {Number} min
		 * @param {Number} max
		 * @return {Number}
		 * @api private
		 */

		getRandomInt:function(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		},
	}
}