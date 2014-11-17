// This is used to cache the evaluation result from db query

// data: the data object to be cached
// expire: 60 mins by default
var CacheItem = function(data, expire) {
  expire |= 60;
  this.data = data;
  this._expire = Date.now() + expire * 60 * 1000;
};

CacheItem.prototype.expire = function() {
  return Date.now() - this._expire > 0;
};

// Every cache item is this object by default, thus it is always expired
var _initObj = new CacheItem(null, -1);

module.exports = {
  // Don't abuse cache. Here explicitly preserves the place for what kind of content to be cached.
  // And also gives the recommended time for expiration
  cache: {
    // Cache the origin docs queried from db
    db: {
      // Docs from "totalpkgs"
      // Expire: 60mins
      totalPkg: _initObj
    },

    // Cache the data for chart
    chart: {
      // Chart of weekly increasement of total modules
      // Expire: 60mins
      ttPkgWeeklyDelta: _initObj
    }
  },
  CacheItem: CacheItem
};