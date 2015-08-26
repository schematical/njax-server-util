
module.exports = function(app){
    app.njax.force_https = function(){
        return function(req, res, next){
            if(!req.njax){
                req.njax = {};
            }

            if(!app.njax.env_config.force_https || (req.njax.protocol == 'https')){
                return next();
            }

            var secure_url = 'https://' + req.njax.host;
            if(!app.njax.env_config.hide_port){
                secure_url += (':' + app.njax.env_config.port)
            }
            secure_url += req.originalUrl;
            return res.redirect(secure_url);
        }
    }
}