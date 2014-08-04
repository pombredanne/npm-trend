var debug = require("debug")("[npmsite]");
var cheerio = require('cheerio');
var async = require("async");
var Worker = require("./worker");

var npmsite = {
  // start grasping of www.npmjs.org
  startGrasp: function() {
    npmsite._sites.forEach(function(site) {
      site.begin();
    });
  },

  // sync results of some workers that are necessary for other workers
  _syncResults: {
    pkg_num: -1
  },

  // callbacks to process returned pages
  _page_cbs: {
    npm_main_page: function(err, page, url) {
      if (err != null) {
        debug("%s with %s", err.type, url);

        // sync result
        npmsite._syncResults.pkg_num = 0;
        return;
      }

      var $ = cheerio.load(page);
      var npmmain = {
        pkg_num: -1,
        download_last_day: -1,
        download_last_week: -1,
        download_last_month: -1
      };

      // get total package number
      var raw_pkg_num = $("#index p").first().text();
      if (raw_pkg_num.indexOf("Total Packages:") == 0) {
        npmmain.pkg_num = /\d+/.exec(raw_pkg_num.replace(/\s/g, ""))[0];
      } else {
        debug("cannot get total package number");
      }

      // get download traffic
      var raw_downloads = $("#index table.downloads td");
      var _getDownlad = function(seq, noun) {
        if (raw_downloads.eq(seq + 1).text().indexOf("downloads in the last " + noun) > -1) {
          npmmain["download_last_" + noun] = /\d+/.exec(raw_downloads.eq(seq).text().replace(/\s/g, ""))[0];
        } else {
          debug("cannot get download count of last %s", noun);
        }
      };
      _getDownlad(0, "day");
      _getDownlad(2, "week");
      _getDownlad(4, "month");

      // sync result
      npmsite._syncResults.pkg_num = npmmain.pkg_num;

      // debug output
      Object.getOwnPropertyNames(npmmain).forEach(function(pty) {
        debug("%s: %d", pty, npmmain[pty]);
      });
      debug("finish %s", url);
    },

    npm_module_index: function(err, page, url) {}
  }
};

// sites to grasp
npmsite._sites = [{
  url: "https://www.npmjs.org/",
  page_cb: npmsite._page_cbs["npm_main_page"],
  begin: function() {
    Worker.start(this.url, this.page_cb);
  }
}, {
  url: "https://www.npmjs.org/browse/updated/@|replace|@",
  page_cb: npmsite._page_cbs["npm_module_index"],
  begin: function() {
    var _this = this;

    async.series([

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
      function(done) {
        Worker.start(_this.url, _this.page_cb, require("r...e")(0, npmsite._syncResults.pkg_num / 100 + 1).toArray());
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