module.exports = function(app){
    require('./mongoose')(app);
    require('./s3')(app);
}