var async = require('async');
var _ = require('underscore');
module.exports = function (app) {
	var MongooseBuilder = {

		prepairModel: function (model) {

			for (var key in model.fields) {
				 MongooseBuilder.prepairModelField(key, model.fields[key], model)
			}
		},
		prepairModelField: function (key, fieldData, model) {

			var Schema = app.mongoose.Schema;
			if(!fieldData){
				console.error(model.name, key, fieldData, model);
				throw new Error("Cannot have undefined field: " + key);
			}
			fieldData.mongo_type = {}
			if(!_.isString(fieldData.type)){
				return //TODO: Remove this awful hack
			}
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
					fieldData.mongo_type = {type: Schema.Types.ObjectId, ref: app.njax.helpers.capitalizeFirstLetter(fieldData.ref)}
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
					fieldData.mongo_type = {type: String};

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
					fieldData.mongo_type = {type: [Number], index: '2d'};

					break;

			}
		},

		build: function (buildMaster) {
			console.log('MongoGen:', Object.keys(buildMaster.models));
			for (var i in buildMaster.models) {
				var model = buildMaster.models[i];

				MongooseBuilder.prepairModel(model);

			}

			for (var i in buildMaster.models) {

				var model = buildMaster.models[i];

				var newSchema = MongooseBuilder.buildModel(model);
				var upperName = app.njax.helpers.capitalizeFirstLetter(model.name);
				app.model[upperName] = app.mongoose.model(upperName, newSchema);

			}
		},
		buildModel: function (_model) {

			MongooseBuilder.prepairModel(_model)

			var Schema = app.mongoose.Schema;

			var fields = {};
			for (var key in _model.fields) {
				if(_model.fields[key].type == 'md'){
					fields[key + '_raw'] = String;
					fields[key + '_rendered'] = String;
				}else{
					fields[key] = _model.fields[key].mongo_type;
				}
			}



			if(_model.parent_field){
				fields['_parent_uri'] = { type:"string" };
			 }

			var newSchema = new Schema(fields);
			newSchema.virtual('_njax_type').get(function () {
				return _model.name;
			});
			if(_model.parent) {
				newSchema.virtual('uri').get(function () {


					if (!this[_model.parent]) {
						var parent_uri = null;
					} else {
						var parent_uri = (this[_model.parent].uri || (this._parent_uri));
					}
					return parent_uri +/* '/' +*/ _model.uri_prefix + '/' + this._id;


				});
			}else{
				newSchema.virtual('uri').get(function () {
					return /*'/' +*/ _model.uri_prefix + '/' + this._id;
				});
			}


			for (var name in _model.fields) {
				var field = _model.fields[name];
				if (_model.fields[name].type == 'md') {
					newSchema.virtual(field.name).get(function () {
						return this[field.name + '_raw'];
					}).set(function (value) {
						if (!value || value.length == 0) {
							return false;
						}
						var markdown = require('markdown').markdown;
						this[field.name + '_raw'] = value;
						this[field.name + '_renedered'] = markdown.toHTML(value);
					});
				}

				if (_model.fields[name].type == 'tpcd') {
					newSchema.virtual(field.name + '_tpcds').get(function () {
						var tpcds = {};

						for (var value in _model.fields[name].options) {
							tpcds[value] = _model.fields[name].options[value];
						}
					});

					newSchema.path(field.name).validate(function (value) {
						for (var i in _model.fields[name].options) {
							if (i == value) {
								return true;
							}
						}
					}, 'Invalid ' + field.name);

					for (var value in _model.fields[name].options) {
						newSchema.virtual('is_' + value).get(function () {
							return (this[field.name] == '<%= value %>');
						});
					}
				}

				if (_model.fields[name].type == 's3-asset') {
					newSchema.virtual(field.name + '_s3').get(function () {
						var path = require('path');

						var AWS = require('aws-sdk');
						AWS.env_config.update(app.njax.env_config.aws);
						var s3 = new AWS.S3();
						var _this = this;
						if (!app.njax.env_config.local_file_cache) {
							var url = '//s3.amazonaws.com/' + app.njax.env_config.aws.bucket_name + '/' + this[field.name];
						} else {
							var url = app.njax.env_config.www_url + '/cache/' + this[field.name];
						}

						return {
							url: url,
							getFile: function (local_file_path, callback) {
								if (!callback && _.isFunction(local_file_path)) {
									callback = local_file_path;
									local_file_path = _this[field.name];
									/*
									 if(!local_file_path || (!app.njax.isTmpdir(local_file_path)){
									 }
									 local_file_path = app.njax.tmpdir(local_file_path);
									 }
									 */
								}

								if (!_this[name] || _this[name].length == 0) {
									return callback(null, null, null);
								}
								var dir_name = path.dirname(local_file_path);
								if (!fs.existsSync(dir_name)) {
									mkdirp.sync(dir_name);
								}
								if (app.njax.env_config.local_file_cache) {


									var cache_path = app.njax.cachedir(_this[name]);
									var content = null;
									if (!fs.existsSync(cache_path)) {
										return callback(null, null, null);
									}
									content = fs.readFileSync(
										cache_path
									);
									if (local_file_path != cache_path) {
										fs.writeFileSync(
											local_file_path,
											content
										);
									}
									return callback(null, content, local_file_path);
								}

								async.series([
									function (cb) {
										mkdirp(path.dirname(local_file_path), function (err) {
											if (err) return callback(err);
											return cb();
										});
									},
									function (cb) {
										var stream = require('fs').createWriteStream(local_file_path);
										var params = {
											Bucket: app.njax.env_config.aws.bucket_name,
											Key: _this[name]
										}
										var body = '';
										s3.getObject(params).
											on('error', function (err, response) {
												if (err) return callback(err, response);
											}).
											on('httpData', function (chunk) {
												stream.write(chunk);
												body += chunk;
											}).
											on('httpDone', function () {
												stream.end(null, null, function () {
													callback(null, body, local_file_path);
												});

											}).
											send();
									}
								]);
							},
							setFile: function (file_path, callback) {
								var content = fs.readFileSync(file_path);
								async.series([
									function (cb) {
										var params = {
											Bucket: app.njax.env_config.aws.bucket_name,
											Key: file_path,
											Body: content,
											ACL: 'public-read',
											ContentLength: content.length
										};
										s3.putObject(params, function (err, aws_ref) {
											if (err) {
												return callback(err);
											}
											_this[name] = file_path;
											return cb(null);
										});
									},
									function (cb) {
										_this.save(function (err) {
											if (err) return callback(err);
											return cb();
										});
									},
									function (cb) {
										return callback();
									}
								]);
							}
						}
					});
				}
			}


			newSchema.virtual('archive').get(function () {
				return function (callback) {
					this.status = 'archived';
					this.archiveDate = new Date();
					this.save(callback);
				}
			});
			newSchema.virtual('is_archived').get(function () {
				if (!this.archiveDate) {
					return false;
				}
				if (!this.archiveDate > new Date()) {
					return false;
				}
				return true;
			});


			newSchema.pre('save', function (next) {
				if (!this._id) {
					this._id = new app.mongoose.Types.ObjectId();
					this.creDate = new Date();
				}

				if (!this._parent_uri) {
					/*if (this.target) {
						var _this = this;
						if(model.parent){

						 return app.model.Target.findOne({_id: this.target}).exec(function (err, target) {
						 if (err) return next(err);
						 if (!target) {
						 return next(new Error("No target found when trying to populate _parent_uri. Either find it or manually populate the _parent_uri."));
						 }
						 _this._parent_uri = target.uri;
						 return next();
						 });

					}


					return next(new Error("Missing Parent Field: target!"));*/

				}


				return next();

			});

			newSchema.virtual('events').get(function () {
				return function (callback) {
					return app.njax.events.query(this, callback);
				}
			});


			newSchema.virtual('tags').get(function () {
				return function (callback) {
					return app.njax.tags.query(this, callback);
				}
			});
			newSchema.virtual('addTag').get(function () {
				return function (tag_data, callback) {
					return app.njax.tags.add(tag_data, this, callback);
				}
			});


			newSchema.virtual('url').get(function () {
				var port_str = '';
				if (!app.njax.env_config.hide_port) {
					port_str = ':' + app.njax.env_config.port;
				}
				return app.njax.env_config.domain + port_str + this.uri;
			});

			newSchema.virtual('api_url').get(function () {
				var port_str = '';
				if (!app.njax.env_config.hide_port) {
					port_str = ':' + app.njax.env_config.port;
				}

				return app.njax.env_config.core.api.host + this.uri;

			});


			if (!newSchema.options.toObject) newSchema.options.toObject = {};
			newSchema.options.toObject.transform = function (doc, ret, options) {
				ret.uri = doc.uri;

				ret.url = doc.url;
				ret.api_url = doc.api_url;
				ret._njax_type = doc._njax_type;


				ret.ping_date = doc.ping_date;
				if (doc.ping_date) {
					ret.ping_date_iso = doc.ping_date.toISOString();
				}


				ret.receiver_coords_lat = doc.receiver_coords && doc.receiver_coords[0];
				ret.receiver_coords_lng = doc.receiver_coords && doc.receiver_coords[1];


				ret.receiver_location_measure_date = doc.receiver_location_measure_date;
				if (doc.receiver_location_measure_date) {
					ret.receiver_location_measure_date_iso = doc.receiver_location_measure_date.toISOString();
				}


				ret.coords_lat = doc.coords && doc.coords[0];
				ret.coords_lng = doc.coords && doc.coords[1];


				ret.decay_weight_date = doc.decay_weight_date;
				if (doc.decay_weight_date) {
					ret.decay_weight_date_iso = doc.decay_weight_date.toISOString();
				}


				ret.archiveDate = doc.archiveDate;
				if (doc.archiveDate) {
					ret.archiveDate_iso = doc.archiveDate.toISOString();
				}


				ret.creDate = doc.creDate;
				if (doc.creDate) {
					ret.creDate_iso = doc.creDate.toISOString();
				}
			}

			return newSchema;
		}
	}
	return MongooseBuilder;
}