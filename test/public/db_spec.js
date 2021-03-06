var chai = require("chai");
var expect = chai.expect;
var path = require("path");
var os = require("os");
var fs = require("fs-extra");
var DB = require("../../lib/public/db");
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf;
var async = require("async");
var Mongodb = require("mongodb").Db;
var MongoServer = require("mongodb").Server;
var test_util = require("../test_util");
chai.config.includeStack = true;

var errcb = test_util.errcb;
var sleep = test_util.sleep;

describe("db", function() {
  var dbport = (50000 + parseInt(10000 * Math.random())).toString();
  var dbdir = "./npmtrend.test.db.tmp";
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
      expect(err).to.be.null;
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

      var db = new DB(dbconfig);
      expect(db._getConnStr(dbconfig)).to.equal("mongodb://root:123456@localhost:" + dbport + "/test");
      dbconfig.needAuth = false;
      expect(db._getConnStr(dbconfig)).to.equal("mongodb://localhost:" + dbport);
    });

    it("should be disconnected by default", function() {
      var db = new DB(dbconfig);
      expect(db.ready()).to.be.false;
    })

    it("connect without auth", function(done) {
      var mongod = exec(dbcmd_noauth);
      dbconfig.npmtrendDB = "test";
      dbconfig.needAuth = false;

      var db = new DB(dbconfig);
      async.series([
        sleep(),
        function(adone) {
          db.connect();
          adone();
        },
        function(adone) {
          async.until(function() {
            return db.ready();
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            mongod.kill();
            adone();
          });
        },
        function(adone) {
          async.until(function() {
            return !db.ready();
          }, function(cb) {
            // Attention, do not set the timeout value too small. At a heavy load machine, timeout of small value may always make other event
            // postponed indefinitely. Thus unable to wait for the expected result to come since the necessary calculation is starved.
            setTimeout(cb, 300);
          }, function() {
            expect(/connection accepted from/.test(fs.readFileSync(dblog))).to.be.true;
            adone();
          });
        }
      ], function(err) {
        if (err != null && mongod != null) {
          mongod.kill();
        }
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });

    it("connect with auth, not admin user", function(done) {
      var mongod = exec(dbcmd_auth);
      dbconfig.npmtrendDB = "test";
      dbconfig.username = "tusr";
      dbconfig.passwd = "123456";

      var db = new DB(dbconfig);
      async.series([
        sleep(),
        function(adone) {
          db.connect();
          adone();
        },
        function(adone) {
          async.until(function() {
            return db.ready();
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            mongod.kill();
            adone();
          });
        },
        function(adone) {
          async.until(function() {
            return !db.ready();
          }, function(cb) {
            setTimeout(cb, 300);
          }, function() {
            var log = fs.readFileSync(dblog);
            expect(/connection accepted from/.test(log)).to.be.true;
            expect(/authenticate db: test.*user: "tusr"/.test(log)).to.be.true;
            expect(/auth: couldn't find user tusr@test/.test(log)).to.be.false;
            adone();
          });
        }
      ], function(err) {
        if (err != null && mongod != null) {
          mongod.kill();
        }
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });

    it("connect with auth, could retry with admin user", function(done) {
      var mongod = exec(dbcmd_auth);
      dbconfig.npmtrendDB = "test";
      dbconfig.username = "rusr";
      dbconfig.passwd = "123456";

      var db = new DB(dbconfig);
      async.series([
        sleep(),
        function(adone) {
          db.connect();
          adone();
        },
        function(adone) {
          async.until(function() {
            return db.ready();
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            mongod.kill();
            adone();
          });
        },
        function(adone) {
          async.until(function() {
            return !db.ready();
          }, function(cb) {
            setTimeout(cb, 300);
          }, function() {
            var log = fs.readFileSync(dblog);
            expect(/connection accepted from/.test(log)).to.be.true;
            expect(/authenticate db: test.*user: "rusr"/.test(log)).to.be.true;
            expect(/authenticate db: admin.*user: "rusr"/.test(log)).to.be.true;
            expect(/auth: couldn't find user rusr@test/.test(log)).to.be.true;
            expect(/auth: couldn't find user rusr@admin/.test(log)).to.be.false;
            adone();
          });
        }
      ], function(err) {
        if (err != null && mongod != null) {
          mongod.kill();
        }
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });

    it("could disconnect", function(done) {
      var mongod = exec(dbcmd_noauth);
      dbconfig.npmtrendDB = "test";
      dbconfig.needAuth = false;

      var db = new DB(dbconfig);
      async.series([
        sleep(),
        function(adone) {
          db.connect();
          adone();
        },
        function(adone) {
          async.until(function() {
            return db.ready();
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            db.disconnect();
            adone();
          });
        },
        function(adone) {
          async.until(function() {
            return !db.ready();
          }, function(cb) {
            setTimeout(cb, 300);
          }, function() {
            adone();
          });
        },
        sleep(300),
        function(adone) {
          expect(/end connection/.test(fs.readFileSync(dblog))).to.be.true;
          mongod.kill();
          adone();
        }
      ], function(err) {
        if (err != null && mongod != null) {
          mongod.kill();
        }
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });
  });

  describe("schema", function() {
    beforeEach(function() {
      dbconfig.npmtrendDB = "test";
      dbconfig.username = "tusr";
      dbconfig.passwd = "123456";
    });

    it("schema option must be strict", function() {
      var db = new DB(dbconfig);
      expect(db._schemaOption.strict).to.be.true;
    });

    it("verify models", function() {
      var db = new DB(dbconfig);
      expect(db).to.have.property("TotalPkg");
      expect(db).to.have.property("TotalDayDld");
      expect(db).to.have.property("TotalWeekDld");
      expect(db).to.have.property("TotalMonthDld");
      expect(db).to.have.property("Modules");
    });

    ["TotalPkg", "TotalDayDld", "TotalWeekDld", "TotalMonthDld"].forEach(function(model) {
      it(model + ", including uniqueness check", function(done) {
        var mongod = exec(dbcmd_auth);
        var doc = {
          date: new Date(Date.now()),
          num: 100
        };

        var db = new DB(dbconfig);
        async.series([
          sleep(),
          function(adone) {
            db.connect();
            adone();
          },
          sleep(),
          function(adone) {
            db[model].create(doc, function(err) {
              expect(err).to.be.null;
              adone();
            });
          },
          function(adone) {
            db[model].find({
              date: doc.date
            }, function(err, docs) {
              expect(err).to.be.null;
              expect(docs[0].date).to.deep.equal(doc.date);
              expect(docs[0].num).to.equal(doc.num);
              adone();
            });
          },
          function(adone) {
            db[model].create(doc, function(err) {
              expect(err.err).to.match(/duplicate key.*date/);
              adone();
            });
          }
        ], function(err) {
          mongod.kill();
          errcb(err);
          expect(err).to.be.null;
          done();
        });
      });
    });

    it("Models, including uniqueness check", function(done) {
      var mongod = exec(dbcmd_auth);
      var doc = {
        name: "npm",
        description: "node modules",
        keyword: ["node", "package distribution"],
        weekDld: [{
          date: new Date(Date.now() - 5000),
          num: 100
        }, {
          date: new Date(Date.now()),
          num: 500
        }],
        monthDld: [{
          date: new Date(Date.now() - 50000),
          num: 1000
        }]
      };

      var db = new DB(dbconfig);
      async.series([
        sleep(),
        function(adone) {
          db.connect();
          adone();
        },
        sleep(),
        function(adone) {
          db.Modules.create(doc, function(err) {
            expect(err).to.be.null;
            adone();
          });
        },
        function(adone) {
          db.Modules.find({
            name: doc.name
          }, function(err, docs) {
            expect(err).to.be.null;

            var find = docs[0];
            expect(find.name).to.equal(doc.name);
            expect(find.description).to.equal(doc.description);
            expect(find.keyword).to.have.same.members(doc.keyword);
            ["weekDld", "monthDld"].forEach(function(field) {
              find[field].forEach(function(e, idx) {
                expect(e.num).to.equal(doc[field][idx].num);
                expect(e.date).to.deep.equal(doc[field][idx].date);
              });
            });
            adone();
          });
        },
        function(adone) {
          db.Modules.create(doc, function(err) {
            expect(err.err).to.match(/duplicate key.*name/);
            adone();
          });
        }
      ], function(err) {
        mongod.kill();
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });
  });
});