#!/usr/bin/env node

/* convert objects to tsv */

/* get node modules */
var fs = require("fs");
var path = require("path");

module.exports = function(data, callback) {

	var tsv = [];

	/* write header */
	tsv.push(["Name","Fraktion","Wahlkreis","Mandat","Biografie","Art","Stufe","Jahr","Beginn","Ende","Periodisch","Originaltext"].join("\t"));

	/* write records */
	data.forEach(function(item){
		item.nebeneinkuenfte.forEach(function(nek){
			if (nek.level > 0) tsv.push([item.name, item.fraktion, item.wahlkreis, item.mandat, item.url, nek.type, nek.level, nek.year, nek.begin, nek.end, nek.periodical, nek.text.replace(/[\r\n]/g,' ')].join("\t"));
		});
	});

	/* call back with data */
	callback(null, tsv.join("\n"));

};