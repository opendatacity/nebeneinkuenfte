$(document).ready(function(){
	
	$('article table').each(function(idx,e){
		$(e).tablesorter({sortInitialOrder: "desc"});
	});
	
});