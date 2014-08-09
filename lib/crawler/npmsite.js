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

  // Util functions
  _util: {
    getDownloads: function(raw_downloads) {
      var result = {
        last_day: 0,
        last_week: 0,
        last_month: 0
      };

      for (var i = 0; i < raw_downloads.length; i += 2) {
        var noun = /day|week|month$/.exec(raw_downloads.eq(i + 1).text());
        if (noun != null) {
          result["last_" + noun[0]] = /\d+/.exec(raw_downloads.eq(i).text().replace(/\s/g, ""))[0];
        }
      }

      return result;
    }
  },

  // sync results of some workers that are necessary for other workers
  _syncResults: {
    pkg_num: -1,
    already: {
      done: 0,
      success: 0,
      failure: 0
    }
  },

  // callbacks to process returned pages
  _page_cbs: {
    npm_main_page: function(err, page, url) {
      if (err != null) {
        // sync result
        npmsite._syncResults.pkg_num = 0;
        return;
      }

      var $ = cheerio.load(page);
      var npmmain = {
        pkg_num: -1,
        download: null
      };

      // get total package number
      var raw_pkg_num = $("#index p").first().text();
      if (raw_pkg_num.indexOf("Total Packages:") == 0) {
        npmmain.pkg_num = /\d+/.exec(raw_pkg_num.replace(/\s/g, ""))[0];
      } else {
        debug("cannot get total package number");
      }

      // get download traffic
      npmmain.download = npmsite._util.getDownloads($("#index table.downloads td"));

      // sync result
      npmsite._syncResults.pkg_num = npmmain.pkg_num;

      // debug output
      debug("npm packages: %d | %d | %d | %d", npmmain.pkg_num, npmmain.download.last_day, npmmain.download.last_week, npmmain.download.last_month);
      debug("finish %s", url);
    },

    npm_module_index: function(err, page, url) {
      if (err != null) {
        return;
      }

      var $ = cheerio.load(page);
      var list = $("div#package div.row p a");
      var length = list.get().length;

      // empty page
      if (length == 0) {
        debug("%s is empty page", url);
        return;
      }

      // get modules
      var texts = $("div#package div.row p");
      var modules = [];
      for (var i = 0; i < length; i++) {
        modules.push({
          name: list.eq(i).text(),
          last_update: /\d{4}-\d{2}-\d{2}$/.exec(texts.eq(i).text().replace(/\s/g, ""))[0]
        });
      }

      // debug output and crawl upon every module
      modules.forEach(function(module) {
        debug("module: %s, last updated at: %s", module.name, module.last_update);
        Worker.start("https://www.npmjs.org/package/" + module.name, npmsite._page_cbs["npm_module"]);
      });
    },

    npm_module: function(err, page, url) {
      npmsite._syncResults.already.done++;

      if (err != null) {
        debug("module %d / %d done, success: %d, failure: %d", npmsite._syncResults.already.done, npmsite._syncResults.pkg_num, npmsite._syncResults.already.success, ++npmsite._syncResults.already.failure);
        return;
      }

      var module = {
        name: "",
        download: null,
        description: "",
        keywords: null
      };

      var $ = cheerio.load(page);

      // TODO: some modules' download data is only available when logon
      module.name = $("#package header h1").text();
      module.download = npmsite._util.getDownloads($("#package table.downloads td"));
      module.description = $("#package p.description").text();

      var metas = $("#package table.metadata th");
      metas.each(function(i, e) {
        if ($(this).text() == "Keywords") {
          module.keywords = [];
          $(this).parent().find("a").each(function(i, e) {
            module.keywords.push($(this).text());
          });
        }
      });

      // debug output
      debug("module: %s | %s | %d | %d | %d", module.name, module.description, module.download.last_day, module.download.last_week, module.download.last_month);
      if (module.keywords != null) {
        debug(module.keywords);
      }
      debug("module %d / %d done, success: %d, failure: %d", npmsite._syncResults.already.done, npmsite._syncResults.pkg_num, ++npmsite._syncResults.already.success, npmsite._syncResults.already.failure);
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
}, {
  url: "https://www.npmjs.org/browse/updated/@|replace|@",
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