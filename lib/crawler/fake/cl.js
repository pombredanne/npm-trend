// Fake crawler process for testing

var fs = require("fs");
var os = require("os");
var path = require("path");

var args = null;
var testlog = path.join(os.tmpdir(), "/npm-trend.fakecl.log");

(function parseArgs() {
  args = require("minimist")(process.argv.slice(2), {
    boolean: true
  });
})();

// Prove this process is created successfully
(function createTestLog() {
  if (fs.existsSync(testlog)) {
    fs.unlinkSync(testlog);
  }

  fs.writeFileSync(testlog, "Fake crawler start\n");
})();

(function simulateWorking() {
  // simulate long/short runing process
  if (args.longrun) {
    process.on("SIGTERM", function() {
      fs.appendFileSync(testlog, "Fake crawler killed\n");
    });
    setTimeout(function() {
      process.exit(0);
    }, 30 * 1000);
  } else if (args.shortrun) {
    fs.appendFileSync(testlog, "Fake crawler finish\n");
    process.exit(0);
  } else if (args.multiinst) {
    process.exit(1);
  }
})();