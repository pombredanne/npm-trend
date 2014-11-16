$(function() {
  // Draw the weekly delta chart of total npm modules
  (function() {
    var chart = JSON.parse(decodeURIComponent($("#chartData_deltaWeekTotalPkg").attr("value")));

    if (chart.series.data.length == 0) {
      return;
    }

    var lst = chart.series.data[chart.series.data.length - 1];
    if (lst > 0) {
      var sec = Math.round(7 * 24 * 3600 / lst);
      var hour = parseInt(sec / 3600);
      sec -= hour * 3600;
      var min = parseInt(sec / 60);
      sec -= min * 60;

      var f = function(num, s) {
        return num.toString() + " " + s + (num > 1 ? "s" : "");
      };
      var s = f(hour, "hour") + " " + f(min, "minute") + " " + f(sec, "second");

      $("#main > h2").first().after("<h2>A new NPM module is born every " + s + "</h2>");
    }

    $('#chartContainer_deltaWeekTotalPkg').highcharts({
      chart: {
        zoomType: 'x'
      },
      title: {
        text: chart.title
      },
      subtitle: {
        text: document.ontouchstart === undefined ?
          'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
      },
      xAxis: {
        type: 'datetime',
        minRange: 3 * 7 * 24 * 3600 * 1000,
        tickInterval: 7 * 24 * 3600 * 1000
      },
      yAxis: {
        title: {
          text: 'Increasement'
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
        type: 'area',
        name: chart.series.name,
        pointInterval: chart.series.pointInterval,
        pointStart: Date.UTC(chart.series.pointStart.year, chart.series.pointStart.month, chart.series.pointStart.day),
        data: chart.series.data
      }]
    });
  })();
});