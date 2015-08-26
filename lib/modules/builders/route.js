
module.exports = function(app){
	var RouteBuilder = {
		build:function(buildMaster){
			/*for (var i in buildMaster.models) {
				var model = buildMaster.models[i];
			 	RouteBuilder.prepairModel(model);
			}*/

			for (var i in buildMaster.models) {
				var model = buildMaster.models[i];
				RouteBuilder.buildModel(model);
			}
		},
		buildModel:function(model){

		}
	}
	return RouteBuilder;
}