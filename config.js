var config = {}

config.secret = 'your-secret';
config.consumer = 'annotationstudio';
config.api = {};
config.api.version = '1.0';
config.mongodb = {};
config.mongodb.live = 'mongodb://heroku_app5176464:1e86dpt7qi3folobb3t63kqrlq@ds033907.mongolab.com:33907/heroku_app5176464';
config.mongodb.local = 'mongodb://localhost/annotationdb';
config.mongodb.staging = 'mongodb://heroku_app6335855:ajc6b1a5f3aqkbv7dlrbebv4t1@ds035607.mongolab.com:35607/heroku_app6335855';

module.exports = config;
