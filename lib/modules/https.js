
module.exports = function(app){
    app.njax.force_https = function(){
        return function(req, res, next){
            if(!req.njax){
                req.njax = {};
            }
            req.njax.protocal = req.headers['x-forwarded-proto'] || req.protocol;
            req.njax.host = req.headers["x-forwarded-host"] || req.hostname;
            if(!app.njax.config.force_https || (req.njax.protocal == 'https')){
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