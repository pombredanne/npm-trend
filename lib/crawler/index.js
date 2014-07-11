var childp = require("child_process");
var debug = require("debug")("[crawler]");
var fs = require("fs");

var config = {
  duringLimit: 60, // seconds
  relaunchQLen: 3,
  launchNextTimeAfter: 120 // minutes
};
var relaunchQueue = [];
var crawler = null;

module.exports = {
  // Relaunch frequency check
  _relaunchTooFrequently: function() {
    relaunchQueue.push(Date.now());
    if (relaunchQueue.length > config.relaunchQLen) {
      relaunchQueue = relaunchQueue.slice(1);
      return relaunchQueue[relaunchQueue.length - 1] - relaunchQueue[0] < config.duringLimit * 1000;
    }

    return false;
  },

  // Repeated warning
  _repeatWarn: function(msg, seconds) {
    msg = "Warn: " + msg;
    console.warn(msg);
    setInterval(function() {
      console.warn(msg);
    }, seconds * 1000);
  },

  // Launch crawler
  launch: function() {
    var cwl_file = __dirname + "/crawler_main.js";
    var cwl_obj = this;
    if (!fs.existsSync(cwl_file)) {
      throw new Error("Cannot find crawler executable");
    }

    crawler = childp.fork(cwl_file, {
      env: process.env
    });
    debug("Launch crawler. PID: %d", crawler.pid);

    // Relaunch crawler if unexpected exit, or warn if there is already crawler instance
    crawler.on("exit", function(code) {
      crawler = null;

      if (code === 1) {
        cwl_obj._repeatWarn("there is already crawler instance", 60);
        return;
      }

      if (code === 0) {
        debug("crawler finish");
        setTimeout(cwl_obj.launch, config.launchNextTimeAfter * 60 * 1000);
        return;
      }

      debug("Unexpected crawler exit, relaunch");
      if (cwl_obj._relaunchTooFrequently()) {
        cwl_obj._repeatWarn("crawler relaunch too frequently, stop relaunching", 10);
      } else {
        cwl_obj.launch();
      }
    });
  },

  // Kill crawler
  kill: function() {
    if (crawler != null) {
      crawler.removeAllListeners("exit");
      debug("Kill crawler. PID: %d", crawler.pid);
      crawler.kill();
    }
  }
};