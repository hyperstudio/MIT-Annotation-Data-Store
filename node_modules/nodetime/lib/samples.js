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


var Time = require('./time').Time;


var nt;
var info;
var state = {};
var roots = [];
var operations = [];
var rootCallTimestamps = {};
var stackTraceCalls = 0;


exports.init = function() {
  nt = global.nodetime;


  nt.on('info', function(_info) {
    info = _info;
  });

  nt.on('call', function(point, time) {
    if(time.isMacro) rootCallTimestamps[time.id] = time.begin;
  });

  nt.on('metric', function(metric) {
    if(!state[metric.scope]) state[metric.scope] = {};
    state[metric.scope][metric.name + (metric.unit ? ' (' + metric.unit + ')' : '')] = metric.value;
  });


  // cleanup operations
  setInterval(function() {
    try {
      // expire root calls
      var now = nt.millis();
      for(var prop in rootCallTimestamps) {
        if(rootCallTimestamps[prop] + 60000 < now) {
          delete rootCallTimestamps[prop];
        }
      }

      var firstCall = undefined;
      for(var prop in rootCallTimestamps) {
          firstCall = rootCallTimestamps[prop];
          break;
      }

      operations = operations.filter(function(o) {
        return (firstCall && o._begin >= firstCall);
      });
    }
    catch(e) {
      nt.error(e);
    }
  }, 10000);
}

exports.time = function(scope, command, isMacro) {
  var t =  new Time(scope, command, isMacro);
  t.start();

  return t;
}; 


exports.truncate = function(args) {
  if(!args) return undefined;

  if(typeof args === 'string') {
    return (args.length > 80 ? (args.substr(0, 80) + '...') : args); 
  }
  
  if(!args.length) return undefined;

  var arr = [];
  var argsLen = (args.length > 10 ? 10 : args.length); 
  for(var i = 0; i < argsLen; i++) {
   if(typeof args[i] === 'string') {
      if(args[i].length > 80) {
        arr.push(args[i].substr(0, 80) + '...'); 
      }
      else {
        arr.push(args[i]); 
      }
    }
    else if(typeof args[i] === 'number') {
      arr.push(args[i]); 
    }
    else if(args[i] === undefined) {
      arr.push('[undefined]');
    }
    else if(args[i] === null) {
      arr.push('[null]');
    }
    else if(typeof args[i] === 'object') {
      arr.push('[object]');
    }
    if(typeof args[i] === 'function') {
      arr.push('[function]');
    }
  } 

  if(argsLen < args.length) arr.push('...');

  return arr;
};



exports.stackTrace = function() {
  if(nt.paused || stackTraceCalls++ > 1000) return undefined;

  var err = new Error();
  Error.captureStackTrace(err);

  if(err.stack) {
    var lines = err.stack.split("\n");
    lines.shift();
    lines = lines.filter(function(line) {
      return (!line.match(/nodetime/) || line.match(/nodetime\/test/));;
    });

    return lines; 
  }

  return undefined;
};


exports.add = function(time, sample, label) {
  process.nextTick(function() {
    try {
      _add(time, sample, label);
    }
    catch(err) {
      nt.error(err);
    }
  });
};


var _add = function(time, sample, label) {
  sample._version = nt.version;
  sample._ns = 'samples';
  sample._id = time.id;
  sample._isMacro = time.isMacro;
  sample._begin = time.begin;
  sample._end = time.end;
  sample._ms = time.ms;
  sample._ts = time.begin;
  sample._cputime = time.cputime

  if(label && label.length > 80) label = label.substring(0, 80) + '...';
  sample._label = label;

  sample['Response time (ms)'] = sample._ms;
  sample['Timestamp (ms)'] = sample._ts;
  if(sample._cputime !== undefined) sample['CPU time (ms)'] = sample._cputime;


  if(sample._isMacro) {
    sample['Operations'] = findOperations(sample);
    sample['Node state'] = state;
    sample['Node information'] = info;

    try {
      if(!nt.filterFunc || nt.filterFunc(sample)) {
        nt.emit('sample', sample);
      }
    }
    catch(err) {
      nt.error(err);
    }

    delete rootCallTimestamps[sample._id];
  }
  else {
    operations.push(sample);

    try {
      if(!nt.filterFunc || nt.filterFunc(sample)) {
        nt.emit('sample', sample);
      }
    }
    catch(err) {
      nt.error(err);
    }
  }
};


var findOperations = function(sample) {
  var found = [];

  for(var i = operations.length - 1; i >= 0; i--) {
    var o = operations[i];
    if(o._begin >= sample._begin && o._end <= sample._end) {
      found.push(o);
    }

    if(o._end < sample._begin) {
      break;
    }
  }

  found = found.sort(function(a, b) {
    return b._ms - a._ms;
  });

  return found.splice(0, 50);
};



