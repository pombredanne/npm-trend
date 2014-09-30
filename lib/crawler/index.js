var childp = require("child_process");
var debug = require("debug")("[crawler]");
var fs = require("fs");
var util = require("../util");
var gconfig = require("./cl_config.json");

module.exports = function(out_config) {
  // Default config for crawler
  var config = {
    duringLimit: 60, // seconds
    relaunchQLen: 3,
    launchNextTimeAfter: gconfig.relaunchAfter, // minutes
    cwl_file: __dirname + "/crawler_main.js", // the crawler process file
    args: [] // args when forking crawler process. Currernly real crawler needs no arg while the fake one needs some for purpose of testing
  };

  var crawler_p = null; // crawler process object
  var relaunchQueue = []; // store records of relaunching
  var crawler = {
    // Relaunch frequency check, internal call only
    _relaunchTooFrequently: function() {
      util.writeTestLog("Chcek if relaunch too frequently");
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
      util.writeTestLog("Launch crawler. PID: " + crawler_p.pid);

      // Relaunch crawler if unexpected exit, or warn if there is already crawler instance
      crawler_p.on("exit", function(code) {
        crawler_p = null;
        util.writeTestLog("Detect crawler exit code " + code);
        if (code === util.crawlerExit.NO_DB) {
          // crawler exit due to no DB connection
          process.exit(0);
        }

        if (code === util.crawlerExit.MULTI_INSTANCE) {
          crawler._repeatWarn("there is already crawler instance", 60);
          return;
        }

        if (code === util.crawlerExit.NORMAL) {
          debug("crawler finish");
          setTimeout(crawler.launch, config.launchNextTimeAfter * 60 * 1000);
          return;
        }

        debug("Unexpected crawler exit code %d, relaunch", code);
        if (crawler._relaunchTooFrequently()) {
          util.writeTestLog("crawler relaunch too frequently, stop relaunching");
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
        util.writeTestLog("Kill crawler. PID: " + crawler_p.pid);
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