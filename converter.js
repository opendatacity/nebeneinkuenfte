#!/usr/bin/env node

/* get node modules */
var fs = require("fs");
var path = require("path");

/* read data json */
var data = JSON.parse(fs.readFileSync(path.resolve(__dirname, "data.json")));
var out = [];

/* write tsv header */
out.push([
	"Name",
	"Fraktion",
	"Wahlkreis",
	"Mandat",
	"Biografie",
	"Art",
	"Stufe",
	"Jahr",
	"Ende",
	"Periodisch",
	"Originaltext"
].join("\t"));

/* write records */
data.forEach(function(item){
	item.nebeneinkuenfte.forEach(function(nek){
		if (nek.level > 0) {
			out.push([
				item.name,
				item.fraktion,
				item.wahlkreis,
				item.mandat,
				item.url,
				nek.type,
				nek.level,
				nek.year,
				nek.end,
				nek.periodical,
				nek.text.replace(/[\r\n]/g,' ')
			].join("\t"));
		}
	});
});

/* write file */
fs.writeFileSync(path.resolve(__dirname, "data.tsv"), out.join("\n"));
