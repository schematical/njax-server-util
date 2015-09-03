var async = require('async');
var _ = require('underscore');

module.exports = function (app) {
	var SocketBuilder = {

		prepairModel: function (model) {

			for (var key in model.fields) {
				SocketBuilder.prepairModelField(key, model.fields[key], model)
			}

		},
		prepairModelField: function (key, fieldData, model) {


		},

		build: function (buildMaster) {
			console.log('SocketGen:', Object.keys(buildMaster.models));
			for (var i in buildMaster.models) {
				var model = buildMaster.models[i];

				SocketBuilder.prepairModel(model);

			}

			for (var i in buildMaster.models) {

				var model = buildMaster.models[i];

				var newSchema = SocketBuilder.buildModel(model);
				var upperName = app.njax.helpers.capitalizeFirstLetter(model.name);
				app.model[upperName] = app.mongoose.model(upperName, newSchema);

			}
		},
		buildModel: function (_model) {

			SocketBuilder.prepairModel(_model);

			var SocketRoute = {
				init:function(){
					//Listen for query

					//Listen for saves

					//Listen for archives
				}
			}

		}
	}
	return SocketBuilder;
}