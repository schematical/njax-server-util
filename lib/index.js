var express = require('express');
var http = require('http');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mkdirp = require('mkdirp');
var cookieParser = require('cookie-parser');
var multipart = require('connect-multiparty');
var errorhandler = require('errorhandler');
var njax_static_serve = require('./modules/static_serve');
//var njax_cookie_session = require('./modules/cookie_session');

var env_config = {
	aws: {
		accessKeyId: 'xx',
		secretAccessKey: 'xxx',
		bucket_name: 'byobob',
		associateId: 'holiday_helper-20'
	},
	cookie: {
		secret: 'ninja_face'
	},
	app_dir: path.join(__dirname, '..', '..'),
	mongo: 'mongodb://localhost/njax',
	port: 3000,
	domain: 'localhost',
	protocol: 'http',
	api: {}
}
module.exports = njax = njax_util = {
	app: function (njax_config, options) {
		njax.env_config = env_config = _.extend(env_config, options);
		if (!env_config.cookie.domain) {
			env_config.cookie.domain = '.' + env_config.domain;
		}
		if (!njax.env_config.tmp_dir) {
			njax.env_config.tmp_dir = njax.env_config.app_dir + '/_tmp';
		}
		if (!njax.env_config.cache_dir) {
			njax.env_config.cache_dir = njax.env_config.app_dir + '/_cache';
		}
		var www_url = njax.env_config.domain;
		if (!njax.env_config.hide_port) {
			www_url += ':' + njax.env_config.port;
		}
		njax.env_config.www_url = (njax.env_config.protocol || njax.env_config.api.protocol) + '://' + www_url;
		var api_url = njax.env_config.api.host;
		njax.env_config.api_url = (njax.env_config.protocol || njax.env_config.api.protocol) + '://' + api_url;


		var app = express();

		app.njax = njax;
		app.njax.express = express;
		app.njax.routes = {};//Specal extendable routes
		app.njax.njax_config = njax_config;


		// all environments
		app.set('port', env_config.port || 3000);
		app.set('views', path.join(env_config.app_dir, 'public/templates'));
		app.set('view engine', 'hjs');
		app.all('/load_balencer_test', function (req, res, next) {
			return res.send("Running Well");
		})

		env_config.njax_util_dir = path.join(__dirname, '..');
		env_config.njax_util_tpl_dir = path.join(env_config.njax_util_dir, 'public', 'templates');
		/* app.locals.partials = {
		 _header:env_config.njax_util_tpl_dir + '/_header',
		 _footer:env_config.njax_util_tpl_dir + '/_footer'
		 };*/

		njax_static_serve(app);
		if (app.get('env') == 'development') {
			//APP Specific assets
			app.all('/templates/*', function (req, res, next) {
				res.setHeader("Access-Control-Allow-Origin", "*");
				return next();
			});


			app.all('/js/*', njax.static_serve('js'));
			app.all('/img/*', njax.static_serve('img'));
			app.all('/css/*', njax.static_serve('css'));
			app.all('/css/*', njax.static_serve('css'));
			app.all('/fonts/*', njax.static_serve('fonts'));
			app.all('/templates/*', njax.static_serve('templates'));
			app.all('/bower_components/*', njax.static_serve('bower_components'));

			app.locals.asset_url = env_config.asset_url || './';
			app.use(morgan('dev'));
			//NJax Specific


			//NJax Specific
			app.all('/njax/*', function (req, res, next) {
				var asset_path = req.path.substr(5);
				var real_asset_path = path.join(env_config.njax_dir, 'public', asset_path);
				if (fs.existsSync(real_asset_path)) {
					return res.sendfile(real_asset_path);
				}
				return next();
			});
			app.locals.njax_asset_url = '/njax';
		}

		app.use(cookieParser(app.njax.env_config.cookie.secret, app.njax.env_config.cookie))

		app.use(multipart());
		app.use(bodyParser({limit: '50mb'}));
		app.use(errorhandler());


		app.start = _.bind(njax_util._start(app), njax);


		require('./modules')(app);
		app.njax.builder.build();


		require('./routes')(app);


		return app;


	},
	static_serve: function (dir, render_func) {
		if (_.isFunction(dir)) {
			render_func = dir;
			dir = null;
		}
		if (render_func && !_.isFunction(render_func)) {
			throw new Error("Invalid Render Function passed in");
		}
		return function (req, res, next) {
			//TODO: Remove this hacky crap
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,access_token,client_id,client_secret');
			res.setHeader('Access-Control-Allow-Credentials', true);
			res.setHeader('Access-Control-Allow-Origin', req.get('Origin'));//'*');
			var asset_path = req.path;
			for (var i in njax.env_config.asset_dirs) {
				var real_asset_path = path.join(njax.env_config.asset_dirs[i], asset_path);
				if (fs.existsSync(real_asset_path)) {
					if (!render_func) {
						return res.sendfile(real_asset_path);
					}
					return render_func(req, res, next, real_asset_path);
				}
			}
			return next();
		}
	},
	setup_partials: function (partial) {

		for (var i in env_config.tpl_dirs) {
			if (fs.existsSync(path.join(env_config.tpl_dirs[i], partial + '.hjs'))) {
				//compile bootstrap
				partial = path.join(env_config.tpl_dirs[i], partial);
				return partial;
			}
		}


		throw new Error("Cannot find valid Partial: " + partial);

	},
	_start: function (app) {
		return function (options, callback) {
			if (!callback && _.isFunction(options)) {
				callback = options;
			}
			app.njax.addTemplateDir(path.join(app.njax.env_config.app_dir, 'public', 'templates'));
			app.njax.addAssetDir(path.join(app.njax.env_config.app_dir, 'public'));


			//app.njax.addTemplateDir(app.get('views'));

			app.njax.env_config.tpl_dirs = app.njax.env_config.tpl_dirs.reverse();
			//console.log( app.njax.env_config.tpl_dirs );
			app.njax.env_config.asset_dirs = app.njax.env_config.asset_dirs.reverse();
			for (var i in app.locals.partials) {
				app.locals.partials[i] = app.njax.setup_partials(app.locals.partials[i]);
			}

			app.use(app.njax.routes.error404);
			app.use(app.njax.routes.error500);

			var server = http.createServer(app);
			server.listen(app.get('port'), function () {
				console.log('Express server listening on port ' + app.get('port'));
				if (callback) {
					return callback(null, app, server);
				}
			});
		}
	},
	cachedir: function (file_name /*, ext */) {
		if (!file_name) {
			file_name = 'x';
		} else {
			if (file_name.toString) {
				file_name = file_name.toString();
			}
		}

		return path.join(njax.env_config.cache_dir, file_name);
	},
	tmpdir: function (file_name /*, ext */) {
		if (!file_name) {
			var date = new Date();
			file_name = Math.round(Math.random() * 9999) + '-' + date.getTime();
		}
		if (file_name.toString) {
			file_name = file_name.toString();
		}

		return path.join(njax.env_config.tmp_dir, file_name);
	},
	isTmpdir: function (file_name /*, ext */) {
		if (!file_name) {
			var date = new Date();
			file_name = Math.round(Math.random() * 9999) + '-' + date.getTime();
		}
		if (file_name.toString) {
			file_name = file_name.toString();
		}

		return njax.env_config.tmp_dir == file_name.substr(0, njax.env_config.tmp_dir.length);
	},
	cpWorker: require('./modules/child_process/worker')
}


