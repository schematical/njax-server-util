
module.exports = function(app){
 	app.all('/load_balencer_test',function(req, res, next){
		return res.send("Running Well");
 	})
}