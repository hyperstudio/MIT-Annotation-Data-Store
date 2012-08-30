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

exports.init = function() {
  nt = global.nodetime;

  nt.on('sample', function(sample) {
    console.log(indent({sample: sample}));
  });
};


function indent(obj, depth) {
  if(!depth) depth = 0;
  if(depth > 20) return '';

  var tab = '';
  for(var i = 0; i < depth; i++) tab += "\t";

  var str = ''
  var arr = Array.isArray(obj);

  for(var prop in obj) {
    var val = obj[prop];
    if(val == undefined || prop.match(/^_/)) continue;
    
    var label = val._label || (arr ? ('[' + prop + ']') : prop);

    if(typeof val === 'string' || typeof val === 'number') {
      str += tab + label + ': \033[33m' + val + '\033[0m\n';
    }
    else if(typeof val === 'object') {
      str += tab + '\033[1m' + label + '\033[0m\n';
      str += indent(val, depth + 1);
    }
  }
  
  return str;
}

