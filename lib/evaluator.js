#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var moment = require("moment");

module.exports = function(data, callback) {
	
	var _stufen_min = [0,1000,3500,7000,15000,30000,50000,75000,100000,150000,250000];
//	var _stufen_max = [0,3500,7000,15000,30000,50000,75000,100000,150000,250000,Infinity];

	var _begin = moment("2013-09-22");
	var _end = moment();

	var _personen = {};
	var _fraktionen = {};
	var _mandate = {};
	var _ausschuesse = {};
	var _laender = {};
	var _gender = {};
	var _gesamt = { "members": 0, "earners": 0, "items": 0, "min": 0, "map": {} };

	data.forEach(function(d){
	
		if (!_personen.hasOwnProperty(d.name)) _personen[d.name] = {};
		if (!_fraktionen.hasOwnProperty(d.fraktion)) _fraktionen[d.fraktion] = { "members": 0, "earners": 0, "items": 0, "min": 0, "map": {} };
		if (!_mandate.hasOwnProperty(d.mandat)) _mandate[d.mandat] = { "members": 0, "earners": 0, "items": 0, "min": 0, "map": {} };
		d.ausschuesse.forEach(function(a){
			if (!_ausschuesse.hasOwnProperty(a.name)) _ausschuesse[a.name] = { "members": 0, "earners": 0, "items": 0, "min": 0, "map": {} };
		});
		if (!_laender.hasOwnProperty(d.land)) _laender[d.land] = { "members": 0, "earners": 0, "items": 0, "min": 0, "map": {} };
		if (!_gender.hasOwnProperty(d.gender)) _gender[d.gender] = { "members": 0, "earners": 0, "items": 0, "min": 0, "map": {} };

		var _income = [];

		/* parse neebeneinkuenfte */
		d.nebeneinkuenfte.forEach(function(n){

			/* ignore level 0 */
			if (n.level === 0) return;
		
			/* ignore those for now */
			if (n.type === "Vereinbarungen über künftige Tätigkeiten oder Vermögensvorteile") return;

			/* determine numbers and amounts */
			switch (n.periodical) {
				case "einmalig": 
					_income.push([1, n.level])
				break;
				case "jährlich":

					/* yearly income for one year */
					if (n.year !== null) {
						_income.push([1, n.level])
						return;
					} 
				
					/* assume begin and end are the full current legislative period if none specified */
					var begin = (n.begin !== null) ? moment(n.begin).year() : _begin.year();
					var end = (n.end !== null) ? moment(n.end).year() : _end.year();
				
					/* calculate the number of distince calendar years */
					var years = ((end-begin)+1);
				
					_income.push([years, n.level]);
			
				break;
				case "monatlich": 

					/* the whole number of months in this period */
					if (n.year === null && n.begin === null && n.end === null) {
						var months = Math.ceil(Math.abs(_end.diff(_begin, "months", true)));
						_income.push([months, n.level]);
						return;
					}
			
					/* the number of months of the year in this period */
					if (n.year !== null && n.begin === null && n.end === null) {
						var begin = moment(n.year+"-01-01");
						var end = moment(n.year+"-12-31");
						if (begin.isBefore(_begin)) begin = _begin;
						if (end.isAfter(_end)) end = _end;
						var months = Math.ceil(Math.abs(end.diff(begin, "months", true)));
						_income.push([months, n.level]);
						return;
					} 
					
					var begin = (n.begin === null) ? _begin : moment(n.begin);
					var end = (n.end === null) ? _end : moment(n.end);
				
					var months = Math.ceil(Math.abs(end.diff(begin, "months", true)));
					_income.push([months, n.level]);
			
				break;
			}

		});

		/* collect data */
		_personen[d.name].items = _income.length;
		_personen[d.name].min = _income.reduce(function(p,c){ return p+(c[0]*_stufen_min[c[1]]); }, 0);
//		_personen[d.name].max = _income.reduce(function(p,c){ return p+(c[0]*_stufen_max[c[1]]); }, 0);
		_personen[d.name].map = _income.reduce(function(p,c){ var k = c[1].toString(); if (!p.hasOwnProperty(k)) p[k] = 0; p[k] += c[0]; return p; }, {});

		/* add to total */
		_gesamt.members++;
		if (_income.length > 0) {
			_gesamt.earners++;
			_gesamt.items += _personen[d.name].items;
			_gesamt.min += _personen[d.name].min;
//			_gesamt.max += _personen[d.name].max;
			for (level in _personen[d.name].map) {
				if (_personen[d.name].map.hasOwnProperty(level) && !_gesamt.map.hasOwnProperty(level)) _gesamt.map[level] = 0;
				_gesamt.map[level] += _personen[d.name].map[level];
			}
		}
	
		/* add to fraction */
		_fraktionen[d.fraktion].members++;
		if (_income.length > 0) {
			_fraktionen[d.fraktion].earners++;
			_fraktionen[d.fraktion].items += _personen[d.name].items;
			_fraktionen[d.fraktion].min += _personen[d.name].min;
//			_fraktionen[d.fraktion].max += _personen[d.name].max;
			for (level in _personen[d.name].map) {
				if (_personen[d.name].map.hasOwnProperty(level) && !_fraktionen[d.fraktion].map.hasOwnProperty(level)) _fraktionen[d.fraktion].map[level] = 0;
				_fraktionen[d.fraktion].map[level] += _personen[d.name].map[level];
			}
		};
		
		/* add to mandate type */
		_mandate[d.mandat].members++;
		if (_income.length > 0) {
			_mandate[d.mandat].earners++;
			_mandate[d.mandat].items += _personen[d.name].items;
			_mandate[d.mandat].min += _personen[d.name].min;
//			_mandate[d.mandat].max += _personen[d.name].max;
			for (level in _personen[d.name].map) {
				if (_personen[d.name].map.hasOwnProperty(level) && !_mandate[d.mandat].map.hasOwnProperty(level)) _mandate[d.mandat].map[level] = 0;
				_mandate[d.mandat].map[level] += _personen[d.name].map[level];
			}
		};
		
		/* add to laender */
		_laender[d.land].members++;
		if (_income.length > 0) {
			_laender[d.land].earners++;
			_laender[d.land].items += _personen[d.name].items;
			_laender[d.land].min += _personen[d.name].min;
//			_laender[d.land].max += _personen[d.name].max;
			for (level in _personen[d.name].map) {
				if (_personen[d.name].map.hasOwnProperty(level) && !_laender[d.land].map.hasOwnProperty(level)) _laender[d.land].map[level] = 0;
				_laender[d.land].map[level] += _personen[d.name].map[level];
			}
		};
		
		/* add to gender */
		_gender[d.gender].members++;
		if (_income.length > 0) {
			_gender[d.gender].earners++;
			_gender[d.gender].items += _personen[d.name].items;
			_gender[d.gender].min += _personen[d.name].min;
//			_gender[d.gender].max += _personen[d.name].max;
			for (level in _personen[d.name].map) {
				if (_personen[d.name].map.hasOwnProperty(level) && !_gender[d.gender].map.hasOwnProperty(level)) _gender[d.gender].map[level] = 0;
				_gender[d.gender].map[level] += _personen[d.name].map[level];
			}
		};		
	
		/* add to committees */
		d.ausschuesse.forEach(function(a){
			_ausschuesse[a.name].members++;
			if (_income.length > 0) {
				_ausschuesse[a.name].earners++;
				_ausschuesse[a.name].items += _personen[d.name].items;
				_ausschuesse[a.name].min += _personen[d.name].min;
//				_ausschuesse[a.name].max += _personen[d.name].max;
				for (level in _personen[d.name].map) {
					if (_personen[d.name].map.hasOwnProperty(level) && !_ausschuesse[a.name].map.hasOwnProperty(level)) _ausschuesse[a.name].map[level] = 0;
					_ausschuesse[a.name].map[level] += _personen[d.name].map[level];
				}
			};
		});
	
	});

	/* compile to single object and extend with ratios */
	var out = {
		date: data.date,
		gesamt: {},
		personen: [],
		fraktionen: [],
		mandate: [],
		ausschuesse: [],
		laender: [],
		gender: []
	};

	out.gesamt = {
		"members": _gesamt.members,
		"earners": _gesamt.earners,
		"items": _gesamt.items,
		"min": _gesamt.min,
//		"max": _gesamt.max,
		"ratio_earners_per_member": (_gesamt.earners / _gesamt.members),
		"ratio_min_per_earner": (_gesamt.min / _gesamt.earners),
		"ratio_min_per_member": (_gesamt.min / _gesamt.members),
//		"ratio_max_per_earner": (_gesamt.max / _gesamt.earners),
//		"ratio_max_per_member": (_gesamt.max / _gesamt.members),
		"ratio_items_per_earner": (_gesamt.items / _gesamt.earners),
		"ratio_items_per_member": (_gesamt.items / _gesamt.members),
		"map": [
			(_gesamt.map["0"] || 0),
			(_gesamt.map["1"] || 0),
			(_gesamt.map["2"] || 0),
			(_gesamt.map["3"] || 0),
			(_gesamt.map["4"] || 0),
			(_gesamt.map["5"] || 0),
			(_gesamt.map["6"] || 0),
			(_gesamt.map["7"] || 0),
			(_gesamt.map["8"] || 0),
			(_gesamt.map["9"] || 0),
			(_gesamt.map["10"] || 0)
		]
	};

	for (name in _personen) if (_personen.hasOwnProperty(name)) out.personen.push({
		"name": name,
		"items": _personen[name].items,
		"min": _personen[name].min,
//		"max": _personen[name].max,
		"map": [
			(_personen[name].map["0"] || 0),
			(_personen[name].map["1"] || 0),
			(_personen[name].map["2"] || 0),
			(_personen[name].map["3"] || 0),
			(_personen[name].map["4"] || 0),
			(_personen[name].map["5"] || 0),
			(_personen[name].map["6"] || 0),
			(_personen[name].map["7"] || 0),
			(_personen[name].map["8"] || 0),
			(_personen[name].map["9"] || 0),
			(_personen[name].map["10"] || 0)
		]
	});

	for (name in _fraktionen) if (_fraktionen.hasOwnProperty(name)) out.fraktionen.push({
		"name": name,
		"members": _fraktionen[name].members,
		"earners": _fraktionen[name].earners,
		"items": _fraktionen[name].items,
		"min": _fraktionen[name].min,
//		"max": _fraktionen[name].max,
		"ratio_earners_per_member": (_fraktionen[name].earners / _fraktionen[name].members),
		"ratio_min_per_earner": (_fraktionen[name].min / _fraktionen[name].earners),
		"ratio_min_per_member": (_fraktionen[name].min / _fraktionen[name].members),
//		"ratio_max_per_earner": (_fraktionen[name].max / _fraktionen[name].earners),
//		"ratio_max_per_member": (_fraktionen[name].max / _fraktionen[name].members),
		"ratio_items_per_earner": (_fraktionen[name].items / _fraktionen[name].earners),
		"ratio_items_per_member": (_fraktionen[name].items / _fraktionen[name].members),
		"map": [
			(_fraktionen[name].map["0"] || 0),
			(_fraktionen[name].map["1"] || 0),
			(_fraktionen[name].map["2"] || 0),
			(_fraktionen[name].map["3"] || 0),
			(_fraktionen[name].map["4"] || 0),
			(_fraktionen[name].map["5"] || 0),
			(_fraktionen[name].map["6"] || 0),
			(_fraktionen[name].map["7"] || 0),
			(_fraktionen[name].map["8"] || 0),
			(_fraktionen[name].map["9"] || 0),
			(_fraktionen[name].map["10"] || 0)
		]
	});

	for (name in _mandate) if (_mandate.hasOwnProperty(name)) out.mandate.push({
		"name": name,
		"members": _mandate[name].members,
		"earners": _mandate[name].earners,
		"items": _mandate[name].items,
		"min": _mandate[name].min,
//		"max": _mandate[name].max,
		"ratio_earners_per_member": (_mandate[name].earners / _mandate[name].members),
		"ratio_min_per_earner": (_mandate[name].min / _mandate[name].earners),
		"ratio_min_per_member": (_mandate[name].min / _mandate[name].members),
//		"ratio_max_per_earner": (_mandate[name].max / _mandate[name].earners),
//		"ratio_max_per_member": (_mandate[name].max / _mandate[name].members),
		"ratio_items_per_earner": (_mandate[name].items / _mandate[name].earners),
		"ratio_items_per_member": (_mandate[name].items / _mandate[name].members),
		"map": [
			(_mandate[name].map["0"] || 0),
			(_mandate[name].map["1"] || 0),
			(_mandate[name].map["2"] || 0),
			(_mandate[name].map["3"] || 0),
			(_mandate[name].map["4"] || 0),
			(_mandate[name].map["5"] || 0),
			(_mandate[name].map["6"] || 0),
			(_mandate[name].map["7"] || 0),
			(_mandate[name].map["8"] || 0),
			(_mandate[name].map["9"] || 0),
			(_mandate[name].map["10"] || 0)
		]
	});
	
	for (name in _laender) if (_laender.hasOwnProperty(name)) out.laender.push({
		"name": name,
		"members": _laender[name].members,
		"earners": _laender[name].earners,
		"items": _laender[name].items,
		"min": _laender[name].min,
//		"max": _laender[name].max,
		"ratio_earners_per_member": (_laender[name].earners / _laender[name].members),
		"ratio_min_per_earner": (_laender[name].min / _laender[name].earners),
		"ratio_min_per_member": (_laender[name].min / _laender[name].members),
//		"ratio_max_per_earner": (_laender[name].max / _laender[name].earners),
//		"ratio_max_per_member": (_laender[name].max / _laender[name].members),
		"ratio_items_per_earner": (_laender[name].items / _laender[name].earners),
		"ratio_items_per_member": (_laender[name].items / _laender[name].members),
		"map": [
			(_laender[name].map["0"] || 0),
			(_laender[name].map["1"] || 0),
			(_laender[name].map["2"] || 0),
			(_laender[name].map["3"] || 0),
			(_laender[name].map["4"] || 0),
			(_laender[name].map["5"] || 0),
			(_laender[name].map["6"] || 0),
			(_laender[name].map["7"] || 0),
			(_laender[name].map["8"] || 0),
			(_laender[name].map["9"] || 0),
			(_laender[name].map["10"] || 0)
		]
	});
	
	for (name in _gender) if (_gender.hasOwnProperty(name)) out.gender.push({
		"type": name,
		"members": _gender[name].members,
		"earners": _gender[name].earners,
		"items": _gender[name].items,
		"min": _gender[name].min,
//		"max": _gender[name].max,
		"ratio_earners_per_member": (_gender[name].earners / _gender[name].members),
		"ratio_min_per_earner": (_gender[name].min / _gender[name].earners),
		"ratio_min_per_member": (_gender[name].min / _gender[name].members),
//		"ratio_max_per_earner": (_gender[name].max / _gender[name].earners),
//		"ratio_max_per_member": (_gender[name].max / _gender[name].members),
		"ratio_items_per_earner": (_gender[name].items / _gender[name].earners),
		"ratio_items_per_member": (_gender[name].items / _gender[name].members),
		"map": [
			(_gender[name].map["0"] || 0),
			(_gender[name].map["1"] || 0),
			(_gender[name].map["2"] || 0),
			(_gender[name].map["3"] || 0),
			(_gender[name].map["4"] || 0),
			(_gender[name].map["5"] || 0),
			(_gender[name].map["6"] || 0),
			(_gender[name].map["7"] || 0),
			(_gender[name].map["8"] || 0),
			(_gender[name].map["9"] || 0),
			(_gender[name].map["10"] || 0)
		]
	});

	for (name in _ausschuesse) if (_ausschuesse.hasOwnProperty(name)) out.ausschuesse.push({
		"name": name,
		"members": _ausschuesse[name].members,
		"earners": _ausschuesse[name].earners,
		"items": _ausschuesse[name].items,
		"min": _ausschuesse[name].min,
//		"max": _ausschuesse[name].max,
		"ratio_earners_per_member": (_ausschuesse[name].earners / _ausschuesse[name].members),
		"ratio_min_per_earner": (_ausschuesse[name].min / _ausschuesse[name].earners),
		"ratio_min_per_member": (_ausschuesse[name].min / _ausschuesse[name].members),
//		"ratio_max_per_earner": (_ausschuesse[name].max / _ausschuesse[name].earners),
//		"ratio_max_per_member": (_ausschuesse[name].max / _ausschuesse[name].members),
		"ratio_items_per_earner": (_ausschuesse[name].items / _ausschuesse[name].earners),
		"ratio_items_per_member": (_ausschuesse[name].items / _ausschuesse[name].members),
		"map": [
			(_ausschuesse[name].map["0"] || 0),
			(_ausschuesse[name].map["1"] || 0),
			(_ausschuesse[name].map["2"] || 0),
			(_ausschuesse[name].map["3"] || 0),
			(_ausschuesse[name].map["4"] || 0),
			(_ausschuesse[name].map["5"] || 0),
			(_ausschuesse[name].map["6"] || 0),
			(_ausschuesse[name].map["7"] || 0),
			(_ausschuesse[name].map["8"] || 0),
			(_ausschuesse[name].map["9"] || 0),
			(_ausschuesse[name].map["10"] || 0)
		]
	});

	callback(null, out);

};

