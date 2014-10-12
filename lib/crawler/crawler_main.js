var debug = require("debug")("[crawler:main]");
var os = require("os");
var fs = require("fs");
var path = require("path");
var util = require("../util");
var gconfig = require("./cl_config.json");

// Cannot support win32
if (os.platform() == "win32") {
  console.error("Win32 is not supported");
  process.exit(util.crawlerExit.NORMAL);
}

var config = {
  singletonFile: path.normalize(path.join(os.tmpdir(), "/npm-trend.crawler.singleton"))
};

(function setConcurrentSocketLimit() {
  // will impact concurrency performance
  require("http").globalAgent.maxSockets = gconfig.maxSockets;
  require("https").globalAgent.maxSockets = gconfig.maxSockets;
})();

(function registerSingleInstance() {
  debug("Register crawler instance");

  // there is already crawler instance
  if (fs.existsSync(config.singletonFile)) {
    util.writeTestLog("there is already crawler instance");
    process.exit(util.crawlerExit.MULTI_INSTANCE);
  }

  fs.writeFileSync(config.singletonFile, process.pid);
})();

(function setExitEvent() {
  util.exitSignalSet.forEach(function(sig) {
    process.on(sig, function() {
      debug("Get %s", sig);
      process.exit(util.crawlerExit.SIG_OR_EXCP);
    });
  });

  process.on("uncaughtException", function(err) {
    var es = "UncaughtException: " + err + "\n" + err.stack;
    console.error(es);
    util.writeTestLog(es);
    process.exit(util.crawlerExit.SIG_OR_EXCP);
  });

  process.on("exit", function(code) {
    if (code != util.crawlerExit.MULTI_INSTANCE) {
      debug("Clean crawler instance");
      fs.unlinkSync(config.singletonFile);
    }
    debug("exit code: %d", code);
  });
})();

require("./npmsite").startGrasp();