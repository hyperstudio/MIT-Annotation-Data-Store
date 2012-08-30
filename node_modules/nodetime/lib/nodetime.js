/*
 * Copyright (c) 2012 Dmitri Melikyan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a 
 * copy of this software and associated documentation files (the 
 * "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, 
 * distribute, sublicense, and/or sell copies of the Software, and to permit 
 * persons to whom the Software is furnished to do so, subject to the 
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN 
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR 
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


if(global.nodetime) return global.nodetime;

var fs = require('fs');
var os = require('os');
var util = require('util');
var path = require('path');
var events = require('events');
var cluster = require('cluster');
var crypto = require('crypto');
var agentio = require('./agent.io');
var proxy = require('./proxy');
var samples = require('./samples');
var metrics = require('./metrics');
var info = require('./info');
var sender = require('./sender');
var stdout = require('./stdout');
var dtrace = require('./dtrace');
var filter = require('./filter');
var PredicateFilter = filter.PredicateFilter;
var v8profiler = require('./v8-profiler');


var Nodetime = function() {
  this.initialized = false;
  this.version = '0.4.6';
  this.master = cluster.isMaster;
  this.paused = true;
  this.pauseAt = undefined;
  this.nextId = Math.round(Math.random() * Math.pow(10, 6));
  this.filterFunc = undefined;
  this.filterOptions = undefined;
  this.times = {};
  this.timekit = undefined;

  events.EventEmitter.call(this);
};

util.inherits(Nodetime, events.EventEmitter);
exports = module.exports = global.nodetime = new Nodetime(); 


Nodetime.prototype.profile = function(opts) {
  if(this.initialized) return;
  this.initialized = true;

  var self = this;

  if(!opts) opts = {};

  // registered accounts
  this.accountKey = opts.accountKey; 
  this.appName = opts.appName || 'Default Application'; 
  if(this.accountKey) {
    this.sessionId = 'pro:' + this.accountKey + ':' + sha1(this.appName);
  }

  this.history = opts.history !== undefined ? opts.history : true;
  this.transactions = opts.transactions !== undefined ? opts.transactions : true;
  this.headless = opts.headless;
  this.dtrace = opts.dtrace;
  this.stdout = opts.stdout;
  if(this.stdout && opts.headless === undefined) this.headless = true;
  this.debug = opts.debug;  
  this.silent = opts.silent && !opts.debug;  
  this.server = opts.server || "https://nodetime.com";  
  this.proxyServer = opts.proxy;


  // try to load timekit
  try { 
    this.timekit = require('timekit'); 
    if(!this.timekit.time() || !this.timekit.cputime()) throw new Error('timekit broken');
  } 
  catch(err) { 
    this.timekit = undefined;
    this.error(err);
  }


  // node >= 0.8
  this.hasHrtime = process.hasOwnProperty('hrtime');


  // prepare probes
  var probes = {};
  var files = fs.readdirSync(path.dirname(require.resolve('./nodetime')) + '/probes');
  files.forEach(function(file) {
    var m = file.match('^(.*)+\.js$');
    if(m && m.length == 2) probes[m[1]] = true;
  });

  proxy.after(module.__proto__, 'require', function(obj, args, ret) {
    if(ret.__required__) return;

    if(probes[args[0]]) {
      ret.__required__ = true; 

      require('./probes/' + args[0])(ret);
    }
  });


  // setup agent and request sessionId if not given
  if(!this.headless) {
    this.agent = agentio.createClient({server: this.server, proxy: this.proxyServer, group: this.sessionId, debug: this.debug});

    this.agent.on('message', function(msg) {
      if(isValidCommand(msg)) {
        if(msg.cmd === 'newSession') {
          self.sessionId = msg.args;
          self.agent.setGroup(self.sessionId);
          self.message("profiler console for this instance is at \033[33m" + self.server + "/" + self.sessionId + "\033[0m");

          try {
            self.emit('session', self.sessionId);

            // session expires on server after 20 minutes
            setTimeout(function() {
              self.sessionId = undefined;
            }, 1200000);
          }
          catch(err) {
            self.error(err);
          }
        }
        else if(msg.cmd === 'pause') {
          self.pause();
        }
        else if(msg.cmd === 'resume') {
          self.resume();
        }
        else if(msg.cmd === 'filter') {
          if(msg.args) {
            var pf = new PredicateFilter();
            if(pf.preparePredicates(msg.args)) {
              self.filter(function(sample) {
                return pf.filter(sample);
              }, msg.args);
            }
          }
          else {
            self.filter(undefined);
          }
        }
        else if(msg.cmd === 'profileCpu') {
          try {
            if(typeof msg.args === 'number' && msg.args > 0 && msg.args <= 60) {
              v8profiler.startCpuProfiler(msg.args);
            }
          }
          catch(err) {
            self.error(err);
          }
        }
        else if(msg.cmd === 'takeHeapSnapshot') {
          try {
            v8profiler.takeHeapSnapshot();
          }
          catch(err) {
            self.error(err);
          }
        }

      }
      else {
        self.log("invalid command from server");
      }
    });

    if(this.master && !this.sessionId) {
      this.log("requesting session from server");
      this.agent.send({cmd: 'createSession'});
    }
  }


  // broadcast sessionId to all workers in a cluster
  if(!this.headless && !this.sessionId) {
    if(this.master) {
      //cluster.on('fork', function(worker) { switch to this sometime in the future
      proxy.after(cluster, 'fork', function(obj, args, worker) {
        if(self.sessionId) {
            worker.send({nodetimeSessionId: self.sessionId});
            self.log('master ' + process.pid + ' sent sessionId ' + self.sessionId + ' to worker ' + worker.id)
        }
        else {
          self.once('session', function(sessionId) {
            worker.send({nodetimeSessionId: sessionId});
            self.log('master ' + process.pid + ' sent sessionId ' + sessionId + ' to worker ' + worker.id)
          });
        }
      });
    }
    else {
      process.on('message', function(msg) {
        if(!msg || !msg.nodetimeSessionId) return;

        self.sessionId = msg.nodetimeSessionId;
        self.agent.group = self.sessionId;
        self.log('worker ' + process.pid + ' received sessionId ' + msg.nodetimeSessionId + ' from master');
      });
    }  
  }

  metrics.init();
  proxy.init();
  if(this.stdout) stdout.init();
  if(this.dtrace) dtrace.init();
  if(!this.headless) sender.init();
  filter.init();
  samples.init();
  info.init();
  v8profiler.init();

  // expose tools  
  this.tools = {
    proxy: proxy,
    samples: samples,
    info: info
  };



  // always activate profiler at startup
  // backoff start to avoid load time noise
  setTimeout(function() {
    self.resume();
  }, 2000);

  // autopause profiler if not resumed explicitely
  setInterval(function() {
    if(!self.paused && self.millis() > self.pauseAt) 
      self.pause(); 
  }, 1000);
};


Nodetime.prototype.switchApp = function(appName) {
  if(!this.initialized) return;

  this.appName = appName;
  if(this.accountKey) {
    this.sessionId = 'pro:' + this.accountKey + ':' + sha1(this.appName);
    this.agent.setGroup(this.sessionId);
  }

  // resend info
  try {
    this.tools.info.sendInfo();
  }
  catch(err) {
    this.error(err);
  }
};


Nodetime.prototype.pause = function(keepState) {
  if(!this.initialized || !this.transactions) return;

  this.paused = true;
 
  if(!keepState) {
    this.pauseAt = undefined;
    this.filterFunc = undefined;
    this.filterOptions = undefined;
  }

  this.emit('pause');
  this.message('profiler paused');
};


Nodetime.prototype.resume = function(seconds) {
  if(!this.initialized || !this.transactions) return;

  if(!seconds) seconds = 180;

  this.pauseAt = this.millis() + seconds * 1000;
  this.paused = false;

  this.emit('resume', seconds);
  this.message('profiler resumed for ' + seconds + ' seconds');
};


Nodetime.prototype.filter = function(func, options) {
  this.filterFunc = func;
  this.filterOptions = options
};


Nodetime.prototype.time = function(label, context) {
  if(this.paused || !this.initialized) return;

  this.times[label] = {
    time: samples.time("Custom", label, true),
    stackTrace: samples.stackTrace(),
    context: context
  };
};


Nodetime.prototype.timeEnd = function(label, context) {
  if(this.paused || !this.initialized) return;

  var time = this.times[label];
  delete this.times[label];
  if(!time) throw new Error('No such label: ' + label);

  if(!time.time.done()) return;

  var obj = {'Type': 'Custom'};
  
  // merge start context
  if(time.context) {
    for(var prop in time.context) {
      obj[prop] = time.context[prop];
    }
  }

  // merge end context
  if(context) {
    for(var prop in context) {
      obj[prop] = context[prop];
    }
  }

  // add stack trace
  obj['Stack trace'] = time.stackTrace;

  samples.add(time.time, obj, 'Custom: ' + label);
};


Nodetime.prototype.metric = function(scope, name, value, unit, op, history) {
  if(!this.initialized || (!this.history && this.paused)) return;

  metrics.add(scope, name, value, unit, op, history);
};


Nodetime.prototype.hrtime = function() {
  if(this.timekit) {
    return this.timekit.time();
  }
  else if(this.hasHrtime) {
    var ht = process.hrtime();
    return ht[0] * 1000000 + Math.round(ht[1] / 1000);
  }
  else {
    return new Date().getTime() * 1000;
  }
};


Nodetime.prototype.micros = function() {
  return this.timekit ? this.timekit.time() : new Date().getTime() * 1000;
};


Nodetime.prototype.millis = function() {
  return this.timekit ? this.timekit.time() / 1000 : new Date().getTime();
};


Nodetime.prototype.cputime = function() {
  return this.timekit ? this.timekit.cputime() : undefined;
};


Nodetime.prototype.log = function(msg) {
  if(this.debug && msg) console.log('nodetime:', msg);
};


Nodetime.prototype.error = function(e) {
  if(this.debug && e) console.error('nodetime error:', e, e.stack);
};


Nodetime.prototype.dump = function(obj) {
  if(this.debug) console.log(util.inspect(obj, false, 10, true));
};


Nodetime.prototype.message = function(msg) {
  if(!this.silent) util.log("\033[1;31mNodetime:\033[0m " + msg);
};


var isValidCommand = function(obj) { 
  if(!obj) return false;
  if(typeof obj.cmd !== 'string' || obj.cmd.length > 256) return false;

  return true;
};


var sha1 = function(str) {
  var hash = crypto.createHash('sha1');
  hash.update(str);
  return hash.digest('hex');
};
