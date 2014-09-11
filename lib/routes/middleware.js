var _ = require('underscore');
var path = require('path');
var fs = require('fs');
//var Hogan = require('hogan');

module.exports = function(app){

    function add_partial(key, location){
        res.locals.partials = _.extend(app.locals.partials, res.locals.partials);
        res.locals.partials[key] = location;
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
            if(!fs.existsSync(path.join(app.set('views'), tpl + '.hjs'))){
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
                    path:req.path
                }
        );

       return next();
    }



    app.add_partial = _.bind(middleware, app);






    return middleware;






}
