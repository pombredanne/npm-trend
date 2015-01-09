$(function() {
  // Unpack #datapack node and show data
  var datapack = JSON.parse(decodeURIComponent($("#datapack").attr("value")));

  // Total modules
  if (datapack.ttpkg) {
    $("#text_sta").append("<h2>Lastest total NPM modules: " + datapack.ttpkg.num + " at " + datapack.ttpkg.date + "</h2>");
  }

  // Frequency of a newly born npm module
  if (datapack.deltaWeekTotalPkgChart && !datapack.deltaWeekTotalPkgChart.empty) {
    var chart = datapack.deltaWeekTotalPkgChart;
    var lst = chart.series.data[chart.series.data.length - 1][3];
    var sec = Math.round(7 * 24 * 3600 / lst);
    var hour = parseInt(sec / 3600);
    sec -= hour * 3600;
    var min = parseInt(sec / 60);
    sec -= min * 60;

    var f = function(num, s) {
      return num.toString() + " " + s + (num > 1 ? "s" : "");
    };
    var s = f(hour, "hour") + " " + f(min, "minute") + " " + f(sec, "second");

    $("#text_sta").append("<h2>A new NPM module is born every " + s + "</h2>");
  }

  // Frequency of download traffic in one second
  if (datapack.weeklyDldChart && !datapack.weeklyDldChart.empty) {
    var chart = datapack.weeklyDldChart;
    var len = chart.series.data.length;
    $("#text_sta").append("<h2>" + Math.round(chart.series.data[len - 1][3] / (7 * 24 * 3600)) + " modules are required from npmjs.org every second</h2>");
  }

  // Draw chart
  ["deltaWeekTotalPkg", "dailyDld", "weeklyDld", "monthlyDld"].forEach(function(chtstr) {
    if (!datapack[chtstr + "Chart"] || datapack[chtstr + "Chart"].empty) {
      return;
    }

    var chart = datapack[chtstr + "Chart"];
    var opt = {
      deltaWeekTotalPkg: {
        prefix: "",
        minRange: 14,
        intv: 14,
        ytext: "Increasement",
        dotname: "Increasement"
      },
      dailyDld: {
        prefix: "Daily ",
        minRange: 3,
        intv: 14,
        ytext: "Traffic",
        dotname: "Count"
      },
      weeklyDld: {
        prefix: "Weekly ",
        minRange: 14,
        intv: 14,
        ytext: "Traffic",
        dotname: "Count"
      },
      monthlyDld: {
        prefix: "Monthly ",
        minRange: 60,
        intv: 30,
        ytext: "Traffic",
        dotname: "Count"
      }
    };

    NPMTrend.Chart.drawTrafficChart("#chartContainer_" + chtstr, {
      chartTitle: opt[chtstr].prefix + chart.title,
      xMinRangeDay: opt[chtstr].minRange,
      xInterval: opt[chtstr].intv,
      yTitle: opt[chtstr].ytext,
      mouseOnPlotText: opt[chtstr].dotname,
      data: chart.series.data.map(function(e) {
        return [Date.UTC(e[0], e[1], e[2]), e[3]]
      })
    });
  });
});