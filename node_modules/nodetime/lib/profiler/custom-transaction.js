'use strict';


var TimePromise = require('./time-promise').TimePromise;


function CustomTransaction(agent) {
  this.agent = agent;
}
exports.CustomTransaction = CustomTransaction;


CustomTransaction.prototype.init = function() {
};


CustomTransaction.prototype.start = function(scope, label, context) {
  var self = this;
  var profiler = self.agent.profiler;

  return new TimePromise(
    self.agent,
    profiler.time(scope, label, true),
    profiler.stackTrace(),
    context);
};
