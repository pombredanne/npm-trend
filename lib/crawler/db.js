var debug = require("debug")("[db]");
var mongoose = require('mongoose');
var sprintf = require("sprintf-js").sprintf;
var util = require("../util");
var _ = require("underscore");

module.exports = {
  // Get connection string for given db config
  _getConnStr: function(config) {
    return config.needAuth ? sprintf("mongodb://%s:%s@%s/%s", config.username, config.passwd, config.address, config.authDB) : sprintf("mongodb://%s", config.address);
  },

  // Schema option
  _schemaOption: {
    safe: true,
    strict: true
  },

  // TODO: If needs validator?
  // Schemas for db
  _schemas: {
    TotalPkg: {
      date: Date,
      num: Number
    },

    TotalDayDld: {
      date: Date,
      num: Number
    },

    TotalWeekDld: {
      date: Date,
      num: Number
    },

    TotalMonthDld: {
      date: Date,
      num: Number
    },

    Modules: {
      name: {
        type: String,
        index: { // Mongoose doc says direction doesn't matter for single key index
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

  // Connection instance, assigned later
  _conn: null,

  // Model, instantiated later
  TotalPkg: null,
  TotalDayDld: null,
  TotalWeekDld: null,
  TotalMonthDld: null,
  Modules: null,

  // Get connection state
  ready: function() {
    if (this._conn == null) {
      return false;
    }
    return this._conn.readyState == 1;
  },

  // Create a db connection for the given config
  connect: function(out_config) {
    out_config.authDB = out_config.npmtrendDB;

    var connOpt = {
      db: {
        native_parser: true
      },
      server: {
        auto_reconnect: true, // Doc says true by default
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

    // Reconnection failures will trigger this event. Just swallow it
    var cb_error = function(err) {};

    var cb_disconnected = function() {
      this._conn.close();

      var log = sprintf("Disconnect from %s", this._getConnStr(out_config));
      debug(log);
      util.writeTestLog(log);
      setInterval(function() {
        console.warn("DB disconnected already!");
      }, 5 * 60 * 1000);
    }.bind(this);

    // callback for mongoose.createConnection
    var cb_conn = function(err) {
      // Fails to connect, could use admin as authDB to retry
      if (err != null) {
        debug(err.message);
        if (out_config.authDB != "admin") {
          out_config.authDB = "admin";
          go();
        }
      } else {
        // Instantiate db models
        var Schema = mongoose.Schema;
        _.pairs(this._schemas).forEach(function(pair) {
          this[pair[0]] = this._conn.model(pair[0], new Schema(pair[1], this._schemaOption));
        }.bind(this));

        this._conn.on("disconnected", cb_disconnected);
      }
    }.bind(this);

    var go = function() {
      debug("Try to connect %s", this._getConnStr(out_config));
      this._conn = mongoose.createConnection(this._getConnStr(out_config), connOpt, cb_conn);
      this._conn.on("connected", cb_connected);
      this._conn.on("error", cb_error);
    }.bind(this);

    go();

    return this;
  }
};