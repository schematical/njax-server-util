
module.exports = function(app){
    app.njax.force_https = function(){
        return function(req, res, next){
            if(!req.njax){
                req.njax = {};
            }

            if(!app.njax.config.force_https || (req.njax.protocol == 'https')){
                return next();
            }

            var secure_url = 'https://' + req.njax.host;
            if(!app.njax.config.hide_port){
                secure_url += (':' + app.njax.config.port)
            }
            secure_url += req.originalUrl;
            return res.redirect(secure_url);
        }
    }
}