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


var os = require('os');


var nt;
var v8tools;
var active = false;
var origPaused;

exports.init = function() {
  nt = global.nodetime;

  try { 
    v8tools = require('v8tools'); 
  } 
  catch(err) { 
    nt.error(err);
  }

  // if paused during CPU profiling, do not resume automatically
  nt.on('pause', function() {
    origPaused = true;
  });
}


/* CPU profiler */

exports.startCpuProfiler = function(seconds) {
  if(!v8tools || active) return;
  active = true;

  seconds || (seconds = 10);

  var paused = nt.paused;
  if(!paused) {
    nt.pause(true);
    origPaused = paused;
  }


  v8tools.startV8Profiler();
  nt.message("V8 CPU profiler started");

  // stop v8 profiler automatically after 10 seconds
  setTimeout(function() {
    try {
      exports.stopCpuProfiler();
    }
    catch(err) {
      nt.error(err);
    }
  }, seconds * 1000);
};


exports.stopCpuProfiler = function() {
  if(!v8tools || !active) return;

  var nodes = {};
  var root = undefined;
  var rootSamplesCount = undefined;

  v8tools.stopV8Profiler(function(parentCallUid, callUid, totalSamplesCount, functionName, scriptResourceName, lineNumber) {
    if(rootSamplesCount === undefined)
      rootSamplesCount = totalSamplesCount;

    var cpuUsage = ((totalSamplesCount * 100) / rootSamplesCount || 1);
    var obj = {
      _totalSamplesCount: totalSamplesCount,
      _functionName: functionName,
      _scriptResourceName: scriptResourceName,
      _lineNumber: lineNumber,
      _cpuUsage: cpuUsage, 
      _id: nt.nextId++,
      _target: [],
      _label: cpuUsage.toFixed(2) + "% - " + functionName
    };

    if(scriptResourceName && lineNumber) 
      obj._label += " (" + scriptResourceName + ":" + lineNumber + ")";

    nodes[callUid] = obj;
    if(root === undefined) {
      root = obj;
    }

    if(parentCallUid) {
      var parentNode = nodes[parentCallUid];
      if(parentNode) parentNode._target.push(obj);
    }
  });

  nt.message("V8 CPU profiler stopped");

  if(root) {
    var profile = {};
    profile._id = nt.nextId++;
    profile._label = os.hostname() + ' [' + process.pid + ']';
    profile._ts = nt.millis();
    profile._ns = 'cpu-profiles';
    profile.root = root;

    nt.agent.send({cmd: 'updateData', args: profile});
  }


  if(!origPaused) {
    nt.resume();
  }

  active = false;
};



/* Heap profiler */

function edgeTypeToString(type) {
  switch(type) {
    case 0: 
      return 'variable';
    case 1: 
      return 'element';
    case 2: 
      return 'property';
    case 3: 
      return 'internal';
    case 4: 
      return 'hidden';
    case 5: 
      return 'shortcut';
    case 6:
      return 'weak';
    default:
      return 'other';
  }
}

function nodeTypeToString(type) {
  switch(type) {
    case 0: 
      return 'hidden';
    case 1: 
      return 'array';
    case 2: 
      return 'string';
    case 3: 
      return 'object';
    case 4: 
      return 'compiled code';
    case 5: 
      return 'function clojure';
    case 6: 
      return 'regexp';
    case 7: 
      return 'heap number';
    case 7: 
      return 'native object';
    default:
      return 'other';
  }
}



function calculateRetainedSize(depth, walked, node) {
  if(depth++ > 1000) return 0;
  walked[node.nodeUid] = true;

  node.retainedSize += node.selfSize;

  node.children.forEach(function(childNode) {
    if(walked[childNode.nodeUid] || childNode.retainersCount > 1) return;

    if(!childNode.retainedSize) {
      calculateRetainedSize(depth + 1, walked, childNode);
    }

    node.retainedSize += childNode.retainedSize;
  });
}


function genKey(node) {
  if(node.retainerType == 0 || node.retainerType == 2) {
    return edgeTypeToString(node.retainerType) + ':' + node.retainerName;
  }
  else {
    return edgeTypeToString(node.retainerType);
  }
}


function genGroupLabel(node) {
  switch(node.retainerType) {
    case 0: 
      return 'Variable: ' + node.retainerName;
    case 1: 
      return 'Array elements';
    case 2: 
      return 'Property: ' + node.retainerName;
    case 4: 
      return 'Hidden links';
    case 6:
      return 'Weak references';
    default:
      return 'Other';
  }
}

