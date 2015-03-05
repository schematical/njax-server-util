njax-util
=========

NJax-Util is a package of code that is used in both [NJax's core module](http://github.com/schematical/njax) and [NJax's child service module](http://github.com/schematical/njax-app).
The majority of documentation for the NJax Framework can be found at [http://github.com/schematical/njax](http://github.com/schematical/njax).

##Usage:
This repo is meant to be included as a child module of the aforementioned repos and not really recommended to be included directly into your projects.

##Anatomy:

###[./lib](./lib):
The backend files that run on the server as part of this node_module.

####[./lib/routes](./lib/routes):
A collection of routes available to all NJax based modules

#####[./lib/routes/middleware.js](./lib/routes/middleware.js):
A series of middleware that runs on every request to an NJax app.

_NOTE: Some of this needs to be moved to a middleware that can be called in the app.js of a project built off of the NJax framework._

#####[./lib/routes/error.js](./lib/routes/error.js):
A bit of basic error handling middleware

#####[./lib/routes/_s3.js](./lib/routes/_s3.js):
A collection of functionality for working with Amazon Web Service's [S3 Buckets](http://aws.amazon.com/s3/)

####[./lib/modules](./lib/modules):
Some modules that are shared between the core and its child services.


#####[./lib/modules/cache.js](./lib/modules/cache.js):
The Cache module is a value key store that stores data in process memory that gets updated when an Event is fired off from the core (//TODO: Link to the events section in Njax's Core)

#####[./lib/modules/cookie_session.js](./lib/modules/cookie_session.js):
_NOTE: Cookie Session is no longer in use_
Cookie session was a simple way of storing an encrypted cookie with session data in it.


#####[./lib/modules/child_process](./lib/modules/child_process):
Child process has modules for launching child processes external from the parent process. This is most commonly used for firing off Web Hooks from the core, but can have other uses as well.

#####[./lib/modules/crypto.js](./lib/modules/crypto.js):
This handles basic encryption

#####[./lib/modules/helpers.js](./lib/modules/helpers.js):
Helpers are a collection of simple utility functions that were not included in underscore.js

#####[./lib/modules/hjs.js](./lib/modules/hjs.js):
HJS has some basic functionality for working with templates using [hjs](https://www.npmjs.com/package/hjs).

#####[./lib/modules/https.js](./lib/modules/https.js):
This has some simple functions for enforcing https vs http and dealing with multiple protocols

#####[./lib/modules/mongo_session.js](./lib/modules/mongo_session.js):
This is has the functionality that stores basic user session in MongoDB.

_NOTE: This has it's own config setting `session_mongo` so you can store this data that does NOT need to persist long term in a separate db. This takes some of the load off of your long term db._

_NOTE 2: I know connect has a session tool for this but it was not cutting it for what I wanted it for_

#####[./lib/modules/mongoose.js](./lib/modules/mongoose.js):
This ques up mongoose and our data layer model. It does not initialize the actual Schema's though. That  happens in the applications and in some cases NJax Core

#####[./lib/modules/s3.js](./lib/modules/s3.js):
This has more model(not control) functionality for use with the [S3 Buckets](http://aws.amazon.com/s3/)

#####[./lib/modules/static_serve.js](./lib/modules/static_serve.js):
NJax has the ability to make static assets extendable.

//TODO: Write example



