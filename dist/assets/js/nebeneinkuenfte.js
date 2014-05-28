$(document).ready(function(){
	
	/* make tables sortable */
	$('article table').each(function(idx,e){
		$(e).tablesorter({sortInitialOrder: "desc"});
	});

	/* set content min height */
	$('#main').css("min-height", $(window).innerHeight()-($('header').outerHeight()+$('footer').outerHeight()));
	$(window).resize(function(){
		$('#main').css("min-height", $(window).innerHeight()-($('header').outerHeight()+$('footer').outerHeight()));
	});
	
	/* make tabs linkable */
	if (document.location.hash) $('.nav-tabs a[href=#'+document.location.hash.replace(/[^a-z]/g,'')+']').tab('show') ;
	$('.nav-tabs a').on('shown.bs.tab', function(e) {
		$(this).blur();
		window.location.hash = e.target.hash.replace(/^#/,'/');
	});
	
});