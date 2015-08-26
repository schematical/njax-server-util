var mongoose = require('mongoose');

module.exports = function(app){
    app.mongoose = mongoose;
    app.mongoose.connect(app.njax.env_config.mongo);

    app.model = {}
	//!!!HERE WILL GO THE MONGO BUILDER TOOL
}