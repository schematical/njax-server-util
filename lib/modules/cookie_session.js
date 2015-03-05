var onHeaders = require('on-headers')


var _CookieSession = {
	Session:function(ctx, obj){
		this._ctx = ctx;
		for (var i in obj){
			this[i] = obj[i];
		}
	},
	default_cookie_name:'njax.session'
}
_CookieSession.Session.prototype.destroy = function(){
	this._ctx.destroyNJaxSession();
}
_CookieSession.Session.prototype.toJSON = function(){
	var keys =  Object.keys(this);
	var obj = {};
	for(var i in keys){
		var key = keys[i];
		switch(key){
			case('_ctx'):

			break;
			default:
				obj[key] = this[key];
		}
	}
	return JSON.stringify(obj);
}
module.exports = function(app, config){
	return function(req, res, next) {
		var cookie_name = config.name ||_CookieSession.default_cookie_name;
		//Grab cookie
		var cookie = req.cookies[cookie_name];


		var cookie_data = null;
		req.destroyNJaxSession = function(){
			cookie_data = new _CookieSession.Session(req, {});
		}
		req.__defineGetter__('session', function () {
			if(!cookie_data) {
				if (!cookie) {
					cookie_data =new _CookieSession.Session( {
						_created: new Date()
					});

					//If not cookie set one and move on

				} else {

					//Decode the cookie
					var cookie_json = app.njax.crypto.decrypt(
						cookie,
						app.njax.config.cookie.secret
					);
					try {
						cookie_data = new _CookieSession.Session(req, JSON.parse(cookie_json));
					} catch (e) {
						console.error("Cookie Failed to parse:", cookie_json);
						cookie_data =  new _CookieSession.Session(req, {});
					}
				}
			}

			return cookie_data;
		});

		req.__defineSetter__('session', function (val) {
			if (null == val) {
				return req.destroyNJaxSession();
			}
			cookie_data = val;
		});

		onHeaders(res, function setHeaders() {
			if (cookie_data === undefined) {
				// not accessed
				return;
			}
			if(!cookie_data || !cookie_data.toJSON){
				console.error("Invalid Cookie Data");
				console.error(cookie_data);
				cookie_data =  new _CookieSession.Session(req, {});
			}

			var new_cookie = cookie_data.toJSON();
			var cookie_str = app.njax.crypto.encrypt(
				new_cookie,
				app.njax.config.cookie.secret
			);

			var cookie_length =  Buffer.byteLength(cookie_str, 'utf8');
			if(cookie_length >= 4096){
				//Cookie size is too large
				console.error('Cookie size is too large - ' + ((req.user && req.user.email) || ' No user'))
				return //Dont save the cookie
			}

			res.cookie(cookie_name, cookie_str, app.njax.config.cookie);


		});

		//Add a session object

		return next();
	}
}