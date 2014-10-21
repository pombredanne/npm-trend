var debug = require("debug")("[db]");
var mongoose = require('mongoose');
var sprintf = require("sprintf-js").sprintf;
var util = require("../util");
var _ = require("underscore");
var Schema = mongoose.Schema;

var _totalSch = {
  date: {
    type: Date,
    index: {
      unique: true
    }
  },
  num: Number
};

// Get connection string for given db config
var _getConnStr = function(config) {
  return config.needAuth ? sprintf("mongodb://%s:%s@%s/%s", config.username, config.passwd, config.address, config.authDB) : sprintf("mongodb://%s", config.address);
};

// Schema option
var _schemaOption = {
  safe: true,
  strict: true
};

// Schemas for db
var _schemas = {
  TotalPkg: _totalSch,
  TotalDayDld: _totalSch,
  TotalWeekDld: _totalSch,
  TotalMonthDld: _totalSch,

  Modules: {
    name: {
      type: String,
      index: { // Mongoose doc says direction doesn't matter for single key index
        unique: true
      }
    },
    description: String,
    keyword: [String],

    // Be careful, mongodb could not ensure uniqueness on single sub doc. So no need to use sub doc, just using array is enough
    weekDld: [{
      date: Date,
      num: Number
    }],
    monthDld: [{
      date: Date,
      num: Number
    }]
  }
};

var db = function(config) {
  // authDB property is used by _getConnStr. Firstly, use npmtrendDB as authDB
  config.authDB = config.npmtrendDB;
  this._config = config;

  // Connection instance
  this._conn = null;

  // Model
  // Ensure the model name here is same as the schema name of _schemas
  this.TotalPkg = null;
  this.TotalDayDld = null;
  this.TotalWeekDld = null;
  this.TotalMonthDld = null;
  this.Modules = null;
};

db.prototype._getConnStr = _getConnStr;
db.prototype._schemaOption = _schemaOption;

// Get connection state
db.prototype.ready = function() {
  if (this._conn == null) {
    return false;
  }
  return this._conn.readyState == 1;
};

// Close connection
db.prototype.disconnect = function() {
  if (this.ready()) {
    this._conn.removeAllListeners("disconnected");
    this._conn.close();
  }
};

// Create a db connection for the given config
db.prototype.connect = function() {
  if (this.ready()) {
    return;
  }

  var out_config = this._config;
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

  // callback for event connected
  var cb_connected = function() {
    var log = sprintf("Connect %s OK!", _getConnStr(out_config));
    debug(log);
    util.writeTestLog(log);
  };

  // Reconnection failures will trigger this event. Just swallow it
  var cb_error = function(err) {};

  // callback for event disconnected
  var cb_disconnected = function() {
    var log = sprintf("Disconnect from %s", _getConnStr(out_config));
    debug(log);
    util.writeTestLog(log);

    var warn = setInterval(function() {
      if (this.ready()) {
        clearInterval(warn);
      } else {
        console.warn("DB disconnected already!");
      }
    }.bind(this), 5 * 60 * 1000);
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
      _.pairs(_schemas).forEach(function(pair) {
        this[pair[0]] = this._conn.model(pair[0], new Schema(pair[1], _schemaOption));
      }.bind(this));

      this._conn.on("disconnected", cb_disconnected);
    }
  }.bind(this);

  var go = function() {
    debug("Try to connect %s", _getConnStr(out_config));
    this._conn = mongoose.createConnection(_getConnStr(out_config), connOpt, cb_conn);
    this._conn.on("connected", cb_connected);
    this._conn.on("error", cb_error);
  }.bind(this);

  // Trigger connection
  go();
};

module.exports = db;
