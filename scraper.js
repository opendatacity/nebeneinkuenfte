#!/usr/bin/env node

/* require node modules */
var fs = require("fs");
var url = require("url");
var path = require("path");

/* require npm modules */
var scrapyard = require("scrapyard");
var colors = require("colors");

/* set up scrapyard */
var scraper = new scrapyard({
	cache: './cache', 
	debug: false,
	timeout: 300000000,
	retries: 5,
	connections: 5
});

/* parse taetigkeiten */
var parse_taetigkeiten = function(t) {
	
	/* fix separated headlines */
	if (t.head.charAt(t.head.length-1) !== "," && t.lines[0].charAt(t.lines[0].length-1) === ",") {
		t.head = t.head+" "+t.lines.shift();
	}
	
	var data = [];
	
	t.lines.forEach(function(l){

		/* clean leading and trailing spaces */
		l = l.replace(/^\s+|\s+$/g,'');
		
		/* explode semicoloned fields */
		var fragments = [];
		l.split(/;/g).forEach(function(f){
			fragments.push(f);
		});

		fragments.forEach(function(f){

			var item = {
				"type": t.section,
				"year": null,
				"level": null,
				"end": null,
				"periodical": "einmalig",
				"text": [t.head, f].join(", ").replace(/,[ ,]+/g, ', ')
			}
			
			var q = [t.head, f].join(", ").replace(/,[ ,]+/g, ', ');
			
			/* check for ending information */
			var ending = q.match(/\(bis ([^\)]+)\)/);
			if (ending) {
				item.end = ending[1];
				q = q.replace(/\(bis ([^\)]+)\)/g,''); // to not confuse with year
			}
			
			/* check for periodical */
			var periodical = q.match(/(monatlich|jährlich)/)
			if (periodical) {
				item.periodical = periodical[1];
			}
			
			/* check for level */
			var level = q.match(/Stufe ([0-9]+)/i);
			if (level) {
				item.level = parseInt(level[1],10);
			} else {
				item.level = 0;
			}
			
			/* check for year */
			var year = q.match(/(20(13|14))/);
			if (year) {
				item.year = parseInt(year[1],10);
			}
			
			data.push(item);
			
		});

	});

	return data;

}

