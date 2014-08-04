var chai = require("chai");
var sinon = require("sinon");
var Worker = require("../../lib/crawler/worker");
var express = require("express");
var fs = require("fs");
var expect = chai.expect;
chai.config.includeStack = true;

describe("Worker to get page", function() {
  // fake website for worker testing
  var app;
  var http_server;
  var https_server;

  before(function() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    app = express();
    app.get("/single", function(req, res) {
      res.send("single");
    });
    app.get("/error", function(req, res) {
      res.send(404, "not found");
    });
    app.get("/test/1", function(req, res) {
      res.send("test1");
    });
    app.get("/test/2", function(req, res) {
      res.send(304);
    });
    app.get("/test/3", function(req, res) {
      res.send("test3");
    });
    http_server = app.listen(56789);
    https_server = require("https").createServer({
      key: fs.readFileSync(__dirname + "/../../lib/crawler/fake/key.pem"),
      cert: fs.readFileSync(__dirname + "/../../lib/crawler/fake/key-cert.pem")
    }, app);
    https_server.listen(56790);
  });

  after(function() {
    http_server.close();
    https_server.close();
  });

  describe("params check", function() {
    it("url format requirement", function() {
      ["", "abc", 'http:/123', 'https//', 'http://'].forEach(function(url) {
        expect(function() {
          Worker.start(url);
        }).to.
        throw (Error, /url must start with/);
      });
    });

    it("page callback function required", function() {
      expect(function() {
        Worker.start('http://test');
      }).to.
      throw (Error, /callback function for returned page missed/);
    });

    it("range must be array if given", function() {
      expect(function() {
        Worker.start('http://test', function() {}, "")
      }).to.
      throw (Error, /"range" param must be array/);
    });
  });

  describe("single page", function() {
    it("no error page", function() {
      var page_cb = function(err, page, url) {
        expect(err).to.be.null;
        expect(page).to.eql("single");
        expect(/^https?:\/\/localhost:567\d\d\/single$/.test(url)).to.be.true;
      };
      Worker.start('http://localhost:56789/single', page_cb);
      Worker.start('https://localhost:56790/single', page_cb);
    });

    it("error page", function() {
      var page_cb = function(err, page) {
        expect(page).to.be.null;
        expect(err.type).to.eql("response error");
      };
      Worker.start('http://localhost:56789/error', page_cb);
      Worker.start('https://localhost:56790/error', page_cb);
    });

    it("error with request", function() {
      var page_cb = function(err, page) {
        expect(page).to.be.null;
        expect(err.type).to.eql("request error");
      };
      Worker.start('http://localhost:99999/error', page_cb);
      Worker.start('https://123/error', page_cb);
    });
  });

  describe("multiple pages", function() {
    it("error and no error page coexist", function() {
      var page_cb = function(err, page, url) {
        if (url.indexOf("test1") > -1) {
          expect(err).to.be.null;
          expect(page).to.eql("test1");
        } else if (url.indexOf("test2") > -1) {
          expect(page).to.be.null;
          expect(err.res.statusCode).to.eql(304);
        } else if (url.indexOf("test3") > -1) {
          expect(err).to.be.null;
          expect(page).to.eql("test3");
        }
      };
      var next = function(cur) {
        return cur + 1;
      };
      Worker.start('http://localhost:56789/test/@|replace|@', page_cb, [1, 2, 3]);
      Worker.start('https://localhost:56790/test@|replace|@', page_cb, [1, 2, 3]);
    });
  });
});