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


var internalCommands = [
  '_executeQueryCommand', 
  '_executeInsertCommand', 
  '_executeUpdateCommand', 
  '_executeRemoveCommand'
];

var commandMap = {
  '_executeQueryCommand': 'find', 
  '_executeInsertCommand': 'insert', 
  '_executeUpdateCommand': 'update', 
  '_executeRemoveCommand': 'remove'
};

module.exports = function(obj) {
  internalCommands.forEach(function(internalCommand) {
    proxy.before(obj.Db.prototype, internalCommand, function(obj, args) {
      var trace = samples.stackTrace();
      var command = (args && args.length > 0) ? args[0] : undefined;
      var time = samples.time("MongoDB", commandMap[internalCommand]);

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done()) return;
        if(nt.paused) return;

        var conn = {};
        if(command.db) {
          var servers = command.db.serverConfig;
          if(servers) {
            if(Array.isArray(servers)) {
              conn.servers = [];
              servers.forEach(function(server) {
                conn.servers.push({host: server.host, port: server.port});
              }); 
            }
            else {
              conn.host = servers.host;
              conn.port = servers.port;
            }
          }
          
          conn.database = command.db.databaseName;
        }

        var commandName = commandMap[internalCommand];
        var query = command.query ? samples.truncate(JSON.stringify(command.query)) : '{}';
        var error = proxy.getErrorMessage(args);
        var obj = {'Type': 'MongoDB', 
          'Connection': conn,
          'Command': {collectionName: command.collectionName, 
              commandName: commandName, 
              query: query, 
              queryOptions: command.queryOptions, 
              numberToSkip: command.numberToSkip,
              numberToReturn: command.numberToReturn},
          'Stack trace': trace,
          'Error': error};

        samples.add(time, obj, 'MongoDB: ' + commandName);
      });
    });
  });
};

