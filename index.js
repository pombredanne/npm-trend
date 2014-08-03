var util = require("lib/util.js");
var os = require("os");

// Cannot support win32
if (os.platform() == "win32") {
  console.error("Win32 is not supported");
  process.exit(0);
}

(function parseArgs() {
  var args = require("minimist")(process.argv.slice(2), {
    boolean: true
  });

  if (args.debug) {
    console.log("debug mode opened");
    process.env["DEBUG"] = "*";
  }
})();

var debug = require("debug")("[main]");
var crawler = require("lib/crawler")();

try {
  crawler.launch();
} catch (e) {
  console.error("Launch crawler fails: " + e);
  crawler.kill();
  process.exit(0);
}

// Kill crawler if main process exit
(function setExitEvent() {
  var clean = function() {
    crawler.kill();
    process.exit(0);
  }

  util.exitSignalSet.forEach(function(sig) {
    process.on(sig, function() {
      debug("Get %s", sig);
      clean();
    });
  });

  process.on("uncaughtException", function(err) {
    console.error("UncaughtException: " + err);
    console.error(err.stack);
    clean();
  });
})();