module.exports = function(app){
    app.njax.routes.error404 = function(req, res, next){
        console.log("404 Hit");
        res.send(404, 'Sorry cant find that!');
    }
    app.njax.routes.error500 = function(err, req, res, next){
        console.error(err.stack);
        res.status(500)

        if(req.njax && req.njax.call_type == 'api'){
            return res.json({ error: err.message });
        }
        return next(err);//Send a regular error message for now
    }
}