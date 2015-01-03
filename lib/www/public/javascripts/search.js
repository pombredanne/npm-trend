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
    var chartid = "chart_" + res.name;
    $("#sresult").append(getChartDiv(chartid));

    // TODO: dup chart code, need refactor
    $("#" + chartid).highcharts({
      chart: {
        zoomType: 'x'
      },
      title: {
        text: "Weekly traffic"
      },
      subtitle: {
        text: document.ontouchstart === undefined ?
          'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
      },
      xAxis: {
        type: 'datetime',
        minRange: 14 * 24 * 3600 * 1000,
        tickInterval: 14 * 24 * 3600 * 1000,
        dateTimeLabelFormats: {
          day: '%Y-%m-%d',
          week: '%Y-%m-%d',
          month: '%Y-%m'
        }
      },
      yAxis: {
        title: {
          text: "Traffic"
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1
            },
            stops: [
              [0, Highcharts.getOptions().colors[0]],
              [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
            ]
          },
          marker: {
            radius: 2
          },
          lineWidth: 1,
          states: {
            hover: {
              lineWidth: 1
            }
          },
          threshold: null
        }
      },

      series: [{
        name: "Count",
        data: res.weekDld.map(function(e) {
          return [Date.UTC(e.date.substr(0, 4), parseInt(e.date.substr(5, 2)) - 1, e.date.substr(8, 2)), e.num];
        })
      }]
    });
  } else {
    // TODO: show more if there is more
  }
});