# Nebeneinkünfte

Generiert Offene Daten aus den Angaben zu Nebentätigkeiten und Nebeneinkünften der Mitglieder des Deutschen Bundestages (17. Wahlperiode) von der [Webseite des Deutschen Bundestages](http://www.bundestag.de/)

## Installation

````
git clone https://github.com/opendatacity/nebeneinkuenfte.git
cd nebeneinkuenfte
npm install
````

## Benutzung

Daten von der Webseite des Deutschen Bundestages einsammeln:

````
node bin/scraper.js
````

Auswertung erstellen:

````
node bin/generate.js
````

## License

Nebeneinkünfte ist [Public Domain](./license.md).
