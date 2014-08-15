var chai = require("chai");
var sinon = require("sinon");
var path = require("path");
var os = require("os");
var fs = require("fs");
var async = require("async");
var get_crawler = require("../../lib/crawler");
var expect = chai.expect;
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

        sleep(),
        function(adone) {
          expect(fs.readFileSync(fake_testlog, "utf-8")).to.eql("Fake crawler start\n" + "Fake crawler finish\n");
          expect(function() {
            crawler.kill();
          }).to.not.
          throw ();
          adone();
        }
      ], function(err) {
        errcb(err);
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
        sleep(),
        function(adone) {
          expect(fs.readFileSync(fake_testlog, "utf-8")).to.eql("Fake crawler start\n" + "Fake crawler killed\n");
          adone();
        }
      ], function(err) {
        errcb(err);
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
      setTimeout(function() {
        expect(crawler._repeatWarn.withArgs("there is already crawler instance").calledOnce).to.be.true;
        crawler._repeatWarn.restore();
        done();
      }, 500);
    });

    it("relaunch crawler after a configurable time", function(done) {
      sinon.spy(crawler, "launch");
      crawler.config({
        args: ["--shortrun"],
        launchNextTimeAfter: 1 / 1000
      });
      crawler.launch();
      setTimeout(function() {
        expect(crawler.launch.callCount).to.be.above(1);
        crawler.launch.restore();
        crawler.kill();
        done();
      }, 500);
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
        sleep(),
        function(adone) {
          expect(crawler.launch.calledThrice).to.be.true;
          expect(crawler._relaunchTooFrequently.calledThrice).to.be.true;
          expect(crawler._repeatWarn.withArgs("crawler relaunch too frequently, stop relaunching").calledOnce).to.be.true;
          crawler.launch.restore();
          crawler._relaunchTooFrequently.restore();
          crawler._repeatWarn.restore();
          adone();
        }
      ], function(err) {
        errcb(err);
        done();
      });
    });
  });
});