module.exports = {
  errcb: function(err) {
    if (err != null) {
      console.error(err.message);
      console.error(err.stack);
    }
  },

  sleep: function(time) {
    return function(done) {
      setTimeout(done, time == null ? 500 : time);
    };
  }
}