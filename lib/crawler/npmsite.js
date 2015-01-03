var debug = require("debug")("[npmsite]");
var cheerio = require('cheerio');
var async = require("async");
var Worker = require("./worker");
var HTTPStatus = require("http-status");
var util = require("../util");
var DBmon = require("../public/db");
var readline = require("readline");
var dbconfig = require("../public/db_config.json");
var sprintf = require("sprintf-js").sprintf;

require("date-utils");

var npmsite = {
  // DB instance
  db: new DBmon(dbconfig),

  // start grasping of www.npmjs.com
  startGrasp: function() {
    // Connect db
    npmsite.db.connect();

    // Set timer to check if no more to grasp
    npmsite._pollProcessStatus();

    var cnt = 0;
    async.until(function() {
      return cnt == 3 || npmsite.db.ready();
    }, function(end) {
      cnt++;
      setTimeout(end, 1000);
    }, function() {
      var start = function() {
        npmsite._sites.forEach(function(site) {
          site.begin();
        });
      };

      if (npmsite.db.ready()) {
        start();
      } else {
        // DB not found. Should interact with user
        var rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        var check = function() {
          rl.question("No DB connected, still go on? [y/n] or reconnect? [r]", function(answer) {
            answer = answer.toLowerCase();
            if (answer == "y") {
              rl.close();
              start();
            } else if (answer == "n") {
              util.writeTestLog("Choose not to go on without db connection.");
              process.exit(util.crawlerExit.NO_DB);
            } else if (answer == "r") {
              npmsite.db.connect();
              setTimeout(function() {
                if (npmsite.db.ready()) {
                  start();
                } else {
                  check();
                }
              }, 3000);
            } else {
              check();
            }
          });
        };

        check();
      }
    });
  },

  // periodically check if there is nothing more to grasp or cannot grasp anything due to unexpected network error
  // if no more to grasp, process should exit but sometimes not
  // currently if the "done" number doesn't change in 10 mins, regard as finishing
  _pollProcessStatus: function() {
    var last = 0;

    setInterval(function() {
      var done = npmsite._syncResults.already.done;

      if (last == done) {
        util.writeTestLog(sprintf("Modules %d / %d done, success: %d, failure: %d", npmsite._syncResults.already.done, npmsite._syncResults.already.see, npmsite._syncResults.already.success, npmsite._syncResults.already.failure));
        process.exit(util.crawlerExit.NORMAL);
      } else {
        last = done;
      }
    }, 10 * 60 * 1000);
  },

  // Util functions
  _util: {
    collectErrors: function(err, url) {
      var log = url + " | " + err.type + " | ";
      if (err.type == "request error") {
        log += err.excp.message;
      } else if (err.type == "response error") {
        log += (err.response.statusCode + " " + HTTPStatus[err.response.statusCode]);
      }

      util.writeTestLog(log);
    },

    pageNeedRetry: function(err, url, cb) {
      if (err.type == "response error") {
        var stac = err.response.statusCode;
        if (stac == 502 || stac == 503) {
          debug("Get http %d for %s, will retry later.", stac, url);
          setTimeout(function() {
            Worker.start(url, cb);
          }, 30 * 1000);
          return true;
        }
      }

      return false;
    },

    params: {
      moduleListLen: 60
    }
  },

  // sync results of some workers that are necessary for other workers
  _syncResults: {
    pkg_num: -1, // actually modules in npmjs.com website are several hundreds less than this number
    already: {
      see: 0,
      done: 0,
      success: 0,
      failure: 0
    }
  },

  // callbacks to process returned pages
  _page_cbs: {
    npm_main_page: function(err, page, url, res) {
      if (err != null) {
        if (npmsite._util.pageNeedRetry(err, url, npmsite._page_cbs["npm_main_page"])) {
          return;
        }

        npmsite._util.collectErrors(err, url);

        // sync result
        npmsite._syncResults.pkg_num = 0;
        return;
      }

      var $ = cheerio.load(page);
      var npmmain = {
        pkg_num: -1,
        download: null
      };

      // get total package number and download traffic
      var stat = $("#home-stats strong");
      var _getStatNum = function(stat) {
        return stat.text().replace(/,/g, "");
      };
      npmmain.pkg_num = _getStatNum(stat.eq(0));
      npmmain.download = {
        last_day: _getStatNum(stat.eq(1)),
        last_week: _getStatNum(stat.eq(2)),
        last_month: _getStatNum(stat.eq(3))
      };

      // sync result
      npmsite._syncResults.pkg_num = npmmain.pkg_num;

      // update db
      try {
        var time = util.getDayWeekMonth(res.headers.date);
        var saveOpt = {
          safe: true,
          upsert: true
        };
        var errcb = function(err) {
          if (err != null) {
            debug(err);
          }
        };

        npmsite.db.TotalPkg.update({
          date: time.today
        }, {
          date: time.today,
          num: npmmain.pkg_num
        }, saveOpt, errcb);

        // It is possible that different mirrors of npmjs.com cannot keep db consistency immediately after a day.
        // So we check that adjacent day/week/month download num shouldn't be exactly the same, meaning the data hasn't been refreshed
        npmsite.db.TotalDayDld.find({
          date: time.lastDay.clone().removeDays(1)
        }, function(err, docs) {
          errcb(err);
          if (docs.length == 0 || docs[0].num != npmmain.download.last_day) {
            npmsite.db.TotalDayDld.update({
              date: time.lastDay
            }, {
              num: npmmain.download.last_day
            }, saveOpt, errcb);
          }
        });

        npmsite.db.TotalWeekDld.find({
          date: time.lastWeek.clone().removeWeeks(1)
        }, function(err, docs) {
          errcb(err);
          if (docs.length == 0 || docs[0].num != npmmain.download.last_week) {
            npmsite.db.TotalWeekDld.update({
              date: time.lastWeek
            }, {
              num: npmmain.download.last_week
            }, saveOpt, errcb);
          }
        });

        npmsite.db.TotalMonthDld.find({
          date: time.lastMonth.clone().removeMonths(1)
        }, function(err, docs) {
          errcb(err);
          if (docs.length == 0 || docs[0].num != npmmain.download.last_month) {
            npmsite.db.TotalMonthDld.update({
              date: time.lastMonth
            }, {
              num: npmmain.download.last_month
            }, saveOpt, errcb);
          }
        });
      } catch (e) {
        // Exception due to no db connection. Log not needed.
      }

      // debug output
      debug("npm packages: %d | %d | %d | %d", npmmain.pkg_num, npmmain.download.last_day, npmmain.download.last_week, npmmain.download.last_month);
      debug("finish %s", url);
    },

    npm_module_index: function(err, page, url) {
      if (err != null) {
        if (npmsite._util.pageNeedRetry(err, url, npmsite._page_cbs["npm_module_index"])) {
          return;
        }

        npmsite._util.collectErrors(err, url);
        return;
      }

      var $ = cheerio.load(page);
      var list = $("ul.columnar li h3 a.name");
      var length = list.get().length;

      // empty page
      if (length == 0) {
        debug("%s is empty page", url);
        return;
      }

      if (length != npmsite._util.params.moduleListLen) {
        util.writeTestLog(sprintf("Detect page module number is not %d, actual: %d | %s", npmsite._util.params.moduleListLen, length, url));
      }

      // get modules
      npmsite._syncResults.already.see += length;
      for (var i = 0; i < length; i++) {
        Worker.start("https://www.npmjs.com/package/" + list.eq(i).text(), npmsite._page_cbs["npm_module"]);
      }
    },

    npm_module: function(err, page, url, res) {
      if (err != null) {
        if (npmsite._util.pageNeedRetry(err, url, npmsite._page_cbs["npm_module"])) {
          return;
        }

        npmsite._syncResults.already.done++;
        npmsite._util.collectErrors(err, url);
        debug("module %d / %d / %d done, success: %d, failure: %d", npmsite._syncResults.already.done, npmsite._syncResults.already.see, npmsite._syncResults.pkg_num, npmsite._syncResults.already.success, ++npmsite._syncResults.already.failure);
        return;
      }

      npmsite._syncResults.already.done++;
      var module = {
        name: "",
        download: null,
        description: "",
        keywords: null
      };

      var $ = cheerio.load(page);

      var urlsub = url.split('/');
      module.name = urlsub[urlsub.length - 1];
      module.description = $("#readme hgroup h2").text();

      var stat = $("div.container div.sidebar ul.box").eq(1).find("li strong");
      var _getStatNum = function(stat) {
        return stat.text().replace(/,/g, "");
      };
      module.download = {
        last_day: _getStatNum(stat.eq(0)),
        last_week: _getStatNum(stat.eq(1)),
        last_month: _getStatNum(stat.eq(2))
      };
      module.keywords = [];
      $("div.container div.sidebar p a").each(function() {
        var href = $(this).attr("href");
        if (href && href.indexOf("/browse/keyword") == 0) {
          module.keywords.push($(this).text());
        }
      });

      // update db
      (function() {
        var time = util.getDayWeekMonth(res.headers.date);
        var saveOpt = {
          safe: true,
          upsert: true
        };
        var errcb = function(err) {
          if (err != null) {
            debug(err);
          }
        };
        var updateAry = function(ary, date, num) {
          for (var i = ary.length - 1; i >= 0; i--) {
            if (Date.equals(date, ary[i].date)) {
              if (ary[i].num != num) {
                ary[i].num = num;
                return true;
              } else {
                return false;
              }
            }
          }

          ary.push({
            date: date,
            num: num
          });
          return true;
        };

        async.series([

          function(done) {
            try {
              npmsite.db.Modules.update({
                name: module.name,
              }, {
                name: module.name,
                description: module.description,
                keyword: module.keywords
              }, saveOpt, function(err) {
                done(err);
              });
            } catch (e) {
              // Exception due to no db connection. Log not needed.
              done();
            }
          },
          function(done) {
            try {
              npmsite.db.Modules.find({
                name: module.name
              }, "weekDld monthDld", function(err, docs) {
                if (docs.length == 0) {
                  util.writeTestLog("Fatal error: " + module.name + " should have been saved to db.");
                } else {
                  var weekch = updateAry(docs[0].weekDld, time.lastWeek, module.download.last_week);
                  var monthch = updateAry(docs[0].monthDld, time.lastMonth, module.download.last_month);
                  if (weekch || monthch) {
                    docs[0].save();
                  }
                }
                done(err);
              });
            } catch (e) {
              // Exception due to no db connection. Log not needed.
              done();
            }
          }
        ], errcb);
      })();

      // debug output
      debug("module: %s | %s | %d | %d | %d", module.name, module.description, module.download.last_day, module.download.last_week, module.download.last_month);
      if (module.keywords.length > 0) {
        debug(module.keywords);
      }

      // Due to npm website, already.see may be less than pkg_num at last. This is not code bug.
      // But already.done must be equal with already.see at last.
      debug("module %d / %d / %d done, success: %d, failure: %d", npmsite._syncResults.already.done, npmsite._syncResults.already.see, npmsite._syncResults.pkg_num, ++npmsite._syncResults.already.success, npmsite._syncResults.already.failure);
    }
  }
};

