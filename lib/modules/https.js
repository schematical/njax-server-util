
module.exports = function(app){
    app.njax.force_https = function(){
        return function(req, res, next){
            var protocal = req.headers['x-forwarded-proto'] || req.protocol;
            if(!app.njax.config.force_https || (protocal == 'https')){
                return next();
            }
            var host = req.headers["x-forwarded-host"] || req.hostname;
            var secure_url = 'https://' + req.hostname;
            if(!app.njax.config.hide_port){
                secure_url += (':' + app.njax.config.port)
            }
            secure_url += req.originalUrl;
            return res.redirect(secure_url);
        }
    }
}