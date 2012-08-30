tk = require('timekit');
console.time('t');
for(var i = 0; i < 1000000; i++) {
  var ht = process.hrtime();
  //ht[0] * 1000000 + Math.round(ht[1] / 1000);

  //new Date().getTime();
}
console.timeEnd('t');
