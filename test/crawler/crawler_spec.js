//TODO: Need code coverage test
var chai = require("chai");
var sinon = require("sinon");
var path = require("path");
var os = require("os");
var fs = require("fs");
var async = require("async");
var get_crawler = require("../../lib/crawler");
var expect = chai.expect;
var test_util = require("../test_util");
chai.config.includeStack = true;

var errcb = test_util.errcb;
var sleep = test_util.sleep;

describe("Crawler object", function() {
  var crawler;
  var fake_cl = path.normalize(__dirname + "/../../lib/crawler/fake/cl.js");
  var fake_testlog = path.join(os.tmpdir(), "/npm-trend.fakecl.log");

  beforeEach(function() {
    crawler = get_crawler();
  });

  it("Property check", function() {
    [
      "_relaunchTooFrequently",
      "_repeatWarn",
      "launch",
      "kill",
      "config",
      "_test"
    ].forEach(function(prty) {
      expect(crawler).to.have.ownProperty(prty);
    });
  });

  describe("launch, relaunch, kill Crawler process", function() {
    beforeEach(function() {
      crawler.config({
        cwl_file: fake_cl
      });
    });

    it("throw error if cannot find crawler process", function() {
      crawler.config({
        cwl_file: "./no"
      });

      expect(function() {
        crawler.launch();
      }).to.
      throw (Error);
    });

    it("could launch crawler, no exception if kill after crawler exit", function(done) {
      crawler.config({
        args: ["--shortrun"]
      });

      expect(function() {
        crawler.launch();
      }).to.not.
      throw ();

      async.series([

        function(adone) {
          async.until(function() {
            if (fs.existsSync(fake_testlog)) {
              return fs.readFileSync(fake_testlog, "utf-8") == "Fake crawler start\n" + "Fake crawler finish\n";
            } else {
              return false;
            }
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            expect(function() {
              crawler.kill();
            }).to.not.
            throw ();
            adone();
          });
        }
      ], function(err) {
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });

    it("could kill running crawler", function(done) {
      crawler.config({
        args: ["--longrun"]
      });

      crawler.launch();
      async.series([
        sleep(),
        function(adone) {
          crawler.kill();
          adone();
        },
        function(adone) {
          async.until(function() {
            if (fs.existsSync(fake_testlog)) {
              return fs.readFileSync(fake_testlog, "utf-8") == "Fake crawler start\n" + "Fake crawler killed\n";
            } else {
              return false;
            }
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            adone();
          });
        }
      ], function(err) {
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });

    it("will warn if there is already crawler instance", function(done) {
      require("child_process").fork(fake_cl, ["--longrun"]);

      sinon.spy(crawler, "_repeatWarn");
      crawler.config({
        args: ["--multiinst"]
      });
      crawler.launch();
      async.until(function() {
        return crawler._repeatWarn.withArgs("there is already crawler instance").calledOnce;
      }, function(cb) {
        setTimeout(cb, 100);
      }, function() {
        crawler._repeatWarn.restore();
        done();
      });
    });

    it("relaunch crawler after a configurable time", function(done) {
      sinon.spy(crawler, "launch");
      crawler.config({
        args: ["--shortrun"],
        launchNextTimeAfter: 1 / 1000
      });
      crawler.launch();
      async.until(function() {
        return crawler.launch.callCount > 1;
      }, function(cb) {
        setTimeout(cb, 100);
      }, function() {
        crawler.launch.restore();
        crawler.kill();
        done();
      });
    });

    it("warn if crawler relaunch too frequently", function(done) {
      sinon.spy(crawler, "launch");
      sinon.spy(crawler, "_relaunchTooFrequently");
      sinon.spy(crawler, "_repeatWarn");
      crawler.config({
        args: ["--longrun"],
        duringLimit: 60,
        relaunchQLen: 2
      });
      crawler.launch();

      async.series([
        sleep(),
        function(adone) {
          process.kill(crawler._test.crawler_pid(), "SIGINT");
          adone();
        },
        sleep(),
        function(adone) {
          process.kill(crawler._test.crawler_pid(), "SIGINT");
          adone();
        },
        sleep(),
        function(adone) {
          process.kill(crawler._test.crawler_pid(), "SIGINT");
          adone();
        },
        function(adone) {
          async.until(function() {
            return crawler.launch.calledThrice && crawler._relaunchTooFrequently.calledThrice && crawler._repeatWarn.withArgs("crawler relaunch too frequently, stop relaunching").calledOnce;
          }, function(cb) {
            setTimeout(cb, 100);
          }, function() {
            crawler.launch.restore();
            crawler._relaunchTooFrequently.restore();
            crawler._repeatWarn.restore();
            adone();
          });
        }
      ], function(err) {
        errcb(err);
        expect(err).to.be.null;
        done();
      });
    });
  });
});