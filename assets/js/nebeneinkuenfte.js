$(document).ready(function () {

	/* make tables sortable */
	$('article table').each(function (idx, e) {
		$(e).tablesorter({sortInitialOrder: "desc"});
	});

	/* set content min height */
	$('#main').css("min-height", $(window).innerHeight() - ($('header').outerHeight() + $('footer').outerHeight()));
	$(window).resize(function () {
		$('#main').css("min-height", $(window).innerHeight() - ($('header').outerHeight() + $('footer').outerHeight()));
	});

	/* make tabs linkable */
	if (document.location.hash) $('.nav-tabs a[href=#' + document.location.hash.replace(/[^a-z]/g, '') + ']').tab('show');
	$('.nav-tabs a').on('shown.bs.tab', function (e) {
		$(this).blur();
		window.location.hash = e.target.hash.replace(/^#/, '/');
		var target = $(e.target).attr("href");
		if (target == '#graph')
			rebuildChart();
	});

	/* type of chart data */
	var data_sections = [
		{name: 'Fraktion', 'value': 'fraktionen'},
		{name: 'Geschlecht', 'value': 'gender'},
		{name: 'Bundesland', 'value': 'laender'},
		{name: 'Mandat', 'value': 'mandate'}
	];

	/* get nicer names from json data */
	function getDataName(d) {
		if (d.name)
			return d.name[0].toUpperCase() + d.name.slice(1);
		return (d.type == 'f' ? 'Frauen' : 'Männer');
	}

	/* list of charts */
	var charts = [
		{
			name: 'Anzahl-Verteilung der Stufen',
			data: function (section) {
				return data.data[section.value].map(function (f) {
					return {
						key: getDataName(f),
						values: f.map.map(function (v, index) {
							return {x: index, y: v};
						}).slice(1)
					};
				});
			},
			tooltip: function (key, x, y, e, graph) {
				return '<p>In Stufe ' + x + ':</p><p>' + y + ' ' + key + '</p>';
			},
			x: 'int',
			y: 'int',
			types: ['stacked']
		},

		{
			name: 'Gesamtbetrag (Minimum)',
			data: function (section) {
				return data.data[section.value].map(function (f) {
					return {
						x: getDataName(f),
						y: f.min
					};
				}).sort(function (a, b) {
					return b.y - a.y;
				});
			},
			tooltip: function (key, x, y, e, graph) {
				return '<p>' + x + ':</p><p>' + y + ' ' + key + '</p>';
			},
			y: 'euro',
			types: ['bars', 'pie']
		},

		{
			name: 'Durchschnitt (Minimum)',
			data: function (section) {
				return data.data[section.value].map(function (f) {
					return {
						x: getDataName(f),
						y: f.ratio_min_per_member
					};
				}).sort(function (a, b) {
					return b.y - a.y;
				});
			},
			tooltip: function (key, x, y, e, graph) {
				return '<p>' + x + ':</p><p>' + y + ' ' + key + '</p>';
			},
			y: 'euro',
			types: ['bars', 'pie']
		},

		{
			name: 'Anzahl Abgeordnete mit Nebeneinkünften',
			data: function (section) {
				return data.data[section.value].map(function (f) {
					return {
						x: getDataName(f),
						y: f.earners
					};
				}).sort(function (a, b) {
					return b.y - a.y;
				});
			},
			tooltip: function (key, x, y, e, graph) {
				return '<p>' + x + ': ' + y + ' Abgeordnete mit Nebeneinkünften</p>';
			},
			y: 'int',
			types: ['bars', 'pie']
		},

		{
			name: 'Anteil der Abgeordneten mit Nebeneinkünften',
			data: function (section) {
				return data.data[section.value].map(function (f) {
					return {
						x: getDataName(f),
						y: f.ratio_earners_per_member * 100
					};
				}).sort(function (a, b) {
					return b.y - a.y;
				});
			},
			tooltip: function (key, x, y, e, graph) {
				return '<p>Anteil der Abgeordneten mit Nebeneinkünften: ' + x + ' ' + y + '</p>';
			},
			y: 'percent',
			types: ['bars', 'pie']
		}
	];

	/* add the graph to the dom */
	var addChart = function (series, d, chart) {
		nv.addGraph(function () {

			if (chart.yAxis)
				if (d.y == 'float') {
					chart.yAxis
						.tickFormat(d3.format(',.1f'));
				} else if (d.y == 'percent') {
					chart.yAxis
						.tickFormat(function (v) {
							return d3.format(',.1f')(v) + ' %';
						});
				} else if (d.y == 'euro') {
					chart.yAxis
						.tickFormat(function (v) {
							return d3.format('.0f')(v) + ' €';
						});
				} else if (d.y == 'int') {
					chart.yAxis
						.tickFormat(d3.format('d'));
				}
			if (chart.xAxis)
				if (d.x == 'float') {
					chart.xAxis
						.tickFormat(d3.format(',.1f'));
				} else if (d.x == 'percent') {
					chart.xAxis
						.tickFormat(function (v) {
							return d3.format(',.1f%')(v) + ' %';
						});
				} else if (d.x == 'int') {
					chart.xAxis
						.tickFormat(d3.format('d'));
				}

			if (chart.tooltipContent && d.tooltip) {
				chart.tooltipContent(d.tooltip);
			}

			var svg = d3.select("#chart")
				.append("svg");
			svg.datum(series)
				.call(chart);
			return chart;
		});
	};

	/* check chart types */
	var buildChart = function (c, s, t) {
		if (t == 'pie') {
			var chart = nv.models.pieChart()
				.showLabels(true);
			addChart(c.data(s), c, chart);
		} else if (t == 'bars') {
			var chart = nv.models.discreteBarChart()
					.staggerLabels(true)
					.tooltips(true)
					.showValues(true)
					.transitionDuration(350)
				;

			addChart([
				{key: '', values: c.data(s)}
			], c, chart);
		} else if (t == 'stacked') {
			var chart = nv.models.multiBarChart()
					.transitionDuration(350)
					.reduceXTicks(false)
					.rotateLabels(0)
//					.showControls(false)
					.stacked(true)
//				.groupSpacing(0.1)
				;
			addChart(c.data(s), c, chart);
		}
	};

	/* current chart settings */
	var current = {
		chart: 0,
		data: 0
	};

	/* (re-)builds chart with current settings */
	var rebuildChart = function () {
		var c = charts[current.chart];
		var s = data_sections[current.data];
		var t = c.types[0];
		$('#chart').empty();
		buildChart(c, s, t);
	};

	/* prepare chart selects */
	for (var i = 0; i < charts.length; i++) {
		$('#chart-select').append('<option value="' + i + '">' + charts[i].name + '</option>');
	}
	$('#chart-select').change(function () {
		current.chart = parseInt(this.value);
		rebuildChart();
	});
	for (var i = 0; i < data_sections.length; i++) {
		$('#chart-data-select').append('<option value="' + i + '">' + data_sections[i].name + '</option>');
	}
	$('#chart-data-select').change(function () {
		current.data = parseInt(this.value);
		rebuildChart();
	});
	if (window.location.hash == '#/graph')
		rebuildChart();

});