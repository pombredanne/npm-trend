var debug = require("debug")("[crawler:main]");
var os = require("os");
var fs = require("fs");
var path = require("path");
var util = require("../util.js");

// Cannot support win32
if (os.platform() == "win32") {
  console.error("Win32 is not supported");
  process.exit(0);
}

var config = {
  singletonFile: path.normalize(path.join(os.tmpdir(), "/npm-trend.crawler"))
};

(function registerSingleInstance() {
  debug("Register crawler instance");

  // there is already crawler instance
  if (fs.existsSync(config.singletonFile)) {
    process.exit(1);
  }

  fs.writeFileSync(config.singletonFile, process.pid);
})();

(function setExitEvent() {
  // Unexpected exit
  var clean = function() {
    fs.unlinkSync(config.singletonFile);
    process.exit(2);
  };

  util.exitSignalSet.forEach(function(sig) {
    process.on(sig, function() {
      debug("Get %s", sig);
      clean();
    });
  });

  process.on("uncaughtException", function(err) {
    console.error("UncaughtException: " + err);
    clean();
  });
})();

// setTimeout(function() {}, 1000 * 10000);

// normal exit
fs.unlinkSync(config.singletonFile);
process.exit(0);