
module.exports = function(app){
    require('./middleware')(app);
    //require('./s3')(app);
    require('./errors')(app);
}