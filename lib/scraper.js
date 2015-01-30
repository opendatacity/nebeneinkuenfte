/* require node modules */
var fs = require("fs");
var url = require("url");
var path = require("path");

/* require npm modules */
var scrapyard = require("scrapyard");
var moment = require("moment");
var colors = require("colors");

/* set up scrapyard */
var scraper = new scrapyard({
	cache: './.cache', 
	debug: false,
	timeout: 86400000,
	retries: 5,
	connections: 5
});

var _translate = {
	"beginn": 1,
	"anfang": 1,
	"januar": 1,
	"februar": 2,
	"märz": 3,
	"maerz": 3,
	"april": 4,
	"mai": 5,
	"juni": 6,
	"juli": 7,
	"august": 8,
	"september": 9,
	"oktober": 10,
	"november": 11,
	"dezember": 12,
	"ende": 12
};

var _verbose = false;

var parse_date = function(str) {
	var date = str.match(/^([0-9]{2})\.([0-9]{2})\.(20[0-9]{2})$/);
	if (date) {
		/* valid date string */
		var value = moment({
			year: (parseInt(date[3],10)),
			month: (parseInt(date[2],10)-1),
			day: (parseInt(date[1],10))
		}).toISOString();
		return value;
	} 
	var date = str.toLowerCase().match(/^([a-zä]+)\s+(20[0-9]{2})$/);
	if (date) {
		if (_translate.hasOwnProperty(date[1])) {
			var month = _translate[date[1]];
			var day = moment({
				year: (parseInt(date[2],10)),
				month: (month-1),
			}).daysInMonth();
			var value = moment({
				year: (parseInt(date[2],10)),
				month: (month-1),
				day: day
			}).toISOString();
			return value;
		}
	}
	var date = str.toLowerCase().match(/^(anfang|mitte|ende)\s+([a-zä]+)\s+(20[0-9]{2})$/);
	if (date) {
		if (_translate.hasOwnProperty(date[2])) {
			var month = _translate[date[2]];
			switch (date[1]) {
				case "anfang": var day = 1; break;
				case "mitte": var day = 15; break;
				case "ende":
					var day = moment({
						year: (parseInt(date[3],10)),
						month: (month-1),
					}).daysInMonth();
				break;
			}
			var value =  moment({
				year: (parseInt(date[3],10)),
				month: (month-1),
				day: day
			}).toISOString();
			return value;
		}
	}
	if (_verbose) console.error("[warn]".inverse.bold.yellow, "unparsable date".white, str.yellow);
	return null;
}


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
				"begin": null,
				"end": null,
				"periodical": "einmalig",
				"text": [t.head, f].join(", ").replace(/,[ ,]+/g, ', ')
			}
			
			var q = [t.head, f].join(", ").replace(/,[ ,]+/g, ', ');
						
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
						
			var begin = q.match(/(seit|ab|von|seit dem) ((([0-2][0-9]|30|31)\.)?(((0[1-9]|10|11|12)(\.|\/))?(20[0-9]{2})))/);
			if (begin){
				item.begin = moment({
					year: (parseInt(begin[9],10)),
					month: (parseInt(begin[6],10) || 1),
					day: (parseInt(begin[3],10) || 1)
				}).toISOString();
				q = q.replace(/(seit|ab|von|seit dem) ((([0-2][0-9]|30|31)\.)?(((0[1-9]|10|11|12)(\.|\/))?(20[0-9]{2})))/g,''); // to not confuse with year
			};
			
			/* check for ending information */
			var ending = q.match(/\(bis ([^\)]+)\)/);
			if (ending) {
				item.end = parse_date(ending[1]);
				q = q.replace(/\(bis ([^\)]+)\)/g,''); // to not confuse with year
			}
			
			/* check for year */
			var year = q.match(/(20(13|14|15|16|17))/);
			if (year) {
				item.year = parseInt(year[1],10);
			}
			
			data.push(item);
			
		});

	});

	return data;

}

