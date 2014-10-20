var express = require('express');
var http = require('http');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var serveStatic = require('serve-static');
var bodyParser     = require('body-parser');
var morgan = require('morgan');

var cookieParser = require('cookie-parser');
var session = require('express-session');
var multipart = require('connect-multiparty');
var errorhandler = require('errorhandler');
var njax_static_serve = require('./modules/static_serve');

var config = {
    aws:{
        accessKeyId:'xx',
        secretAccessKey:'xxx',
        bucket_name:'byobob',
        associateId:'holiday_helper-20'
    },
    cookie:{
        secret:'ninja_face'
    },
    app_dir:path.join(__dirname, '..', '..'),
    mongo:'mongodb://localhost/njax',
    port:3000,
    domain:'localhost',
    protocol:'http',
    api:{

    }
}
module.exports = njax = njax_util = {
        app:function(options){
            njax.config = config = _.extend(config, options);
            if(!config.cookie.domain){
                config.cookie.domain = '.' + config.domain;
            }
            if(!njax.config.tmp_dir){
                njax.config.tmp_dir = njax.config.app_dir + '/_tmp';
            }
            if(!njax.config.cache_dir){
                njax.config.cache_dir = njax.config.app_dir + '/_cache';
            }
            var www_url = njax.config.domain;
            if(!njax.config.hide_port){
                www_url += ':' + njax.config.port;
            }
            njax.config.www_url = (njax.config.protocol || njax.config.api.protocol) + '://' + www_url;
            var api_url = njax.config.api.host;
            njax.config.api_url =  (njax.config.protocol || njax.config.api.protocol) + '://' + api_url;



            var app = express();
            app.njax = njax;
            app.njax.routes = {

            };//Specal extendable routes

            // all environments
            app.set('port', config.port || 3000);
            app.set('views', path.join(config.app_dir, 'public/templates'));
            app.set('view engine', 'hjs');

            app.use(cookieParser(app.njax.config.cookie.secret, app.njax.config.cookie))
            app.use(session({ secret: config.cookie.secret, cookie:  app.njax.config.cookie}))
            app.use(multipart());
            config.njax_util_dir = path.join(__dirname, '..');
            config.njax_util_tpl_dir = path.join(config.njax_util_dir, 'public', 'templates');
           /* app.locals.partials = {
                _header:config.njax_util_tpl_dir + '/_header',
                _footer:config.njax_util_tpl_dir + '/_footer'
            };*/
            app.use(bodyParser());

            if(app.get('env') == 'development'){
                //APP Specific assets
                app.all('/templates/*',function(req, res, next) {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    return next();
                });

				njax_static_serve(app);
				app.all('/js/*', njax.static_serve('js'));
				app.all('/img/*', njax.static_serve('img'));
				app.all('/css/*', njax.static_serve('css'));
				app.all('/css/*', njax.static_serve('css'));
				app.all('/fonts/*', njax.static_serve('fonts'));
				app.all('/templates/*', njax.static_serve('templates'));
				app.all('/bower_components/*', njax.static_serve('bower_components'));

                app.locals.asset_url = config.asset_url || './';
                app.use(morgan('dev'));
				//NJax Specific


                //NJax Specific
                app.all('/njax/*', function(req, res, next){
                    var asset_path = req.path.substr(5);
                    var real_asset_path = path.join(config.njax_dir, 'public',asset_path);
                    if(fs.existsSync(real_asset_path)){
                        return res.sendfile(real_asset_path);
                    }
                    return next();
                });
                app.locals.njax_asset_url = '/njax';
            }


            app.use(errorhandler());


            app.start = _.bind(njax_util._start(app), njax);



            require('./modules')(app);

            require('./routes')(app);


            return app;


        },
		static_serve:function(dir, render_func){
			if(_.isFunction(dir)){
				render_func = dir;
				dir = null;
			}
			if(render_func && !_.isFunction(render_func)){
				throw new Error("Invalid Render Function passed in");
			}
			return function(req, res, next){
				//TODO: Remove this hacky crap
				res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
				res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,access_token,client_id,client_secret');
				res.setHeader('Access-Control-Allow-Credentials', true);
				res.setHeader('Access-Control-Allow-Origin', '*');
				var asset_path = req.path;
				for(var i in njax.config.asset_dirs){
					var real_asset_path = path.join(njax.config.asset_dirs[i], asset_path);
					if(fs.existsSync(real_asset_path)){
						if(!render_func){
							return res.sendfile(real_asset_path);
						}
						return render_func(req, res, next, real_asset_path);
					}
				}
				return next();
			}
		},
        setup_partials:function(partial){

			for(var i in config.tpl_dirs){
				if(fs.existsSync(path.join(config.tpl_dirs[i], partial + '.hjs'))){
					//compile bootstrap
					partial = path.join(config.tpl_dirs[i], partial);
					return partial;
				}
			}

			throw new Error("Cannot find valid Partial: " + partial);

        },
        _start:function(app){
            return function(options, callback){
                if(!callback && _.isFunction(options)){
                    callback = options;
                }
				app.njax.addTemplateDir(path.join(app.njax.config.app_dir, 'public', 'templates'));
				app.njax.addAssetDir(path.join(app.njax.config.app_dir, 'public'));


                //app.njax.addTemplateDir(app.get('views'));

                app.njax.config.tpl_dirs = app.njax.config.tpl_dirs.reverse();
				console.log( app.njax.config.tpl_dirs );
				app.njax.config.asset_dirs = app.njax.config.asset_dirs.reverse();
				for(var i in app.locals.partials){
					app.locals.partials[i] = app.njax.setup_partials(app.locals.partials[i]);
				}

                app.use(app.njax.routes.error404);
                app.use(app.njax.routes.error500);

                var server = http.createServer(app);
                server.listen(app.get('port'), function(){
                    console.log('Express server listening on port ' + app.get('port'));
                    if(callback){
                        return callback(null, app, server);
                    }
                });
            }
        },
        cachedir:function(file_name /*, ext */){

            if(file_name.toString){
                file_name = file_name.toString();
            }

            return path.join(njax.config.cache_dir, file_name);
        },
        tmpdir:function(file_name /*, ext */){
            if(!file_name){
                var date = new Date();
                file_name = Math.round(Math.random() * 9999) + '-' + date.getTime();
            }
            if(file_name.toString){
                file_name = file_name.toString();
            }

            return path.join(njax.config.tmp_dir, file_name);
        },
        isTmpdir:function(file_name /*, ext */){
            if(!file_name){
                var date = new Date();
                file_name = Math.round(Math.random() * 9999) + '-' + date.getTime();
            }
            if(file_name.toString){
                file_name = file_name.toString();
            }

            return njax.config.tmp_dir == file_name.substr(0, njax.config.tmp_dir.length);
        },
        cpWorker:require('./modules/child_process/worker')
}


