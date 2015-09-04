var async = require('async');
var _ = require('underscore');
var lodash = require('lodash');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');



module.exports = function (app) {
	var TemplateBuilder = {
		_cached_tpls:{},
		prepairModel: function (model) {

			for (var key in model.fields) {
				TemplateBuilder.prepairModelField(key, model.fields[key], model)
			}

		},
		prepairModelField: function (key, fieldData, model) {


		},

		build: function (buildMaster) {
			console.log('TemplateGen:', Object.keys(buildMaster.models));
			for (var i in buildMaster.models) {
				var model = buildMaster.models[i];

				TemplateBuilder.prepairModel(model);

			}

			for (var i in buildMaster.models) {

				var model = buildMaster.models[i];

				var newSchema = TemplateBuilder.buildModel(model);
				var upperName = app.njax.helpers.capitalizeFirstLetter(model.name);
				app.model[upperName] = app.mongoose.model(upperName, newSchema);

			}
		},
		buildModel: function (_model) {

			var data = {
				_model: _model
			}

			//Generate that stuff
			var tpl_dir_root = path.join(app.njax.env_config.app_dir, 'public/templates/model');
			this.templateIfNew(app.njax.env_config.njax_util_dir + '/public/gen/model/detail.hjs', tpl_dir_root +  '/' + _model.name + '/detail.hjs', data);
			this.templateIfNew(app.njax.env_config.njax_util_dir + '/public/gen/model/edit.hjs', tpl_dir_root +  '/' + _model.name + '/edit.hjs', data);
			this.templateIfNew(app.njax.env_config.njax_util_dir + '/public/gen/model/list.hjs', tpl_dir_root + '/' + _model.name + '/list.hjs', data);
			this.templateIfNew(app.njax.env_config.njax_util_dir + '/public/gen/model/_edit.html', tpl_dir_root +'/' + _model.name + '/_edit.html', data);
			this.templateIfNew(app.njax.env_config.njax_util_dir + '/public/gen/model/_list_single.hjs', tpl_dir_root +'/' + _model.name + '/_list_single.hjs', data);

		},
		templateIfNew:function(tpl_source, dest, data){
			if(fs.existsSync(dest)){
				return true;
			}
			if(!TemplateBuilder._cached_tpls[tpl_source]){
				//first read tpl_source
				if(!fs.existsSync(tpl_source)){
					throw Error("Cannot find template resource: " + tpl_source);
				}
				var tpl = fs.readFileSync(tpl_source);
				TemplateBuilder._cached_tpls[tpl_source] = lodash.template(tpl);
			}
			var rendered = TemplateBuilder._cached_tpls[tpl_source](data);
			var file_dir = path.dirname(dest);
			if(!fs.exists(file_dir)){
				mkdirp.sync(file_dir);
			}
			return fs.writeFileSync(dest, rendered);
		}
	}
	return TemplateBuilder;
}