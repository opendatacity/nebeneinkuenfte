var fs = require('fs');

module.exports.saveCompact = function (fulldata, SITEDIR, callback) {

	var destfile = SITEDIR + '/recherche/data/nebeneinkuenfte.compact.json';

	var periodicals = [
		{key: 'monatlich', name: 'Monatliche Einkünfte'},
		{key: 'jährlich', name: 'Jährliche Einkünfte'},
		{key: 'einmalig', name: 'Einmalige Einkünfte'}
	];
	var levels = [
		{key: '10', name: '10: > € 250.000'},
		{key: '9', name: '9: € 150.000 - € 250.000'},
		{key: '8', name: '8: € 100.000 - € 150.000'},
		{key: '7', name: '7: €  75.000 - € 100.000'},
		{key: '6', name: '6: €  50.000 - €  75.000'},
		{key: '5', name: '5: €  30.000 - €  50.000'},
		{key: '4', name: '4: €  15.000 - €  30.000'},
		{key: '3', name: '3: €   7.000 - €  15.000'},
		{key: '2', name: '2: €   3.000 - €   7.000'},
		{key: '1', name: '1: €   1.000 - €   3.000'},
		{key: '0', name: '0: < € 1.000'}
	];

	var prepareFraktion = function (s) {
		if (s == 'Bündnis 90/Die Grünen')
			return 'Die Grünen';
		return s;
	};

	var prepareText = function (s) {
		var list = s.split(',');
		return list.filter(function (p) {
			return [
				'Stufe 0',
				'Stufe 1',
				'Stufe 2',
				'Stufe 3',
				'Stufe 4',
				'Stufe 5',
				'Stufe 6',
				'Stufe 7',
				'Stufe 8',
				'Stufe 9',
				'Stufe 10',
				'jährlich',
				'monatlich'
			].indexOf(p.trim()) < 0;
		}).join(',');
	};

	var data = [];
	fulldata.data.forEach(function (entry) {
		entry.nebeneinkuenfte.forEach(function (nentry) {
			var result = {
				name: entry.name,
				district: (entry.wahlkreis ? entry.wahlkreis.slice(10) : null),
				party: prepareFraktion(entry.fraktion),
				level: nentry.level,
				periodical: nentry.periodical,
				text: prepareText(nentry.text),
				url: entry.url
			};
			if (nentry.year)
				result.year = nentry.year;
			if (nentry.end)
				result.end = nentry.end;
			data.push(result);
		});
	});

	var bounds = {partys: [], levels: levels, periodicals: periodicals};
	data.forEach(function (entry) {
		if (bounds.partys.indexOf(entry.party) < 0)
			bounds.partys.push(entry.party);
	});

	fs.writeFileSync(destfile, JSON.stringify({
		bounds: bounds,
		entries: data
	}));

	callback();

};