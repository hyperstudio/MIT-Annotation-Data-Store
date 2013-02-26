'use strict';

function System(agent) {
  this.agent = agent;
  
  this.hasHrtime = true;
  this.timekit = undefined;
}
exports.System = System;


System.prototype.init = function() {
  var self = this;

  // make sure hrtime is available
  self.hasHrtime = process.hasOwnProperty('hrtime');

  // try to load timekit
  try { 
    self.timekit = require('timekit'); 
    if(!self.timekit.time() || !self.timekit.cputime()) throw new Error('timekit broken');
  } 
  catch(err) { 
    self.timekit = undefined;
    self.agent.logger.error(err);
  }
};


System.prototype.hrtime = function() {
  if(this.timekit) {
    return this.timekit.time();
  }
  else if(this.hasHrtime) {
    var ht = process.hrtime();
    return ht[0] * 1000000 + Math.round(ht[1] / 1000);
  }
  else {
    return Date.now() * 1000;
  }
};


System.prototype.micros = function() {
  return this.timekit ? this.timekit.time() : Date.now() * 1000;
};


System.prototype.millis = function() {
  return this.timekit ? this.timekit.time() / 1000 : Date.now();
};


System.prototype.cputime = function() {
  return this.timekit ? this.timekit.cputime() : undefined;
};

