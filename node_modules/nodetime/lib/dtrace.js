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
  // trying to initialize dtrace provider
  var dtp = undefined;
  try { 
    var d = require("dtrace-provider"); 
    dtp = d.createDTraceProvider("nodetime");
    dtp.addProbe("api-call-start", "int", "char *", "char *");
    dtp.addProbe("api-call-done", "int", "char *", "char *");
    dtp.enable();
  } 
  catch(err) { 
    this.error(err) 
  }


  // firing dtrace events on calls
  if(dtp) { 
    nt.on('call', function(point, time) {
      try {
        var scope = time.scope.replace(/\s/g, '-').toLowerCase();
        var command = time.command.replace(/\s/g, '-').toLowerCase();
        dtp.fire('api-call-' + point, function() {
          return [time.id, scope, command];
        });
      } 
      catch(err) { 
        nt.error(err) 
      }
    });
  }
};


