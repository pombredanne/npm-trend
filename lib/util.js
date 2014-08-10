var fs = require("fs");

module.exports = {
  exitSignalSet: ["SIGINT", "SIGTERM", "SIGQUIT", "SIGABRT"],
  writeTestLog: (function() {
    return process.env["DEBUG"] == "*" ? function(log) {
      fs.writeFileSync(__dirname + "/../test.log", new Date().toString() + " | " + log + "\n", {
        flag: "a"
      });
    } : function() {};
  })()
};