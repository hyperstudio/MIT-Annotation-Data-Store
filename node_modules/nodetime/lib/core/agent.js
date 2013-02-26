'use strict';

var fs = require('fs');
var util = require('util');
var path = require('path');
var cluster = require('cluster');
var EventEmitter = require('events').EventEmitter;
 
var Logger = require('./logger').Logger;
var Timers = require('./timers').Timers;
var System = require('./system').System;
var Proxy = require('./proxy').Proxy;
var Thread = require('./thread').Thread;
var Utils = require('./utils').Utils;
var MetricsManager = require('../metrics/metrics-manager').MetricsManager;
var ProcessState = require('../process/process-state').ProcessState;
var ProcessInfo = require('../process/process-info').ProcessInfo;
var ProcessStats = require('../process/process-stats').ProcessStats;
var DiskStats = require('../process/disk-stats').DiskStats;
var SaasClient = require('../saas/saas-client').SaasClient;
var DataSender = require('../saas/data-sender').DataSender;
var Profiler = require('../profiler/profiler').Profiler;
var NamedTransactions = require('../profiler/named-transactions').NamedTransactions;
var CustomTransaction = require('../profiler/custom-transaction').CustomTransaction;
var GCStats = require('../v8/gc-stats').GCStats;
var CpuProfiler = require('../v8/cpu-profiler').CpuProfiler;
var HeapProfiler = require('../v8/heap-profiler').HeapProfiler;
var HeapStats = require('../v8/heap-stats').HeapStats;
var StdoutWriter = require('../addons/stdout-writer').StdoutWriter;


function Agent() {
  this.initialized = false;
  this.version = '0.8.4';
  this.nextId = Math.round(Math.random() * Math.pow(10, 6));
  this.performanceIndexMetric = undefined;

  // predefine options
  this.debug = false;
  this.stdout = false;
  this.server = undefined;
  this.proxyServer = undefined;
  this.features = {
    transactionProfiler: true, 
    hostMetrics: false,
    redisMetrics: true,
    mongodbMetrics: true
  };

  EventEmitter.call(this);


  // create modules
  this.logger = new Logger(this);
  this.timers = new Timers(this);
  this.system = new System(this);
  this.proxy = new Proxy(this);
  this.thread = new Thread(this);
  this.utils = new Utils(this);
  this.metricsManager = new MetricsManager(this);
  this.processState = new ProcessState(this);
  this.processInfo = new ProcessInfo(this);
  this.processStats = new ProcessStats(this);
  this.diskStats = new DiskStats(this);
  this.saasClient = new SaasClient(this);
  this.dataSender = new DataSender(this);
  this.profiler = new Profiler(this);
  this.namedTransactions = new NamedTransactions(this);
  this.customTransaction = new CustomTransaction(this);
  this.gcStats = new GCStats(this);
  this.cpuProfiler = new CpuProfiler(this);
  this.heapProfiler = new HeapProfiler(this);
  this.heapStats = new HeapStats(this);
  this.stdoutWriter = new StdoutWriter(this);
};

util.inherits(Agent, EventEmitter);



Agent.prototype.init = function(opts) {
  var self = this;

  if(self.initialized) return;
  self.initialized = true;

  opts || (opts = {});
  opts.features || (opts.features = {});

  // Registered accounts.
  self.accountKey = opts.accountKey;
  self.appName = opts.appName || 'Default Application'; 
  if(self.accountKey) {
    if(!self.accountKey.match(/^[a-zA-Z0-9]{1,128}$/)) {
      throw Error('Nodetime: invalid accountKey format');
    }

    if(!self.appName.match(/^[\s\w\-\.\:]{1,128}$/)) {
      throw Error('Nodetime: invalid appName format');
    }

    self.sessionId = 'pro:' + self.accountKey + ':' + self.utils.sha1(self.appName);
  }

  self.debug = opts.debug;
  self.stdout = opts.stdout;
  self.server = opts.server;
  self.proxyServer = opts.proxy;

  // compatibility
  if(opts.features.transactions === undefined && opts.transactions !== undefined) 
    opts.features.transactions = opts.transactions;
  if(opts.features.redisMetrics === undefined && opts.redisMetrics !== undefined) 
    opts.features.redisMetrics = opts.redisMetrics;
  if(opts.features.mongodbMetrics === undefined && opts.mongodbMetrics !== undefined) 
    opts.features.mongodbMetrics = opts.mongodbMetrics;
  // end compatibility

  self.features.transactionProfiler = 
      opts.features.transactionProfiler === undefined || opts.features.transactionProfiler;
  self.features.hostMetrics = !!opts.features.hostMetrics;
  self.features.redisMetrics =
      opts.features.redisMetrics === undefined || opts.features.redisMetrics;
  self.features.mongodbMetrics =
      opts.features.mongodbMetrics === undefined || opts.features.mongodbMetrics;


  // Initialize core modules first.
  self.logger.init(self.debug);
  self.timers.init();
  self.system.init();
  self.proxy.init();
  self.thread.init();
  self.utils.init();

  // Initialize data sender.
  self.dataSender.init();
  self.saasClient.init(self.server, self.proxyServer, self.sessionId);

  // Metrics aggregator should be initialize before 
  // metric senders.
  self.metricsManager.init();
  // Predefine performance index metric.
  self.performanceIndexMetric = 
    this.metricsManager.createMetric('Process', 'Performance index', null, 'index');


  // Initialize the rest.
  self.processState.init();
  self.processInfo.init();
  self.processStats.init();
  if(self.features.hostMetrics) self.diskStats.init();
  self.profiler.init();
  self.namedTransactions.init(opts.namedTransactions);
  self.customTransaction.init();
  self.gcStats.init();
  self.cpuProfiler.init();
  self.heapProfiler.init();
  self.heapStats.init();
  if(self.stdout) self.stdoutWriter.init();


  // Prepare probes.
  self.loadProbes();


  // Notify listeners about session.
  if(self.sessionId) {
    // pro version
    try {
      self.emit('session', self.sessionId);
    }
    catch(err) {
      self.logger.error(err);
    }
  }
  else {    
    // Free version.

    // Receiving session id from server.
    self.on('command', function(command, args) {
      if(command === 'newSession') {
        self.sessionId = args;

        // Replace temporary session id with a real free one.
        self.saasClient.switchSessionId(self.sessionId);
        self.logger.message("profiler console for this instance is at \u001b[33m" + "https://nodetime.com/app/" + self.sessionId + "\u001b[0m");

        try {
          self.emit('session', self.sessionId);

          // Session expires on server after 20 minutes
          // destroy the agent.
          self.timers.setTimeout(function() {
            self.destroy();
          }, 1200000);
        }
        catch(err) {
          self.logger.error(err);
        }
      }
    });

    // Requesting session id from server.
    self.saasClient.sendCommand('createSession');
  }
};

