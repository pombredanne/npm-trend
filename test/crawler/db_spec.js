var chai = require("chai");
var expect = chai.expect;
var path = require("path");
var os = require("os");
var fs = require("fs-extra");
var db = require("../../lib/crawler/db");
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf;
var async = require("async");
chai.config.includeStack = true;

var errcb = function(err) {
  if (err != null) {
    console.error(err.message);
    console.error(err.stack);
  }
};

var sleep = function(time) {
  return function(done) {
    setTimeout(done, time == null ? 500 : time);
  };
};

//TODO: not enough test
describe("db", function() {
  var dbport = (50000 + parseInt(10000 * Math.random())).toString();
  var dbdir = path.join(os.tmpdir(), "/" + dbport.toString());
  var dblog = path.join(dbdir, "/" + Math.random().toString());
  var dbconfig = null;
  var dbcmd_noauth = sprintf("mongod --port %s --dbpath %s --logpath %s", dbport, dbdir, dblog);
  var dbcmd_auth = dbcmd_auth + " --auth";

  before(function() {
    fs.removeSync(dbdir);
    fs.mkdirSync(dbdir);
  });

  after(function() {
    fs.removeSync(dbdir);
  });

  beforeEach(function() {
    dbconfig = {
      "address": "localhost:" + dbport,
      "npmtrendDB": "test",
      "needAuth": true,
      "username": "root",
      "passwd": "123456"
    };

    fs.removeSync(dblog);
  });

  describe("connection", function() {
    it("give right connection string", function() {
      dbconfig.authDB = dbconfig.npmtrendDB;
      expect(db._getConnStr(dbconfig)).to.equal("mongodb://root:123456@localhost:" + dbport + "/test");
      dbconfig.needAuth = false;
      expect(db._getConnStr(dbconfig)).to.equal("mongodb://localhost:" + dbport);
    });

    it("should be disconnected by default", function() {
      expect(db.ready()).to.be.false;
    })

    it("connect without auth", function(done) {
      var mongod = exec(dbcmd_noauth);
      dbconfig.needAuth = false;
      async.series([
        sleep(),
        function(adone) {
          db.connect(dbconfig);
          adone();
        },
        sleep(),
        function(adone) {
          expect(db.ready()).to.be.true;
          mongod.kill();
          adone();
        },
        sleep(),
        function(adone) {
          expect(db.ready()).to.be.false;
          expect(/connection accepted from/.test(fs.readFileSync(dblog))).to.be.true;
          adone();
        }
      ], function(err) {
        if (err != null && mongod != null) {
          mongod.kill();
        }
        errcb(err);
        done();
      });
    });
  });
});