var mongoose = require('mongoose');
var fs = require('fs');
var async = require('async');
var mkdirp = require('mkdirp');
var _ = require('underscore');

module.exports = function(app){
    app.mongoose = mongoose;
    app.mongoose.connect(app.njax.env_config.mongo);

    app.model = {}


}