/* scrape bundestag */
var scrape = function(_callback){
	var data = [];
	var base_url = "http://www.bundestag.de/bundestag/abgeordnete18/alphabet/index.html";
	scraper.scrape(base_url, "html", function(err, $){
		if (err) {
			_callback(err);
		} else {
			var _count_fetchable = 0;
			var _count_fetched = 0;
			$('.linkIntern a','#inhaltsbereich').each(function(idx, e){
				var $e = $(this);
				/* check for dead or retired members, marked by "+)" or "*)" and for "Jakob Maria Mierscheid" */
				if (!($e.text().match(/[\*\+]\)$/)) && !($(this).text().match(/Mierscheid/i))) {
					_count_fetchable++;
					var _data = {
						"name": null,
						"aliases": [],
						"url": url.resolve(base_url, $e.attr('href')),
						"fraktion": null,
						"fotos": [],
						"ausschuesse": [],
						"wahlkreis": null,
						"mandat": null,
//						"kontakt": [],
						"web": [],
						"nebeneinkuenfte": []
					};
					scraper.scrape(_data.url, "html", "utf8", function(err, $){
						_count_fetched++;
						if (err) {
							console.error("[fail]".inverse.bold.red, "fetching".white, _data.url.red);
						} else {
							/* name, fraktion */
							var _title = $('h1', '#inhaltsbereich').eq(0).text().replace(/^\s+|\s+$/,'').split(', ');
							_data.name = _title[0].replace(/ \([^\)]+\)$/,'');
							_data.fraktion = _title[1];
														
							console.error("[info]".inverse.bold.cyan, "fetched".white, _data.name.cyan.bold, _data.fraktion.cyan);
							
							/* build aliases */
							_data.aliases.push(_data.name);
							if (_data.name.match(/^(Prof\. |Dr\. |h\.\s?c\. )/)) {
								_data.aliases.push(_data.name.replace(/(Prof\. |Dr\. |h\.\s?c\. )/g,''));
							}
							_data.aliases.forEach(function(name){
								if (name.match(/\s+[A-Z]\.\s+/)) {
									_data.aliases.push(name.replace(/\s+[A-Z]\.\s+/,' '));
								}
							});
							
							/* fotos */
							$('.bildDivPortrait', '#inhaltsbereich').each(function(idx,e){
								_data.fotos.push({
									"url": url.resolve(_data.url, $(this).find('img').attr('src')),
									"copyright": $(this).find('.bildUnterschrift p').text()
								});
							});

							/* ausschuesse */
							$('.mitgliedschaftBox', '#inhaltsbereich').each(function(idx,e){
								if ($(this).find('h2').eq(0).text().replace(/^\s+|\s+$/,'') === "Mitgliedschaften und Ämter im Bundestag") {
									$(this).find('.standardBox h3').each(function(idx,f){
										$(f).next().find('a').each(function(idx,g){
											_data.ausschuesse.push({
												"name": $(g).text(),
												"funktion": $(f).text().replace(/^\s+|\s+$/,""),
												"url": url.resolve(_data.url, $(g).attr('href'))
											});
										});
									});
								}
							});

							/* website, wahlkreis */
							$('.contextBox', '#context').each(function(idx,e){
								var _section = $(this).find('h2').text();
								switch(_section) {
									case "Kontakt":
										if ($(this).find('.standardBox .standardLinkliste .linkExtern a').length > 0) {
											$(this).find('.standardBox .standardLinkliste .linkExtern a').each(function(idx,f){
												switch($(f).text()) {
													case "bei Facebook":
														_data.web.push({
															"service": "facebook",
															"url": $(f).attr('href')
														});
													break;
													case "bei Twitter":
														_data.web.push({
															"service": "twitter",
															"url": $(f).attr('href')
														});
													break;
													case "bei studiVZ":
														_data.web.push({
															"service": "studivz",
															"url": $(f).attr('href')
														});
													break;
													case "bei Xing":
														_data.web.push({
															"service": "studivz",
															"url": $(f).attr('href')
														});
													break;
													case "Weblog":
														_data.web.push({
															"service": "blog",
															"url": $(f).attr('href')
														});
													break;
													case "persönliche Internetseite":
														_data.web.push({
															"service": "website",
															"url": $(f).attr('href')
														});
													break;
													default:
														if ($(f).text().match(/^http[s]?:\/\//)) {
															_data.web.push({
																"service": "website",
																"url": $(f).attr('href')
															});
														} else {
															_data.web.push({
																"service": "unknown",
																"url": $(f).attr('href')
															});
														}
													break;
												}
											});
										}
									break;
									case "Gewählt über Landesliste":
										_data.mandat = 'liste';
										if ($(this).find('.standardBox a[title^=Wahlkreis]','#context').length === 1) {
											_data.wahlkreis = $(this).find('.standardBox a[title^=Wahlkreis]','#context').eq(0).attr('title');
										} else {
											_data.wahlkreis = null;
										}
									break;
									case "Direkt gewählt in":
										_data.mandat = 'direkt';
										_data.wahlkreis = $(this).find('.standardBox a[title^=Wahlkreis]','#context').eq(0).attr('title');
									break;
									case "Reden des MdB": break;
									case "Namentliche Abstimmungen": break;
									case "Informationen zur Fraktion": break;
									default:
										console.error("[warn]".inverse.bold.yellow, "unknown section".white, _section.yellow, "for".white, _data.name.yellow, "at".white, _data.url.red);
									break;
								}
							});
							
							/* veröffentlichungspflichtige angaben */
							var _active = false;
							var _section = null;
							var _firstpar = false;
							var _capture = null;
							var _items = [];

							$('.infoBox.voa .standardBox', '#inhaltsbereich').children().each(function(idx,e){
								var $t = $(this);

								/* activate evaluation on parts 2. and 3. */
								if ($t.is("h3")) {
									var _firstpar = true;
									_section = $t.text().replace(/^\s+|\s+$/g,"");
									switch(_section) {
										case "Berufliche Tätigkeit vor der Mitgliedschaft im Deutschen Bundestag": 
											_active = false;
										break;
										case "Funktionen in Vereinen, Verbänden und Stiftungen": 
										case "Funktionen in Unternehmen": 
										case "Funktionen in Körperschaften und Anstalten des öffentlichen Rechts": 
										case "Entgeltliche Tätigkeiten neben dem Mandat": 
										case "Beteiligungen an Kapital- oder Personengesellschaften": 
										case "Vereinbarungen über künftige Tätigkeiten oder Vermögensvorteile": 
											_active = true;
										break;
										default: 
											_active = false;
										break;
									}
								}
								if (!_active) return;
								
								/* capture paragraphs */
								if ($t.is("p") && !$t.hasClass("kleinAbstand")) {
									
									/* check if paragraph is a new subsection */
									if (_capture === null || _firstpar || $t.hasClass("voa_abstand")) {
										/* add captured data to items and start over with an empty capture */
										if (_capture && ("lines" in _capture) && _capture.lines.length > 0) _items.push(_capture);
										_capture = {
											"section": _section,
											"head": $t.text(),
											"lines": []
										};
									} else {

										if (_capture === null) {
											console.log($t.html());
											process.exit();
										}
										_capture.lines.push($t.text());
									}
									
								}
								
								var _firstpar = false;
								
							});
							if (_capture && ("lines" in _capture) && _capture.lines.length > 0) _items.push(_capture);

							/* refine items */
							_items.forEach(function(item){
								_data["nebeneinkuenfte"] = _data["nebeneinkuenfte"].concat(parse_taetigkeiten(item));
							});
							_data["nebeneinkuenfte"].filter(function(i){
								return (i !== null);
							});
							
							/* push to data */
							data.push(_data);

							/* callback if done */
							if (_count_fetched === _count_fetchable) {
								_callback(null, data);
							}

						}

					});
				}
			});
		}
	});
};

/* execute scraper */
scrape(function(err, data){
	if (err) {
		console.error("[fail]".inverse.bold.red, err);
		process.exit();
	}
	fs.writeFileSync(path.resolve(__dirname, "data.json"), JSON.stringify(data,null,'\t'));
	console.error("[ok]".inverse.bold.green, "data saved".green);
	console.error("<3".bold.magenta, "made with datalove".magenta);
});


