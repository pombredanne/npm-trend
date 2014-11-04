var debug = require("debug")("[Worker]");
var request = require("request");
var HTTPStatus = require("http-status");
var util = require("../util");
var gconfig = require("./cl_config.json");

var worker = {
  // url: a single page url like: "http://www.baidu.com", or a pattern url like "https://www.foo.com/?seq=@|replace|@". "@|replace|@" will be replace by the range
  // page_cb: the callback to process returned page
  // range: array elements to be replaced with in url
  start: function(url, page_cb, range) {
    var err = "";
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

    // wrap the page callback
    var pcb_wrap = function(err, page, url, res) {
      try {
        page_cb(err, page, url, res);
      } catch (e) {
        util.writeTestLog(e.message + "\n" + e.stack);
      }
    };

    // just grasp a single page
    if (range == null) {
      worker._grasp(url, pcb_wrap);
      return;
    }

    // grasp multiple pages
    range.forEach(function(e) {
      worker._grasp(url.replace("@|replace|@", e), pcb_wrap);
    });
  },

  // retry grasping page for some errors
  _err_should_retry: [
    "socket hang up", // response timeout compared with the request's timeout

    // most likely that the socket connect() call fails. see http://stackoverflow.com/questions/16772519/socket-recv-on-selected-socket-failing-with-etimedout
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",

    // this means DNS name resolving fails. but for this crawler this is not DNS issue. it is a bug of nodejs of some version
    // see https://github.com/joyent/node/issues/5545
    // some says that setting http request option "agent" to false could resolve, and some says just sending request again will resolve
    "getaddrinfo ENOTFOUND",

    // server side TCP connection closed
    "read ECONNRESET"
  ],

  // concurrent limit of http request
  _concurrent: {
    limit: gconfig.maxSockets, // will impact concurrency performance
    instance: 0 // how many requests have been sent
  },

  // grasp a page and process
  _grasp: function(url, page_cb) {
    // delay request for a random time if too many requests now
    if (!(worker._concurrent.instance < worker._concurrent.limit)) {
      setTimeout(worker._grasp, 500 + 2000 * Math.random(), url, page_cb);
      return;
    }

    worker._concurrent.instance++;
    request({
      url: url,
      method: "get",
      followRedirect: true,
      timeout: gconfig.httpGetTimeout * 1000,
      encoding: "utf-8"
    }, function(err, res) {
      worker._concurrent.instance--;

      if (err != null) {
        // retry for some errors
        for (var i = 0; i < worker._err_should_retry.length; i++) {
          if (err.message.indexOf(worker._err_should_retry[i]) > -1) {
            debug("retry action for http error when getting %s: %s", url, err.message);
            worker._grasp(url, page_cb);
            return;
          }
        };

        debug("http error when getting %s: %s", url, err.message);
        console.error(err.stack);

        page_cb({
          type: "request error",
          excp: err
        }, null, url);
      } else {
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

        // 200 ok
        debug("http response ok for %s", url);
        page_cb(null, res.body, url, res);
      }
    });
  }
};

module.exports = worker;