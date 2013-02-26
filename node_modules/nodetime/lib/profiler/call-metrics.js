'use strict';


/*
 * To hold a set of metrics associated with a call in closure context.
 */

function CallMetrics(agent) {
  this.agent = agent;

  this.rpm = undefined;

  this.epm = undefined;
  this.art = undefined;
  this.rtp = undefined;
  this.act = undefined;

  // Predefined performance index metric.
  this.pi = this.agent.performanceIndexMetric;
}
exports.CallMetrics = CallMetrics;


CallMetrics.prototype.init = function(scope, group) {
  var mm = this.agent.metricsManager;

  if(group) {
    scope = scope + '/' + group;
  }

  this.rpm = mm.createMetric(scope, 'Requests per minute', null, 'sum');

  this.epm = mm.createMetric(scope, 'Errors per minute', null, 'sum');
  this.art = mm.createMetric(scope, 'Average response time', 'ms', 'avg');
  this.rtp = mm.createMetric(scope, 'Response time 95th percentile', 'ms', '95th');
  this.act = mm.createMetric(scope, 'Average CPU time', 'ms', 'avg');
};


CallMetrics.prototype.callStart = function(time) {
  this.rpm.addValue(1);
};


CallMetrics.prototype.callDone = function(time) {
  this.epm.addValue(time.hasError ? 1 : 0);
  this.art.addValue(time.ms);
  this.rtp.addValue(time.ms);
  if(time.cputime) {
    this.act.addValue(time.cputime);
  }

  this.pi.addValue(time.ms);
};

