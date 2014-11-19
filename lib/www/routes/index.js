var express = require('express');
var router = express.Router();
var db = require("../util/db");
var globalCache = require("../util/cache").cache;
var CacheItem = require("../util/cache").CacheItem;
var bsearch = require("binary-search");
var async = require("async");

require("date-utils");

// Get delta data of total npm modules between every week for drawing chart
function getDeltaPkgChart(docs) {
  if (!globalCache.chart["ttPkgWeeklyDelta"].expire()) {
    return globalCache.chart["ttPkgWeeklyDelta"].data;
  }

  if (!docs) {
    return null;
  }

  var weekStartDate = new Date(docs[0].date);
  var weekEndDate = weekStartDate.clone().addWeeks(1);
  var endDate = new Date(docs[docs.length - 1].date);

  var pointStart = {
    year: weekEndDate.getUTCFullYear(),
    month: weekEndDate.getUTCMonth(),
    day: weekEndDate.getUTCDate()
  };
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
      // TODO: Will data loss make chart ugly?
      data.push(0);
    } else {
      data.push(7 * Math.round((docs[weekE].num - docs[weekS].num) / (new Date(docs[weekS].date).getDaysBetween(new Date(docs[weekE].date)))));
    }

    weekStartDate.addWeeks(1);
    weekEndDate.addWeeks(1);
  }

  globalCache.chart["ttPkgWeeklyDelta"] = new CacheItem({
    title: "Increasement of NPM modules every week",
    series: {
      name: "Increasement",
      pointInterval: 7 * 24 * 3600 * 1000,
      pointStart: pointStart,
      data: data,
    },
    empty: data.length == 0
  });

  return globalCache.chart["ttPkgWeeklyDelta"].data;
}

// Prepare data at regular intervals
(function prepareData() {
  // TotalPkg docs
  var getTotalPkg = function() {
    if (globalCache.db["totalPkg"].expire()) {
      try {
        db.TotalPkg.find(function(err, docs) {
          if (err) {
            // TODO: need persistent log
            console.log(err);
          } else {
            globalCache.db["totalPkg"] = new CacheItem(docs);
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
      getTotalPkg();
      setTimeout(getTotalPkg, 60 * 1000);
    });
  })();
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
      deltaPkgChart: getDeltaPkgChart(ttpkgDocs)
    }
  });
});

module.exports = router;