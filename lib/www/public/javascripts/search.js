$(function() {
  // Unpack #datapack node and show data
  var datapack = JSON.parse(decodeURIComponent($("#datapack").attr("value")));
  var getMarkA = function(href, text) {
    return '<h3><a target="_blank" href="' + href + '">' + text + '</a></h3>'
  }
  var getDescription = function(text) {
    return '<h4>' + text + '</h4>';
  }
  var getChartDiv = function(chartid) {
    return '<div id="' + chartid + '"></div>';
  }

  if (datapack.length == 0) {
    $("#sresult").append("<h3>No result.</h3>");
  } else if (datapack.length == 1) {
    // TODO: keyword and monthDld data is not used
    var res = datapack[0];

    $("#sresult").before("</br>");
    $("#sresult").append(getMarkA("https://www.npmjs.com/package/" + res.name, res.name));
    if (res.description && res.description != "") {
      $("#sresult").append(getDescription(res.description));
    }

    if (res.weekDld.length == 0) {
      return;
    }

    // Show chart of weekDld
    var chartid = "chart_" + Math.random().toString().slice(2);
    $("#sresult").append(getChartDiv(chartid));

    NPMTrend.Chart.drawTrafficChart("#" + chartid, {
      chartTitle: "Weekly traffic",
      xMinRangeDay: 14,
      xInterval: 14,
      yTitle: "Traffic",
      mouseOnPlotText: "Count",
      data: res.weekDld.map(function(e) {
        return [Date.UTC(e.date.substr(0, 4), parseInt(e.date.substr(5, 2)) - 1, e.date.substr(8, 2)), e.num];
      })
    });
  } else {
    // TODO: show more if there is more
  }
});