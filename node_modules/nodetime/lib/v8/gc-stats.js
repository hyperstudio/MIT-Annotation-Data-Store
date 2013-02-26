'use strict';



function GCStats(agent) {
  this.agent = agent;

  this.v8tools = undefined;
}
exports.GCStats = GCStats;



GCStats.prototype.init = function() {
  var self = this;

  try { 
    self.v8tools = require('v8tools');
  } 
  catch(err) {
    self.agent.logger.error(err);
    return;
  }

  if(!self.v8tools.afterGC) {
    self.agent.logger.error('old v8tools version, please update v8tools package');
    return;
  }

  var mm = self.agent.metricsManager;

  var numFullGC = mm.createMetric('Garbage Collection', 'Full GCs per minute', null, 'sum'); 
  var numIncGC = mm.createMetric('Garbage Collection', 'Incremental GCs per minute', null, 'sum'); 
  var sizeChange = mm.createMetric('Garbage Collection', 'Used heap size change per minute', 'MB', 'sum'); 
  var lastUsedHeapSize = undefined;

  self.v8tools.afterGC(function(gcType, gcFlags, usedHeapSize) {
    if(gcType === 'kGCTypeMarkSweepCompact') {
      numFullGC.addValue(1);
    }
    else if(gcType === 'kGCTypeScavenge') {
      numIncGC.addValue(1);
    }

    if(lastUsedHeapSize !== undefined) {
      sizeChange.addValue((usedHeapSize - lastUsedHeapSize) / 1048576);
    }
    lastUsedHeapSize = usedHeapSize;
  });
};
