var express = require('express');
var router = express.Router();
var db = require("../util/db");
var globalCache = require("../util/cache").cache;
var CacheItem = require("../util/cache").CacheItem;
var bsearch = require("binary-search");
var async = require("async");
var _ = require("underscore");
_.mixin(require("underscore.string").exports());

require("date-utils");

// Get delta data of total npm modules between every week for drawing chart
function getDeltaPkgChart(docs) {
  if (!globalCache.chart["ttPkgWeeklyDelta"].expire()) {
    return globalCache.chart["ttPkgWeeklyDelta"].data;
  }

  if (!docs || docs.length == 0) {
    return null;
  }

  var weekStartDate = new Date(docs[0].date);
  var weekEndDate = weekStartDate.clone().addWeeks(1);
  var endDate = new Date(docs[docs.length - 1].date);
  var data = [];

  // If we lost data of some day, eg. 2014-10-01. We can also use 09-30 or 10-02 to mitigate effect of the data loss
  var findClosestOf = function(tdate) {
    var comp = function(a, b) {
      return Date.compare(new Date(a.date), new Date(b.date));
    };

    var where = bsearch(docs, {
      date: tdate.toLocaleString()
    }, comp);
    if (where >= 0) {
      return where;
    }

    where = bsearch(docs, {
      date: tdate.removeDays(1).toLocaleString()
    }, comp);
    if (where >= 0) {
      return where;
    }

    where = bsearch(docs, {
      date: tdate.addDays(2).toLocaleString()
    }, comp);

    return where >= 0 ? where : -1;
  }

  while (Date.compare(weekEndDate, endDate) <= 0) {
    var weekS = findClosestOf(weekStartDate.clone());
    var weekE = findClosestOf(weekEndDate.clone());

    if (weekS == -1 || weekE == -1) {
      // Lose data of this week, just do nothing
    } else {
      data.push([weekEndDate.getUTCFullYear(), weekEndDate.getUTCMonth(), weekEndDate.getUTCDate(), 7 * Math.round((docs[weekE].num - docs[weekS].num) / (new Date(docs[weekS].date).getDaysBetween(new Date(docs[weekE].date))))]);
    }

    weekStartDate.addWeeks(1);
    weekEndDate.addWeeks(1);
  }

  globalCache.chart["ttPkgWeeklyDelta"] = new CacheItem({
    title: "Increasement of NPM modules every week",
    series: {
      data: data,
    },
    empty: data.length == 0
  });

  return globalCache.chart["ttPkgWeeklyDelta"].data;
}

// Get chart of download traffic
var getDldTrafficChart = function(tb) {
  if (!globalCache.chart[tb].expire()) {
    return globalCache.chart[tb].data;
  }

  var docs = globalCache.db[tb].data;

  if (!docs || docs.length == 0) {
    return null;
  }

  var data = docs.map(function(d) {
    var dt = new Date(d.date);
    return [dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), d.num];
  });

  globalCache.chart[tb] = new CacheItem({
    title: "download traffic of NPM modules", // to be added with prefix "Daily, Weekly, Monthly"
    series: {
      data: data,
    },
    empty: data.length == 0
  });

  return globalCache.chart[tb].data;
};

// Prepare data at regular intervals
(function prepareData() {
  // console.log(_.capitalize("abc"));
  ["totalPkg", "totalDayDld", "totalWeekDld", "totalMonthDld"].forEach(function(tb) {
    var populateCache = function() {
      if (globalCache.db[tb].expire()) {
        try {
          db[_.capitalize(tb)].find(function(err, docs) {
            if (err) {
              // TODO: need persistent log
              console.log(err);
            } else {
              globalCache.db[tb] = new CacheItem(docs);
            }
          });
        } catch (e) {
          // TODO: need persistent log
          console.log(e.stack);
        }
      }
    };

    // Try to populate cache asap
    (function() {
      var cnt = 0;
      async.until(function() {
        return cnt == 100 || db.ready();
      }, function(done) {
        cnt++;
        setTimeout(done, 100);
      }, function() {
        populateCache();
        setTimeout(populateCache, 60 * 1000);
      });
    })();
  });
})();

/* GET home page. */
router.get('/', function(req, res, next) {
  var ttpkgDocs = globalCache.db["totalPkg"].data;

  res.render('index', {
    datapack: {
      ttpkg: (function() {
        if (!ttpkgDocs || ttpkgDocs.length < 1) {
          return null;
        }

        var lst = ttpkgDocs[ttpkgDocs.length - 1];
        return {
          num: lst.num,
          date: new Date(lst.date).toYMD()
        };
      })(),

      deltaWeekTotalPkgChart: getDeltaPkgChart(ttpkgDocs),
      dailyDldChart: getDldTrafficChart("totalDayDld"),
      weeklyDldChart: getDldTrafficChart("totalWeekDld"),
      monthlyDldChart: getDldTrafficChart("totalMonthDld")
    }
  });
});

module.exports = router;