// sites to grasp
npmsite._sites = [{
  url: "https://www.npmjs.com/",
  page_cb: npmsite._page_cbs["npm_main_page"],
  begin: function() {
    // In case that the download num of main page is not refreshed immediately after a day, here will grasp main page for multiple times.
    Worker.start(this.url, this.page_cb);
    setInterval(function() {
      Worker.start(this.url, this.page_cb);
    }.bind(this), 180 * 1000);
  }
}, {
  url: "https://www.npmjs.com/browse/updated?page=@|replace|@",
  page_cb: npmsite._page_cbs["npm_module_index"],
  begin: function() {
    var _this = this;

    async.series([
      // Wait for total package number to be ready
      function(done) {
        var count = 0;
        var up = 200;
        var err = null;
        var finish = false;

        var timer = setInterval(function() {
          if (npmsite._syncResults.pkg_num > 0) {
            finish = true;
            debug("module index worker gets total pkg number OK");
          } else if (npmsite._syncResults.pkg_num == 0) {
            // pkg_num is set to -1 by default. 0 means there is error with parsing
            finish = true;
            err = "error with getting total pkg number, module index worker cannot start";
          } else if (++count > up) {
            finish = true;
            err = "module index worker cannot get total pkg number within about " + up + " seconds";
          }

          if (finish) {
            clearInterval(timer);
            done(err);
          }
        }, 1000);
      },

      // get module list and then crawl upon every module
      function(done) {
        Worker.start(_this.url, _this.page_cb, require("r...e")(1, npmsite._syncResults.pkg_num / npmsite._util.params.moduleListLen + 1).toArray());
        done();
      }
    ], function(err) {
      if (err != null) {
        debug(err);
      }
    });
  }
}];

module.exports = npmsite;