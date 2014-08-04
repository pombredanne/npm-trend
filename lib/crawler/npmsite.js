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

  // callbacks to process returned pages
  _page_cbs: {
    npm_main_page: function(err, page, url) {
      if (err != null) {
        debug("%s with %s", err.type, url);
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

      // debug output
      Object.getOwnPropertyNames(npmmain).forEach(function(pty) {
        debug("%s: %d", pty, npmmain[pty]);
      });
      debug("finish %s", url);
    }
  }
};

// sites to grasp
npmsite._sites = [{
  url: "https://www.npmjs.org/",
  page_cb: npmsite._page_cbs["npm_main_page"],
  begin: function() {
    Worker.start(this.url, this.page_cb);
  }
}];

module.exports = npmsite;