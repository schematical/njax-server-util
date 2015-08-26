var async = require('async');
var _ = require('underscore');
var onHeaders = require('on-headers');
var debug = require('debug')('njax-util:session');


module.exports = function(app){
	//app.njax.mongo_session = function() {
		//Might need to hide this in a session


		var Schema = app.mongoose.Schema;


		var connection = app.mongoose.createConnection(
			app.njax.env_config.session_mongo || app.njax.env_config.mongo
		);
		var fields = {
			_id: {type: Schema.Types.ObjectId},
			session_data: {type: 'String'},
			key: {type: 'String'},
			creDate: Date
		};

		var sessionSchema = new Schema(fields);

		app.njax.Session = connection.model('Session', sessionSchema);
		/*
		 secret: app.njax.env_config.cookie.secret,
		 name:'njax.mongo.session',
		 cookie: {
		 expires:false,
		 domain:app.njax.env_config.cookie.domain,
		 },
		 */


		var _MongoSession = {
			Session: function (ctx, obj) {
				this._ctx = ctx;
				for (var i in obj) {
					this[i] = obj[i];
				}
			},
			default_cookie_name: 'njax.session'
		}
		_MongoSession.Session.prototype.destroy = function () {
			this._ctx.destroyNJaxSession();
		}
		_MongoSession.Session.prototype.toJSON = function () {
			var keys = Object.keys(this);
			var obj = {};
			for (var i in keys) {
				var key = keys[i];
				switch (key) {
					case('_ctx'):

						break;
					default:
						obj[key] = this[key];
				}
			}
			return JSON.stringify(obj);
		}


		//TODO: Set timeout

		return function (req, res, next) {
			if(
				req.method == 'OPTIONS' /*||
				req.accepts('image/png') ||
				req.accepts('png')*/
			){
				return next();
			}
			var cookie_name = app.njax.env_config.name || _MongoSession.default_cookie_name;
			//Grab cookie
			var cookie = req.cookies[cookie_name];

			var mongo_data = null;
			var mongo_doc = null;

			return async.series([
					function (cb) {

						if (!cookie) {
							return cb();
						}

						return app.njax.Session.findOne({
							key: cookie
						}).exec(function (err, session) {
							if (err) return next(err);
							if (session) {
								mongo_doc = session;
							}else{
								console.error("No session for: " + cookie);
							}
							return cb();

						});
					},
					function (cb) {
						if (mongo_doc) {
							var raw_data = null;
							try {
								 raw_data = JSON.parse(mongo_doc.session_data);

							} catch (e) {
								raw_data = {};
								//Eventually hide session data
								//return next(e);
							}
							mongo_data =  new _MongoSession.Session(req, raw_data);
							return cb();
						}

						console.log("Creating new Cookies: " + req.path + '   --  Cookie:' + cookie);
						mongo_doc = new app.njax.Session({
							_id: new app.mongoose.Types.ObjectId(),
							key: app.njax.helpers.uid(64),
							session_data: '{}',
							creDate: new Date()
						});
						mongo_data = new _MongoSession.Session(req, mongo_doc.session_data);
						return mongo_doc.save(function (err) {
							if (err) throw err;
							debug("Creating New Cookies - Path:", req.path);
							return cb();
						});


					},
					//Setup the basics
					function(cb){
						if (!cookie || cookie !=  mongo_doc.key) {
							debug("Setting Cookie");
							res.cookie(cookie_name, mongo_doc.key, app.njax.env_config.cookie);
						}
						req.destroyNJaxSession = function () {
							mongo_data = new _MongoSession.Session(req, {});
						}

						req.__defineGetter__('session', function () {
							if (mongo_data) {
								return mongo_data;
							}

							return null;
						});

						req.__defineSetter__('session', function (val) {
							if (null == val) {
								return req.destroyNJaxSession();
							}
							mongo_data = val;
						});

						onHeaders(res, function setHeaders() {
							if (mongo_data === undefined) {
								// not accessed
								return;
							}
							if (!mongo_data || !mongo_data.toJSON) {
								throw new Error("Invalid Mongo Data");
							}

							var new_session =  mongo_data.toJSON();
							if(mongo_doc.session_data != new_session) {
								mongo_doc.session_data = new_session;
								mongo_doc.save(function (err) {
									if (err) throw err;
									//Cant really do much
									debug("Session Saved");
								});

							}





						});
						return cb();
					}
				],
				function () {
					//end async
					return next();
				});




		}
	//}
}