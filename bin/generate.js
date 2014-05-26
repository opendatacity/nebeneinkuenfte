#!/usr/bin/env node

/* node modules */
var fs = require("fs");
var path = require("path");

/* npm modules */
var commander = require("commander");
var moment = require("moment");

/* local modules */
var generator = require(path.resolve(__dirname, "../lib/generator.js"));

/* package */
var pkg = require(path.resolve(__dirname, "../package.json"));

/* command line options */
commander
	.version(pkg.version)
	.usage('[options] <output-dir>')
	.parse(process.argv);
	
/* determine out directory */
if (commander.args.length >= 1 && fs.existsSync(path.resolve(process.cwd(), commander.args[0]))) {
	var DATA_DIR = path.resolve(process.cwd(), commander.args[0]);
} else {
	var DATA_DIR = path.resolve(__dirname, "../dist/data");
};
var SITE_DIR = path.resolve(DATA_DIR, "..");

/* load data */
var data = JSON.parse(fs.readFileSync(path.resolve(DATA_DIR, "data.json")));
var evaluated = JSON.parse(fs.readFileSync(path.resolve(DATA_DIR, "evaluated.json")));
var template = fs.readFileSync(path.resolve(SITE_DIR, "assets/templates/index.mustache")).toString();

generator(data, evaluated, template, function(err, html){
	if (err) console.error("could not generate html", err) && process.exit(1);
	fs.writeFile(path.resolve(SITE_DIR, "index.html"), html, function(err){
		if (err) console.error("could not save html", err) && process.exit(2);
		console.log("html generated");
	});
});

