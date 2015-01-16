
module.exports = function(app){
    require('./middleware')(app);
    //require('./s3')(app);
	require('./load_balencer')(app);
    require('./errors')(app);
}