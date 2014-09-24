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
    domain:'localhost'
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
            if(!njax.config.core.api.host){
                njax.config.core.api.host = 'api.' + njax.config.core.host;
            }



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
                app.use(serveStatic(path.join(config.app_dir, 'public')));
                app.locals.asset_url = './';
                app.use(morgan('dev'));


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
        setup_partials:function(partial){
            if(fs.existsSync( partial + '.hjs')){
                return partial;
            }
            var active_app_path = path.join(config.app_dir, 'public', 'templates', partial)+ '.hjs';
            if(fs.existsSync(active_app_path)){
                return partial;
            }


            var njax_path = path.join(config.njax_tpl_dir, partial) + '.hjs';

            if(fs.existsSync(njax_path)){
                return njax_path;
            }
            /*  console.error("Missing Partial: " + partial + '.hjs');
             console.error("NJax Path:" + njax_path);
             console.error("Active App Path:" +  active_app_path)*/
            return partial;


        },
        _start:function(app){
            return function(options, callback){
                if(!callback && _.isFunction(options)){
                    callback = options;
                }
                for(var i in app.locals.partials){
                    app.locals.partials[i] = app.njax.setup_partials(app.locals.partials[i]);
                }
                app.njax.addTemplateDir(app.get('views'));
                app.njax.config.tpl_dirs = app.njax.config.tpl_dirs.reverse();
                console.log(app.njax.config.tpl_dirs);
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


