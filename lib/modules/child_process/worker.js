var async = require('async');
var _ = require('underscore');
var NJaxWorker = function(options){
    this.events = {};
    _.extend(options, this);
    process.on('message', _.bind(this.onMessage, this));
}
NJaxWorker.prototype.onMessage = function(m) {
    //Look for events

    var data = m;//JSON.parse(m);

    var event = null;
    if(data._command){
        //Trigger some events
        event = data._command;
    }else{
        event = 'message';
    }

    this.trigger(event, data);

}
NJaxWorker.prototype.trigger = function(event, data){

    if(!this.events[event]){
        return false;
    }
    for(var i in this.events[event]){
        this.events[event][i](event, data, this);
    }
}
NJaxWorker.prototype.on = function(event, callback){
    if(!this.events[event]){
        this.events[event] = [];
    }
    this.events[event].push(callback);
}
NJaxWorker.prototype.send = function(event, data){
    if(_.isString(data)){
        data = { message: data }
    }else if(!data){
        data = {};
    }
    data._event = event;
    var response = null;
    try{
        //console.log('Worker Sending To Manager:', event, data);
        response = JSON.stringify(data);
    }catch(e){
        console.error("Error Stringifying JSON");
        console.error(data);
        console.error(e);
        response = { error: { message: "Error Stringifying JSON"}};
    }
    process.send(response);
}
module.exports = NJaxWorker;