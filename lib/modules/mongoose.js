var mongoose = require('mongoose');

module.exports = function(app){
    app.mongoose = mongoose;
    app.mongoose.connect(app.njax.config.mongo);

    app.model = {}
}