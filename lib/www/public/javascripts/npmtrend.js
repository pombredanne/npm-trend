// Global namespace
var NPMTrend = {
  Chart: {
    drawTrafficChart: function(selector, opt) {
      $(selector).highcharts({
        chart: {
          zoomType: 'x'
        },
        title: {
          text: opt.chartTitle
        },
        subtitle: {
          text: document.ontouchstart === undefined ?
            'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        xAxis: {
          type: 'datetime',
          minRange: opt.xMinRangeDay * 24 * 3600 * 1000,
          tickInterval: opt.xInterval * 24 * 3600 * 1000,
          dateTimeLabelFormats: {
            day: '%Y-%m-%d',
            week: '%Y-%m-%d',
            month: '%Y-%m'
          }
        },
        yAxis: {
          floor: 0,
          title: {
            text: opt.yTitle
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
          name: opt.mouseOnPlotText,
          data: opt.data
        }]
      });
    }
  }
};