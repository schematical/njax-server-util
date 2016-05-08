module.exports = function(app){
    app.njax.routes.error404 = function(req, res, next){
        console.log(req.path + " - 404 Hit");
        res.status(404).send( 'Sorry cant find that!');
    }
    app.njax.routes.error500 = function(err, req, res, next){
        console.error(err.stack);
		console.error(err.message);
		if(err.message == 404){
			return  app.njax.routes.error404(req, res, next);
		}
        res.status(500)

        if(req.njax && req.njax.call_type == 'api'){
            return res.json({ error: err.message });
        }
        return next(err);//Send a regular error message for now
    }
}