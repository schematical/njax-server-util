
module.exports = function(app){
    app.njax.addTemplateDir = function(tpl_dir){
        if(!app.njax.config.tpl_dirs){
            app.njax.config.tpl_dirs = [];
        }
        app.njax.config.tpl_dirs.push(tpl_dir);
    }


}