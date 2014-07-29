'use strict';


var app = angular.module('NebeneinkunftApp', [
	'ngResource',
	'ngCsv'
]);

app.controller('ResultCtrl', function ($scope) {
	$scope.sort = {
		column: 'level',
		descending: false
	};
	$scope.columns = [
		{key: 'level', name: 'Stufe', hint: 'levelname'},
		{key: 'periodical', name: 'Art'},
		{key: 'name', keyhtml: 'urlhtml', name: 'Abgeordnete', class: 'col-sm-2'},
		{key: 'party', name: 'Fraktion', class: 'col-sm-1'},
		{key: 'district', name: 'Wahlkreis', class: 'col-sm-2'},
		{key: 'text', name: 'Beschreibung'}
	];

	$scope.changeSorting = function (column) {
		var sort = $scope.sort;
		if (sort.column == column) {
			sort.descending = !sort.descending;
		} else {
			sort.column = column;
			sort.descending = false;
		}
		$scope.sortList($scope.result);
	};

	$scope.sortList = function (list) {
		list.sort(function (a, b) {
			if (a[$scope.sort.column] < b[$scope.sort.column])
				return $scope.sort.descending ? -1 : 1;
			if (a[$scope.sort.column] > b[$scope.sort.column]) {
				return $scope.sort.descending ? 1 : -1;
			}
			return 0;
		});
	};

	$scope.currentPage = 0;
	$scope.pageSize = 100;
	$scope.selectedCls = function (column) {
		return column == $scope.sort.column && 'sort-' + $scope.sort.descending;
	};

	$scope.setPageSize = function () {
		$scope.pageSize = this.n;
		$scope.currentPage = Math.min($scope.currentPage, $scope.numberOfPages() - 1)
	};

	$scope.showAll = function () {
		$scope.pageSize = 0;
		$scope.currentPage = 0;
	};

	$scope.show_range = function () {
		return [10, 50, 100, 500];
	};

	$scope.pageStart = function () {
		return $scope.currentPage * $scope.pageSize;
	};
	$scope.pageLimit = function () {
		return $scope.pageSize == 0 ? $scope.result.length : $scope.pageSize;
	};

	$scope.numberOfPages = function () {
		if ((!$scope.result) || ($scope.pageSize == 0))
			return 1;
		else
			return Math.ceil($scope.result.length / $scope.pageSize);
	};

	$scope.firstPage = function () {
		$scope.currentPage = 0;
	};

	$scope.lastPage = function () {
		$scope.currentPage = $scope.numberOfPages() - 1;
	};

	$scope.prevPage = function () {
		if ($scope.currentPage > 0) {
			$scope.currentPage--;
		}
	};

	$scope.nextPage = function () {
		if ($scope.currentPage < $scope.numberOfPages() - 1) {
			$scope.currentPage++;
		}
	};

	$scope.setPage = function () {
		$scope.currentPage = this.n;
	};

	$scope.range = function () {
		var ret = [];
		var pages = $scope.numberOfPages();
		var current = $scope.currentPage;
		var start = current - 2;
		var end = current + 3;
		if (start < 0) {
			end += -start;
			start = 0;
		}
		if (end >= pages) {
			start = Math.max(0, start - (end - pages));
			end = pages;
		}
		for (var i = start; i < end; i++) {
			ret.push(i);
		}
		return ret;
	};

	$scope.$watch('fullresult', function (value) {
		if (value) {
			value.forEach(function (entry) {
				if (entry.url)
					entry.urlhtml = '<a href="' + entry.url + '" title="' + entry.url + '">' + entry.name + '</a>';
				entry.levelname = $scope.data.bounds.levels[10 - entry.level].name;
			});
			$scope.sortList(value);
			$scope.result = value;
			$scope.currentPage = 0;
		}
	});

});

app.controller('SearchCtrl', function ($scope, Values) {
	$scope.started = true;
	$scope.loading = true;

	document.getElementById('loading').style.display = "block";
	document.getElementById('view').style.display = "block";

	var matchesQuery = function (q, entry) {
		if ((q.level !== null) && (entry.level.toString() !== q.level.key)) {
			return false;
		}
		if (q.party && (q.party !== entry.party))
			return false;
		if (q.periodical && (q.periodical.key !== entry.periodical))
			return false;
		if (q.typ && (q.typ.key !== entry.typ))
			return false;

		var list = q.text;
		if ((!list) || (list.length == 0))
			return true;
		for (var i = 0; i < list.length; i++) {
			var s = list[i];
			if (
				(entry.name.toLowerCase().indexOf(s) >= 0) ||
				(entry.text.toLowerCase().indexOf(s) >= 0) ||
				(entry.party.toLowerCase().indexOf(s) >= 0) ||
				((entry.district ? entry.district : '').toLowerCase().indexOf(s) >= 0)
				) {
				return true;
			}
		}
		return false;
	};

	var validateQuery = function (q) {
		return {
			level: q.level,
			text: (q.text && q.text.length) ? q.text.split('\n').map(function (s) {
				return s.toLowerCase().trim();
			}) : '',
			periodical: q.periodical,
			party: ($scope.data.bounds.partys.indexOf(q.party) >= 0) ? q.party : null
		};
	};

	var setQueryDesc = function (q, entries) {
		if (entries.length == 0) {
			$scope.querydesc = 'Keine Ergebnisse für diese Suche';
			return;
		}
		var s = entries.length + ' Ergebnis' + ((entries.length > 1) ? 'se ' : ' ');
		if (q.party) {
			s += ' der Fraktion "' + q.party + '"';
		}
		if (q.periodical) {
			s += ' nur ' + q.periodical.name;
		}
		if (q.level) {
			s += ' in Stufe ' + q.level.name;
		}
		if (q.text) {
			s += ' mit Suchbegriffen: "' + q.text.join(',') + '"';
		}
		$scope.querydesc = s;
	};

	if (!$scope.data)
		Values.get({}, function (data) {
			$scope.loading = false;
			$scope.search = {
				party: '',
				name: '',
				typ: null,
				level: null
			};
			$scope.data = data;
		});

	$scope.setCVS = function () {
		if (!$scope.fullresult)
			return;
		$scope.cvs = $scope.fullresult.map(function (entry) {
			return [
				entry.level,
				entry.periodical,
				entry.name,
				entry.party,
				entry.district,
				entry.text,
				entry.url
			]
		}).concat([
			[''],
			[$scope.querydesc]
		]);
	};

	$scope.doSearch = function () {
		var q = validateQuery($scope.search);
		var entries = $scope.data.entries.filter(function (entry) {
			return matchesQuery(q, entry);
		});
		setQueryDesc(q, entries);
		$scope.fullresult = entries;
		$scope.setCVS();
	};
});


//We already have a limitTo filter built-in to angular,
//let's make a startFrom filter
app.filter('startFrom', function () {
	return function (input, start) {
		start = +start; //parse to int
		return input ? input.slice(start) : [];
	}
});

app.factory('Values', function ($resource) {
	'use strict';
	return $resource('data/nebeneinkuenfte.compact.json', {}, {});
});