function truncate(obj) {
  if(!obj) return undefined;
  
  if(typeof(obj) === 'string') {
    if(obj.length > 25) {
      return obj.substring(0, 25) + '...';
    }
    else {
      return obj;
    }
  }
  else if(typeof(obj) === 'number') {
    return obj;
  }
}


function genNodeLabel(node) {
  var name = truncate(node.name);
  return nodeTypeToString(node.type) + (name ? (": " + name) : "");
}


exports.takeHeapSnapshot = function() {
  if(!v8tools || active) return;
  active = true;

  nt.message("V8 heap profiler starting...");

  var seen = {};
  var groups = {};
  var totalSize = 0;
  var totalCount = 0;

  var nodes = {};
  v8tools.takeHeapSnapshot(function(parentNodeUid, nodeUid, name, type, selfSize, retainerName, retainerType) {
    if(retainerType === 5) return;

    var node = nodes[nodeUid];
    if(!node) {
      node = nodes[nodeUid] = {
        nodeUid: nodeUid,
        name: name,
        type: type,
        selfSize: selfSize,
        retainerName: retainerName,
        retainerType: retainerType,
        retainedSize: 0,
        retainersCount: 0,
        parents: {},
        children: []
      }
    }
  
    var parentNode = nodes[parentNodeUid];
    if(parentNode) {
      parentNode.children.push(node);
      if(!node.parents[parentNodeUid]) {
        node.parents[parentNodeUid] = true;
        node.retainersCount++;
      }
    }
  });


  for(var prop in nodes) {
    var node = nodes[prop];
    if(node.retainerType && node.retainerType !== 3) {
      if(!node.retainedSize) calculateRetainedSize(0, {}, node);
      if(node.retainersCount > 1) totalSize += node.selfSize;

      var key = genKey(node);
      var obj = groups[key];
      if(!obj) {
        obj = groups[key] = {
          _id: nt.nextId++,
          _label: genGroupLabel(node),
          size: 0, 
          count: 0,
          instances: []
        };
      }

      obj.size += node.retainedSize;
      obj.count++;

      obj.instances.push({
        _id: nt.nextId++,
        _label: genNodeLabel(node),
        _retainedSize: node.retainedSize,
        'Id': node.nodeUid,
        'Name': truncate(node.name),
        'Type': nodeTypeToString(node.type),
        'Self size (KB)': (node.selfSize / 1024).toFixed(3),
        'Retained size (KB)': (node.retainedSize / 1024).toFixed(3)
      });
    }

    totalSize += node.selfSize;
    totalCount++; 
  }

  // sort groups
  var groupsOrdered = [];
  for(var key in groups) {
    groupsOrdered.push(groups[key]);
  }
  groupsOrdered = groupsOrdered.sort(function(a, b) {
    return b.size - a.size;
  });
  groupsOrdered = groupsOrdered.slice(0, 100);


  // prepare for rendering
  for(var key in groups) {
    var obj = groups[key];

    obj.instances = obj.instances.sort(function(a, b) {
      return b._retainedSize - a._retainedSize;
    });

    obj.largestInstances = obj.instances.slice(0, 10);

    obj.randomInstances = [];
    for(var i = 0; i < 10; i++) {
      obj.randomInstances.push(obj.instances[Math.floor(Math.random() * (obj.instances.length - 1))]);
    }
    obj.randomInstances = obj.randomInstances.sort(function(a, b) {
      return a['Type'] - b['Type'];
    });


    obj['Size (KB)'] = (obj.size / 1024).toFixed(3);
    if(totalSize > 0) obj['Size (%)'] = Math.round((obj.size / totalSize) * 100);
    obj._label = obj['Size (%)'] + "% - " + obj._label;

    obj['Count'] = obj.count;
    if(totalCount > 0) obj['Count (%)'] = Math.round((obj.count / totalCount) * 100);

    obj['Largest instances'] = obj.largestInstances;
    obj['Random instances'] = obj.randomInstances;
    
    delete obj.size;
    delete obj.count;
    delete obj.instances;
    delete obj.largestInstances;
    delete obj.randomInstances;
  }
  nt.message("V8 heap profiler stopped");

  var snapshot = {};
  snapshot._id = nt.nextId++;
  snapshot._label = os.hostname() + ' [' + process.pid + ']';
  snapshot._ts = nt.millis();
  snapshot._ns = 'heap-snapshots';
  snapshot['Retainers'] = groupsOrdered;

  nt.agent.send({cmd: 'updateData', args: snapshot});

  active = false;

  //console.log(require('util').inspect(groupsOrdered, true, 20, true));
};


