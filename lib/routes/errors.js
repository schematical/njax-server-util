module.exports = function(app){
    app.njax.routes.error404 = function(req, res, next){
        console.log("404 Hit");
        res.send(404, 'Sorry cant find that!');
    }
}