var childp = require("child_process");
var debug = require("debug")("[crawler]");
var fs = require("fs");

module.exports = function(out_config) {
  // Default config for crawler
  var config = {
    duringLimit: 60, // seconds
    relaunchQLen: 3,
    launchNextTimeAfter: 120, // minutes
    cwl_file: __dirname + "/crawler_main.js", // the crawler process file
    args: []
  };

  var crawler_p = null;
  var relaunchQueue = [];
  var crawler = {
    // Relaunch frequency check, internal call only
    _relaunchTooFrequently: function() {
      relaunchQueue.push(Date.now());
      if (relaunchQueue.length > config.relaunchQLen) {
        relaunchQueue = relaunchQueue.slice(1);
        return relaunchQueue[relaunchQueue.length - 1] - relaunchQueue[0] < config.duringLimit * 1000;
      }

      return false;
    },

    // Repeated warning, internal call only
    _repeatWarn: function(msg, seconds) {
      msg = "Warn: " + msg;
      console.warn(msg);
      setInterval(function() {
        console.warn(msg);
      }, seconds * 1000);
    },

    // Launch crawler
    launch: function() {
      if (!fs.existsSync(config.cwl_file)) {
        throw new Error("Cannot find crawler executable");
      }

      crawler_p = childp.fork(config.cwl_file, config.args, {
        env: process.env
      });
      debug("Launch crawler. PID: %d", crawler_p.pid);

      // Relaunch crawler if unexpected exit, or warn if there is already crawler instance
      crawler_p.on("exit", function(code) {
        crawler_p = null;

        if (code === 1) {
          crawler._repeatWarn("there is already crawler instance", 60);
          return;
        }

        if (code === 0) {
          debug("crawler finish");
          setTimeout(crawler.launch, config.launchNextTimeAfter * 60 * 1000);
          return;
        }

        debug("Unexpected crawler exit, relaunch");
        if (crawler._relaunchTooFrequently()) {
          crawler._repeatWarn("crawler relaunch too frequently, stop relaunching", 10);
        } else {
          crawler.launch();
        }
      });
    },

    // Kill crawler
    kill: function() {
      if (crawler_p != null) {
        crawler_p.removeAllListeners("exit");
        debug("Kill crawler. PID: %d", crawler_p.pid);
        crawler_p.kill();
      }
    },

    // Set configuration
    config: function(out_config) {
      if (out_config == undefined) {
        return;
      }

      Object.getOwnPropertyNames(config).forEach(function(prty) {
        if (out_config[prty] != null) {
          config[prty] = out_config[prty];
        }
      });
    },

    // Expose something for testing usage only
    _test: {
      crawler_pid: function() {
        return crawler_p.pid;
      }
    }
  };

  crawler.config(out_config);
  return crawler;
};