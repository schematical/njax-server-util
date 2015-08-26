var async = require('async');
var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var debug = require('debug')('njax-util:s3');
module.exports = function(app){
    AWS.env_config.update(app.njax.env_config.aws);
    var s3 = new AWS.S3();
    var njax_s3 = app.njax.s3 = {
        route:function(accept_fields){
            return function(req, res, next){
                var file_keys = Object.keys(req.files);
                if(!req.files || file_keys.length == 0){
                    debug("Exiting - No files posted in");
                    return next();
                }
                var files = [];

                if(accept_fields){
                    for(var i in accept_fields){

                        if(req.files[accept_fields[i]] && (req.files[accept_fields[i]].size > 1)){
                            debug("Uploaded File Size:" + req.files[accept_fields[i]].size)
                            files[i] = req.files[accept_fields[i]];
                            files[i]._field_name = accept_fields[i];
                        }
                    }
                    if(files.length == 0){
                        //console.log("Exiting No Files", files);
                        return next();
                    }
                }else{
                    //POTENTIAL SECURITY RISK:
                    files = req.files;
                }
                async.eachSeries(
                    files,
                    function(file, cb){
                        //console.log('File:', file);
                        if(!(file && file.size > 0 && fs.existsSync(file.path))){
                           return cb();
                        }
                        var extension = path.extname(file.originalFilename).substr(1);
                        var basename = path.basename(file.originalFilename, '.' + extension);
						while(basename.indexOf(' ') != -1){
							basename = basename.replace(' ', '_');
						}
                        var file_path = (req.user ? req.user._id : '__anonymous__') + '/' + basename + '._' + new Date().getTime() + '.' + extension;
                        if(!req.njax){
                            req.njax = {};
                        }
                        if(!req.njax.files){
                            req.njax.files = {};
                        }
                        req.njax.files[file._field_name] = file_path;

                        var content = fs.readFileSync(file.path);
                        //If were running locally then get out of dodge
                        if(app.njax.env_config.local_file_cache){
                            var full_path = app.njax.cachedir(file_path);
                            var dir_name = path.dirname(full_path);
                            if(!fs.existsSync(dir_name)){
                                mkdirp.sync(dir_name);
                            }
                            fs.writeFileSync(
                                full_path,
                                content
                            );
                            file.s3_path = req.njax.files[file._field_name].s3_path = file_path;
                            return cb(null);
                        }

                        var params = {
                            Bucket: app.njax.env_config.aws.bucket_name,
                            Key: file_path,
                            Body: content,
                            ACL: 'public-read',
                            ContentLength: content.length
                        };
                        s3.putObject(params, function (err, aws_ref) {
                            if (err) {
                                console.error(err);
                                return cb(err);
                            }
                            file.s3_path = file_path;
                            return cb(null);
                        });
                    },
                    function(){

                        return next();
                    }
                );
            }
        },
        getFile:function(file_path, local_file_path, callback){
            if(app.njax.env_config.local_file_cache){
                var cached_file_path =  app.njax.cachedir(file_path);
                if(!fs.existsSync(cached_file_path)){
                    return callback(null, null, null);//TODO: POssibly throw error?
                }
                var content = fs.readFileSync(
                    cached_file_path
                );
                if(!fs.existsSync(path.dirname(local_file_path))){
                    mkdirp.sync(path.dirname(local_file_path));
                }
                fs.writeFileSync(
                    local_file_path,
                    content
                );

                return callback(null, content, local_file_path);
            }
            async.series([
                function(cb){
                    var dir = path.dirname(local_file_path);
                    mkdirp(dir, function (err) {
                        if(err) return callback(err);
                        return cb();
                    });
                },
                function(cb){
                    var stream = require('fs').createWriteStream(local_file_path);

                    var params = {
                        Bucket: app.njax.env_config.aws.bucket_name,
                        Key:file_path
                    }
                    var body = '';
                    s3.getObject(params).
                        on('error',function (err) {
                            console.error(err);
                            return callback(err);
                        }).
                        on('httpData',function (chunk) {
                            stream.write(chunk);
                            body += chunk;
                        }).
                        on('httpDone',function () {
                            stream.end(null, null, function(){
                                callback(null, body, local_file_path);
                            });

                        }).
                        send();
                }
            ]);
        }
    }
    app.get('/njax/s3/*', function(req, res, next){
        var file_path = req.path.substr("/njax/s3/".length);
        njax_s3.getFile(file_path, app.njax.tmpdir(), function(err, body, local_file_path){
            if(err) return next(err);
            res.sendfile(local_file_path);
        });
    });


    if(app.njax.env_config.local_file_cache){
        app.get('/cache/*', function(req, res, next){
			if(app.njax.env_config.env == 'local') {
				res.setHeader('Access-Control-Allow-Origin', req.get('Origin'));//'*');
			}
            var file_path = req.path.substr("/cache/".length);
            return njax_s3.getFile(file_path, app.njax.tmpdir(), function(err, body, local_file_path){
                if(err) return next(err);
                if(!local_file_path){
                    return next();//Dont flat out 404, we want a later route to pick it up and render an avatar image probablly
                }
                return res.sendfile(local_file_path);
            });
        });
    }
    return njax_s3;
}