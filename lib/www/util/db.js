var DBmon = require("../../public/db");
var dbconfig = require("../../public/db_config");

var db = new DBmon(dbconfig);
db.connect();
module.exports = db;
