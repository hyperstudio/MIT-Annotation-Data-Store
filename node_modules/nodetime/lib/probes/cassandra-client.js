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


module.exports = function(obj) {
  // connect
  [obj.Connection.prototype, obj.PooledConnection.prototype].forEach(function(proto) {
    proxy.before(proto, 'connect', function(obj, args) {
      var client = obj;
      var trace = samples.stackTrace();
      var time = samples.time("Cassandra", "connect");

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done(proxy.hasError(args))) return;
        if(nt.paused) return;

        var error = proxy.getErrorMessage(args);
        var obj = {'Type': 'Cassandra',
            'Connection': connection(client), 
            'Command': 'connect', 
            'Stack trace': trace,
            'Error': error};

        samples.add(time, obj, 'Cassandra: ' + obj['Command']);
      });
    });
  });


  // execute
  [obj.Connection.prototype, obj.PooledConnection.prototype].forEach(function(proto) {
    proxy.before(proto, 'execute', function(obj, args) {
      var client = obj;
      var trace = samples.stackTrace();
      var command = args.length > 0 ? args[0] : undefined;
      var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
      var time = samples.time("Cassandra", "execute");

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done()) return;
        if(nt.paused) return;

        var error = args.length > 0 ? (args[0] ? args[0].message : undefined) : undefined;
        var obj = {'Type': 'Cassandra',
            'Connection': connection(client), 
            'Command': command, 
            'Arguments': samples.truncate(params),
            'Stack trace': trace,
            'Error': error};
        samples.add(time, obj, 'Cassandra: ' + obj['Command']);
      });
    });
  });
};


var connection = function(client) {
  var connection = undefined;

  if(client.connectionInfo) {
    connection = {
      host: client.connectionInfo.host,
      port: client.connectionInfo.port,
      keyspace: client.connectionInfo.keyspace,
      user: client.connectionInfo.user
    };
  }
  else if(client.connections && client.connections.length > 0) {
    connection = [];
    conn.connections.forEach(function(conn) {
      connection.push({
        host: conn.host,
        port: conn.port,
        keyspace: conn.keyspace,
        user: conn.user
      });
    });
  }

  return connection;
};

