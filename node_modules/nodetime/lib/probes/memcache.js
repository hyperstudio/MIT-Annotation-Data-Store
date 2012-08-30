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


var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');

var commands = [
  'get',
  'set',
  'delete',
  'add',
  'replace',
  'append',
  'prepend',
  'cas',
  'increment',
  'decrement',
  'samples'
];


var findCallback = function(args) {
  for(var i = 0; i < args.length; i++)
    if(typeof args[i] === 'function') return i;
};


module.exports = function(obj) {

  // connect
  proxy.after(obj.Client.prototype, 'connect', function(obj, args, ret) {
    obj.__trace__ = samples.stackTrace();
    obj.__time__ = samples.time("Memcached", "connect");
  });

  proxy.before(obj.Client.prototype, 'on', function(obj, args) {
    var client = obj;
    var event = args[0];
    if(event !== 'connect' && event !== 'timeout' && event !== 'error') return;

    proxy.callback(args, -1, function(obj, args) {
      var time = client.__time__;
      if(!time || !time.done(proxy.hasError(args))) return;
      if(nt.paused) return;

      var error = undefined;
      if(event === 'timeout') {
        error = 'socket timeout';
      }
      else if(event === 'error') {
        error = proxy.getErrorMessage(args);
      }

      var obj = {'Type': 'Memcached',
          'Connection': {host: client.host, port: client.port}, 
          'Command': 'connect', 
          'Stack trace': client.__trace__,
          'Error': error};

      samples.add(time, obj, 'Memcached: ' + obj['Command']);
    });
  });
 

  // commands
  commands.forEach(function(command) {
    proxy.before(obj.Client.prototype, command, function(obj, args) {
      var client = obj;
      var trace = samples.stackTrace();
      var params = args;
      var time = samples.time("Memcached", command);

      // there might be args after callback, need to do extra callback search
      var pos = findCallback(args);
      if(pos == undefined) return;

      proxy.callback(args, pos, function(obj, args) {
        if(!time.done(proxy.hasError(args))) return;
        if(nt.paused) return;

        var error = proxy.getErrorMessage(args);
        var obj = {'Type': 'Memcached',
            'Connection': {host: client.host, port: client.port}, 
            'Command': command, 
            'Arguments': samples.truncate(params),
            'Stack trace': trace,
            'Error': error};

        samples.add(time, obj, 'Memcached: ' + obj['Command']);
      });
    });
  });
};

