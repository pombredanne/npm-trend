var debug = require("debug")("[Worker]");
var http = require("http");
var https = require("https");
var HTTPStatus = require("http-status");

var worker = {
  // url: a single page url like: "http://www.baidu.com", or a pattern url like "https://www.foo.com/?seq=@|replace|@". "@|replace|@" will be replace by the range
  // page_cb: the callback to process returned page
  // range: array elements to be replaced with in url
  start: function(url, page_cb, range) {
    var err = "";
    var http_protocol;
    debug("Create worker for %s", url);

    // check params
    if (!/^https?:\/\/.+/.test(url)) {
      err += ('url must start with http:// or https://' + "\n");
    }

    if (typeof(page_cb) != "function") {
      err += ('callback function for returned page missed' + "\n");
    }

    if (range != null && !Array.isArray(range)) {
      err += ('"range" param must be array' + "\n");
    }

    if (err != "") {
      debug("Exception: %s", err);
      throw new Error(err);
    }

    // check protocol
    http_protocol = url.indexOf("https") == 0 ? https : http;

    // just grasp a single page
    if (range == null) {
      worker._grasp(url, http_protocol, page_cb);
      return;
    }

    // grasp multiple pages
    range.forEach(function(e) {
      worker._grasp(url.replace("@|replace|@", e), http_protocol, page_cb);
    });
  },

  // grasp a page and process
  _grasp: function(url, http_protocol, page_cb) {
    http_protocol.get(url, function(res) {
      debug("get response of %s", url);

      // not 200 OK
      if (res.statusCode != 200) {
        debug("http response %d for %s: %s", res.statusCode, url, HTTPStatus[res.statusCode]);
        page_cb({
          type: "response error",
          response: res
        }, null, url);

        return;
      }

      // 200 OK
      var page = "";
      res.setEncoding("utf8");
      res.on("data", function(chunk) {
        page += chunk;
      }).on("end", function() {
        debug("http response ok for %s", url);
        page_cb(null, page, url);
      });
    }).on("error", function(e) {
      debug("http request error when getting %s: %s", url, e.message);
      page_cb({
        type: "request error",
        excp: e
      }, null, url);
    });
  }
};

module.exports = worker;