var express = require('express');
var router = express.Router();
var db = require("../util/db");

require("date-utils");

/* GET home page. */
router.get('/', function(req, res, next) {
  db.TotalPkg.find(function(err, docs) {
    if (err) {
      next(err);
    }

    var lst = docs[docs.length - 1];
    res.render('index', {
      ttpkg: {
        num: lst.num,
        date: new Date(lst.date).toYMD()
      }
    });
  });
});

module.exports = router;
