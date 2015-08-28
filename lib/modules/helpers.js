
module.exports = function(app){
	app.njax.helpers = {
		regex:{
			escape:function(str){
				return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
			},
			isHexKey:function(str){
				var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
				return checkForHexRegExp.test(str);
			},
			validateEmail:function(email){
				//Old one. It does not like '+' plus symbols
				//var emailRe = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*(\+[a-z0-9-]+)?@[a-z0-9-]+(\.[a-z0-9-]+)*$/i;
				//New one, should allow plus symbols
				var emailRe = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
				return emailRe.test(email)
			}
		},
		capitalizeFirstLetter: function (string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
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
			if(!namespace){
				return null;
			}
			namespace = namespace.toLowerCase();
			namespace = namespace.replace(/[^\w\s]/gi, '');
			namespace = namespace.replace(/ /g,"-");
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