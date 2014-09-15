module.exports = function(app){
    require('./mongoose')(app);
    require('./s3')(app);
    require('./child_process/worker_manager')(app);
}