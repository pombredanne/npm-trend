var debug = require("debug")("[crawler:main]");
var os = require("os");
var fs = require("fs");
var path = require("path");
var util = require("../util");

// Cannot support win32
if (os.platform() == "win32") {
  console.error("Win32 is not supported");
  process.exit(0);
}

var config = {
  singletonFile: path.normalize(path.join(os.tmpdir(), "/npm-trend.crawler.singleton"))
};

(function setConcurrentSocketLimit() {
  // will impact concurrency performance
  require("http").globalAgent.maxSockets = 300;
  require("https").globalAgent.maxSockets = 300;
})();

(function registerSingleInstance() {
  debug("Register crawler instance");

  // there is already crawler instance
  if (fs.existsSync(config.singletonFile)) {
    util.writeTestLog("there is already crawler instance");
    process.exit(1);
  }

  fs.writeFileSync(config.singletonFile, process.pid);
})();

(function setExitEvent() {
  util.exitSignalSet.forEach(function(sig) {
    process.on(sig, function() {
      debug("Get %s", sig);
      process.exit(2);
    });
  });

  process.on("uncaughtException", function(err) {
    var es = "UncaughtException: " + err + "\n" + err.stack;
    console.error(es);
    util.writeTestLog(es);
    process.exit(2);
  });

  process.on("exit", function(code) {
    if (code != 1) {
      debug("Clean crawler instance");
      fs.unlinkSync(config.singletonFile);
    }
    debug("exit code: %d", code);
  });
})();

require("./npmsite").startGrasp();