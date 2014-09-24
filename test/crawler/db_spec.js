var chai = require("chai");
var expect = chai.expect;
var path = require("path");
var os = require("os");
var fs = require("fs-extra");
var db = require("../../lib/crawler/db");
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf;
var async = require("async");
var Mongodb = require("mongodb").Db;
var MongoServer = require("mongodb").Server;
var util = require("../util");
chai.config.includeStack = true;

var errcb = util.errcb;
var sleep = util.sleep;

//TODO: not enough test
describe("db", function() {
  var dbport = (50000 + parseInt(10000 * Math.random())).toString();
  var dbdir = path.join(os.tmpdir(), "/" + dbport.toString());
  var dblog = path.join(dbdir, "/" + Math.random().toString());
  var dbconfig = null;
  var dbcmd_noauth = sprintf("mongod --port %s --dbpath %s --logpath %s", dbport, dbdir, dblog);
  var dbcmd_auth = dbcmd_noauth + " --auth";

  before(function(done) {
    fs.removeSync(dbdir);
    fs.mkdirSync(dbdir);

    // prepare db test user
    var mongod = exec(dbcmd_noauth);
    var conn = null;
    async.series([
      sleep(),
      function(adone) {
        conn = new Mongodb("test", new MongoServer("localhost", parseInt(dbport)));
        conn.open(function(err) {
          expect(err).to.be.null;
          conn.addUser("tusr", "123456", function(err) {
            expect(err).to.be.null;
            adone();
          })
        });
      },
      function(adone) {
        conn.admin().addUser("rusr", "123456", function(err) {
          expect(err).to.be.null;
          conn.close();
          adone();
        });
      }
    ], function(err) {
      mongod.kill();
      errcb(err);
      done();
    });
  });

  after(function() {
    fs.removeSync(dbdir);
  });

  beforeEach(function() {
    dbconfig = {
      "address": "localhost:" + dbport,
      "npmtrendDB": "",
      "needAuth": true,
      "username": "",
      "passwd": ""
    };

    fs.removeSync(dblog);
  });

  describe("connection", function() {
    it("give right connection string", function() {
      dbconfig.npmtrendDB = "test";
      dbconfig.username = "root";
      dbconfig.passwd = "123456";
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
      dbconfig.npmtrendDB = "test";
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

    it("connect with auth, not admin user", function(done) {
      var mongod = exec(dbcmd_auth);
      dbconfig.npmtrendDB = "test";
      dbconfig.username = "tusr";
      dbconfig.passwd = "123456";
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
          var log = fs.readFileSync(dblog);
          expect(db.ready()).to.be.false;
          expect(/connection accepted from/.test(log)).to.be.true;
          expect(/authenticate db: test.*user: "tusr"/.test(log)).to.be.true;
          expect(/auth: couldn't find user tusr@test/.test(log)).to.be.false;
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

    it("connect with auth, could retry with admin user", function(done) {
      var mongod = exec(dbcmd_auth);
      dbconfig.npmtrendDB = "test";
      dbconfig.username = "rusr";
      dbconfig.passwd = "123456";
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
          var log = fs.readFileSync(dblog);
          expect(db.ready()).to.be.false;
          expect(/connection accepted from/.test(log)).to.be.true;
          expect(/authenticate db: test.*user: "rusr"/.test(log)).to.be.true;
          expect(/authenticate db: admin.*user: "rusr"/.test(log)).to.be.true;
          expect(/auth: couldn't find user rusr@test/.test(log)).to.be.true;
          expect(/auth: couldn't find user rusr@admin/.test(log)).to.be.false;
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