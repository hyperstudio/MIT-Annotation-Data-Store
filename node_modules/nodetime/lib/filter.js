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

var nt;
var filterKeys;
var sampleNum;

exports.init = function() {
  nt = global.nodetime;

  filterKeys = {};
  sampleNum = 0;

  nt.on('sample', function(sample) {
    if(!nt.headless && nt.sessionId) {
      collectKeys(undefined, sample, 0);

      sampleNum++;
      if(sampleNum == 1 || sampleNum == 10) {
        sendKeys();
      }
    }
  });


  setInterval(function() {
    try {
      sendKeys();
    }
    catch(e) {
      nt.error(e);
    }
  }, 60000);
};


var collectKeys = function(key, obj, depth) {
  if(depth > 20) return 0;

  var isArray = Array.isArray(obj);
  for(var prop in obj) {
    if(prop.match(/^\_/)) continue;

    if(typeof obj[prop] === 'object') {
      collectKeys(prop, obj[prop], depth + 1);
    }
    else {
      if(!isArray) { 
        filterKeys[prop] = true;
      }
      else {
        filterKeys[key] = true;
      }
    }
  }
};


var sendKeys = function() {
  var keys = [];
  for(var prop in filterKeys) {
    keys.push(prop);
  }

  keys = keys.sort(function(a, b) {
    a = a.toLowerCase(); 
    b = b.toLowerCase();

    if(a > b) return 1;
    if(a < b) return -1;
    return 0; 
  });

  if(keys.length > 0) {
    nt.agent.send({cmd: 'updateFilterKeys', args: keys});
  }
};


var PredicateFilter = function() {
}

exports.PredicateFilter = PredicateFilter;


PredicateFilter.prototype.preparePredicates = function(preds) {
  var parsedPreds = [];
  preds.forEach(function(pred) {
    var parsedPred = {};
    parsedPreds.push(parsedPred);

    parsedPred.key = pred.key;
    parsedPred.op = pred.op;
    parsedPred.val = pred.val;

    try{ 
      parsedPred.valNum = parseFloat(pred.val) 
    } 
    catch(err) {
    }

    try{ 
      if(pred.op === 'match') parsedPred.valRe = new RegExp(pred.val);
      if(typeof pred.val === 'string') parsedPred.valLc = pred.val.toLowerCase();
    } 
    catch(err) {
      return nt.error(err);
    }
  });
      
  this.preds = parsedPreds;

  return true;
}


PredicateFilter.prototype.filter = function(sample) {
  var matched = 0;

  this.preds.forEach(function(pred) {
    matched += walk(pred, sample, 0);
  });

  return (matched > 0);
};


function walk(pred, obj, depth) {
  if(depth > 20) return 0;

  var matched = 0;

  for(var prop in obj) {
    var val = obj[prop];

    if(val === undefined || val === null) {
      continue;
    }
    else if(typeof val === 'object') {
      matched += walk(pred, val, depth + 1);
    }
    else if((pred.key === '*' || pred.key === prop) && test(pred, val)) { 
      matched++;
    }

    if(matched) break;
  }

  return matched;
}


function test(pred, val) {
  var ret = false;

  if(typeof val === 'number') {
    if(pred.valNum !== NaN) {
      if (pred.op === '==') {
        ret = (val == pred.valNum);
      }
      else if (pred.op === '!=') {
        ret = (val != pred.valNum);
      }
      else if (pred.op === '<') {
        ret = (val < pred.valNum);
      }
      else if (pred.op === '>') {
        ret = (val > pred.valNum);
      }
    }
  }
  else if(typeof val === 'string') {
    if(pred.op === 'match' && pred.valRe) {
      ret = pred.valRe.exec(val);
    }
    else if (pred.op === '==') {
      ret = (val.toLowerCase() == pred.valLc);
    }
    else if (pred.op === '!=') {
      ret = (val.toLowerCase() != pred.valLc);
    }
  }

  return ret;
}


