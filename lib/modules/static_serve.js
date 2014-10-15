var fs = require('fs');

module.exports = function(app){
	app.njax.addAssetDir = function(dir){
		if(!fs.existsSync(dir)){
			throw new Error("Directory does not exist:" + dir);
		}
		if(!app.njax.config.asset_dirs){
			app.njax.config.asset_dirs = [];
		}
		app.njax.config.asset_dirs.push(dir);
	}
}
