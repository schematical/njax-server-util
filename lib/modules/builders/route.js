var path = require('path');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xssFilters = require('xss-filters');

module.exports = function (app) {
	var RouteBuilder = {
		build: function (buildMaster) {
			/*for (var i in buildMaster.models) {
			 var model = buildMaster.models[i];
			 RouteBuilder.prepairModel(model);
			 }*/
			app.njax.routes = app.njax.routes = {} || {};
			for (var i in buildMaster.models) {
				var model = buildMaster.models[i];
				app.njax.routes[model.name] = RouteBuilder.buildModel(model);
			}
		},
		buildModel: function (_model) {


			var ObjectId = app.mongoose.Types.ObjectId;
			var route = app.njax.routes[_model.name.toLowerCase()] = {}
			if (_model.fields.owner) {
				route.owner_query = function (req) {

					if (!req[_model.fields.owner.bootstrap_populate]) {
						return null;
					}
					return {
						owner: _model.fields.owner.bootstrap_populate._id
					}
				}
			} else if (_model.parent) {
				route.owner_query = function (req) {
					if (!req[_model.fields[_model.parent].bootstrap_populate]) {
						return null;
					}
					var query = {}
					query[_model.parent] = req[_model.fields[_model.parent].bootstrap_populate]._id.toString();
					return query;
				}
			} else {
				route.owner_query = function () {
					return {}
				}
			}

			route.initPartials = function () {
				app.locals.partials['_' + _model.name + '_edit_form'] = 'model/_' + _model.name + '_edit_form';
				app.locals.partials['_' + _model.name + '_list_single'] = 'model/_' + _model.name + '_list_single';
			}
			route.init = function (uri) {

				if (!uri) uri = _model.uri;
				route.initPartials();


				/** CREATE ROUTE */

				route.create_full = [];

				route.create_full.push(function (req, res, next) {
					if (!req.njax) {
						req.njax = {};
					}
					req.njax.action = 'create';
					req.njax.entity = _model.name;
					return next();
				});
				route.create_full.push(route.auth_create);
				if (_model.file_fields) {
					route.create_full.push(app.njax.s3.route([_model.file_fields]));
				}
				route.create_full.push(route.validate);
				route.create_full.push(route.pre_create);
				route.create_full.push(route.create);
				route.create_full.push(route.update);
				route.create_full.push(route.pre_update_save);
				route.create_full.push(route.update_save);
				route.create_full.push(route.post_create);
				route.create_full.push(route.bootstrap_detail);
				route.create_full.push(route.broadcast_create);
				route.create_full.push(route.redirect_detail);


				/** UPDATE  **/
				route.update_full = [];
				route.update_full.push(function (req, res, next) {
					if (!req.njax) {
						req.njax = {};
					}
					req.njax.action = 'update';
					req.njax.entity = _model.name;
					return next();
				});
				route.update_full.push(route.auth_update);
				if (_model.file_fields) {
					route.update_full.push(app.njax.s3.route(_model.file_fields));
				}
				route.update_full.push(route.validate);
				route.update_full.push(route.pre_update);
				route.update_full.push(route.update);
				route.update_full.push(route.pre_update_save);
				route.update_full.push(route.update_save);
				route.update_full.push(route.post_update);
				route.update_full.push(route.bootstrap_detail);
				route.update_full.push(route.broadcast_update);
				route.update_full.push(route.render_detail);

				if (_model.fields.archiveDate) {

					route.archive_full = [
						function (req, res, next) {
							if (!req.njax) {
								req.njax = {};
							}
							req.njax.action = 'remove';
							req.njax.entity = _model.name;
							return next();
						},
						route.auth_update,
						route.pre_remove,
						route.remove,
						route.post_remove,
						route.bootstrap_detail,
						route.broadcast_remove,
						route.render_remove
					];

				}
				route.query_list_full = [
					route.auth_query_list,
					route.populate_tag_query,
					route.populate_list_query,
					route.populate_list,
					route.bootstrap_list,
					route.render_list
				]
				route.new_full = [
					route.auth_create,
					route.bootstrap_edit,
					route.render_edit
				]

				route.render_detail_full = [
					route.auth_query_detail,
					route.bootstrap_detail,
					route.render_detail
				];
				/*route.render_edit_full = [
				 function(req, res, next){
				 if(!req._model.name){
				 return next(new Error(404));
				 }
				 return next();
				 },
				 route.auth_update,
				 route.bootstrap_edit,
				 route.render_edit
				 ]*/
				app.param(_model.name.toLowerCase(), route.populate);
				app.post(
					uri,
					route.create_full
				);
				app.post(
					uri + '/new',
					route.create_full
				);

				app.post(
					uri + '/:' + _model.name.toLowerCase(),
					route.update_full
				);

				if (_model.fields.archiveDate) {
					app.delete(
						uri + '/:' + _model.name.toLowerCase(),
						app.archive_full
					);
				}

				app.all(
					uri,
					route.query_list_full
				);


				app.all(uri + '/new',
					route.new_full
				);

				app.all(
					uri + '/:' + _model.name.toLowerCase(),
					route.render_detail_full
				);

				//app.all(uri + '/:' + _model.name.toLowerCase() + '/edit', route.render_edit_full);
				if (_model.relationship != 'assoc') {
					app.post(uri + '/:' + _model.name.toLowerCase() + '/tags', [
						route.validate_tag,
						route.create_tag,
						route.broadcast_update,
						route.render_tag
					]);
					app.delete(uri + '/:' + _model.name.toLowerCase() + '/tags/:tag', [
						function (req, res, next) {
							if (!req.tag) {
								return next(new Error(404));
							}
							return next();
						},
						route.remove_tag,
						route.broadcast_update,
						route.render_tag
					]);
					app.all(uri + '/:' + _model.name.toLowerCase() + '/tags', [
						route.auth_query_tags,
						route.list_tags,
						route.render_tags
					]);
					app.all(uri + '/:' + _model.name.toLowerCase() + '/tags/:tag', [
						route.auth_update,
						function (req, res, next) {
							if (!req.tag) {
								return next(new Error(404));
							}
							return next();
						},
						route.render_tag
					]);


					app.post(uri + '/:' + _model.name.toLowerCase() + '/subscriptions', [
						route.auth_create_subscription,
						route.create_subscription,
						route.render_subscription_detail
					]);
					app.delete(uri + '/:' + _model.name.toLowerCase() + '/subscriptions/:subscription', [
						function (req, res, next) {
							if (!req.subscription) {
								return next(new Error(404));
							}
							return next();
						},
						route.remove_subscription,
						route.render_subscription_detail
					]);
					app.all(uri + '/:' + _model.name.toLowerCase() + '/subscriptions', [
						route.auth_query_subscription,
						route.list_subscription,
						route.render_subscription_list
					]);
					app.all(uri + '/:' + _model.name.toLowerCase() + '/subscriptions/:subscription', [
						route.auth_update,
						function (req, res, next) {
							if (!req.tag) {
								return next(new Error(404));
							}
							return next();
						},
						route.render_subscription_detail
					])


					/*
					 //For now we will use the trigger event
					 app.post(uri +  '/:<%= _model.name.toLowerCase() %>/events',[
					 route.create_event,
					 route.broadcast_event,
					 route.render_tag
					 ]);
					 //We dont need to remove events at this point
					 app.delete(uri +  '/:<%= _model.name.toLowerCase() %>/events/:event',[
					 function(req, res, next){
					 if(!req.tag){
					 return next(new Error(404));
					 }
					 return next();
					 },
					 route.remove_event,
					 route.render_event
					 ]);
					 */

					app.all(uri + '/:' + _model.name.toLowerCase() + '/events', [
						route.auth_query_detail,
						route.list_events,
						route.render_events
					]);
					app.all(uri + '/:' + _model.name.toLowerCase() + '/events/:event', [
						function (req, res, next) {
							if (!req.tag) {
								return next(new Error(404));
							}
							return next();
						},
						route.render_events
					]);


				}
			}

			route.auth_query_detail = function (req, res, next) {
				return next();
			};
			route.auth_query_list = function (req, res, next) {
				return next();
			};
			route.auth_query_tags = function(req, res, next)
			{
				return next();
			}
			;
			route.auth_query_subscription = function (req, res, next) {
				return next();
			};
			route.auth_create_subscription = function (req, res, next) {
				return next();
			};

			if (_model.fields.owner) {
				if (_model.fields.owner.type == 'ref') {
					route.auth_update = function (req, res, next) {
						if (req.user && (req[_model.name] && (req[_model.name].owner && req[_model.name].owner.equals(req.user._id)) || (req.is_admin))) {
							return next();//We have a legit users
						}
						return next(new Error(403));//We do not have a legit user
					}
				} else {
					route.auth_update = function (req, res, next) {
						if (req.user && (req[_model.name] && (req[_model.name].owner && req[_model.name].owner == req.user._id) || (req.is_admin))) {
							return next();//We have a legit users
						}
						return next(new Error(403));//We do not have a legit user
					}
				}

			} else {
				route.auth_update = function (req, res, next) {
					if (!req.user) {
						return next(new Error(403));//res.redirect('/');
					}
					return next();
				}
			}

			route.auth_create = function (req, res, next) {
				//ENtities that have not been created do not have an owner to manage
				if (!req.user) {
					return next(new Error(404));//res.redirect('/');
				}
				return next();

			};
			route.populate = function (req, res, next, id) {


				var or_condition = []

				if (app.njax.helpers.regex.isHexKey(id)) {
					or_condition.push({_id: new ObjectId(id)});
				}
				if (_model.fields.namespace) {
					or_condition.push({namespace: id});
				}
				if (or_condition.length == 0) {
					return next();
				}
				var query_$and = [{$or: or_condition}];
				if (_model.fields.archiveDate) {

					query_$and.push({
						$or: [
							{archiveDate: {$gt: new Date()}},
							{archiveDate: null}
						]
					});
				}


				var query = {
					$and: query_$and
				};


				if (_model.parent) {
					if (_model.parent == 'owner') {
						if (req.account) {
							query[_model.parent] = req.account._id;
						}
					} else {
						if (_model.fields[_model.parent].bootstrap_populate) {
							query[_model.parent] = _model.fields[_model.parent].bootstrap_populate._id;
						}
					}

					return app.model[model.capitalName].findOne(query, function (err, collection) {
						if (err) {
							return next(err);
						}
						if (_model.name.toLowerCase()) {
							res.bootstrap(_model.name, _model.name.toLowerCase());
						}
						return next();
					});
				} else {

					var model = null;

					for (var i = 0; i < req[_model.parent][_model.name.toLowerCase() + 's'].length; i++) {
						//it is an id
						if (app.njax.helpers.regex.isHexKey(id) && req[_model.parent][_model.name.toLowerCase() + 's'][i]._id == id) {
							model = req[_model.parent][_model.name.toLowerCase() + 's'][i];
						} else if (_model.fields.namespace && req[_model.parent][_model.name.toLowerCase() + 's'][i].namespace == id) {
							model = req[_model.parent][_model.name.toLowerCase() + 's'][i];
						}
					}

					if (model) {
						res.bootstrap(_model.name, model);
					}
					return next();


				}


			};
			route.render_remove = function (req, res, next) {
				res.render('model/' + _model.name + '_detail', res.locals[_model.name]);
			};
			route.render_list = function (req, res, next) {
				res.render('model/' + _model.name + '_list', res.locals[_model.name + 's']);
			},
				route.populate_tag_query = function (req, res, next) {

					if (!req.query.tags) {
						return next();
					}
					if (!req._list_query) {
						req._list_query = _.clone(route.read_query(req));
					}
					var tag_query = [];
					var tags = req.query.tags.split(',');
					var tag_check = {};

					for (var i in tags) {
						if (!tag_check[tags[i]]) {
							tag_query.push({value: tags[i]});
							tag_check[tags[i]] = tags[i];
						}
					}
					return app.njax.tags.query(
						{
							tag_query: tag_query,
							entity_type: _model.capitalName
						},
						function (err, entites) {
							if (err) return next(err);
							var entity_id_query = [];
							if (entites.length == 0) {
								req._list_query = false;
								return next();
							}
							for (var i in entites) {
								entity_id_query.push({_id: entites[i].entity_id});
							}

							req._list_query.$or = entity_id_query;


							return next();
						}
					);

				};

			route.populate_list_query = function (req, res, next) {
				if (!req._list_query) {
					if (req._list_query === false) {
						//Then they tried to tag search and it returned no results
						return next();
					} else {
						req._list_query = _.clone(route.read_query(req));
						if (!req._list_query) {
							req._list_query = {}; //return next();//TODO: Fix this so its secure
						}

					}
				}


				if (_model.fields.archiveDate) {
					req._list_query = {
						$and: [
							req._list_query,
							{
								$or: [
									{archiveDate: {$gt: new Date()}},
									{archiveDate: null}
								]
							}
						]
					}
				}
				if (_model.invitable) {
					if (!req.query.invites) {
						if (_model.fields.owner) {
							req._list_query.$and.push({owner: {'$ne': null}});
						}
						if (_model.fields.account) {
							req._list_query.$and.push({account: {'$ne': null}});
						}

					} else {
						if (_model.fields.owner) {
							req._list_query.$and.push({owner: null});
						}
						if (_model.fields.account) {
							req._list_query.$and.push({account: null});
						}
					}
				}
				;


				for (var name in _model.fields) {

					if ((_model.fields[name].type == 'ref' || _model.fields[name].type == 'core_ref') && _model.fields[name].is_parent && (name != 'owner')) {
						if (req[_model.fields[name].bootstrap_populate]) {
							req._list_query[name] = req[_model.fields[name].bootstrap_populate]._id;
						} else if (req.query[name]) {
							if (app.njax.helpers.regex.isHexKey(req.query[name])) {
								req._list_query[name] = req.query[name];
							}
						}
					} else if (req.query[name]) {

						if (_model.fields[name].type == 's3-asset') {


						} else if (_model.fields[name].type == 'ref') {
							req._list_query[name] = req.query[name];
						} else if (_model.fields[name].type == 'array') {
						} else if (_model.fields[name].type == 'date') {
						} else if (_model.fields[name].type == 'boolean') {
							req._list_query[name] = (req.query[name].toLowerCase() === 'true');
						} else {
							var escpaedField = app.njax.helpers.regex.escape(req.query[name]);
							req._list_query[name] = {$regex: new RegExp('.*' + escpaedField + '', 'i')};
						}
					}

				}
				return next();
			};
			route.populate_list = function (req, res, next) {
				var query = req._list_query;
				if (!query) {
					return next();
				}
				var collection = null;
				async.series([
					function (cb) {
						if (!_model.is_subdocument) {
							if (req.query.$orderby) {
								var orderby_parts = req.query.$orderby.split(':');
								var orderby_data = {};
								orderby_data['_query_field'] = (typeof(orderby_parts[1]) != 'undefined' && parseInt(orderby_parts[1])) || 1;
								var _$project = {
									_query_field: {$toLower: '$' + orderby_parts[0]}
								};


								for (var name in _model.fields) {
									_$project[name] = '$' + name
								}
								var agg_query = [
									{$match: query},
									{
										$project: _$project
									},
									{
										$sort: orderby_data
									}
								];


								return app.model[_model.capitalName].aggregate(
									agg_query
								).exec(function (err, _collection_data) {
										if (err) return next(err);
										res.bootstrap(_model.name + 's', _collection_data);
										return next();
									});

							}

							return app.model[_model.capitalName].find(query, function (err, _collection) {
								if (err) return next(err);
								collection = _collection;
								res.bootstrap(_model.name + 's', collection);
								return cb();
							});
						} else {
							collection = req[_model.parent][_model.name + 's'];
							res.bootstrap(_model.name + 's', collection);
							return cb();
						}
					},
					function (cb) {
						res.locals[_model.name + 's'] = [];
						for (var i in collection) {
							var collection_data = collection[i].toObject();
							if (_model.fields.owner) {
								if (req.user && (collection[i].owner == req.user._id)) {
									collection_data._user_is_owner = true;
								}
							}
							res.locals[_model.name + 's'].push(
								collection_data
							);
						}

						return cb();
					},
					function (cb) {

						return next();
					}
				]);
			};


			route.render_detail = function (req, res, next) {
				if (!req[_model.name]) {
					return next();
				}

				if (_model.fields.owner) {
					if (req.user && req[_model.name] && req[_model.name].owner == req.user._id) {
						res.locals._user_is_owner = true;
					}
				}

				res.render('model/' + _model.name + '_detail', req[_model.name].toObject());
			};


			route.redirect_detail = function (req, res, next) {
				if (!req[_model.name]) {
					return next();
				}
				if (req.njax.call_type == 'www') {
					return res.redirect(req[_model.name].uri);
				}
				return route.render_detail(req, res, next);

			};
			route.redirect_edit = function (req, res, next) {
				if (!req[_model.name]) {
					return next();
				}

				res.redirect(req[_model.name].uri + '/edit');
			};

			/** SETUP RENDER_EDIT **/
			var render_edit_field_select = [];
			for (var i in _model._rels) {
				if (_model._rels[i].type == 'ref') {
					render_edit_field_select.push(
						function (cb) {
							if (req[_model._rels[i].ref]) {
								return cb();
							}
							return app.model[app.njax.helpers.capitalizeFirstLetter(_model._rels[i].ref)].find({}, function (err, collection) {
								if (err) return next(err);
								var collection_objs = [];
								for (var i in  collection) {
									var collection_obj = collection[i].toObject();
									collection_obj._selected = (req[_model.name][_model._rels[i].ref] == collection[i]._id);
									collection_objs.push(collection_obj);
								}
								res.bootstrap(_model._rels[i].ref + 's', collection_objs);
								return cb();
							});

						}
					);
				}
			}

			route.render_edit = function (req, res, next) {
				async.series([
					function (cb) {
						if (!req[_model.name.toLowerCase()]) {
							//return next();
							req[_model.name.toLowerCase()] = new app.model[_model.capitalName]();
						}
						return cb();
					},
					render_edit_field_select,
					function (cb) {

						res.render('model/' + _model.name + '_edit');
					}
				]);
			},

				route.create = function (req, res, next) {

					if (!req[_model.name]) {
						var model_data = {
							cre_date: new Date()
						};
						for (var i in _model._rels) {
							model_data[_model._rels[i].name] = (req[_model._rels[i].bootstrap_populate] && req[_model._rels[i].bootstrap_populate]._id || null);
						}
						req[_model.name] = new app.model[_model.capitalName](model_data);
					}
					if (_model.fields.namespace) {
						if (!req.body.namespace && req.body.name) {
							req[_model.name].namespace = app.njax.helpers.toNamespace(req.body.name);
						}
					}

					return next();

				},
				route.update = function (req, res, next) {

					if (!req[_model.name]) {
						return next();
						//return next(new Error('<%= _.capitalize(_model.name) %> not found'));
					}

					for (var name in _model.fields) {
						if (_model.fields[name].type == 's3-asset') {
							if (req.njax.files && req.njax.files[name]) {
								req[_model.name][name] = req.njax.files[name];
							}
						} else if ((_model.fields[name].type == 'ref') || (_model.fields[name].type == 'core_ref')) {
							if (name == 'owner') {
								if (!req[_model.name][name] && req[_model.fields[name].bootstrap_populate]) {
									req[_model.name][name] = req[_model.fields[name].bootstrap_populate]._id;
								}
							} else {
								if (req[_model.fields[name].bootstrap_populate]) {
									req[_model.name][name] = req[_model.fields[name].bootstrap_populate]._id;
								} else if (!_.isUndefined(req.body[name])) {
									req[_model.name][name] = req.body[name];
								}
							}
						} else if (_model.fields[name].type == 'array') {
							//Do nothing it is an array
							//req.<%= _model.name.toLowerCase() %>.<%= name %> = req.body.<%= name %>;
						} else if (_model.fields[name].type == 'object') {
							if (!_.isUndefined(req.body[name])) {
								req[_model.name][name] = req.body[name];
								req[_model.name].markModified(name);
							}
						} else {
							if (!_.isUndefined(req.body[name])) {
								var filteredData = xssFilters.inHTMLData(req.body[name]);

								req[_model.name][name] = filteredData;
							}
						}
					}

					return next();

				};
			route.update_save = function (req, res, next) {
				if (!req[_model.name]) {
					return next();
				}
				return req[_model.name].save(function (err, model_data) {
					if (err) {
						return next(err);
					}
					//app._refresh_locals();
					res.bootstrap(_model.name, model_data);
					return next();
				});
			};
			route.query = function (req, res, next) {
				return next();
			};
			route.pre_update_save = function (req, res, next) {
				return next();
			};
			route.bootstrap_list = function (req, res, next) {
				return next();
			};
			/** BOOT STRAP DETAIL */
			if (_model.fields.owner) {
				if (_model.fields.owner.type == 'ref') {

					route.bootstrap_detail = function (req, res, next) {
						if (req.user && req[_model.name] && req[_model.name].owner && (req[_model.name].owner.equals(req.user._id))) {
							res.bootstrap('is_owner', true);
						} else {
							res.bootstrap('is_owner', false);
						}
						return next();
					};

				} else {

					route.bootstrap_detail = function (req, res, next) {
						if (req.user && req[_model.name] && req[_model.name].owner && (req[_model.name].owner == req.user._id)) {
							res.bootstrap('is_owner', true);
						} else {
							res.bootstrap('is_owner', false);
						}
						return next();
					}

				}
			}else {
				route.bootstrap_detail = function (req, res, next) {
					return next();
				}

			}


			route.bootstrap_edit = function (req, res, next) {
				return next();
			};
			route.validate = function (req, res, next) {
				return next();
			};
			route.pre_update = function (req, res, next) {
				return next();
			};
			route.pre_create = function (req, res, next) {
				return next();
			};
			route.pre_create_properties = function (req, res, next) {
				return next();
			};
			route.pre_remove = function (req, res, next) {
				return next();
			},
				route.post_update = function (req, res, next) {
					return next();
				};
			route.post_create = function (req, res, next) {
				return next();
			};
			route.post_remove = function (req, res, next) {
				return next();
			};
			route.validate_tag = function (req, res, next) {
				if (!req.body.type) {
					return next(new Error("Ivalid type"));
				}
				return next();
			};
			route.create_tag = function (req, res, next) {
				if (!req[_model.name]) {
					return next(new Error(404));
				}
				//TODO: Add validation
				return app.njax.tags.add(
					req.body,
					req[_model.name],
					function (err, tag) {
						if (err) return next(err);
						res.bootstrap('tag', tag);
						return next();
					}
				);
			};
			route.remove_tag = function (req, res, next) {
				if (!req.tag) {
					return next(new Error(404));
				}
				return req.tag.remove(function (err) {
					if (err) return next(err);
					return next();
				});
			};

			route.list_tags = function (req, res, next) {
				app.njax.tags.query(req[_model.name], function (err, tags) {
					if (err) return next(err);
					res.bootstrap('tags', tags);
					return next();
				});
			};

			route.render_tags = function (req, res, next) {
				return res.render('model/tags_list', res.locals.tags);
			};
			route.render_tag = function (req, res, next) {
				return res.render('model/tag_detail', res.locals.tag);
			};


			route.create_subscription = function (req, res, next) {
				if (!req[_model.name]) {
					return next(new Error(404));
				}
				//TODO: Add validation
				return app.njax.subscription.add(
					req.user,
					req[_model.name],
					req.body,
					function (err, subscription) {
						if (err) return next(err);
						res.bootstrap('subscription', subscription);
						return next();
					}
				);
			}
			route.remove_subscription = function (req, res, next) {
				if (!req.tag) {
					return next(new Error(404));
				}
				return req.subscription.remove(function (err) {
					if (err) return next(err);
					return next();
				});
			};
			route.list_subscription = function (req, res, next) {
				app.njax.subscription.query(req[_model.name], function (err, subscriptions) {
					if (err) return next(err);
					res.bootstrap('subscriptions', subscriptions);
					return next();
				});
			};

			route.render_subscription_list = function (req, res, next) {
				return res.render('model/subscriptions_list', res.locals.subscriptions);
			};
			route.render_subscription_detail = function (req, res, next) {
				return res.render('model/subscription_detail', res.locals.subscription);
			}


			/*
			 create_event:function(req, res, next){
			 if(!req.<%= _model.name %>){
			 return next(new Error(404));
			 }
			 //TODO: Add validation
			 return app.njax.tags.add(
			 req.body,
			 req.<%= _model.name %>,
			 function(err, tag){
			 if(err) return next(err);
			 res.bootstrap('event', event);
			 return next();
			 }
			 );
			 },
			 remove_event:function(req, res, next){
			 if(!req.event){
			 return next(new Error(404));
			 }
			 return req.event.remove(function(err){
			 if(err) return next(err);
			 return next();
			 });
			 },
			 */
			route.list_events = function (req, res, next) {
				if (!req[_model.name]) {
					return next(new Error(404));
				}
				app.njax.events.query(req[_model.name], function (err, events) {
					if (err) return next(err);
					res.bootstrap('events', events);
					return next();
				});
			};
			route.render_events = function (req, res, next) {
				return res.render('model/event_list', res.locals.events);
			};
			route.render_event = function (req, res, next) {
				return res.render('model/event_detail', res.locals.event);
			};

			/** SETUP BROADCAST_CREATE **/
			if (_model.fields.owner) {
				route.broadcast_create = function (req, res, next) {
					var broadcast_data = {
						user: req.user.toObject(),
						_url: req[_model.name].url,
						_entity_type: req[_model.name]._njax_type
					};
					broadcast_data[_model.name] = req[_model.name].toObject();
					app.njax.broadcast(
						[req.user],
						_model.name + '.create',
						broadcast_data
					);
					return next();
				}
			} else {
				route.broadcast_create = function (req, res, next) {
					return next();
				}
			}

			/** SETUP BROADCAST_UPDATE **/
			if (_model.fields.owner) {
				route.broadcast_update = function (req, res, next) {
					var broadcast_data = {
						user: req.user.toObject(),
						_url: req[_model.name].url,
						_entity_type: req[_model.name]._njax_type
					}
					broadcast_data[_model.name] = req[_model.name].toObject();
					app.njax.broadcast(
						[req.user],
						_model.name + '.update',
						broadcast_data
					);

					return next();
				}

			} else {
				route.broadcast_update = function (req, res, next) {
					return next();
				}
			}

			/** SETUP BROADCAST_ARCHIVE **/
			if (_model.fields.owner) {
				route.broadcast_remove = function (req, res, next) {
					var broadcast_data = {
						user: req.user.toObject(),
						_url: req[_model.name].url,
						_entity_type: req[_model.name]._njax_type
					}

					app.njax.broadcast(
						[req.user],
						_model.name + '.remove',
						broadcast_data
					);
					return next();
				}
			} else {
				route.broadcast_remove = function (req, res, next) {
					return next();
				}
			}

			if (_model.fields.archiveDate) {
				route.remove = function (req, res, next) {
					if (!req.user) {
						return next();
					}
					return req[_model.name].archive(function (err) {
						if (err) return next(err);
						return next();
					});
				}
			}


			route.read_query = route.owner_query;
			route.write_query = route.owner_query;


			return route;


		}

	}
	return RouteBuilder;
}