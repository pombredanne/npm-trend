var expect = require("chai").expect;
var sinon = require("sinon");
var path = require("path");
var os = require("os");
var fs = require("fs");
var get_crawler = require("../../lib/crawler");

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
      "config"
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

    it("could launch crawler", function(done) {
      crawler.config({
        args: ["--shortrun"]
      });

      expect(function() {
        crawler.launch();
      }).to.not.
      throw ();

      setTimeout(function() {
        expect(fs.readFileSync(fake_testlog, "utf-8")).to.eql("Fake crawler start\n" + "Fake crawler finish\n");
        done();
      }, 1000);
    });
  });
});