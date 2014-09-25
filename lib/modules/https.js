
module.exports = function(app){
    app.njax.force_https = function(){
        return function(req, res, next){
            var protocal = req.headers['x-forwarded-proto'] || req.protocol;
            if(!app.njax.config.force_https || (protocal == 'https')){
                return next();
            }
            var secure_url = 'https://' + req.hostname + (!app.njax.config.hide_port && (':' + app.njax.config.port)) + req.originalUrl;
            return res.redirect(secure_url);
        }
    }
}