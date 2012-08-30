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

var nt = require('./nodetime');

function Time(scope, command, isMacro) {
  var nt = global.nodetime;

  this.scope = scope;
  this.command = command;
  this.isMacro = isMacro;

  this.id = nt.nextId++; 

  this._begin = undefined;
  this._cputime = undefined;

  this.begin = undefined;
  this.end = undefined;
  this.ms = undefined;
  this.cputime = undefined;
};
exports.Time = Time;


Time.prototype.start = function() {
  var nt = global.nodetime;

  this.begin = nt.millis();
  this._cputime = nt.cputime();
  this._begin = nt.hrtime();

  var self = this;
  process.nextTick(function() {
    try {
      nt.emit("call", "start", self);
    }
    catch(err) {
      nt.error(err);
    }
  });
};


Time.prototype.done = function(hasError) {
  var nt = global.nodetime;

  if(this.end) return false;

  this.ms = (nt.hrtime() - this._begin) / 1000;
  if(this._cputime !== undefined) this.cputime = (nt.cputime() - this._cputime) / 1000;
  this.end = nt.millis();
  this.hasError = hasError;

  var self = this;
  process.nextTick(function() {
    try {
      nt.emit("call", "done", self);
    }
    catch(err) {
      nt.error(err);
    }
  });

  return true;
};


