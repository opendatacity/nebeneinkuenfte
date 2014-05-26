#!/usr/bin/env node

/* node modules */
var fs = require("fs");
var path = require("path");

/* npm modules */
var commander = require("commander");
var moment = require("moment");
var colors = require("colors");

/* local modules */
var scraper = require(path.resolve(__dirname, "../lib/scraper.js"));
var evaluator = require(path.resolve(__dirname, "../lib/evaluator.js"));
var data2tsv = require(path.resolve(__dirname, "../lib/data2tsv.js"));

/* package */
var pkg = require(path.resolve(__dirname, "../package.json"));

/* command line options */
commander
	.version(pkg.version)
	.usage('[options] <output-dir>')
	.option('-v, --verbose', 'Be loud')
	.parse(process.argv);
	
/* determine out directory */
if (commander.args.length >= 1 && fs.existsSync(path.resolve(process.cwd(), commander.args[0]))) {
	var DATA_DIR = path.resolve(process.cwd(), commander.args[0]);
} else {
	var DATA_DIR = path.resolve(__dirname, "../dist/data");
};
if (commander.verbose) console.error("[info]".inverse.bold.cyan, "writing data to".white, DATA_DIR.cyan);

(function(){
	scraper(function(err,data){
		if (err) {
			console.error("[fail]".inverse.bold.red, err);
			process.exit(1);
		};
		
		if (commander.verbose) console.error("[ ok ]".inverse.bold.green, "data gathered".green);
		
		/* write data to file */
		(function(DATA_FILE){
			fs.writeFile(DATA_FILE, JSON.stringify({date: moment().toISOString(), data: data}), function(err){
				if (err) return console.error("[fail]".inverse.bold.red, "writing data to file".white, DATA_FILE.red, err.toString().white);
				if (commander.verbose) console.error("[save]".inverse.bold.green, "written data to file".white, DATA_FILE.green);
			});
		})(path.resolve(DATA_DIR, "data.json"));
		
		/* write data to file by date */
		(function(DATA_FILE){
			fs.writeFile(DATA_FILE, JSON.stringify({date: moment().toISOString(), data: data}), function(err){
				if (err) return console.error("[fail]".inverse.bold.red, "writing data to file".white, DATA_FILE.red, err.toString().white);
				if (commander.verbose) console.error("[save]".inverse.bold.green, "written data to file".white, DATA_FILE.green);
			});
		})(path.resolve(DATA_DIR, "data."+(moment().format("YYYY-MM-DD"))+".json"));
		
		/* generate tsv */
		data2tsv(data, function(err, tsv){
			if (err) return console.error("[fail]".inverse.bold.red, err);
			if (commander.verbose) console.error("[ ok ]".inverse.bold.green, "converted data to tsv".green);
			(function(DATA_FILE){
				fs.writeFile(DATA_FILE, tsv, function(err){
					if (err) return console.error("[fail]".inverse.bold.red, "writing tsv to file".white, DATA_FILE.red, err.toString().white);
					if (commander.verbose) console.error("[save]".inverse.bold.green, "written tsv to file".white, DATA_FILE.green);
				});
			})(path.resolve(DATA_DIR, "data.tsv"));
		});
		
		/* evaluate data */
		evaluator(data, function(err, evaluated){
			if (err) return console.error("[fail]".inverse.bold.red, err);
			if (commander.verbose) console.error("[ ok ]".inverse.bold.green, "evaluated data".green);
			(function(DATA_FILE){
				fs.writeFile(DATA_FILE, JSON.stringify({date: moment().toISOString(), data: evaluated}), function(err){
					if (err) return console.error("[fail]".inverse.bold.red, "writing evaluated data to file".white, DATA_FILE.red, err.toString().white);
					if (commander.verbose) console.error("[save]".inverse.bold.green, "written evaluated data to file".white, DATA_FILE.green);
				});
			})(path.resolve(DATA_DIR, "evaluated.json"));
		});
		
	}, commander.verbose);
})();


