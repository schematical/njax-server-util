
module.exports = function(app){
    app.njax.addTemplateDir = function(tpl_dir){
        if(!app.njax.env_config.tpl_dirs){
            app.njax.env_config.tpl_dirs = [];
        }
        app.njax.env_config.tpl_dirs.push(tpl_dir);
    }


}