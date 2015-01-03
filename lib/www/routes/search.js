var router = require('express').Router();
var db = require("../util/db");

router.get("/", function(req, res, next) {
  if(req.query.wd == "") {
    res.render("search", {
      datapack: null,
      qstring: req.query.wd
    })

    return;
  }

  // TODO: improve results of searching
  db["Modules"].find({
    name: req.query.wd
  }, function(err, docs) {
    if(err) {
      next(err);
    }

    // TODO: need paging here if too many docs
    res.render("search", {
      datapack: docs,
      qstring: req.query.wd
    });
  });
});

module.exports = router;