var _ = require('underscore');
var path = require('path');
var fs = require('fs');
//var Hogan = require('hogan');

module.exports = function(app){

    function add_partial(key, location){
        res.locals.partials = _.extend(app.locals.partials, res.locals.partials);
        res.locals.partials[key] = location;
    }
    /**
     * This can be extended(Not Asyncrinious)
     */
    function is_api_call(req){
        var host = req.get('x-forwarded-host') ||  (req.hostname || req.host);

        if(host == app.njax.config.core.api.host  || (app.njax.config.api && (host == app.njax.config.api.host))){
            return true;
        }
        if(_.contains(req.subdomains,'api')){
            return true;
        }

        return false;
    }
    function middleware(req, res, next){


        //Get out of options
        if(!req.njax){
            req.njax = {};
        }

        req.njax.protocol = req.headers['x-forwarded-proto'] || req.protocol;
        req.njax.host = req.headers["x-forwarded-host"] || req.hostname;

        req.add_partial = _.bind(add_partial, req);
        res._render = _.bind(res.render, res);
        res.render = function(tpl, data){
            //TODO: Check call type
            if(req.njax.call_type == 'www'){

                res.locals._njax_bootstrap = JSON.stringify(res._bootstrap);
            }else if(req.njax.call_type == 'api'){
                if(!_.isString(tpl)){
                    data = tpl;
                }
                return res.json(data);
            }else{
                return next(new Error("Unrecognized call type"));
            }

            for(var i in app.njax.config.tpl_dirs){
                if(fs.existsSync(path.join(app.njax.config.tpl_dirs[i], tpl + '.hjs'))){
                    //compile bootstrap
                     tpl = path.join(app.njax.config.tpl_dirs[i], tpl);
                    return res._render(tpl, data);
                }
            }
            throw new Error("Cannot find template for '" + tpl + "'");
        }

        req.flash = function(err, err2){
            res.locals.error = err;
            console.error(err2);
        }
        res._bootstrap = {};
		res._bootstrap.cookie = _.clone(app.njax.config.cookie);
		if(res._bootstrap.cookie.secret){
			delete(res._bootstrap.cookie.secret);
		}
        res.bootstrap = function(key, entity, _private){

            if(_.isNull(entity)){
                return;
            }
            req[key] = entity;

            if(_.isArray(entity)){
                var data = [];
                for(var i in entity){
                    if(entity[i] && entity[i].toObject){
                        data.push(entity[i].toObject());
                    }else{
                        data.push(entity[i]);
                    }
                }
            }else if(entity && entity.toObject){
               var data = entity.toObject();
            }else{
               var data = entity;
            }
            res.locals[key] = data;
            if(!_private){
                res._bootstrap[key] = data;
            }
        }
        res.bootstrap(
            'req',
                {
                    host:req.host,
                    path:req.path,
                    domain:app.njax.config.domain
                }
        );
        //First determine calltype
        req.njax.call_type = is_api_call(req) ? 'api' : 'www';
        var host = req.get('x-forwarded-host') ||   ((req.hostname || req.host)  + ':' + app.njax.config.port);


        var www_url = app.njax.config.domain;
        if(!app.njax.config.hide_port){
            www_url += ':' + app.njax.config.port;
        }

        //TODO Check config instead of auto populating


        res.bootstrap('core_api_url',  app.njax.config.core.api.protocol + '://' + app.njax.config.core.api.host);
        res.bootstrap('core_www_url',  app.njax.config.core.api.protocol + '://' + app.njax.config.core.host);
		res.bootstrap('api_url', app.njax.config.api_url );
		res.bootstrap('www_url', app.njax.config.www_url);
        res.bootstrap('client_id',  app.njax.config.client_id);
	

        function add_partial(key, location){
            res.locals.partials = _.extend(app.locals.partials, res.locals.partials);
            res.locals.partials[key] = location;
        }
		res.allowAll = _.bind(function(){
			/*
			TODO Create a better way to cross domain validate
			 */
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,access_token,client_id,client_secret');
			res.setHeader('Access-Control-Allow-Credentials', true);
			res.setHeader('Access-Control-Allow-Origin', '*');
		}, res);
        req.add_partial = _.bind(add_partial, req);
        return next();
    }


    app.add_partial = _.bind(add_partial, app);


    app.use(_.bind(middleware, app));


    /*
     REQUEST CACHE MIddleware
     */
	//TODO: Do not automatically put this here. Make it an middle ware that needs to be placed later. Prob in the actual app(not njax or njax-app)
    app.use(function(req, res, next){
		if(req.method == 'OPTIONS') return next();
        req.cache = function(namespace, data){
            if(!req.session._cache){
                req.session._cache = {};
            }
            req.session._cache[namespace] = data;
            if(_.isObject(data)){
                req.session._cache[namespace]._type = namespace.charAt(0).toUpperCase() + namespace.substring(1).toLowerCase();
            }
        }
        if(!req.session._cache){
            return next();
        }
        for(var namespace in req.session._cache){
            if(req.session._cache[namespace] && req.session._cache[namespace]._type){
                var data = _.clone(req.session._cache[namespace]);
                if(app.model[req.session._cache[namespace]._type]){
                    data.reload = function(callback){
                        app.model[req.session._cache[namespace]._type].find({ _id: data._id }).exec(callback);
                    }
                }else if(app.sdk[req.session._cache[namespace]._type]){
                    data = new app.sdk[req.session._cache[namespace]._type](data);
                }
                res.bootstrap(namespace, data);
            }
        }
        return next();
    });

    return middleware;






}
