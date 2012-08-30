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


var util = require("util");
var EventEmitter = require('events').EventEmitter;
var request = require("request");
var gzipRequest = require("./gzip-request");


var Client = function(opts) {
  var self = this;

  this.version = '0.1.1';

  opts = opts || {};

  this.debug = opts.debug;

  if(opts.group) {
    this.setGroup(opts.group);
  }
  else {
    this.group = uuid();
  }

  if(!opts.server) throw new Error("Server address is missing or invalid");
  this.server = opts.server;
  this.proxy = opts.proxy;

  this.retry = opts.retry || 2;


  this._lastTimestamp = 0;
  this._pollFailed = 0;
  this._pollOngoing = false;
  this._pushFailed = 0;
  this._pushOngoing = false;
  this._pushBuffer = [];


  setInterval(function() {
    try {
      if(!self._pushOngoing) self._push();
    }
    catch(err) {
      self.error(err);
    }
  }, 1000);

  setInterval(function() {
    try {
      if(!self._pollOngoing) self._poll();
    }
    catch(err) {
      self.error(err);
    }
  }, 1000);


  EventEmitter.call(this);
};

util.inherits(Client, EventEmitter);
exports.Client = Client; 

exports.createClient = function(opts) {
  return new exports.Client(opts); 
}

Client.prototype.setGroup = function(group) {
  if(group.match(/^[\w\-\.\:]{1,128}$/)) {
    this.group = group;
  }
  else {
    throw new Error("Client group name is invalid");
  }
};



Client.prototype.log = function(msg) {
  if(this.debug) console.log(msg);
};


Client.prototype.error = function(msg) {
  if(this.debug) console.error(msg, msg ? msg.stack : undefined);
};


Client.prototype.send = function(payload) {
  if(this.compress) {
    gzip.write(payload)
  }
  else {
    this._pushBuffer.push({payload: payload, ts: new Date().getTime()});
  }
};
  

Client.prototype._push = function() {
  var self = this;

  if(self._pushBuffer.length == 0) return;

  self._pushOngoing = true;
  var buf = this._pushBuffer;
  self._pushBuffer = [];
  gzipRequest({
      strictSSL: !self.debug,
      method: "POST", 
      url: self.server + '/agent.io/push/?group=' + self.group, 
      proxy: self.proxy,
      json: buf,
      timeout: 10000,
      headers: {'agentio-version': self.version}
    }, function(err, response, body) {
    if(err || response.statusCode != 200) {
      if(++self._pushFailed == self.retry) {
        self._pushFailed = 0;
      }
      else {
        // put back
        self._pushBuffer = buf.concat(self._pushBuffer);
      }

      self.error(err || "error pushung message(s)");
    }
    else {
      self._pushFailed = 0;

      self.log("sent message(s) to server");
    }

    self._pushOngoing = false;
  });
};


Client.prototype._poll = function() {
  var self = this;

  self._pollOngoing = true;
  request({
      strictSSL: !self.debug,
      url: self.server + '/agent.io/poll/?group=' + self.group + '&since=' + (self._lastTimestamp || ''), 
      proxy: self.proxy,
      encoding: "utf8", 
      timeout: 70000,
      headers: {'agentio-version': self.version}
    }, function(err, response, body) {
    if(err || response.statusCode != 200) {
      self._deferPoll();
      return self.error(err || 'poll request error');
    }
 
    try {
      var msgs = JSON.parse(body);
      msgs = msgs || [];

      msgs.forEach(function(msg) {
        if(msg && msg.payload && msg.ts) {
          self.log("message(s) received from server");
          self._lastTimestamp = msg.ts;
          self.emit("message", msg.payload);
        }
        else {
          self.error("invalid message for client " + self.group);
        }
      });
    }
    catch(err) {
      self._deferPoll();
      return self.error(err);
    }

    self._pollFailed = 0;
    self._pollOngoing = false;
  });
};


Client.prototype._deferPoll = function() {
  var self = this;

  if(++self._pollFailed == self.retry) {
    setTimeout(function() {
      self._pollFailed = 0;
      self._pollOngoing = false;
    }, 60000);
  }
  else {
    self._pollOngoing = false;
  }
}


function uuid() {
  return (new Date().getTime() + ':' + Math.round(Math.random() * Math.pow(10, 16)));
}

