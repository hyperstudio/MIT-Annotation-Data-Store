'use strict';


function TimePromise(agent, time, stackTrace, context) {
  this.agent = agent;

  this.type = 'Custom';
  this.time = time;
  this.stackTrace = stackTrace;
  this.context = context;

  this.agent.profiler.startTransaction(this.time);
};
exports.TimePromise = TimePromise;


TimePromise.prototype.end = function(context) {
  var profiler = this.agent.profiler;
  
  if(!this.time.done()) return;
  if(profiler.skipSample(this.time)) return;

  var sample = profiler.createSample();
  sample['Type'] = this.type;
  sample['Start context'] = this.context;
  sample['End context'] = context;
  sample['Stack trace'] = this.stackTrace;
  sample._group = this.type;
  sample._label = this.type + ': ' + this.time.group;

  profiler.addSample(this.time, sample);
};