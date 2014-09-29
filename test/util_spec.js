var crawler_util = require("../lib/util");
var chai = require("chai");
var expect = chai.expect;
chai.config.includeStack = true;

describe("crawler util", function() {
  describe("getDayWeekMonth", function() {
    var crossMonth = "Wed, 3 Sep 2014 14:53:51 GMT";
    var crossYear = "Wed, 1 Jan 2014 14:53:51 GMT";

    it("could only accept string", function() {
      [Date.now(), new Date(crossMonth)].forEach(function(e) {
        expect(function() {
          crawler_util.getDayWeekMonth(e);
        }).to.
        throw (Error);
      });

      expect(function() {
        crawler_util.getDayWeekMonth(crossMonth);
      }).to.not.
      throw ();
    });

    it("should calculate right dates", function() {
      var cdt = crawler_util.getDayWeekMonth(crossMonth);
      expect(Date.equals(cdt.today, new Date("Wed, 3 Sep 2014 00:00:00 GMT"))).to.be.true;
      expect(Date.equals(cdt.lastDay, new Date("Wed, 2 Sep 2014 00:00:00 GMT"))).to.be.true;
      expect(Date.equals(cdt.lastWeek, new Date("Sun, 24 Aug 2014 00:00:00 GMT"))).to.be.true;
      expect(Date.equals(cdt.lastMonth, new Date("Fri, 1 Aug 2014 00:00:00 GMT"))).to.be.true;

      cdt = crawler_util.getDayWeekMonth(crossYear);
      expect(Date.equals(cdt.today, new Date("Wed, 1 Jan 2014 00:00:00 GMT"))).to.be.true;
      expect(Date.equals(cdt.lastDay, new Date("Tue, 31 Dec 2013 00:00:00 GMT"))).to.be.true;
      expect(Date.equals(cdt.lastWeek, new Date("Sun, 22 Dec 2013 00:00:00 GMT"))).to.be.true;
      expect(Date.equals(cdt.lastMonth, new Date("Sun, 1 Dec 2013 00:00:00 GMT"))).to.be.true;
    });
  });
});