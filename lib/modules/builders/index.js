var async = require('async');;
var _ = require('underscore');
module.exports = function(app){
 	var mongoose = require('./mongoose')(app);
	var route = require('./route')(app);
	var template = require('./template')(app);


	var buildMaster = {
		_camelcaseToSpaces: function (s) {
			return s.replace(/([A-Z])/g, ' $1').trim();
		},
		build: function () {
			buildMaster.models = app.njax.njax_config.models;

			for (var i in buildMaster.models) {
				var model = app.njax.njax_config.models[i];
				model.name = model.name || i;
				app.njax.builder.prepairModel(model);
			}
			mongoose.build(buildMaster);
			route.build(buildMaster);
			template.build(buildMaster);
		},
		prepairModelField: function (key, fieldData, model) {

			if(_.isString(fieldData) || _.isArray(fieldData)){
				fieldData = { type: fieldData };
			}
			if (!fieldData) {
				throw new Error("Field Data is null? Field Name:" + key) + "- Model Name:" + model.name;
			}
			if (!fieldData.type) {
				console.error(key, fieldData);
				throw new Error("Invalid Model > Field > Type in njax_config.js");
			}
			fieldData.name = fieldData.name || key;
			var capitalName = app.njax.helpers.capitalizeFirstLetter(fieldData.name);
			fieldData.displayName = buildMaster._camelcaseToSpaces(capitalName);
			/*fieldData.mongo_type = {}
			switch (fieldData.type.toLowerCase()) {

				case 's3-asset':
					model._files.push(key);
					fieldData.mongo_type.type = "String";
					break

				case 'ref':
					model._rels.push({
						name: key,
						ref: fieldData.ref,
						bootstrap_populate: fieldData.bootstrap_populate || ('req.' + fieldData.ref)
					});
					fieldData.mongo_type = "{ type: Schema.Types.ObjectId, ref: '" + this._.capitalize(fieldData.ref) + "' }"
					break
				case 'core-ref':
				case 'core_ref':
					fieldData.type = 'core_ref';
					model._rels.push({
						type: fieldData.type,
						name: key,
						ref: fieldData.ref,
						bootstrap_populate: fieldData.bootstrap_populate || ('req.' + fieldData.ref)
					});
					fieldData.mongo_type.type = "String";
					break
				case 'api-ref':
					fieldData.mongo_type.type = "String";
					break
				case 'objectid':
					fieldData.mongo_type.type = 'ObjectId'
					fieldData.mongo_type.ipsum = 'id';
					break;
				case 'date':
					fieldData.mongo_type.type = 'Date';
					fieldData.mongo_type.format = 'date-time';
					break;
				case 'array':
					if (fieldData.sub_type) {
						fieldData.mongo_type = '[' + fieldData.sub_type + ']';
					}
					break;
				case 'number':
					fieldData.mongo_type.type = "Number"
					break;
				case 'boolean':
					fieldData.mongo_type.type = "Boolean";
					break;
				case 'string':
				case 'email' :
				case 'namespace':
				case 'url':
				case 'md':
					fieldData.mongo_type = '{ type:String }';

					break;
				case 'buffer':
				case 'mixed':
					break;
				case 'object':
					fieldData.mongo_type.type = "Object";
					break;
				case 'tpcd':
					fieldData.mongo_type.type = "String";

					break;
				case 'latlng':
					fieldData.mongo_type = "{ type: [Number], index: '2d' }";

					break;

			}*/
			if (model._files.length > 0) {
				model.file_fields = model._files.join("','");
			}

			return fieldData;

		},
		prepairModel: function (model) {
			if (model._prerendered) {
				return model;
			}

			model.capitalName = app.njax.helpers.capitalizeFirstLetter(model.name);
			model.displayName = buildMaster._camelcaseToSpaces(model.capitalName);
			if (model.parent) {
				var parent_field = model.fields[model.parent];

				if (!parent_field) {
					console.log(Object.keys(model.fields));
					throw new Error("No parent field '" + model.parent + "' exists in model '" + model.name + "'");
				}
				if (!parent_field.ref) {
					throw new Error("Parent field must be a ref. Field: '" + model.parent + "' in model '" + model.name + "'");
				}
				if (parent_field.type != 'core_ref') {
					if (!buildMaster.models[parent_field.ref]) {

						throw new Error("Cannot find model : " + parent_field.ref);
					}

					if (!buildMaster.models[parent_field.ref]._prerendered) {

						buildMaster.prepairModel(buildMaster.models[model.parent]);
					}
					model.parent_model = buildMaster.models[parent_field.ref];
				} else {

					if (!(parent_field.route.length >= 0)) {//It just needs to exist
						throw new Error("Parent fields of type 'core_ref' need to have a 'route' property set : " + parent_field.ref);
					}
				}
				model.fields[model.parent].is_parent = true;
				model.parent_field = parent_field;

			}
			var uri = '';
			var schema_uri = '';
			var route = '';
			var hjs_uri = '';
			if (model.parent_field) {
				if (model.parent_field.type == 'core_ref') {
					route += parent_field.route + '/:' + parent_field.ref;
					hjs_uri += '{{ ' + parent_field.ref + '.uri }}';
				} else {
					route += buildMaster.models[parent_field.ref].route + '/:' + parent_field.ref;
					hjs_uri += '{{ ' + parent_field.ref + '.uri }}';
				}
			}
			if (typeof(model.uri_prefix) == 'undefined') {
				route += '/' + model.name + 's';
				hjs_uri += '/' + model.name + 's';
			} else {
				route += model.uri_prefix;
				hjs_uri += model.uri_prefix;
			}
			//uri += '/:' + model.name;
			model.uri = model.route = route;//SHITTY HACK
			model.hjs_uri = hjs_uri;
			model._files = [];
			model._rels = [];
			for (var key in model.fields) {
				model.fields[key] = app.njax.builder.prepairModelField(key, model.fields[key], model)
			}

			if (model.invitable) {
				if (!model.fields.email) {
					throw new Error("Field Needs an email to be marked as 'invitable'");
				}
			}

			model._prerendered = true;
		}
	}
	app.njax.builder = buildMaster;
	return buildMaster;


}