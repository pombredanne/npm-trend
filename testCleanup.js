// Test failure may leave something not removed. This targets to ensure they are cleaned up.
var exec = require('child_process').exec;
var colors = require('colors');
var async = require("async");

var errcb = function(err) {
  if (err != null && err != "") {
    console.log(err);
    return true;
  } else {
    return false;
  }
};
var fakelog = "npm-trend.fakecl.log";
var dbpath = "npmtrend.test.db.tmp";

console.log("Test clean up ...\n");

setTimeout(function() {
  // Clean log of fake crawler
  exec("rm -f ./" + fakelog, function(err, stdout, stderr) {
    var e = errcb(err);
    e = e || errcb(stderr);
    if (e) {
      console.log("[!!!] Please manually remove npm-trend.fakecl.log if it is not removed.".red);
    }
  });

  // Clean mongod process and tmp dir for db testing
  exec("ps aux|grep " + dbpath, function(err, stdout, stderr) {
    async.each(stdout.split("\n"), function(i, done) {
      if (/mongod/.test(i)) {
        exec("kill -9 " + i.split(/\s+/)[1], function(err, stdout, stderr) {
          done();
        });
      } else {
        done();
      }
    }, function() {
      exec("rm -rf ./" + dbpath, function(err, stdout, stderr) {
        var e = errcb(err);
        e = e || errcb(stderr);
        if (e) {
          console.log("[!!!] Please manually remove npmtrend.test.db.tmp directory if it is not removed.".red);
        }
      });
    });
  });
}, 3000);