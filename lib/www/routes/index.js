var express = require('express');
var router = express.Router();
var db = require("../util/db");
var bsearch = require("binary-search");

require("date-utils");

// Get delta data of total npm modules between every week for drawing chart
function getDeltaPkgChart(docs) {
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

  return {
    title: "Increasement of NPM modules every week",
    series: {
      name: "Increasement",
      pointInterval: 7 * 24 * 3600 * 1000,
      pointStart: pointStart,
      data: data // Don't draw the chart if data is empty
    }
  };
}

/* GET home page. */
router.get('/', function(req, res, next) {
  db.TotalPkg.find(function(err, docs) {
    if (err) {
      next(err);
    }

    if (docs.length < 1) {
      res.render("index_nodata");
      return;
    }

    var lst = docs[docs.length - 1];
    res.render('index', {
      ttpkg: {
        num: lst.num,
        date: new Date(lst.date).toYMD()
      },
      deltaPkgChart: JSON.stringify(getDeltaPkgChart(docs))
    });
  });
});

module.exports = router;