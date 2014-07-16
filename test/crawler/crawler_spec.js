var expect = require("chai").expect;
var sinon = require("sinon");
var get_crawler = require("../../lib/crawler");

describe("Crawler object", function() {
  var crawler;

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

  // describe("launch", function() {
  //   it("could launch and kill crawler", function() {
  //   });
  // });
});