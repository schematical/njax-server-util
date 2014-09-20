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

        if(host.substr(0, 4) == 'api.'){
            return true;
        }
        if(_.contains(req.subdomains,'api')){
            return true;
        }

        return false;
    }
    function middleware(req, res, next){


        //Get out of options
        req.njax = {};


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
            //compile bootstrap
            if(!fs.existsSync(path.join(app.get('views'), tpl + '.hjs'))){
                tpl = path.join(app.njax.config.njax_tpl_dir, tpl);
            }
            res._render(tpl, data);
        }

        req.flash = function(err, err2){
            res.locals.error = err;
            console.error(err2);
        }
        res._bootstrap = {};

        res.bootstrap = function(key, entity, _private){

            if(_.isNull(entity)){
                return;
            }
            req[key] = entity;

            if(_.isArray(entity)){
                var data = [];
                for(var i in entity){
                    if(entity[i].toObject){
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
        var host = req.get('x-forwarded-host') ||   ((req.hostname || req.host)   + ':' + app.njax.config.port);


        var www_url = app.njax.config.domain + ':' + app.njax.config.port;

        //TODO Check config instead of auto populating
        var api_url = 'api.' + (www_url);
        res.bootstrap('api_url', api_url);
        res.bootstrap('www_url', www_url);
        res.bootstrap('core_api_url',  app.njax.config.core.api.protocol + '://' + app.njax.config.core.api.host);
        res.bootstrap('core_www_url',  '//' + app.njax.config.core.host);
        res.bootstrap('client_id',  app.njax.config.client_id);


        function add_partial(key, location){
            res.locals.partials = _.extend(app.locals.partials, res.locals.partials);
            res.locals.partials[key] = location;
        }
        req.add_partial = _.bind(add_partial, req);
        return next();
    }


    app.add_partial = _.bind(add_partial, app);


    app.use(_.bind(middleware, app));


    /*
     REQUEST CACHE MIddleware
     */
    app.use(function(req, res, next){
        console.log("Cache?");
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
