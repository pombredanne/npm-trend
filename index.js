(function parseArgs() {
  var args = require("minimist")(process.argv.slice(2), {
    boolean: true
  });

  if (args.debug) {
    console.log("debug mode opened");
    process.env["DEBUG"] = "*";
  }
})();

var childp = require("child_process");
var debug = require("debug")("[main]");

// Relaunch frequency check
var duringLimit = 60 * 1000;
var relaunchQueue = [];
function relaunchTooFrequently() {
  relaunchQueue.push(Date.now());
  if(relaunchQueue.length > 3) {
    relaunchQueue = relaunchQueue.slice(1);
    return relaunchQueue[relaunchQueue.length - 1] - relaunchQueue[0] < duringLimit;
  }

  return false;
}

// Launch crawler
var crawler = null;
(function launchCrawler() {
  debug("Launch crawler ...");
  crawler = childp.fork("./bin/crawler/main.js");
  debug("Launch crawler OK. PID: %d", crawler.pid);

  // Relaunch crawler if unexpected exit
  crawler.on("exit", function() {
    debug("Unexpected crawler exit, relaunch");
    if (relaunchTooFrequently()) {
      console.warn("Warn: crawler relaunch too frequently, stop relaunching");
      setInterval(function() {
        console.warn("Warn: crawler relaunch too frequently, stop relaunching");
      }, 10 * 1000);
    } else {
      launchCrawler();
    }
  });
})();

// Kill crawler if main process exit
(function setExitEvent() {
  process.on("exit", function() {
    debug("Kill crawler. PID: %d", crawler.pid);
    crawler.kill();
  });
})();