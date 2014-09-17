var debug = require("debug")("[db]");
var mongoose = require('mongoose');
var sprintf = require("sprintf-js").sprintf;
var util = require("../util");

module.exports = {
  // Internal use
  _getConnStr: function(config) {
    return config.needAuth ? sprintf("mongodb://%s:%s@%s/%s", config.username, config.passwd, config.address, config.npmtrendDB) : sprintf("mongodb://%s", config.address);
  },

  // TODO: Use npmtrendDB as authDB first. if fails and npmtrendDB is not admin, use admin as authDB to retry
  // Create a db connection for the given config
  connect: function(out_config) {
    var connOpt = {
      server: {
        poolSize: 5,
        socketOptions: {
          keepAlive: 1
        }
      }
    };

    var cb_connected = function() {
      var log = sprintf("Connect %s OK!", this._getConnStr(out_config));
      debug(log);
      util.writeTestLog(log);
    }.bind(this);

    // TODO: should try to reconnect DB
    var cb_disconnected = function() {
      var log = sprintf("Disconnect from %s", this._getConnStr(out_config));
      debug(log);
      util.writeTestLog(log);
      setInterval(function() {
        console.warn("DB disconnected already!");
      }, 5 * 60 * 1000);
    }.bind(this);

    debug("Try to connect %s", this._getConnStr(out_config));
    var conn = mongoose.createConnection(this._getConnStr(out_config), connOpt, function(err) {
      if (err != null) {
        debug("Fail to connect %s with error: %s", this._getConnStr(out_config), err);
      }
    }.bind(this));
    conn.on("connected", cb_connected);
    conn.on("disconnected", cb_disconnected);

    return conn;
  }
};