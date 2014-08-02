var debug = require("debug")("[worker]");
var http = require("http");
var https = require("https");
var HTTPStatus = require("http-status");

var worker = {
  // url: a single page url like: "http://www.baidu.com", or a pattern url like "https://www.foo.com/?seq=@|replace|@". "@|replace|@" will be replace by the range [start_point, end_point]
  // page_cb: the callback to process returned page
  // start_point: the start string/number to be replaced with
  // end_point: the end string/number to be replaced with
  // next: callback function to enumerate the range [start_point, end_point]
  start: function(url, page_cb, start_point, end_point, next) {
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

    if (next != null && typeof(next) != "function") {
      err += ('"next" param must be a function' + "\n");
    }

    if (err != "") {
      debug("Exception: %s", err);
      throw new Error(err);
    }

    // check protocol
    http_protocol = url.indexOf("https") == 0 ? https : http;

    // just grasp a single page
    if (next == null) {
      worker._grasp(url, http_protocol, page_cb);
      return;
    }

    // grasp multiple pages
    var cur_point = start_point;
    while (true) {
      worker._grasp(url.replace("@|replace|@", cur_point), http_protocol, page_cb);
      if (cur_point === end_point) {
        return;
      }
      cur_point = next(cur_point);
    }
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
      res.setEncoding("utf8");
      res.on("data", function(chunk) {
        debug("http response ok for %s", url);
        page_cb(null, chunk, url);
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