Agent.prototype.profile = Agent.prototype.init;


Agent.prototype.loadProbes = function() {
  var self = this;

  // Dynamic probes.
  var probeCons = [];
  probeCons.push(require('../probes/cassandra-client-probe').CassandraClientProbe);
  probeCons.push(require('../probes/fs-probe').FsProbe);
  probeCons.push(require('../probes/http-probe').HttpProbe);
  probeCons.push(require('../probes/memcache-probe').MemcacheProbe);
  probeCons.push(require('../probes/memcached-probe').MemcachedProbe);
  probeCons.push(require('../probes/mongodb-probe').MongodbProbe);
  probeCons.push(require('../probes/mysql-probe').MysqlProbe);
  probeCons.push(require('../probes/net-probe').NetProbe);
  probeCons.push(require('../probes/pg-probe').PgProbe);
  probeCons.push(require('../probes/redis-probe').RedisProbe);
  probeCons.push(require('../probes/socket.io-probe').SocketioProbe);

  var packageProbes = {};
  probeCons.forEach(function(probeCon) {
    var probe = new probeCon(self);
    probe.packages.forEach(function(pkg) {
      packageProbes[pkg] = probe;
    });
  });

  // Preattaching probles, works, but not well tested
  // because require may load from different paths.
  // This removes the requirement to require nodetime
  // before everything else.
  /*for(var name in packageProbes) {
    var ret;
    try {
      ret = require.call(this, name);
    }
    catch(err) {
      // ignore exceptions
    }

    if(ret) {
      self.logger.log('found ' + name + ' module');
      packageProbes[name].attach(ret);
    }
  }*/
  
  // on demand probe attaching
  self.proxy.after(module.__proto__, 'require', function(obj, args, ret) {
    var probe = packageProbes[args[0]];
    if(probe) {
      probe.attach(ret);
    }
  });


  // Explicit probes.
  var ProcessProbe = require('../probes/process-probe').ProcessProbe;
  new ProcessProbe(self).attach(process);
  var GlobalProbe = require('../probes/global-probe').GlobalProbe;
  new GlobalProbe(self).attach(global);
};


Agent.prototype.getNextId = function() {
  return this.nextId++
};


Agent.prototype.switchApp = function(appName) {
  if(!this.initialized) return;

  this.appName = appName;
  if(this.accountKey) {
    this.sessionId = 'pro:' + this.accountKey + ':' + this.utils.sha1(this.appName);
    this.saasClient.switchSessionId(this.sessionId);
  }

  // Resend info, so that the server can see the new application name.
  try {
    this.processInfo.sendInfo();
  }
  catch(err) {
    this.logger.error(err);
  }
};


Agent.prototype.destroy = function() {
  try {
    this.emit('destroy');
  }
  catch(err) {
    this.logger.error(err);
  }

  this.removeAllListeners();
};


Agent.prototype.time = function(scope, label, context) {
  if(!this.initialized) return;

  return this.customTransaction.start(scope, label, context)
};


Agent.prototype.metric = function(scope, name, value, unit, op) {
  if(!this.initialized) return;

  this.metricsManager.addMetric(scope, name, value, unit, op);
};


Agent.prototype.expressErrorHandler = function() {
  return function(err, req, res, next) {
    res.__caughtException__ = err;
    next(err);
  };
};


var Nodetime = function() {
  var self = this;

  var agent = new Agent();
  ['profile',
    'switchApp',
    'destroy',
    'time',
    'metric',
    'expressErrorHandler'
  ].forEach(function(meth) {
    self[meth] = function() { 
      return agent[meth].apply(agent, arguments);
    };
  });

  ['on', 
   'addListener',
   'pause',
   'resume'
  ].forEach(function(meth) {
    self[meth] = function() {
      // deprecated
    };
  });
};

exports = module.exports = new Nodetime(); 

