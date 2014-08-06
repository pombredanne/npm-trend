var chai = require("chai");
var sinon = require("sinon");
var path = require("path");
var os = require("os");
var fs = require("fs");
var get_crawler = require("../../lib/crawler");
var expect = chai.expect;
chai.config.includeStack = true;

describe("Crawler object", function() {
  var crawler;
  var fake_cl = path.normalize(__dirname + "/../../lib/crawler/fake/cl.js");
  var fake_testlog = path.join(os.tmpdir(), "/npm-trend.fakecl.log");

  beforeEach(function() {
    crawler = get_crawler();
  });

  afterEach(function() {
    if (fs.existsSync(fake_testlog)) {
      fs.unlink(fake_testlog, function(e) {
        if (e != null) {
          console.error(e);
        }
      });
    }
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

      setTimeout(function() {
        expect(fs.readFileSync(fake_testlog, "utf-8")).to.eql("Fake crawler start\n" + "Fake crawler finish\n");
        expect(function() {
          crawler.kill();
        }).to.not.
        throw ();
        done();
      }, 500);
    });

    it("could kill running crawler", function(done) {
      crawler.config({
        args: ["--longrun"]
      });
      crawler.launch();
      setTimeout(function() {
        crawler.kill();
        setTimeout(function() {
          expect(fs.readFileSync(fake_testlog, "utf-8")).to.eql("Fake crawler start\n" + "Fake crawler killed\n");
          done();
        }, 500);
      }, 500);
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
      setTimeout(function() {
        process.kill(crawler._test.crawler_pid(), "SIGINT");
        setTimeout(function() {
          process.kill(crawler._test.crawler_pid(), "SIGINT");
          setTimeout(function() {
            process.kill(crawler._test.crawler_pid(), "SIGINT");
            setTimeout(function() {
              expect(crawler.launch.calledThrice).to.be.true;
              expect(crawler._relaunchTooFrequently.calledThrice).to.be.true;
              expect(crawler._repeatWarn.withArgs("crawler relaunch too frequently, stop relaunching").calledOnce).to.be.true;
              crawler.launch.restore();
              crawler._relaunchTooFrequently.restore();
              crawler._repeatWarn.restore();
              done();
            }, 500);
          }, 500);
        }, 500);
      }, 500);
    });
  });
});