/* scrape bundestag */
var scrape = function(_callback, verbose){
	
	if (verbose) _verbose = true;
	
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
							var _title = $('h1', '#inhaltsbereich').eq(0).text().replace(/^\s+|\s+$/g,'').split(', ');
							_data.name = _title[0].replace(/ \([^\)]+\)$/,'');
							_data.fraktion = _title[1].replace(/^\s+|[\s\*]+$/g,'');
														
							if (_verbose) console.error("[info]".inverse.bold.cyan, "fetched".white, _data.name.cyan.bold, _data.fraktion.cyan);

							/* try to determine gender from job description */
							/* believe me, i'd rather like to check a "preferred pronoun" statement */
							var _job = $('.biografie p strong', '#inhaltsbereich').eq(0).text().replace(/^\s+|\s+$/g,'')
								.replace("bei der Bundeskanzlerin", "")
								.replace("bei der Bundesministerin", "")
								.replace("Nordrhein", "");

							if (/[a-zäöüß](in|frau|schwester|beauftragte)\b|\b(Angestellte|Vorsitzende)\b/.test(_job)) {
								_data.gender = "f";
							} else {
								if (["Sybille Benning","Heidrun Bluhm","Kerstin Kassner","Marina Kermer","Gisela Manderla","Maria Michalk","Sylvia Pantel","Dr. Nina Scheer","Christina Schwarzer","Dr. Petra Sitte","Azize Tank","Doris Wagner"].indexOf(_data.name) >= 0) {
									_data.gender = "f";
								} else {
									_data.gender = "m";
								}
							}
							
							
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
									"copyright": $(this).find('.bildUnterschrift p').text().replace(/^\s+|\s+$/g,'')
								});
							});

							/* ausschuesse */
							$('.mitgliedschaftBox', '#inhaltsbereich').each(function(idx,e){
								if ($(this).find('h2').eq(0).text().replace(/^\s+|\s+$/g,'') === "Mitgliedschaften und Ämter im Bundestag") {
									$(this).find('.standardBox h3').each(function(idx,f){
										$(f).next().find('a').each(function(idx,g){
											_data.ausschuesse.push({
												"name": $(g).text().replace(/^\s+|\s+$/g,''),
												"funktion": $(f).text().replace(/^\s+|\s+$/g,""),
												"url": url.resolve(_data.url, $(g).attr('href'))
											});
										});
									});
								}
							});

							/* website, wahlkreis */
							$('.contextBox', '#context').each(function(idx,e){
								var _section = $(this).find('h2').text().replace(/^\s+|\s+$/g,'');
								switch(_section) {
									case "Kontakt":
										if ($(this).find('.standardBox .standardLinkliste .linkExtern a').length > 0) {
											$(this).find('.standardBox .standardLinkliste .linkExtern a').each(function(idx,f){
												switch($(f).text().replace(/^\s+|\s+$/g,'').replace(/:$/g,'')) {
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
													case "Internet":
														_data.web.push({
															"service": "website",
															"url": $(f).attr('href')
														});
													break;
													default:
														var _url = url.parse($(f).attr('href'));
														switch (_url.hostname) {
															case "www.youtube.com":
																_data.web.push({
																	"service": "youtube",
																	"url": $(f).attr('href')
																});
															break;
															case "www.facebook.com":
																_data.web.push({
																	"service": "facebook",
																	"url": $(f).attr('href')
																});
															break;
															case "www.flickr.com":
																_data.web.push({
																	"service": "flickr",
																	"url": $(f).attr('href')
																});
															break;
															case "www.meinvz.de":
															case "www.meinvz.net":
																_data.web.push({
																	"service": "meinvz",
																	"url": $(f).attr('href')
																});
															break;
															case "www.myspace.com":
																_data.web.push({
																	"service": "myspace",
																	"url": $(f).attr('href')
																});
															break;
															case "www.wer-kennt-wen.de":
																_data.web.push({
																	"service": "wer-kennt-wen",
																	"url": $(f).attr('href')
																});
															break;
															case "": /* hello, Karl-Georg Wellmann */ break;
															default:
																_data.web.push({
																	"service": "website",
																	"url": $(f).attr('href')
																});
															break;
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
										_data.land = $(this).find('.standardBox strong','#context').eq(0).text().replace(/^\s+|\s+$/g,'');
									break;
									case "Direkt gewählt in":
										_data.mandat = 'direkt';
										_data.wahlkreis = $(this).find('.standardBox a[title^=Wahlkreis]','#context').eq(0).attr('title');
										_data.land = $(this).find('.standardBox strong','#context').eq(0).text().replace(/^\s+|\s+$/g,'');
									break;
									case "Reden des MdB": break;
									case "Namentliche Abstimmungen": break;
									case "Informationen zur Fraktion": break;
									default:
										if (_verbose) console.error("[warn]".inverse.bold.yellow, "unknown section".white, _section.yellow, "for".white, _data.name.yellow, "at".white, _data.url.red);
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

module.exports = scrape;
