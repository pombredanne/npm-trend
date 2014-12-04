var fs = require("fs");

require("date-utils");

module.exports = {
  exitSignalSet: ["SIGINT", "SIGTERM", "SIGQUIT", "SIGABRT"],

  writeTestLog: (function() {
    return (process.env["DEBUG"] == "*" || process.env["TESTLOG"]) ? function(log) {
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
  },

  getDayWeekMonth: function(dt) {
    if (typeof dt != "string") {
      throw new Error("getDayWeekMonth only accepts string");
    }

    var d = new Date(dt);
    try {
      d.removeUTCMilliseconds(d.getUTCMilliseconds());
    } catch (e) {}
    d.removeSeconds(d.getUTCSeconds());
    d.removeMinutes(d.getUTCMinutes());
    d.removeHours(d.getUTCHours());

    return {
      today: d,
      lastDay: d.clone().removeDays(1),
      lastWeek: d.clone().removeDays(d.getUTCDay() + 7),
      lastMonth: d.clone().removeDays(d.getUTCDate() - 1).removeMonths(1)
    };
  }
};