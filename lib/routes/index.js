var path = require('path');

module.exports = function(app){
    require('./middleware')(app);
    //require('./s3')(app);

    require('./errors')(app);

	app.all('/njax_config.js',function(req, res, next){
		return res.render(
			path.join(app.njax.env_config.njax_util_tpl_dir, 'njax_config_js'),
			{
				njax_config_json: JSON.stringify(app.njax.njax_config)
			}
		);
	})
}