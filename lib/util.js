var fs = require("fs");

module.exports = {
  exitSignalSet: ["SIGINT", "SIGTERM", "SIGQUIT", "SIGABRT"],

  writeTestLog: (function() {
    return process.env["DEBUG"] == "*" ? function(log) {
      fs.writeFileSync(__dirname + "/../test.log", new Date().toString() + " | " + log + "\n", {
        flag: "a"
      });
    } : function() {};
  })(),

  crawlerExit: {
    NORMAL: 0,
    MULTI_INSTANCE: 1,
    SIG_OR_EXCP: 2,
    NO_DB: 3
  }
};