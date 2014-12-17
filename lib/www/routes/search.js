var router = require('express').Router();
var db = require("../util/db");

router.get("/", function(req, res, next) {
  if(req.query.wd == "") {
    res.render("search", {
      datapack: null
    })
  }

  // TODO: improve results of searching
  db["Modules"].find({
    name: req.query.wd
  }, function(err, docs) {
    if(err) {
      next(err);
    }

    res.render("search", {
      datapack: docs
    });
  });
});

module.exports = router;