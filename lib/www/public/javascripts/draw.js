$(function() {
  // Unpack #datapack node and show data
  var datapack = JSON.parse(decodeURIComponent($("#datapack").attr("value")));

  // Total modules
  if (datapack.ttpkg) {
    $("#ttpkg").append("<h2>Lastest total NPM modules: " + datapack.ttpkg.num + " at " + datapack.ttpkg.date + "</h2>");
  }

  // Weekly increasement chart of total modules
  if (datapack.deltaPkgChart && !datapack.deltaPkgChart.empty) {
    var chart = datapack.deltaPkgChart;

    (function() {
      var lst = chart.series.data[chart.series.data.length - 1];
      var sec = Math.round(7 * 24 * 3600 / lst);
      var hour = parseInt(sec / 3600);
      sec -= hour * 3600;
      var min = parseInt(sec / 60);
      sec -= min * 60;

      var f = function(num, s) {
        return num.toString() + " " + s + (num > 1 ? "s" : "");
      };
      var s = f(hour, "hour") + " " + f(min, "minute") + " " + f(sec, "second");

      $("#ttpkg").after("<h2>A new NPM module is born every " + s + "</h2>" + "<br/><br/><br/>");
    })();

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
  }
});