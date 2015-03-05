module.exports = function(app){
    require('./mongoose')(app);
    require('./s3')(app);
    require('./cache')(app);
    require('./child_process/worker_manager')(app);
    require('./hjs')(app);
    require('./https')(app);
	require('./crypto')(app);
	require('./helpers')(app);

}