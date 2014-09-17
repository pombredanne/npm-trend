var debug = require("debug")("[db]");
var mongoose = require('mongoose');
var sprintf = require("sprintf-js").sprintf;
var util = require("../util");
var _ = require("underscore");

//TODO: any test needed for this module?
module.exports = {
  // Internal use
  _getConnStr: function(config) {
    return config.needAuth ? sprintf("mongodb://%s:%s@%s/%s", config.username, config.passwd, config.address, config.npmtrendDB) : sprintf("mongodb://%s", config.address);
  },

  // Schemas for db
  _schemas: {
    Total: {
      pkgNum: [{
        date: Date,
        num: Number
      }],
      dayDld: [{
        date: Date,
        num: Number
      }],
      weekDld: [{
        date: Date,
        num: Number
      }],
      monthDld: [{
        date: Date,
        num: Number
      }]
    },

    Modules: {
      name: {
        type: String,
        index: {
          unique: true
        }
      },
      description: String,
      keyword: [String],
      weekDld: [{
        date: Date,
        num: Number
      }],
      monthDld: [{
        date: Date,
        num: Number
      }]
    }
  },

  // Model, instantiated later
  Total: null,

  // Model, instantiated later
  Modules: null,

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
      else {
        var Schema = mongoose.Schema;
        _.pairs(this._schemas).forEach(function(pair) {
          this[pair[0]] = conn.model(pair[0], new Schema(pair[1]))
        });
      }
    }.bind(this));
    conn.on("connected", cb_connected);
    conn.on("disconnected", cb_disconnected);

    return this;
  }
};