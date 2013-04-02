var config = {}

config.secret = 'your-secret';
config.consumer = 'your-app-name';
config.api = {};
config.api.version = '1.0';
config.mongodb = {};
config.mongodb.live = 'mongodb://user:pass@host.domain.com:port/dbname'
config.mongodb.local = 'mongodb://localhost/dbname'
config.mongodb.staging = 'mongodb://user:pass@host.domain.com:port/staging-dbname'

module.exports = config;
