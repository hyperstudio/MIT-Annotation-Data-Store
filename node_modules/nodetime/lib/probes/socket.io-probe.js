'use strict';


function SocketioProbe(agent) {
  this.agent = agent;

  this.packages = ['socket.io'];
  this.attached = false;
}
exports.SocketioProbe = SocketioProbe;



SocketioProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var metricsManager = self.agent.metricsManager;

  var connectCount = undefined;

  var connectCountMetric = metricsManager.createMetric('Socket.io', 'Socket count', null, 'avg');
  var sentCountMetric = metricsManager.createMetric('Socket.io', 'Messages sent per minute', null, 'sum');
  var receivedCountMetric = metricsManager.createMetric('Socket.io', 'Messages received per minute', null, 'sum');

  self.agent.timers.setInterval(function() {
    if(connectCount !== undefined) {
      connectCountMetric.addValue(connectCount);
    }
  }, 60000);


  proxy.after(obj, 'listen', function(obj, args, ret) {
    if(!ret.sockets) return;

    if(connectCount === undefined) {
      connectCount = 0;
    }

    proxy.before(ret.sockets, ['on', 'addListener'], function(obj, args) {
      if(args[0] !== 'connection') return;

      proxy.callback(args, -1, function(obj, args) {
        if(!args[0]) return;

        var socket = args[0];

        // conenctions
        connectCount++;
        socket.on('disconnect', function() {
          connectCount--;
        });        

        // sent messages
        proxy.before(socket, ['emit', 'send'], function(obj, args) {
          // ignore internal events
          if(args[0] === 'newListener') return;

          sentCountMetric.addValue(1); 
        });

        // received messages
        proxy.before(socket, ['on', 'addListener'], function(obj, args) {
          // ignore internal events
          if(args[0] === 'disconnect') return;

          receivedCountMetric.addValue(1);   
        });
      });
    });
  });
};

