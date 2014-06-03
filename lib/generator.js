/* node modules */
var fs = require("fs");
var path = require("path");

/* npm modules */
var mustache = require("mustache");
var moment = require("moment");

function mformat(num){
	num = parseFloat(num).toFixed(2).split('.');
	while (/(\d+)(\d{3})/.test(num[0])) num[0] = num[0].replace(/(\d+)(\d{3})/, '$1\u202F$2');
	return num.join(',')+" €";
}


module.exports = function(data, evaluated, template, callback) {
	
	var view = {};
	
	/* */
	var lookup = {};
	data.data.forEach(function(d){
		lookup[d.name] = {
			fraktion: d.fraktion,
			url: d.url
		};
	});
	
	view.gesamt = evaluated.data.gesamt;
	view.gesamt.num = view.gesamt.map.reduce(function(p,c){ return (p+c); }, 0)
	
	/* personen */
	view.abgeordnete = [];
	evaluated.data.personen.forEach(function(p){
		if (p.items === 0) return;
		view.abgeordnete.push({
			name: p.name,
			fraktion: lookup[p.name].fraktion,
			url: lookup[p.name].url,
			items: p.items,
			num: p.map.reduce(function(p,c){ return (p+c); }, 0),
			min: p.min,
			map: p.map
		});
	});
	view.abgeordnete.sort(function(a,b){ return (b.min-a.min); });

	/* personen */
	view.fraktionen = evaluated.data.fraktionen.sort(function(a,b){ return (b.min-a.min); });

	/* ausschuesse */
	view.ausschuesse = evaluated.data.ausschuesse.sort(function(a,b){ return (b.min-a.min); });

	/* bundeslaender */
	view.laender = evaluated.data.laender.sort(function(a,b){ return (b.min-a.min); });

	/* gender */
	view.gender = [];
	evaluated.data.gender.forEach(function(p){
		p[p.type] = true;
		view.gender.push(p);
	});
	view.gender = view.gender.sort(function(a,b){ return (b.min-a.min); });

	/* mandate */
	view.mandate = [];
	evaluated.data.mandate.forEach(function(p){
		p[p.name] = true;
		view.mandate.push(p);
	});
	view.mandate = view.mandate.sort(function(a,b){ return (b.min-a.min); });

	view.date = moment(evaluated.date).format("DD.MM.YYYY HH:mm");

	/* view helpers */
	view.format_map = function(){
		return this.map.map(function(v,k){
			if (k === 0) return "";
			if (v === 0) return "<td></td>";
			return '<td class="c">'+v+"</td>";
		}).join("");
	};
	
	view.percent = function(){
		return function(text, render) {
			return ((parseFloat(render(text))*100).toFixed(2)+"%");
		}
	}

	view.total = function(){
		return function(text, render) {
			return mformat(render(text));
		}
	}

	view.data = JSON.stringify(evaluated);

	callback(null, mustache.render(template, view));
	
};
