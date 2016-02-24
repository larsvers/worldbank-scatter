// JavaScript document of the worldbank interface
// based on the Tracker viewport semver 0.3.0 
// 14.11.2015 larsverspohl


god();

// top level namespace
function god () {

	// top level variables
	var rawData, svgId, gId, aesClass, answerLinesHelp, circles, elementType, minLineValue, target, segmentInfo;

	// utility functions
	var log = console.log.bind(console);

	var round = function(x) { return d3.round(x,1); }
	var round2 = function(x) { return d3.round(x,2); }
	var thousandsPrep = d3.format(',');
	var thousands = function(x){ return thousandsPrep(d3.round(x/1000,0)); }
	var pointFormat = function(val, label){
		var val = val;
		var label = label === undefined ? '' : label;
		if (isNaN(val)) {
			null;
		} else if (val < 1000) {
			val = d3.round(val,0) + ' ' + label;
		} else if (val < 1e+6) {
			val = d3.round(val/1000,1) + 'k ' + label;
		} else if (val < 1e+9) {
			val = d3.round(val/1e+6,1) + 'm ' + label;
		} else if (val < 1e+12) {
			val = d3.round(val/1e+9,1) + 'b ' + label;
		}
		return val;
	}

	// var formatDatePrep = d3.time.format('%b %y');
	var formatDatePrep = d3.time.format('%Y');
	var formatDate = function (x) { return formatDatePrep(new Date(Date.parse(x))); }
	var formatPlusPrep = d3.format('+');
	var formatPlus = function(x) { return formatPlusPrep(x); }
	var formatPercentPrep = d3.format('%');
	var formatPercent = function(x) { return formatPercentPrep(x); }

	// var spaceLess = function(x) { return x.replace(/\s/g,''); }
	var spaceLess = function(x) { return x.replace(/[^A-Za-z15]/g,''); } // remove all non-letter characters, but keep 15 to allow id differentiation between 'Population ages 0-14 (% of total)' and ' Population ages 15-64 (% of total)'. hack, I know.
	var concatClassName = function(x) { return String(x).replace(/\s/g,'.'); } 
	var rankKey = function (d) { return +d.rank; }
	var getCountry = function (x) { return x.questionValues[0].answerValues[0].country; }
	var getText = function (x) { return x.questionValues[0].answerValues[0].questionText; }
	var getMaxNumberOfAnswers = function (data){
		var q = data.map(function(d) { return d.questionValues; });
		var a = [];
		for (var i in q){
			a.push(q[i].map(function(d) { return d.answer; }).length);
		}
		return d3.max(a);
	} // for bar charts
	var numberOfAnswerValues = function(data) {
		var b = data[0].questionValues.length;
		var c = [];	
		var d;
		for (var i = 0; i < b; i++) {
			c.push(data[0].questionValues[i].answerValues.length);
		}
		d = d3.max(c);
		return d; 
	} // time-series length
	var getDate = function(x) { return x.date; }; // access function for the data of the raw data  
	var getLastYearDate = function(date) { return new Date(date.getFullYear()-1, date.getMonth(), date.getDate()); }
	var heatMap = d3.scale.linear().domain([0,100]).range(['#f7fbff', '#08519c']); // for tables
	var heatSwitch = 0; // for tables
	var containerId; // for tables
	var setFilterSectionCSS = function(){
		d3.select('section#controlTop')
			.style('pointer-events', 'all')
			.style('background-color', 'rgba(255,255,255,0.9)');		
	} // these original conditions are switched off for the table visual. Hence whenever we build another visual we need to switch this CSS back on
	var access = function(x) { return x.answerValues; } // accessing the answerValues for the profile visual
	var unik = function(arr) { // http://jszen.com/best-way-to-get-unique-values-of-an-array-in-javascript.7.html
		var n = {}, r = [];
		for (var i = 0; i < arr.length; i++) {             // do for each element of the array
			if (!n[arr[i]]) {                                // if this element is not yet in n
				n[arr[i]] = true;                              // put it into the object n with the flag 'true'
				r.push(arr[i]);                                // and push it into the array r
			}
		}
		return r;
	}
	var moveContentUp = function() { document.getElementById('wrapperContent').style.marginTop = '2.5%'; } // moves the dashboard up, closer to the navbar
	var moveContentDown = function() { document.getElementById('wrapperContent').style.marginTop = '13%'; } // restores original distance between navbar and content, to allow space for filters
	var target;
	var extraButtonColour = function (){
		if(target === 'Men'){
			d3.selectAll('.btn.extra').style('border-bottom-color', '#ccc');
			d3.selectAll('.btn.extra.Men').style('border-bottom-color', '#222');
		} else if (target === 'Women') {
			d3.selectAll('.btn.extra').style('border-bottom-color', '#ccc');
			d3.selectAll('.btn.extra.Women').style('border-bottom-color', '#222');
		} else {
			d3.selectAll('.btn.extra').style('border-bottom-color', '#ccc');
			d3.selectAll('.btn.extra.All').style('border-bottom-color', '#222');
		}
	} // used for the target buttons in drawLines() and drawBars()
	var cutQuestion = function(x) { return x.substring(0, x.lastIndexOf('%')); } // used in builder to colour list depending on the question category
	var cutQuestion2 = function(x) { return x.substring(0, x.lastIndexOf('|')-1); } // used in builder to colour list depending on the question category
	var cutCategory = function(x) { return x.substring(x.lastIndexOf('%')+1, x.length); }  // used in builder to colour list depending on the question category
	var movingAvg = function(n) {
    return function (points) {
      points = points.map(function(each, index, array) {
        var to = index + n - 1;
        var subSeq, sum;
        if (to < points.length) {
          subSeq = array.slice(index, to + 1);
          sum = subSeq.reduce(function(a,b) { 
              return [a[0] + b[0], a[1] + b[1]]; 
          });
          return sum.map(function(each) { return each / n; });
        }
        return undefined;
      });
      points = points.filter(function(each) { return typeof each !== 'undefined' })
      return points.join('L');
		}
	} // n = desired moving avg. courtesy of http://stackoverflow.com/questions/11963352/plot-rolling-moving-average-in-d3-js  
	var reduceToIndeces = function(data, indeces) {
		var output = [];
		indeces.forEach(function(el) {
			output.push(data[el]);
		});
		return output;
	} // reduceToIndeces() takes data and an array of indeces and returns a reduced set of data containing only the indexed elements - used in the data prep section of the bubble() function
	var leastSquareLine = function (values_x, values_y) {
    var sum_x = 0;
    var sum_y = 0;
    var sum_xy = 0;
    var sum_xx = 0;
    var count = 0;

    // We'll use those variables for faster read/write access.
    var x = 0;
    var y = 0;
    var values_length = values_x.length;

    if (values_length != values_y.length) {
        throw new Error('The parameters values_x and values_y need to have same size!');
    }

    // Nothing to do.
    if (values_length === 0) {
        return [ [], [] ];
    }

		// Calculate the sum for each of the parts necessary.
    for (var v = 0; v < values_length; v++) {
        x = values_x[v];
        y = values_y[v];
        sum_x += x;
        sum_y += y;
        sum_xx += x*x;
        sum_xy += x*y;
        count++;
    }

		// Calculate m and b for the formular:
    // y = x * m + b
    var m = (count*sum_xy - sum_x*sum_y) / (count*sum_xx - sum_x*sum_x);
    var b = (sum_y/count) - (m*sum_x)/count;

		// We will make the x and y result line now
    var result_values_x = [];
    var result_values_y = [];

    for (var v = 0; v < values_length; v++) {
        x = values_x[v];
        y = x * m + b;
        result_values_x.push(x);
        result_values_y.push(y);
    }

    return [result_values_x, result_values_y];
	} // find line of best fit for bubbles. courtesy of http://dracoblue.net/dev/linear-least-squares-in-javascript/
	var pearson = function(prefs, p1, p2) {
	  var si = [];

	  for (var key in prefs[p1]) {
	    if (prefs[p2][key]) si.push(key);
	  }

	  var n = si.length;

	  if (n == 0) return 0;

	  var sum1 = 0;
	  for (var i = 0; i < si.length; i++) sum1 += prefs[p1][si[i]];

	  var sum2 = 0;
	  for (var i = 0; i < si.length; i++) sum2 += prefs[p2][si[i]];

	  var sum1Sq = 0;
	  for (var i = 0; i < si.length; i++) {
	    sum1Sq += Math.pow(prefs[p1][si[i]], 2);
	  }

	  var sum2Sq = 0;
	  for (var i = 0; i < si.length; i++) {
	    sum2Sq += Math.pow(prefs[p2][si[i]], 2);
	  }

	  var pSum = 0;
	  for (var i = 0; i < si.length; i++) {
	    pSum += prefs[p1][si[i]] * prefs[p2][si[i]];
	  }

	  var num = pSum - (sum1 * sum2 / n);
	  var den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) *
	      (sum2Sq - Math.pow(sum2, 2) / n));

	  if (den == 0) return 0;

	  return num / den;
	} // calculate pearson's r. usage: var data = new Array(21,54,60,78,82), new Array(20,54,54,65,45) ); console.log(pearsonCorrelation(data,0,1)); courtesy of https://gist.github.com/matt-west/6500993
	
	// media query for conditional javascript
	var screenSize = document.documentElement.clientWidth;
	
	// the 3 possible button states
	var btnState = [
		{num: 0, state: 'no lock, light grey', 'background-color': '#e6e6e6', 'color': '#000'},
		{num: 1, state: 'lock, black/white', 'background-color': '#3c3c3c', 'color': '#fff'},
		{num: 2, state: 'top answer lock, grey', 'background-color': '#ccc', 'color': '#000'}
	];

	// initialise the current button state
	var btnStateCurrent = 0;


	// lookup table for dashboard dropdown
	var dashLookup = {
		'dashb0': function() { return 'wide'; },
		'dashb1': function() { return 'tight'; }
	};
	var setIndex; // global to enable access in dashboard() function
	
	// lookup table for country dropdown
	var area = {
		'area0': function() { return 'World_#fcd116'; }
	};

	// lookup table for category dropdown
	var category = {
		'cat0': function() { return 'Population'; },
		'cat1': function() { return 'Rates'; },
		'cat2': function() { return 'Age'; },
		'cat3': function() { return 'Health'; },
		'cat4': function() { return 'Economy'; },
		'cat5': function() { return 'Urbanisation'; },
	};

	// lookup table for dashboard dropdown
	var scatterLookup = {
		'scatter0': function() { return 0; },
		'scatter1': function() { return 1; },
		'scatter2': function() { return 2; },
		'scatter3': function() { return 3; },
		'scatter4': function() { return 4; }
	};

	// lookup table for prespective dropdown
	var perspective = {
		'persp0': function() { return 'Lines'; },
		'persp1': function() { return 'Bars'; },
		'persp2': function() { return 'Tables'; }
	};

	var quotes = ['Above all else show the data. | E Tufte', 
		'The purpose of visualization is insight, not pictures. | B Schneiderman', 
		'In God we trust, all others must bring data. | W Edwards Deming',
		'The greatest value of a picture is when it forces us to notice what we never expected to see. | J Tukey',
		'History may not repeat itself, but it shure does rhyme. | M Twain',
		'If you think you have it tough, read history books. | B Maher',
		'A developed country is not not a place where the poor have cars. It\'s where the rich use public transport | Mayor of Bogota',
		'You can observe a lot by just watching. | Y Berra']

	// initialise area and category
	var file = 'data/world.csv';
	// var file = 'data/dashboard - tight index.csv';
	var countrySelect = 'World';
	var categorySelect = 'Population';
	var perspectiveSelect = 'Lines';
	var developmentLevelLeft = 'Very High';
	var developmentLevelRight = 'Low';
	var navigationBouncer = 0; // decides if the country-selection applies to the dashboard-, the bubble- or the overall data-file (see the .area-listener for mechanics)
	// 0 = world file
	// 1 = dashboard file
	// 2 = profile file ! check
	// 3 = brand capital file ! check
	// 4 = chart builder with overall country file
	
	
	d3.selectAll('li.change').style('display', 'inherit'); // zoom
	d3.selectAll('li.perspective').style('display', 'inherit'); // visual
	d3.selectAll('li.zoom').style('display', 'none'); // zoom
	d3.selectAll('li.period').style('display', 'none'); // profile periods

	// d3.selectAll('li.dash').style('color', '#fff'); // set colour
	d3.selectAll('li.category').style('color', '#fff'); // set colour
	d3.select('div#loadingContainer').style('display', 'none'); // hide quote
	
	// dashboard(file, countrySelect, categorySelect, perspectiveSelect);
	
	
	// primary render function
	d3.select('button#launchApp').on('mousedown', function() {

		d3.selectAll('ul.nav.list li').style('color', '#ccc'); // set colour
		d3.selectAll('li.category').style('color', '#fff'); // set colour

		navFunc(file, countrySelect, categorySelect, perspectiveSelect, developmentLevelLeft, developmentLevelRight);
		
	});
	
	// back to homepage
	d3.select('div.brand').on('mousedown', function() {

		d3.selectAll('.box, .tooltip').remove();
		d3.select('div#home').style('display', 'flex'); // hide homepage html
		
	});

		
	// navigation button listeners and handlers

	d3.selectAll('li.dashb').on('mousedown', function() {
		setIndex = d3.select(this).attr('id');
		var setHtml = d3.select(this).html();
		file = 'data/dashboard - ' + dashLookup[setIndex]() + ' index.csv';
		categorySelect = 'None';
		navigationBouncer = 1; 
		
		d3.select('#dashSpan').html(setHtml).style('color','#fff'); // set html of nav button
		d3.selectAll('#categorySpan').html('trends').style('color','#ccc'); // set neutral category
		d3.select('#scatterSpan').html('explore').style('color', '#ccc');
		d3.selectAll('li.builder').style('color','#ccc'); // set colour
		
		d3.selectAll('.box, .tooltip, #summaryHeadline').remove(); // remove all existing d3-produced elements
		d3.selectAll('li.change').style('display', 'none'); // zoom
		d3.selectAll('li.perspective').style('display','none'); // hide perspective option
		d3.selectAll('li.zoom').style('display','none'); // hide zoom option
		d3.selectAll('li.period').style('display', 'none'); // hide profile periods


		d3.select('div.legend').style('display', 'none') // hide legend from chart builder 
		
		dashboard(file, countrySelect, categorySelect, perspectiveSelect);
		
	});

	d3.selectAll('li.cat').on('mousedown', function() {
		var catId = d3.select(this).attr('id');
		categorySelect = spaceLess(category[catId]());
		file = 'data/world.csv';
		navigationBouncer = 0;

		d3.select('#categorySpan').html(category[catId]().toLowerCase()).style('color','#fff');
		d3.select('#dashSpan').html('summarise').style('color', '#ccc');
		d3.select('#scatterSpan').html('explore').style('color', '#ccc');
		d3.selectAll('li.builder').style('color','#ccc'); // set colour
		
		d3.selectAll('.box, .tooltip, #summaryHeadline').remove();
		d3.selectAll('li.change').style('display', 'inherit'); // zoom
		d3.selectAll('li.perspective').style('display','inherit'); // show perspective option
		d3.selectAll('li#persp1').style('display', 'inherit'); // show bars perspective (necessary when coming from builder which is hiding it)
		d3.selectAll('li.zoom').style('display','inherit'); // show zoom option
		d3.selectAll('li.period').style('display', 'none'); // hide periods
		
		
		d3.select('div.legend').style('display', 'none') // hide legend from chart builder 
		
		navFunc(file, countrySelect, categorySelect, perspectiveSelect, developmentLevelLeft, developmentLevelRight);
	});
	
	d3.selectAll('li.scatt').on('mousedown', function() {
		file = 'data/world.csv';
		var scatterId = d3.select(this).attr('id');
		var scatterIndex = scatterLookup[scatterId]();
		var scatterHtml = d3.select(this).html();
		categorySelect = 'Population';
		navigationBouncer = 2; 
		
		d3.select('#scatterSpan').html(scatterHtml).style('color','#fff');
		d3.selectAll('#categorySpan').html('trends').style('color','#ccc'); // set colour; // set neutral category
		d3.select('#dashSpan').html('summarise').style('color', '#ccc');

		d3.selectAll('li.period').style('display', 'inherit'); // show periods
		
		d3.selectAll('.box, .tooltip, #summaryHeadline').remove(); // remove all existing d3-produced elements
		d3.selectAll('li.change').style('display', 'none'); // zoom
		d3.selectAll('li.perspective').style('display','none'); // hide perspective option
		d3.selectAll('li.zoom').style('display','none'); // hide zoom option
		d3.select('div.legend').style('display', 'none') // hide legend from chart builder 
		d3.select('div#home').style('display', 'none'); // hide homepage html
		d3.select('div#loadingContainer').style('display', 'none'); // hide quote
		
		// bubble() API
		// file = file location
		// country = country
		// category = question category (Operator, Channels, and so on)
		// perspective = line, bar, data not used here
		// xVar = variable to show on x-axis (string) example: "Gender", has to conincide with variable question
		// yVar = variable to show on y-axis (string) example: "Age", has to conincide with variable question
		// zVar = variable to show on bubble size (string) example: "Subscription", has to conincide with variable question. If no zVar write "2D"
		// headline (string)
		// yLabel for y Axis (String)
		// xLabelRight (String) leave empty for 2D scatter (if bubble size excluded), useful mainly for brand profile ("more female" right and "more male" left)
		// xLabelLeft (String) label for y axis
		// x-, y- and zBarLabel (String) label for the bar charts. if no zVar write "" for zBarLabel

		if(scatterIndex === 0) {
			bubble(file, countrySelect, categorySelect, perspectiveSelect,
				'GDP per capita (constant 2005 US$)', 
				'Population ages 65 and above (% of total)', 
				'2D',
				'GDP vs Older Population',
				'% of population 65+',
				'GDP per capita',
				'',
				'GDP per capita',
				'% of population 65+',
				'')
		}	

		if(scatterIndex === 1) {
			bubble(file, countrySelect, categorySelect, perspectiveSelect,
				'GDP per capita (constant 2005 US$)', 
				'Population ages 0-14 (% of total)', 
				'2D',
				'GDP vs Young Population',
				'% of population 0-14',
				'GDP per capita',
				'',
				'GDP per capita',
				'% of population 0-14',
				'')
		}	
		
		if(scatterIndex === 2) {
			bubble(file, countrySelect, categorySelect, perspectiveSelect,
				'Adolescent fertility rate (births per 1,000 women ages 15-19)',
				'Mortality rate, infant (per 1,000 live births)',
				'2D',
				'Adolescent fertility vs Mortality',
				'Infant mortality rate (per 1000)',
				'Births per 1000 woman between 15 and 19',
				'',
				'Births per adolescent woman (15-19)',
				'Infant mortality rate',
				'')
		}

		if(scatterIndex === 3) {
			bubble(file, countrySelect, categorySelect, perspectiveSelect,
				'Adolescent fertility rate (births per 1,000 women ages 15-19)',
				'Survival to age 65 (% of cohort)',
				'2D',
				'Adolescent fertility vs Survival beyond 65',
				'% of people surviving to 65',
				'Births per 1000 woman between 15 and 19',
				'',
				'Births per adolescent woman (15-19)',
				'% of population 65+',
				'')
		}

		if(scatterIndex === 4) {
			bubble(file, countrySelect, categorySelect, perspectiveSelect,
				'Population, female (% of total)', 
				'Birth rate, crude (per 1,000 people)',
				'Death rate, crude (per 1,000 people)',
				'Female Population vs Birth rate',
				'Birth rate',
				'Female Population in %',
				'',
				'Female Population in %',
				'Birth rate',
				'Death rate')
		}
		
	});

	d3.selectAll('li.builder').on('mousedown', function() {
		file = 'data/world.csv';
		perspectiveSelect = 'Lines'; // force lines (attention: update when bars and data is allowed)
		d3.select('#perspSpan').html('lines');
		
		navigationBouncer = 4;

		d3.selectAll('.box, .tooltip, #summaryHeadline').remove();
		
		d3.selectAll('li.builder').style('color','#fff'); // set colour
		d3.selectAll('#dashSpan').html('summarise').style('color','#ccc'); // set colour
		d3.selectAll('#categorySpan').html('trend').style('color','#ccc'); // set colour; // set neutral category
		d3.selectAll('#scatterSpan').html('explore').style('color','#ccc'); // set colour

		d3.selectAll('li.perspective').style('display','inherit'); // show perspective option
		d3.selectAll('li#persp1').style('display', 'none'); // hide bars perspective
		d3.selectAll('#perspSpan').html('lines'); // set perspective
		perspectiveSelect = 'Lines'; // change 'global' to show lines so that the following example flow doesn't show lines on the menu but bar-charts on the screen: sweden>operator>bars >> chart builder(>lines forced) >> sweden>operator>lines but screen showing bars 
		
		d3.select('div#home').style('display', 'none'); // hide homepage html
		d3.select('div#loadingContainer').style('display', 'none'); // hide quote
		d3.selectAll('li.change').style('display', 'none'); // zoom
		d3.selectAll('li.zoom').style('display', 'none'); // hide zoom option
		d3.selectAll('li.period').style('display', 'none'); // hide periods

		builder(file, countrySelect, perspectiveSelect);

	});


	d3.selectAll('li.persp').on('mousedown', function() {
		var perspId = d3.select(this).attr('id');
		perspectiveSelect = perspective[perspId]();

		d3.select('span#perspSpan').html(perspectiveSelect.toLowerCase());

		d3.selectAll('.box, .tooltip, #summaryHeadline').remove();

		if (navigationBouncer === 0) {
			navFunc(file, countrySelect, categorySelect, perspectiveSelect, developmentLevelLeft, developmentLevelRight);
		} else if (navigationBouncer === 4) {
			builder(file, countrySelect, perspectiveSelect);			
		}
		
	});
	
	d3.selectAll('li.zoom').on('mousedown', function() {
		var state = d3.select('div#wrapperContext').style('display')
		d3.select('div#wrapperContext').style('display', state == 'none' ? 'inherit' : 'none' );
	});

	
	// modal and dataset-selection
	d3.select('li.change').on('mousedown', function() {
		if(d3.select('div.modal').style('display') === 'none') {
			d3.select('div.modal').style('display', 'inherit');
			d3.select('ul#left > li.' + spaceLess(developmentLevelLeft)).classed('locked', true);
			d3.select('ul#right > li.' + spaceLess(developmentLevelRight)).classed('locked', true);
		} else {
			d3.select('div.modal').style('display', 'none');
		}
	});

	d3.selectAll('ul.choice#left > li').on('mousedown', function() {
		d3.selectAll('ul.choice#left > li').classed('locked', false);
		var liClass = d3.select(this).attr('class');
		if(d3.selectAll('li.locked.' + liClass)[0].length === 0) {
			d3.select(this).classed('locked', true);
			developmentLevelLeft = d3.select(this).html();
		}
	});

	d3.selectAll('ul.choice#right > li').on('mousedown', function() {
		d3.selectAll('ul.choice#right > li').classed('locked', false);
		var liClass = d3.select(this).attr('class');
		if(d3.selectAll('li.locked.' + liClass)[0].length === 0) {
			d3.select(this).classed('locked', true);
			developmentLevelRight = d3.select(this).html();
		}
	});

	d3.select('button#modalSubmit').on('mousedown', function() {

		if(d3.selectAll('ul.choice > li.locked')[0].length === 2) {
			d3.selectAll('.box, .tooltip, #summaryHeadline').remove();
			d3.select('div.modal').style('display', 'none');
			navFunc(file, countrySelect, categorySelect, perspectiveSelect, developmentLevelLeft, developmentLevelRight);
		} else {
			d3.select('div.modal').style('display', 'none');
		}
	});

	d3.select('button#modalCancel').on('mousedown', function() {
		d3.select('div.modal').style('display', 'none');
	});

	// home page navigation triggers
	d3.selectAll('span#summary').on('mouseover', function() {
		var col = d3.select('span#dashSpan').style('color');
		d3.selectAll('span#dashSpan').transition().style('color', 'tomato').transition().delay(1000).style('color', col);
	});
	d3.selectAll('span#trends').on('mouseover', function() {
		var col = d3.select('span#categorySpan').style('color');
		d3.selectAll('span#categorySpan').transition().style('color', 'tomato').transition().delay(1000).style('color', col);
	});
	d3.selectAll('span#explore').on('mouseover', function() {
		var col = d3.select('span#scatterSpan').style('color');
		d3.selectAll('span#scatterSpan').transition().style('color', 'tomato').transition().delay(1000).style('color', col);
	});
	d3.selectAll('span#builder').on('mouseover', function() {
		var col = d3.select('li.builder').style('color');
		d3.selectAll('li.builder').transition().style('color', 'tomato').transition().delay(1000).style('color', col);
	});
	



	function dashboard(file, country, category, perspective) {

		moveContentUp(); // moves the content wrapper up beyond the filter div
		d3.select('div#home').style('display', 'none'); // hide homepage html, for security
		
		// read in data, write visual
		d3.csv(file, function(rawData) {
			
			rawData = rawData.filter(function(d) {
				return d.answer !== 'Cambodia';
			}); // remove Cambodia as its major signal impacts on all other scales. Alternative log scale is signficantly less expressive
			
			// date extent for x-scale
			var minMaxDate = d3.extent(rawData, function(d) { return Date.parse(d.date); });
			var maxDate = new Date(minMaxDate[1]);
			var maxDateLy = getLastYearDate(maxDate);

			var startDate = new Date(minMaxDate[0]).getFullYear();
			var endDate = new Date(minMaxDate[1]).getFullYear();
			var durInYears = endDate - startDate + 1;
			
			// value extent for y-scale
			var minMaxValue = d3.extent(rawData, function(d) { return +d.value; });
						
						
			// measures for svg
			var width = (document.getElementById('wrapperContent').clientWidth / 2);
			var height = width * .27; // height/width aspect-ratio as determined in css of pseudo-elements padding-top (not quite in order to allow the visual to be pulled over to [nearly] full width)
			var margin = { top: height * 0.18, right: 0, bottom: height * 0.18, left: width * 0.45 };

			// scale ranges
			var x = d3.scale.ordinal().rangeRoundBands([margin.left, (width - margin.right)], .1);
			var y = d3.scale.linear().range([(height - margin.bottom), margin.top]);  // y scale range

			// scale domains (before setting up x and y axis !)
			// x.domain(minMaxDate);
			x.domain(d3.range(durInYears));
			y.domain(minMaxValue);

			// log(durInYears); return;
			
			// x and y axis
			// var xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(d3.time.format('%b %y')).tickSize(4).tickPadding(10);
			var xAxis = d3.svg.axis().scale(x).orient('bottom');
			var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickSize(4).tickPadding(5);


			// only show answers of one reception method
			var dataWork = rawData.filter(function(d) {
				return d.category === category && d.show == 1 && d.country === country;
			});

			// create sorted array of answers based on the answers' average rank and map colors accordingly
			// http://stackoverflow.com/questions/21819819/summarize-array-of-objects-and-calculate-average-value-for-each-unique-object-na
			function average(arr) {
			    var sums = {}, counts = {}, results = [], answer;
			    for (var i = 0; i < arr.length; i++) {  // for each object in the array
			        answer = arr[i].answer;  // get the answer
			        if (!(answer in sums)) { // if the answer is not yet in the variable sums (this step removes duplicates - a good guess)
			            sums[answer] = 0; // in the 'sums' object set the value of the answer key to 0 
			            counts[answer] = 0; // in the 'counts' object set the value of the answer key to 0 
			        }
			        sums[answer] += Number(arr[i].rank); // add the rank to the 'sums' object answer-key
			        counts[answer]++; // add the number of ranks to the 'counts' object answer key
						}
						for(answer in sums) { // for each unique answer in the 'sums'-object
			        results.push({ answer: answer, rank: sums[answer] / counts[answer] }); 
							// create an object with key answer holding the answer and key rank dividing 
							// this answers' sum by this answers' count and push it into the array
			    }
			    return results; // return the array
			}

			// create sorted array of unique values
			var sorted = average(dataWork);
			sorted = sorted.sort(function(a,b){ return a.rank - b.rank; });
			sorted = sorted.map(function(m){ return spaceLess(m.answer); })

			// map colors
			var colors = d3.scale.category10()
				.domain(sorted);

	
			// set double-column layout
			var dataBouncer = 1;

			drawIt(dataWork, 'Growth index', 'left');
			
			// main draw line function
			function drawIt(data, question, column){

				data.filter(function(d) { return d.question === question; });
				
				// nest data by question (top-level) and answer (2nd level)
				var data = d3.nest()
					.key(function(d) { return d.answer; })
					.entries(data);

				data.forEach(function(d) {
					d.answer = d.key;
					d.answerValues = d.values;
					delete d.key; delete d.values;
	
				});

				// sort data by rank (note include slice() to create new object)
				data.sort(function(a,b) { return a.answerValues[0].rank - b.answerValues[0].rank; });

				// log(data);
				
				// set up headline
				var summary = dashLookup[setIndex]();
				if (summary === 'wide') {
					var h1 = "<h1>Growth index - wide</h1>";
					var p = "<p>...shows how each country's development changes from one year to another.\
									Does it grow or decline ? </br> This <strong>wide</strong> index does so by averaging 9 key metrics\
									(GDP, some Mortality rates, Life expectancy and Survival beyond 65).</br>\
									The countries are then ranked by their growth in the last 10 years\
									- the list being topped by the country that showed the strongest growth.</p>";
				} else {
					var h1 = "<h1>Growth index - tight</h1>";
					var p = "<p>...shows how each country's development changes from one year to another.\
									Does it grow or decline ? </br> This <strong>tight</strong> index does so by averaging 3 key metrics\
									(Life expectancy, Death rate and Survival beyond 65).</br>\
									The countries are then ranked by their growth in the last 10 years\
									- the list being topped by the country that showed the strongest growth.</p>";
				} // headline information text
									
				d3.select('div#summaryHeadline').remove(); // remove all potential previous headlines
				
				var headline = d3.select('div#wrapperContent')
					.insert('div', ':first-child')
					.attr('id', 'summaryHeadline')
					.append('div')
					.html(h1 + p); // add headline

				// add container
				var container = d3.select('.contentInner#left')
					.selectAll('.containerInner')
					.data(data)
					.enter();
				
				var box = container.append('div')
					.attr('class', 'boxContentDash graph box')
					.append('div')
					.attr('class', 'containerContent contain')
					.attr('id', function(d) { return 'outer_' + spaceLess(d.answer); });



		// --- graph ------------------------------------------------------------------------------------
				
				// svg (incl. viewBox for responsiveness)
				var svg = box.append('svg')
					.attr('width', '100%')
					.attr('height', '100%')
					.attr('viewBox', '0 0 ' + width + ' ' + height)
					.attr('preserveAspectRatio', 'xMinYMin')
					.attr('class','question')
					.attr('id', function(d, i) {return spaceLess(d.answer); })
					.style('border-top', '1px solid #ccc');
				
				// brand name
				var brand = svg
					.append('text')
					.text(function(d) { return d.answer; })
					.attr('class', 'brand')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', width*0.03) // express relative to svg-sizes for responsiveness
					.attr('y', y(0) - width*0.03) // express relative 
					.style('font-size', width*0.08 + 'px') // express relative 
					.style('fill', '#999')
					.style('fill-opacity', .6);

				// brand rank
				var rankNo = svg
					.append('text')
					.text(function(d) { return 'growth rank ' + d.answerValues[0].rank; })
					.attr('class', 'rankNo')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', width*0.03) // express relative
					.attr('y', y(0) + width*0.03)
					.style('font-size', width*0.04 + 'px') // express relative
					.style('fill', '#999')
					.style('fill-opacity', .6);
					
				// percentage change line (MoM = Month on Month)
				var valChange = svg
					.append('text')
					.text(function(d) {
						var l = d.answerValues.length - 1;
						return formatPlus(round(d.answerValues[l].value)) + '% from ' + formatDate(maxDateLy) + ' to ' + formatDate(maxDate);
					 })
					.attr('class', 'valChange')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', width*0.03) // express relative
					.attr('y', y(0) + width*0.08) // express relative
					.style('font-size', width*0.025 + 'px') // express relative 
					.style('fill', '#999')
					.style('fill-opacity', .6);

				// add axes
				svg.append('g')
				  .attr('class', 'x axis dash')
					.attr('transform', 'translate( 0, ' + (height-margin.bottom) + ' )')
				  .call(xAxis);

				svg.append('g')
				  .attr('class', 'y axis dash')
					.attr('transform', 'translate( ' + margin.left + ', 0 )')
					.call(yAxis);

				// add clip-path details
				svg.append('defs').append('clipPath')
			    .attr('id', 'clip')
					.append('rect')
			    .attr('width', width-margin.right-margin.left)
			    .attr('height', height-margin.bottom) // allowed to use all margin.top space for higher percentages
					.attr('transform', 'translate(' + margin.left + ', 0)'); // see above
					
				var blocksHelp = svg.selectAll('.blocks')
					.data(function(d) { return d.answerValues; })
					.enter()
					.append('rect')
					.attr('class', function(d) { return 'blockshelp'; })
					.attr('id', function(d) { return 'date' + d.date.replace(/-/g,''); })
					.attr('x', function(d,i) { return x(i); })
					.attr('y', function(d) { return y(minMaxValue[1]); })
					.attr('width', function(){ return x.rangeBand() + 5 + 'px'; })
					.attr('height', function(d) { return (y(minMaxValue[0])); })
					.style('fill', '#000')
					.style('opacity', 0); // helper rects for mouseover
					
				
				var blocks = svg.selectAll('.blocks')
					.data(function(d) { return d.answerValues; })
					.enter()
					.append('rect');

				var blocksUpdate = blocks
					.attr('class', function(d) { return 'blocks'; })
					.attr('id', function(d) { return 'date' + d.date.replace(/-/g,''); })
					.attr('x', function(d,i) { return x(i); })
					.attr('y', function(d) { return y(Math.max(0, Number(d.value))); })
					.attr('height', 0)
					.attr('width', x.rangeBand())
					.style('fill', function(d) { return Number(d.value) > 0 ? '#2ECC71' : 'tomato'; })
					.style('opacity', .5);

				blocksUpdate.transition().duration(1000).ease('bounce')
					.attr('height', function(d) { return Math.abs(y(0) - y(Number(d.value)) ); });


				var value = svg.selectAll('.value')
					.data(function(d) { return d.answerValues; })
					.enter()
					.append('text');
				
				var valueUpdate = value
					.attr('class', function(d) { return 'value'; })
					.attr('id', function(d) { return 'date' + d.date.replace(/-/g,''); })
					.attr('x', function(d,i) { return x(i) + x.rangeBand()/2; })
					.attr('y', function(d) { return +d.value > 0 ? y(Number(d.value)) - height*0.025 : y(Number(d.value)) + height*0.075; }) // express relative to svg-sizes for responsiveness
					.text(function(d) { return formatPlus(round(d.value)); })
					.style('text-anchor', 'middle')
					.style('fill', function(d) { return Number(d.value) > 0 ? '#2ECC71' : 'tomato'; })
					.style('display', 'none');


				var dateLabel = svg.selectAll('.dateLabel')
					.data(function(d) { return d.answerValues; })
					.enter()
					.append('text');
				
				var dateLabelUpdate = dateLabel
					.attr('class', function(d) { return 'dateLabel'; })
					.attr('id', function(d) { return 'date' + d.date.replace(/-/g,''); })
					.attr('x', function(d,i) { return x(i) + x.rangeBand()/2; })
					.attr('y', function(d) { return +d.value > 0 ? y(0) + height*0.12 : y(Number(d.value)) + height*0.15; }) // express relative to svg-sizes for responsiveness
					.text(function(d) { return formatDate(new Date(Date.parse(d.date))); })
					.style('text-anchor', 'middle')
					.style('fill', function(d) { return Number(d.value) > 0 ? '#2ECC71' : 'tomato'; })
					.style('display', 'none');



		// --- interactivity ------------------------------------------------------------------------------

				function blockOver(d) {

					var blockId = d3.select(this).attr('id') + ':not(.blockshelp)';
					var textId = d3.select(this.parentNode).attr('id');
					var selectionValChange = d3.select('.valChange#' + textId);
					var selectionBrand = d3.select('.brand#' + textId);
					var selectionRank = d3.select('.rankNo#' + textId);
					var value = formatPlus(round(d.value));
					var date = new Date(Date.parse(d.date));

					selectionValChange.text(function(d) { return value + '% from ' + formatDate(getLastYearDate(date)) + ' to ' + formatDate(date); })
						.style('fill', function (d) { return value < 0 ? 'tomato' : '#2ECC71'; })
						.transition().duration(100).style('fill-opacity', 1);

					selectionBrand.transition().duration(100).style('fill-opacity', 1);
					selectionRank.transition().duration(100).style('fill-opacity', 1);

					d3.selectAll('.blocks#' + blockId).style('opacity', 1);
					d3.selectAll('.value#' + blockId).style('display', 'inherit');
					d3.selectAll('.dateLabel#' + blockId).style('display', 'inherit');
					
				} // mouseover function

				blocksUpdate.on('mouseover', blockOver); // mouseover for visible bars
				blocksHelp.on('mouseover', blockOver); // mouseover for helper bars

				function blockOut(d){

					var blockId = d3.select(this).attr('id') + ':not(.blockshelp)';
					var textId = d3.select(this.parentNode).attr('id');
					var selectionValChange = d3.selectAll('.valChange#' + textId);
					var selectionBrand = d3.select('.brand#' + textId);
					var selectionRank = d3.select('.rankNo#' + textId);

					selectionValChange.text(function(d) {
						var l = d.answerValues.length - 1;
						return formatPlus(round(d.answerValues[l].value)) + '% from ' + formatDate(maxDateLy) + ' to ' + formatDate(maxDate);
						})
						.style('fill', '#999')
						.transition().style('fill-opacity', .6);

					selectionBrand.transition().style('fill-opacity', .6);
					selectionRank.transition().style('fill-opacity', .6);

					d3.selectAll('.blocks#' + blockId).style('opacity', .5);
					d3.selectAll('.value#' + blockId).style('display', 'none');
					d3.selectAll('.dateLabel#' + blockId).style('display', 'none');
					
				} // mouseout function

				blocksUpdate.on('mouseout', blockOut); // mouseout for visible bars
				blocksHelp.on('mouseout', blockOut); // mouseout for helper bars



		// --- tooltip transition ------------------------------------------------------------------------------------

				// add tooltip
				var tooltipExplain = d3.select('body').append('div')
			    .attr('class', 'tooltip')
			    .attr('id', 'explain')
					.style('opacity', 0)
					.style('z-index', 10);

				// explanation text for dashboard
				var explainDashboard = "<span style='font-size:14px'>Growth Index</span> </br></br> \
					This board tries to give us a quick </br> \
					and concise visual reference to which countries </br> \
					have seen what levels of growth in the past. </br></br> \
					The 'wide growth index' shows the yearly change of an average from </br> \
					9 metrics covering GDP, Mortality levels, Life expectancy and similar. </br> \
					The 'tight growth index' averages 3 metrics covering just </br> \
					Life expectancy, Death rate and Survival to age 65. </br></br> \
					The wide index is more expressive as it covers more metrics, </br> \
					The tight index covers, however, more countries (154). </br></br> \
					The countries are ranked by the level of growth over the past 10 years. </br></br>";
					
					
				// event listeners and handlers
				d3.select('li.explanation')
					.on('mouseover', function() {
						tooltipExplain.html(explainDashboard)
							.style('opacity', .9)
							.style('right', '2.48%')
							.style('top', '4.5em');
					})
					.on('mouseout', function() {
						tooltipExplain.transition().duration(1000).style('opacity', 0);
					});


				// at last check for number of data sets and apply single column layout if necessary 
				// (needs to be after all accessed elements have been built)
				singleColumn();

			} // drawIt(), draws the bars


			function singleColumn() {
				if (dataBouncer == 0) {
					d3.selectAll('.inside').style('width', '50%'); // normal setting for 2-column layout
					d3.selectAll('.box').style('width', '100%').style('float', 'none');  // normal setting for 2-column layout
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', false); // removes potential class with shorter top-padding to the :before element
				} else if (dataBouncer == 1) {
					d3.selectAll('.inside#left').style('width', '100%'); // left column gets full width
					d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left'); // all boxes (i.e. graphs) get half the width unless when viewed on mobile (needs to be tested!)
					d3.selectAll('.inside#right').selectAll('*').remove(); // remove all children of the right inside wrapper = remove all right .box-elements
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
					d3.selectAll('.boxFilters').style('width', '100%'); // the box for the filters and the context need a width of 100%
					// d3.selectAll('.boxFilters')[0][1].remove();
					d3.selectAll('.boxContext').classed('boxContextSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
					d3.selectAll('.boxContext').style('width', '100%'); // the box for the filters and the context need a width of 100%
				} else if (dataBouncer == 2) {
					d3.selectAll('.inside#right').style('width', '100%'); // all as above
					d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left');
					d3.selectAll('.inside#left').selectAll('*').remove();
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true);
					d3.selectAll('.boxFilters').style('width', '100%');
					d3.selectAll('.boxContext').classed('boxContextSingleCol', true);
					d3.selectAll('.boxContext').style('width', '100%');
				} else {
					console.log('dataBouncer on fire')
				}
			}


		}); // d3.csv() 

	} // dashboard()



	function navFunc(file, country, category, perspective, developmLevelLeft, developmLevelRight) {

		moveContentDown();

		// read in data, write visual
 		// d3.csv(file, function(rawData) {
		var quote = quotes[Math.floor(Math.random()*quotes.length)];
			
		// var interv;
		d3.csv(file)
			.on('progress', function(){ 
				d3.select('div#home').style('display', 'none'); // hide homepage html
				d3.select('div#loadingContainer').style('display', 'flex'); // show quote
				d3.select('p#loading').html(quote); // show quote
			})
			.get(function(err, rawData) {
				if(err) throw err;
				d3.select('div#loadingContainer').style('display', 'none'); // hide quote
				
			// log(rawData);
		
			// date extent for x-scale
			// last date for bar brush
			var minMaxDate = d3.extent(rawData, function(d) { return Date.parse(d.date); });
			maxDate = new Date(minMaxDate[1]);
					
			// measures for svg
			var width = document.getElementById('wrapperContent').clientWidth / 2;
			var height = width * .55; // height/width aspect-ratio as determined in css of pseudo-elements padding-top
			var height2 = width * .08; // height/width aspect-ratio as determined in css of pseudo-elements padding-top
			var margin = { top: height * 0.2, 
										 right: width * 0.15, 
										 bottom: height * 0.11, 
										 left: width * 0.085 };


			// only show answers of one reception method
			var dataOrig01 = rawData.filter(function(d) {
				return  (d.category === category &&
								 d.show == 1 &&
								 d.country === country &&
								 d.reception === developmLevelLeft); });
								 // d.reception === 'Very High'); });

			var dataOrig02 = rawData.filter(function(d) { 
				return  (d.category === category && 
								 d.show == 1 && 
								 d.country === country &&
								 d.reception === developmLevelRight); });

			// concat the 2 sets for use in graphs (and in order to get the relevant unique names)
			var dataOrig03 = dataOrig01.concat(dataOrig02);
			


			// create sorted array of answers based on the answers' average rank and map colors accordingly
			// http://stackoverflow.com/questions/21819819/summarize-array-of-objects-and-calculate-average-value-for-each-unique-object-na
			function average(arr) {
			    var sums = {}, counts = {}, results = [], answer;
					// for each object in the array ...
			    for (var i = 0; i < arr.length; i++) {
			        answer = arr[i].answer;  // get the answer
			        // if the answer is not yet in the variable sums (this step removes duplicates - a good guess)
							if (!(answer in sums)) {
			            sums[answer] = 0; // in the 'sums' object set the value of the answer key to 0 
			            counts[answer] = 0; // in the 'counts' object set the value of the answer key to 0 
			        }
			        sums[answer] += Number(arr[i].rank); // add the rank to the 'sums' object answer-key
			        counts[answer]++; // add the number of ranks to the 'counts' object answer key
						}
						for(answer in sums) { // for each unique answer in the 'sums'-object
			        results.push({ answer: answer, rank: sums[answer] / counts[answer] }); 
							// create an object with key answer holding the answer and key rank dividing 
							// this answers' sum by this answers' count and push it into the array
			    }
			    return results; // return the array
			}

			// create sorted array of unique values
			var sorted = average(rawData);
			sorted = sorted.sort(function(a,b){ return b.rank - a.rank; });
			sorted = sorted.map(function(m){ return spaceLess(m.answer); }) // spaceLess() added in v22 for showBrandsAtStart()

			// map colors
			var colors = d3.scale.category10()
				.domain(sorted);

			// var colors = d3.scale.ordinal()
			// 	.domain(sorted)
			// 	.range(colorbrewer.Dark2[8]);


			// logic to establish one-sided or two-sided layout
			var dataBouncer;

			if (dataOrig01.length > 0 && dataOrig02.length > 0) {
			 dataBouncer = 0;
			 // both sets have data, each wrapper gets 50% width, box 100% width
		 	} else if (dataOrig01.length > 0 && dataOrig02.length == 0) {
			 dataBouncer = 1;
			 // only left set (dataOrig01) has data, left inner wrappers (.inside) get 100% width, box (.box) 50%, float left
			} else if (dataOrig01.length == 0 && dataOrig02.length > 0) {
			 dataBouncer = 2;
			 // only right set (dataOrig02) has data, right inner wrappers (.inside) get 100% width, box (.box) 50%, float left
			} else {
			 dataBouncer = 99;
			 console.log('probably no data available');
			 // in case no dataset has data !
			}

																				 
			// create the array 'filteredDistinct', containing unique answer categories per reception category (used as select-button keys)
		 	var filteredDistinct;

		 	function btnKeys(answerRecep){
		 		var filteredArray = dataOrig03.filter(function(d){
					return d.answerRecep === String(answerRecep);
				});
		 		var filteredUnique = {};
		 		filteredDistinct = [];
		 		for(var i in filteredArray){
					if(typeof(filteredUnique[filteredArray[i].answer]) == 'undefined'){
		 		  	filteredDistinct.push(filteredArray[i].answer);
		 		 	}
		 		 	filteredUnique[filteredArray[i].answer] = 0;
		 		};
		 	 	return filteredDistinct;
			 }

		 	var btnKeysOtt = btnKeys(developmLevelLeft);
		 	var btnKeysLin = btnKeys(developmLevelRight);


			// button controls
			switch(perspective) {

				case 'Lines': lines();
					break;

				case 'Bars': bars();
					break;

				case 'Tables': tables();
					break;

				default:
					console.error('perspective button on fire');
				
			}

			// wrapper draw functions
			function lines() {
				// show zoom
				d3.selectAll('li.zoom').style('display', 'none'); // zoom

				drawLines(dataOrig03, 'left', developmLevelLeft);
				drawLines(dataOrig03, 'right', developmLevelRight);
			
			} // trigger lines for the 2 seperate columns (left and right)

			function bars() {
				// show zoom
				d3.selectAll('li.zoom').style('display', 'inherit'); // zoom
				drawBars(dataOrig03, 'left', developmLevelLeft);
				drawBars(dataOrig03, 'right', developmLevelRight);

			} // trigger bars for the 2 seperate columns (left and right)

			function tables() {

				// hide zoom
				d3.selectAll('li.zoom').style('display', 'none'); // zoom
			
				drawTables(dataOrig03, 'left', developmLevelLeft);
				drawTables(dataOrig03, 'right', developmLevelRight);
			} // trigger tables for the 2 seperate columns (left and right)


			// main draw line function
			function drawLines(c, column, receptionMethod){


				var data = d3.nest()
					.key(function(d) { return d.question; })
					.key(function(d) { return d.answer; })
					.entries(c); // nest the data

					data.forEach(function(d){
						d.question = d.key;
						d.questionValues = d.values;
						delete d.key; delete d.values; 

						d.questionValues.forEach(function(d) {
							d.answer = d.key;
							d.answerValues = d.values;
							d.rank = d3.mean(d.values, function(d) { return +d.rank; }); 
							d.max = d3.max(d.values, function(d) { return Number(d.value); }); 
							d.min = d3.min(d.values, function(d) { return Number(d.value); }); 
							d.develop = d.values[0].answerRecep;
							delete d.key; delete d.values;
						}); // change variable names in second nest and add hellper variables
					}); // change variable names in first nest

					data.forEach(function(d){
						d.max = d3.max(d.questionValues, function(dd){ return Number(dd.max)});
						d.min = d3.min(d.questionValues, function(dd){ return Number(dd.min)});
					}); // calculate max and min for each question

					data.forEach(function(d){
						d.questionValues = d.questionValues.filter(function(dd){
							return (dd.develop === receptionMethod);
						});
					}); // loop through each datapoint...to filter dataset based on development level

					// log('data',data);
				
				// switch filter section CSS back on (in case user comes from table vis, which switches these conditions off)
				setFilterSectionCSS();

				
				// scale ranges
				var x = d3.time.scale().range([margin.left, width - margin.right]);     // x scale range
				var y = d3.scale.linear().range([height - margin.bottom, margin.top]);  // y scale range

				// scale ranges for the brush
				var x2 = d3.time.scale().range([margin.left, width - margin.right]);     			// x scale range
				var y2 = d3.scale.linear().range([height - margin.bottom, margin.top * 3]);   // y scale range

				// scale domains (before setting up x and y axis !)
				x.domain(minMaxDate);
				// y.domain([0,100]);
			  x2.domain(x.domain());
			  // y2.domain(y.domain());
			

				// clamping the axes (to not shoot over in brush)
				// don't clamp x-domain, this would lead to clustered points at one side 
				x2.clamp(true);
			
				// x and y axis
				var xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(d3.time.format('%Y')).tickSize(4).tickPadding(10);
				var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickSize(5).tickPadding(10)
					.tickFormat(function(d){
						var prefix = d3.formatPrefix(d);
						return prefix.scale(d) + prefix.symbol;
					});
				var xAxis2 = d3.svg.axis().scale(x2).orient('bottom').tickFormat(d3.time.format('%Y')).tickSize(4);
			

				// path generators
				var line = d3.svg.line()
					.defined(function(d) { return !isNaN(d.value); })
					.x(function(d) { return x(Date.parse(d.date)); })
					.y(function(d) { return y(Number(d.value)); })
					.interpolate('linear');

				// target maps (saves text)
				var dataObj = {};

				var pathGen = {
					All: line,
					// Men: lineMen,
					// Women: lineWomen,
					// Open: lineOpen,
				};
				dataObj.CircleY = {
					All: function(d) { return isNaN(d.value) ? 0 : y(d.value); },
					// Men: function(d) { return isNaN(d.valueM) ? 0 : y(d.valueM); },
					// Women: function(d) { return isNaN(d.valueF) ? 0 : y(d.valueF); },
					// Open: function(d) { return isNaN(d.valueO) ? 0 : y(d.valueO); }
				};
				dataObj.TextY = {
					All: function(d) { return isNaN(d.value) ? 0 : y(d.value) - 8; },
					// Men: function(d) { return isNaN(d.valueM) ? 0 : y(d.valueM) - 8; },
					// Women: function(d) { return isNaN(d.valueF) ? 0 : y(d.valueF) - 8; },
					// Open: function(d) { return isNaN(d.valueO) ? 0 : y(d.valueO) - 8; }
				};
				dataObj.BarHeight = {
					All: function(d) { return isNaN(d.value) ? 0 : height - margin.bottom - y(d.value); },
					// Men: function(d) { return isNaN(d.valueM) ? 0 : height - margin.bottom - y(d.valueM); },
					// Women: function(d) { return isNaN(d.valueF) ? 0 : height - margin.bottom - y(d.valueF); },
					// Open: function(d) { return isNaN(d.valueO) ? 0 : height - margin.bottom - y(d.valueO); }
				};
				dataObj.BarY = {
					All: function(d) { return isNaN(d.value) ? 0 : y(d.value); },
					// Men: function(d) { return isNaN(d.valueM) ? 0 : y(d.valueM); },
					// Women: function(d) { return isNaN(d.valueF) ? 0 : y(d.valueF); },
					// Open: function(d) { return isNaN(d.valueO) ? 0 : y(d.valueO); }
				}; // same as CircleY - repeated for easier read
				dataObj.BarTextY = {
					All: function(d) { return isNaN(d.value) ? 0 : y(d.value) - 5; },
					// Men: function(d) { return isNaN(d.valueM) ? 0 : y(d.valueM) - 5; },
					// Women: function(d) { return isNaN(d.valueF) ? 0 : y(d.valueF) - 5; },
					// Open: function(d) { return isNaN(d.valueO) ? 0 : y(d.valueO) - 5; }
				};
				dataObj.Label = {
				All: function(d) { return isNaN(d.value) ? null : round(d.value); },
				// Men: function(d) { return isNaN(d.valueM) ? null : round(d.valueM); },
				// Women: function(d) { return isNaN(d.valueF) ? null : round(d.valueF); },
				// Open: function(d) { return isNaN(d.valueO) ? null : round(d.valueO); }
				};
					dataObj.Label.Last = {
						All: function(d) { return isNaN(d.value) ? null : round(d.value) + ' ' + d.answer; ; },
						// Men: function(d) { return isNaN(d.valueM) ? null : round(d.valueM) + ' ' + d.answer; },
						// Women: function(d) { return isNaN(d.valueF) ? null : round(d.valueF) + ' ' + d.answer; },
						// Open: function(d) { return isNaN(d.valueO) ? null : round(d.valueO) + ' ' + d.answer; }
					};


				// add container divs for each question (for each 'column')
				var container = d3.select('.contentInner#' + column)
					.selectAll('.containerInner')
					.data(data)
					.enter()
					.append('div')
					.attr('class', 'boxContent graph box')
					.append('div')
					.attr('class', 'containerContent contain ' + column)
					.attr('id', function(d) { return 'outer_' + spaceLess(d.question); });

				d3.select('.contentInner#' + column)
					.style('position','inherit')
					.style('left', 'auto'); // necessary in order to remove fixed and left positioning when coming from the chart builder

	
			// --- filters ----------------------------------------------------------------------------------

				// switch filter section CSS back on (in case user comes from table vis, which switches these conditions off)
				setFilterSectionCSS();
			
				// add filter container
				var filters = d3.select('.filters#' + column)
					.append('div')
					.attr('class', 'boxFilters box')
					.append('div')
					.attr('class', 'containerFilters contain');

				filters.append('div')
					.attr('class', 'filterExplain')
					.html(column === 'left' ? developmLevelLeft + ' development:' : developmLevelRight + ' development:');
					
				// add answer buttons
				var answerBtns = filters.selectAll('.buttons')
					.data(btnKeys(receptionMethod).sort())
					.enter()
					.append('button')
					.html(function(d) { return d; })
					.attr('class', 'btn')
					.attr('id', function(d) { return 'btn_' + spaceLess(d); });
		
				// add remove focus button
				var removeFocusBtn = filters.append('button')
					.attr('class', 'btn extra focus')
					.html('Remove all focus');
	
				// add toggle numbers button
				var toggleNumbersBtn = filters.append('button')
					.attr('class', 'btn extra numbers')
					.html('Toggle numbers');
					

				// interactivity buttons
				answerBtns.on('mouseover', answerBtnHover);
			
				answerBtns.on('mousedown', answerBtnLock);
			
				answerBtns.on('mouseout', answerBtnHoverOut);
			
				removeFocusBtn.on('mousedown', removeBtnDown);
				
				toggleNumbersBtn.on('mousedown', toggleNumbersBtnDown);



			// --- graph ------------------------------------------------------------------------------------

				// svg (incl. viewBox for responsiveness)
				var svg = container.append('svg')
					.attr('width', '100%')
					.attr('height', '100%')
					.attr('viewBox', '0 0 ' + width + ' ' + height)
					.attr('preserveAspectRatio', 'xMinYMin')
					.attr('class','question')
					.attr('id', function(d) { return spaceLess(d.question); })
					.each(graphComponent); // use simple reusable component which gives us more control over the individual chart and in this specific case allows us to specify a y-domain for each graph individually

				// add brand description for two-column-layout
				if (dataBouncer == 0) {

					var descr = d3.select('.contentInner#' + column).select('.question')
						.append('text')
						.text(receptionMethod)
						.attr('transform', 'translate(' + (width - margin.right) + ', -10)')
						.style('text-anchor', 'end')
						.style('fill', '#ccc')
						.style('font-size', height*0.01 + 'px');
			
					var	descrTrans = descr.transition().duration(1500).ease('bounce')
						.style('font-size', height*0.045 + 'px')
						.attr('transform', 'translate(' + (width - margin.right/2) + ',' + (height * .1) + ')')

				}

				var chart, answerLines, text, label, circles;
				
				function graphComponent(d, i){
					
					var svg = d3.select(this);
					
					var min = d.min < 0 ? d.min : 0; // could do Math.min([0, d.min])
					y.domain([min, d.max]);
				  y2.domain(y.domain());
					
					if(d.min < 0) {

						svg.append('g')
						  .attr('class', 'x axis zero ')
							.attr('transform', 'translate( 0, ' + y(0) + ' )')
						.call(xAxis.tickSize(4).tickFormat('')); // zero line main axis

						svg.append('g')
						  .attr('class', 'x axis zerolabels')
							.attr('transform', 'translate( 0, ' + (height-margin.bottom) + ' )')
							.style('stroke-width', 0)
						  .call(xAxis.tickSize(0).tickFormat(d3.time.format('%Y'))); // bottom oriented axis only to show for labels

					} else {

						svg.append('g')
						  .attr('class', 'x axis')
							.attr('transform', 'translate( 0, ' + (height-margin.bottom) + ' )')
						.call(xAxis.tickSize(4).tickFormat(d3.time.format('%Y'))); // normal x axis for values < 0

					} // condition x axis on existance of positive or negative values
					
					svg.append('g')
					  .attr('class', 'y axis')
						.attr('transform', 'translate( ' + margin.left + ', 0 )')
						.call(yAxis);

					// add clip-path details
					svg.append('defs').append('clipPath')
				    .attr('id', 'clip')
						.append('rect')
				    .attr('width', width-margin.right-margin.left)
				    .attr('height', height-margin.bottom) // allowed to use all margin.top space for higher percentages
						.attr('transform', 'translate(' + margin.left + ', 0)'); // see above

					// append title
					var graphHeader = svg.append('text')
						.attr('class', 'graphHeader')
						.attr('transform', 'translate(' + (margin.left + (width - margin.right)) / 2 + ',' + (height * .1) + ')')
						.text(function(d) { return d.question; }); // needs to be .text not .html to be displayed in Safari

					// append question text
					var containerId = 'div.' + column + '#outer_' + spaceLess(d.question);
					var questionText = d3.select(containerId).append('div')
						.attr('class', 'qt')
						.attr('id', function(d) { return d3.select(this.parentNode).attr('id').split('_')[1]; })
						.style('top', -height * .89 + 'px')
						.style('display','none')
						.html(function(d) { return getText(d); });

					// switch question Text on off
					d3.selectAll('.graphHeader').on('mousedown', function() {
						var qtId = d3.select(this.parentNode.parentNode).attr('id').split('_')[1];
						d3.selectAll('.qt#' + qtId).style('display', function() {
							return d3.select(this).style('display') == 'none' ? 'inherit' : 'none';
						})
					});

					// add chart g
					chart = svg.selectAll('.chart') // define on higher scope level for toggleTopAnswer interactivity
						.data(function(d) { return d.questionValues; }, rankKey)
						.enter()
						.append('g')
						.attr('class', 'chart')
						.attr('id', function(d) { return spaceLess(d.answer); })
						.style('display', 'inherit');

					// add lines
					answerLines = chart.append('path')
						.attr('class', function(d) { return 'line main ' + spaceLess(d.answer) + ' ' + column; })
						.attr('d', function(d) { return line(d.answerValues); });

					// add hover helper lines
					answerLinesHelp = chart.append('path')
						.attr('class', function(d) { return 'line hoverHelp ' + spaceLess(d.answer) + ' ' + column; })
						.attr('d', function(d) { return line(d.answerValues); });

					// add circles
					circles = chart.selectAll('circle')
						.data(function(d) { return d.answerValues; })
						.enter()
						.append('circle')
						.attr('class', function(d) { return 'line main ' + spaceLess(d.answer) + ' ' + column; })
						.attr('cx', function(d) { return x(Date.parse(d.date)); })
						.attr('cy', function(d) { return isNaN(d.value) ? 0 : y(d.value); })
						.attr('r', 0);

					// add text
					text = chart.selectAll('text')
						.data(function(d) { return d.answerValues; })
						.enter()
						.append('text')
						.attr('class', function(d) { return 'line main ' + spaceLess(d.answer) + ' ' + column; })
						.attr('x', function(d) { return x(Date.parse(d.date)); })
						.attr('y', function(d) { return isNaN(d.value) ? 0 : y(d.value) - 8; })
						// .text(function(d) { return isNaN(d.value) ? null : round(d.value); })
						.text(function(d) { return pointFormat(d.value); })
						.style('fill-opacity', 0)
						.style('pointer-events', 'none');

					// add answer name to last series point
					label = chart.selectAll('.last')
						.data(function(d) { return [d.answerValues[d.answerValues.length-1]]; })
						.enter()
						.append('text')
						.attr('class', function(d) { return 'last line main ' + spaceLess(d.answer) + ' ' + column; })
						.attr('x', function(d) { return x(Date.parse(d.date)); })
						.attr('y', function(d) { return isNaN(d.value) ? null : y(d.value) - 8; })
						// .text(function(d) { return isNaN(d.value) ? null : round(d.value)  + ' ' + d.answer; })
						.text(function(d) { return pointFormat(d.value, d.answer.slice(0,16)); })
						.style('fill-opacity', 0)
						.style('pointer-events', 'none');

					// --- Interactivity -------------------------------------------------------------------------------------------------

					listeners(answerLinesHelp);
					listeners(circles);


				} // use simple reusable component to add to svg which gives us more control over the individual chart and in this specific case allows us to specify a y-domain for each graph individually

		
				// handles the button colours (function above in utility section)
				extraButtonColour();

				singleColumn();
	

			} // drawLines()


			// main draw bars function
			function drawBars(c, column, receptionMethod){


				// --- data ------------------------------------------------------------------------------------
							
				var data = d3.nest()
					.key(function(d) { return d.question; })
					.key(function(d) { return d.answer; })
					.entries(c); // nest the data

					data.forEach(function(d){
						d.question = d.key;
						d.questionValues = d.values;
						delete d.key; delete d.values; 

						d.questionValues.forEach(function(d) {
							d.answer = d.key;
							d.answerValues = d.values;
							d.rank = d3.mean(d.values, function(d) { return +d.rank; }); 
							d.max = d3.max(d.values, function(d) { return Number(d.value); }); 
							d.min = d3.min(d.values, function(d) { return Number(d.value); }); 
							d.develop = d.values[0].answerRecep;
							delete d.key; delete d.values;
						}); // change variable names in second nest and add hellper variables
					}); // change variable names in first nest

					data.forEach(function(d){
						d.max = d3.max(d.questionValues, function(dd){ return Number(dd.max)});
						d.min = d3.min(d.questionValues, function(dd){ return Number(dd.min)});
					}); // calculate max and min for each question

					data.forEach(function(d){
						d.questionValues = d.questionValues.filter(function(dd){
							return (dd.develop === receptionMethod);
						}); 
					}); // loop through each datapoint ... to filter dataset based on development level

					// log('data',data);


				// --- set-up ------------------------------------------------------------------------------------
			
				// scale ranges
				var y = d3.scale.linear().range([height - margin.bottom, margin.top]); // y scale range
				var x2 = d3.time.scale().range([margin.left, width - margin.right]); // x scale range (called x2, y2 for the brush to avoid confusion)
				x2.domain(minMaxDate); // scale domains (before setting up x and y axis !) y.domain gets set in the reusable chart components on individual levels
				x2.clamp(true); // clamp the brush axis (to not shoot over the extent)

				// axes
				var xAxis2 = d3.svg.axis().scale(x2).orient('bottom').tickFormat(d3.time.format('%Y')).tickSize(4);
				var yAxisBar = d3.svg.axis().scale(y).orient('left').ticks(5).tickSize(-(width-margin.left-margin.right)).tickPadding(15)
					.tickFormat(function(d){
						var prefix = d3.formatPrefix(d);
						return prefix.scale(d) + prefix.symbol;
					});

				// calulate bar width
				var chartItems = getMaxNumberOfAnswers(data); // utility func
				var barWidth = (width-margin.left-margin.right) / chartItems;

				// add container
				var container = d3.select('.contentInner#' + column)
					.selectAll('container')
					.data(data)
					.enter()
					.append('div')
					.attr('class', 'boxContent graph box')
					.append('div')
					.attr('class', 'containerContent contain')
					.attr('id', function(d) { return 'outer_' + spaceLess(d.question); });

			
				// --- filters ------------------------------------------------------------------------------------

				setFilterSectionCSS(); // switch filter section CSS back on (in case user comes from table vis, which switches these conditions off)
			
				// add filter container
				var filters = d3.select('.filters#' + column)
					.append('div')
					.attr('class', 'boxFilters box')
					.append('div')
					.attr('class', 'containerFilters contain');

				filters.append('div')
					.attr('class', 'filterExplain')
					.html(column === 'left' ? 'Very High :' : 'Low :');

				// add answer buttons
				var answerBtns = filters.selectAll('.buttons')
					.data(btnKeys(receptionMethod).sort())
					.enter()
					.append('button')
					.html(function(d) { return d; })
					.attr('class', 'btn')
					.attr('id', function(d) { return 'btn_' + spaceLess(d); });
	
				// add remove focus button
				var removeFocusBtn = filters.append('button')
					.attr('class', 'btn extra focus')
					.html('Remove all focus');

				// interactivity answer buttons 
				answerBtns.on('mouseover', answerBtnHover)
					.on('mousedown', answerBtnLock)
					.on('mouseout', answerBtnHoverOut);

				// interactivity remove focus buttons
				removeFocusBtn.on('mousedown', removeBtnDown);


				// --- bars prep ------------------------------------------------------------------------------------

				// svg (incl. viewBox for responsiveness)
				var svg = container.append('svg')
					.attr('width', '100%')
					.attr('height', '100%')
					.attr('viewBox', '0 0 ' + width + ' ' + height)
					.attr('preserveAspectRatio', 'xMinYMin')
					.attr('class','question')
					.attr('id',function(d) { return spaceLess(d.question); });

				// add clip-path details
				svg.append('defs').append('clipPath')
			    .attr('id', 'clip')
					.append('rect')
			    .attr('width', width-margin.right-margin.left)
			    .attr('height', height-margin.bottom) // allowed to use all margin.top space for higher percentages
					.attr('transform', 'translate(' + margin.left + ', 0)'); // see above

				// append title
				var graphHeader = svg.append('text')
					.attr('class', 'graphHeader')
					.attr('transform', 'translate(' + (margin.left + (width - margin.right)) / 2 + ',' + (height * .1) + ')')
					.text(function(d) { return d.question; });  // needs to be .text not .html to be displayed in Safari	

				// append question text
				var questionText = container.append('div')
					.attr('class', 'qt')
					.attr('id', function(d) { return d3.select(this.parentNode).attr('id').split('_')[1]; })
					.style('top', -height * .89 + 'px')
					.style('display','none')
					.html(function(d) { return getText(d); });

				// switch question Text on off
				d3.selectAll('.graphHeader').on('mousedown', function() {
					var qtId = d3.select(this.parentNode.parentNode).attr('id').split('_')[1];
					d3.selectAll('.qt#' + qtId).style('display', function() {
						return d3.select(this).style('display') == 'none' ? 'inherit' : 'none';
					})
				});


				// --- brush context and bars update ----------------------------------------------------------------------------

				// event-handler drawing the bars depending on the date passed by function brushed
				function barsUpdate(monthValue, yearValue) {
									
					d3.selectAll('.barChart.' + column).remove(); // remove bar charts from previous iterations

					removeBtnDown(); // remove all locked colours and button colours

					function barRectComponent(d,i){
						
						var chartBar = d3.select(this); // re-bind the resepctive g for the bars to the var chartBar

						// get the min and max for this graph from the parental svg 
						var q = d3.select(this).data()[0].answerValues[0].question;
						q = spaceLess(q);
						var min = d3.select('svg#' + q).data()[0].min;
						var max = d3.select('svg#' + q).data()[0].max;

						// set the y-scale to 0 when minimum is >=0 and to the negative minimum if not
						min = min < 0 ? min : 0;
						y.domain([min, max]);

						// add bars
						var bar = chartBar.selectAll('.bar')
							.data(function(d) {
								return d.answerValues.filter(function(d){
									return +d.year == yearValue; // only get year (not month as in tracker)
								}); 
							}) // get all answerValues for the question and then filter out the values for the chosen month/year
							.enter()
							.append('rect')
							.attr('class', function(d) { return 'bar ' + spaceLess(d.answer); })
							.attr('y', function(d) {
								var val;
								if(isNaN(d.value)) {
									val = 0;
								} else if(d.value >= 0) {
									val = y(d.value);
								} else if(d.value < 0) {
									val = y(0);
								}
								return val;
							}) // the y is the top (left) corner of the bar. It's the scaled value in pixels for positives and the scaled 0 in pixels for minuses
							.attr('height', function(d) {
								var val;
								if(isNaN(d.value)) {
									val = 0;
								} else if(d.value >=0) {
									val = y(0) - y(d.value);
								} else if(d.value < 0) {
									val = y(d.value) - y(0);
								}
								return val;
							}) // the height is the vertical length of the bar. Remember that the scale maps high values to a low pixel number The highest value gets 0 pixels (or margin-top). So for positive values we have y(0) = high pixel number minus y(d.value) = lower pixel. For negative values we just turn that around. 
							.attr('width', barWidth-1.5)
							.style('fill', 'steelblue')
							.style('opacity', .3);

						
						// call event handlers for lines and circles seperately (because tooltip html differs)
						listeners(bar);
					
						
					} // barRectComponent(), simple re-usable component to allow different scales per graph. Gets called on chartBar

	 				// add chart g bars (below white grid-lines)
					var chartBar = svg.selectAll('.chartBar')
						.data(function(d) {
							return d.questionValues.sort(function(a,b){
								return d3.ascending(a.rank, b.rank);  // sorted by average total rank allows check of selected months value vs overall position !
							});
						}, rankKey)
						.enter()
						.append('g')
						.attr('class', 'barChart bars ' + column)
						.attr('id', function(d) { return spaceLess(d.answer); })
						.attr('transform', function(d, i) {
							return 'translate(' + (margin.left + i * barWidth) + ', 0)';
						})
						.style('display', 'inherit')
						.each(barRectComponent);

					function barAxisComponent(d,i) {
				
						var svg = d3.select(this); // bind the respective svg to var svg

						// set the scales to 0 when minimum is >=0 and to the negative minimum if not
						var min = d.min < 0 ? d.min : 0;
						y.domain([min, d.max]);
						// add y-axis
						svg.append('g')
						  // .attr('class', 'y axis bar ' + column) // this doesn't work
						  .attr('class', 'y axis bar')
							.attr('transform', 'translate( ' + margin.left + ', 0 )')
						  .call(yAxisBar);

				
					} // simple re-usable component to allow different scales per graph

					svg.each(barAxisComponent); // add y-axis here between rects and text to show white grid.

					function barTextComponent(d,i){

						var chartText = d3.select(this);
						
						// get the min and max for this graph from the parental svg 
						var q = d3.select(this).data()[0].answerValues[0].question;
						q = spaceLess(q);
						var min = d3.select('svg#' + q).data()[0].min;
						var max = d3.select('svg#' + q).data()[0].max;
						
						// set the y-scale to 0 when minimum is >=0 and to the negative minimum if not
						min = min < 0 ? min : 0;
						y.domain([min, max]);
						
						// add barLabel
						var barLabel = chartText.selectAll('.barLabel')
							.data(function(d) { return d.answerValues.filter(function(d){
								return +d.year == yearValue && +d.month == monthValue;
							}); }) // get all answerValues for the question and then filter out the values for the chosen month/year
							.enter()
							.append('text')
							.attr('class', function(d) { return 'barLabel bar ' + spaceLess(d.answer); })
							.attr('x', (barWidth/2) - 1.5)
							.attr('y', function(d) {
								var val;
								if(isNaN(d.value)) {
									val = 0;
								} else if(d.value >= 0) {
									val = y(d.value) - 5;
								} else if(d.value < 0) {
									val = y(0) - 5;
								}
								return val;
							}) // the y is the top (left) corner of the bar. It's the scaled value in pixels for positives and the scaled 0 in pixels for minuses
							.text(function(d) { return pointFormat(d.value); })
							.style('text-anchor', 'middle')
							.style('font-size', '0.9em')
							.style('fill-opacity', 0);

					} // barTextComponent(), simple re-usable component to allow different scales per graph. Gets called on chartText
					
	 				// add chart g for text (above white grid-lines)
					var chartText = svg.selectAll('.chartText')
						.data(function(d) {
							return d.questionValues.sort(function(a,b){
								return d3.ascending(a.rank, b.rank);  // sorted by average total rank allows check of selected months value vs overall position !
							});
						}, rankKey)
						.enter()
						.append('g')
						.attr('class', 'barChart text ' + column)
						.attr('id', function(d) { return spaceLess(d.answer); })
						.attr('transform', function(d, i) {
							return 'translate(' + (margin.left + i * barWidth) + ', 0)';
						})
						.style('display', 'inherit')
						.each(barTextComponent);
					
					// add axis labels
					d3.selectAll('.y.axis.bar.' + column).remove(); // remove all previous instances of the y axises (which get build in the next step)

					var axisLabel = chartText.selectAll('.axisLabel')
						.data(function(d) { return d.answerValues.filter(function(d){
							return +d.year == yearValue; // only get year (not month as in tracker)
						}); })
						.enter()
						.append('text')
						.attr('class', function(d) { return 'axisLabel bar ' + spaceLess(d.answer); })
						.attr('transform', 'translate(' + ((barWidth/2) + .75) + ',' + (height - margin.bottom + 9) + ') rotate (-45)')
						.text(function(d) { return d.answer.slice(0,8); })
						.style('text-anchor', 'end')
						.style('font-size', '0.9em');
					
					// add a date label per chart
					d3.selectAll('.dateLabel.' + column).remove(); // remove all previous instances of the date labels

					svg.append('text')
						.attr('class', 'dateLabel '  + column)
						.attr('transform', 'translate(' + (width - margin.right) + ', ' + (margin.top + 12*2) + ')')
						.text(formatDate(new Date(yearValue,monthValue-1,1))) // create a new date object with the passed in month- and yearValues and format it to mmm yy
						.style('text-anchor', 'end')
						.style('fill', '#e8e8ee')
						.style('font-size', '3em');

					
				} // barsUpdate(), event handler creating the bars per year selected by brush

				// brush event-handler, triggered by brush, triggers barsUpdate
				function brushed() {
				  var value = brush.extent()[0]; // event-handler taking the first brush-position value (...as we only need one)
				  if (d3.event.sourceEvent) { // not a programmatic event (I think this checks whether this is the only event going on)
				    value = x2.invert(d3.mouse(this)[0]); // gives us the current point - d3.mouse(this)[0] takes the x-value of the mouse at this particualr point, invert translates it from the pixel-range of the x object to the input-domain
				    brush.extent([value, value]); // sets the new brush value
				  }

					var mth = new Date(value).getMonth() + 1;
					var year = new Date(value).getFullYear();

				  handle.attr('cx', x2(value)); // changes the handler accordingly

					barsUpdate(mth, year); // call the barsUpdate function ! attention: should probably only be 'year' !
				} // brushed()
				
				// brush object
				var brush = d3.svg.brush()
					.x(x2)
					.extent([Date.parse('1961-01-01'), Date.parse('2013-01-01')]) // set the initial extent (= range for a 2-sided brush - point for a single brush handle)
					.on('brush', brushed);
					
				// add brush container
				var context = d3.select('.context#' + column)
					.append('div')
					.attr('class', 'boxContext box')
					.append('div')
					.attr('class', 'containerContext contain');

				// add brush svg
				var contextSvg = context.append('svg')
					.attr('width', '100%')
					.attr('height', '100%')
					.attr('viewBox', '0 0 ' + width + ' ' + height2)
					.attr('preserveAspectRatio', 'xMinYMin')
					.append('g')
					.attr('class','contextSvg')
					.attr('id', column);

				// add description
				contextSvg.append('text')
					.text('specify period here')  // needs to be .text not .html to be displayed in Safari
					.attr('transform', 'translate(' + (margin.left + (width - margin.right))/2 + ',' + (height2 * .6) / 2 + ')');

				// add brush axis
			  contextSvg.append('g')
			      .attr('class', 'x axis')
			      .attr('transform', 'translate(0,' + (height2 * .6) + ')')
			      .call(xAxis2);

				// add slider
				var slider = contextSvg.append('g') // note the size is as big as the g appended to the svg on line 58
				    .attr('class', 'slider')
				    .call(brush); // the brush will operate on this g - the slider area !

				slider.select('.background')
				    .attr('height', height2)
						.attr('id', column); // size of the slider area

				// add handle
				var handle = slider.append('circle') // the knob
				    .attr('class', 'handle')
				    .attr('transform', 'translate(0,' + height2 * .6 + ')')
				    .attr('r', screenSize < 500 ? 1.8 : 5); // // conditional circle size based on media query (smaller circles for mobile landscape and smaller)

				// add vertical orientation line 
				var verticalLine = slider.append('line')
					.attr('class', 'verticalLine')
					.attr('id', column)
					.attr({ 'x1': 0, 'y1': 0, 'x2': 0, 'y2': height2 })
					.style('stroke', '#F64747')
					.style('stroke-opacity', 0)
					.style('pointer-events', 'none');

				// switches the event-listener on
				slider
				  .call(brush.event) // would start at 0 0
				  .transition().duration(2500) // gratuitous intro!
				  .call(brush.extent([maxDate, maxDate])) // extent decides the position (needs an array of 2 numbers as its build for the size-changing rect. Here we only need one point (in domain-units not pixel !), but feed it in twice)
				  .call(brush.event); // event-listener doing the underlying math

				d3.selectAll('.extent, .resize')
				    .remove(); // removes the brush-default rectangle and the extent g as we only need a dot, needs to come at end of this section 


				// --- listener and single dataset checker (not necessary for worldbank project) ----------------------------------------------------------------------------
			
				// activating event-handler for tooltip and vertical line
				function barContextOrientation() {
					var xDate = x2.invert(d3.mouse(this)[0]);

					d3.selectAll('.tooltip#aes').html(formatDate(xDate))
						.style('opacity', .9)
						.style('left', (d3.event.pageX + 3) + 'px')
						.style('top', (d3.event.pageY - 25) + 'px')
						.style('color', '#F64747')
						.style('z-index', '11');					

					d3.select('.verticalLine#' + column)
						.attr('transform', 'translate(' + x2(xDate) + ',0)')
						.style('stroke-opacity', 1);
		
				}

				// activating event-listener for tooltip and vertical line (needs to be attached to correct .background rectangle - left or right)
				d3.select('.background#' + column).on('mousemove', barContextOrientation);
				// de-activating event-listener and -handler for tooltip and vertical line
				d3.selectAll('.background').on('mouseout', function(){
					d3.select('.tooltip#aes').style('opacity',0);
					d3.selectAll('.verticalLine').style('stroke-opacity',0); 
				});

		
				// at last check for number of data sets and apply single column layout if necessary 
				// (needs to be after all accessed elements have been built)
				singleColumn();
		
		
			} // drawBars()


			// main draw tables function			
			function drawTables(c, column, receptionMethod){
	
	
				// --- data ------------------------------------------------------------------------------------
						
				var data = d3.nest()
					.key(function(d) { return d.question; })
					.key(function(d) { return d.answer; })
					.entries(c); // nest the data

					data.forEach(function(d){
						d.question = d.key;
						d.questionValues = d.values;
						delete d.key; delete d.values; 

						d.questionValues.forEach(function(d) {
							d.answer = d.key;
							d.answerValues = d.values;
							d.rank = d3.mean(d.values, function(d) { return +d.rank; }); 
							d.max = d3.max(d.values, function(d) { return Number(d.value); }); 
							d.min = d3.min(d.values, function(d) { return Number(d.value); }); 
							d.develop = d.values[0].answerRecep;
							delete d.key; delete d.values;
						}); // change variable names in second nest and add hellper variables
					}); // change variable names in first nest

					data.forEach(function(d){
						d.max = d3.max(d.questionValues, function(dd){ return Number(dd.max)});
						d.min = d3.min(d.questionValues, function(dd){ return Number(dd.min)});
					}); // calculate max and min for each question

					data.forEach(function(d){
						d.questionValues = d.questionValues.filter(function(dd){
							return (dd.develop === receptionMethod);
						}); // ...
					}); // loop through each datapoint ... to filter dataset based on development level

					// log('data',data);

				// --- scroll settings and filter ------------------------------------------------------------------------------------

				// allow tables to scroll through and allow pointer-events only on nav bar
				d3.select('section#controlTop')
					.style('pointer-events', 'none')
					.style('background-color', 'rgba(255,255,255,0)');
				d3.selectAll('.nav.header')
					.style('pointer-events', 'all');
		
				// add filter container (as placeholder)
				var filters = d3.select('.filters#' + column)
					.append('div')
					.attr('class', 'boxFilters box')
					.style('border-bottom', 'none')
					.append('div')
					.attr('class', 'containerFiltersHidden contain');
			

				// --- build tables ------------------------------------------------------------------------------------


				// whichTable function allows control over which target-values are being produced in the table

				var value = 'value'; // sets the target-value

				whichTable(value); // calls the function for the overall target value ()

				// if(category == 'Market'){
				// 	var valueO = 'valueO';
				// 	whichTable(valueO); // calls the function
				// } // build another set of table based on the open SVOD data (excl. TVE) for the market data
		
				function whichTable(value){

					// --- table set-up ------------------------------------------------------------------------------------

					// add container divs
				 	var container = d3.select('.contentInner#' + column)
						.selectAll('.container')
						.data(data)
						.enter()
						.append('div')
						.attr('class', 'boxContent table box')
						.append('div')
						.attr('class', 'containerContent contain')
						.attr('id', function(d) { return 'outer_' + spaceLess(d.question); });

					var tableHeader = container.append('h1')
						.attr('class', 'tableHeader')
						.html(function(d) { return d.question; }); 

					var containerInner = container.append('div')
						.attr('class', 'containerInnerBox')
						.append('div')
						.attr('class', 'containerInner')
						.attr('id', function(d) { return 'inner_' + spaceLess(d.question); });
					
					var xls = container.append('div')
						.attr('class', 'excelExport')
						.html('xls');

					var heatMapBtn = container.append('div')
						.attr('class', 'heatMapBtn')
						.attr('id', function(d) { return d.questionValues[0].answerValues[0].format; }) // id either 'absolute' or 'percent'
						.html('heat map');		

					// add label table
					var tableAns = containerInner
						.append('div')
						.attr('class','containerNumber')
						.append('table')
						.attr('class','answerCategories')
						.attr('id', function(d) { return spaceLess(d.question); });
	
					var headAns = tableAns.append('thead').append('tr').append('th')
						.html('Answers')
						.style('color', 'white');

					var rowsAns = tableAns.append('tbody').selectAll('tr')
						.data(function(d) { return d.questionValues; })
						.enter()
						.append('tr');
		
					var cellsAns = rowsAns.append('td')
						.html(function(d) { return d.answer.slice(0,15) }); 

					// add number table
					var tableNum = containerInner
						.append('div')
						.attr('class', 'containerNumber')
						.attr('id', function(d) { return spaceLess(d.question); })
						.style('width', function(d) {
							var ansCatTableID = spaceLess(d.question);
							var ansCatTableWidth = Number(d3.select('.answerCategories#' + ansCatTableID).style('width').replace(/px/,''));
							var containerInnerWidth = Number(d3.select('.containerInner#inner_' + ansCatTableID).style('width').replace(/px/,''));
							var widthBouncer = containerInnerWidth > window.innerWidth/2; // explained in notes
							if (widthBouncer) {
								var containerNumberWidth = ((containerInnerWidth - ansCatTableWidth*2) / containerInnerWidth)*100;
							} else {
								var containerNumberWidth = ((containerInnerWidth - ansCatTableWidth) / containerInnerWidth)*100;
							}
							return containerNumberWidth + '%'; // ! attention: this needs to be conditioned on number format (perc/abs) !
						})
						.append('table')
						.attr('class','numbers');

					var headNum = tableNum.append('thead').append('tr').selectAll('th')
						.data(function (d) { return d.questionValues[0].answerValues; })
						.enter()
						.append('th')
						.html(function(d) { return formatDate(d.date); });

					var rowsNum = tableNum.append('tbody').selectAll('tr')
						.data(function(d) { return d.questionValues; })
						.enter()
						.append('tr');	
 
					var cellsNum = rowsNum.selectAll('td')
						.data(function(d) { return d.answerValues; })
						.enter()
						.append('td')
						.attr('class', 'cellsNum')
						.attr('id', function(d) {  return d.format; })
						.html(function(d) { return d[value] == 'NA' ? '-' : pointFormat(+d[value]) }); 


					// --- interactivity ------------------------------------------------------------------------------------

					function heatMapComponent(d,i) {
						var thisHere = d3.select(this);

						// get the min and max for this graph from the parental div holding all data 
						var q = thisHere.data()[0].question;
						q = spaceLess(q);
						var min = d3.select('div#outer_' + q).data()[0].min;
						var max = d3.select('div#outer_' + q).data()[0].max;

						heatMap.domain([min,max]); // set domain for each graph individually
							
						d3.select(this).style('background', function(d) { return heatMap(+d[value]); }); // apply heatmap
						
					} // heatMapComponent(), simple reusable component to set the colour domain individually per graph
					
					heatMapBtn.on('mousedown', function(d) {
						heatSwitch = 1 - heatSwitch;
						if (heatSwitch) {
							d3.selectAll('td.cellsNum').each(heatMapComponent);
						} else {
							d3.selectAll('td.cellsNum').style('background', null);
							rowsAns.style('background', null);
						}
					}); // heatMapBtn listener and handler

					xls.on('mousedown', function() {
						containerId = d3.select(this.parentNode).attr('id').replace('outer','export');
						buildExportTable(value);
						exportTable();
						// remove existing graph and table elements before page reload
						d3.selectAll('.box, .containerExport').remove();
						tables();
					}); // xls download button listener and handler
				
				} // whichTable() allows control over which target-values are being produced in the table

				// at last check for number of data sets and apply single column layout if necessary 
				// (needs to be after all accessed elements have been built)
				singleColumn();

				// --- download functions --------------------------------------------------------------------------------------------
	
				function buildExportTable(value) {
	
					data = data.filter(function(d) { return 'export_' + spaceLess(d.question) === containerId; });
			
					// add container div for Export Table
				 	var containerExp = d3.select('body').selectAll('.containerExp')
						.data(data)
						.enter()
						.append('div')
						.attr('class', 'containerExport')
						.attr('id', function(d) { return 'export_' + spaceLess(d.question); })
						.style('width', '700px') // unneccessary but might help with debugging
						.style('height', '300px') // unneccessary but might help with debugging
						.style('display', 'none');
			
					// add table
					var table = containerExp.append('table')
						.attr('id','exportTable')
						.attr('id', function(d) { return spaceLess(d.question); });
	
					var head = table.append('thead')
						.append('tr');

					var headLine = head.append('th')
						.html(function(d) { return d.question; });

					var headData = head.selectAll('.numbersHead') // unique placeholder name necessary here 
						.data(function (d) { return d.questionValues[0].answerValues; })
						.enter()
						.append('th')
						.attr('class', 'numbers')
						.html(function(d) { return formatDate(d.date); });

					var tableBody = table.append('tbody')
						.selectAll('tr')
						.data(function(d) { return d.questionValues; })
						.enter()
						.append('tr');

					var categories = tableBody.append('td')
						.html(function(d) { return d.answer; });

					var cell = tableBody.selectAll('.numbersBody') // unique placeholder name necessary here
						.data(function(d) { return d.answerValues; })
						.enter()
						.append('td')
						.attr('class', 'numbers')
						.html(function(d) { return d.value == 'NA' ? '-' : d.format == 'percent' ? round(+d[value]) + '%' : d3.round(+d[value],0) });
		
	
				}

				function exportTable(){

				  //getting values of current time for generating the file name
				  var dt = new Date();
				  var day = dt.getDate();
				  var month = dt.getMonth() + 1;
				  var year = dt.getFullYear();
				  var hour = dt.getHours();
				  var mins = dt.getMinutes();
				  var postfix = day + '.' + month + '.' + year + '_' + hour + '.' + mins;
				  //creating a temporary HTML link element (they support setting file names)
				  var a = document.createElement('a');
				  //getting data from our div that contains the HTML table
				  var data_type = 'data:application/vnd.ms-excel';
				  var table_div = document.getElementById(containerId);
					var table_html = table_div.outerHTML.replace(/ /g, '%20');
				  a.href = data_type + ', ' + table_html;
				  //setting the file name
				  a.download = 'export_' + postfix + '.xls';
				  //triggering the function
				  a.click();

				}

	
	
			} // drawTables()

			
			// get maximum of answer value (loops through each question to loop through each answervalue to find the max answer value)
			// argument d = data
			// argument y = calculates maxValue from d.value if 0, otherwise calculates maxValue from d.valueO (SVOD excl TVE)
			var valueMax; // initialise variable
			function getMaxAxisValue(d,y){
				var arrOuter = d.questionValues.map(function(m) { return m.answerValues; }); 
				var arrOuterLength = arrOuter.length;
				var arrValuesPrelim = [];
				var arrValues = [];
				for (var i = 0; i < arrOuterLength; i++){
					var arrInnerLength = arrOuter[i].length;
					arrValuesPrelim.push(arrOuter[i]);
					for (var j = 0; j < arrInnerLength; j++){
						y == 0 ? arrValues.push(Number(arrValuesPrelim[i][j].value)) : arrValues.push(Number(arrValuesPrelim[i][j].valueO));
					}
				}
				// arrValuesMax.push(d3.max(arrValues)); // in case we need an array 
				return valueMax = d3.max(arrValues); // this is the max value
			}
		
			// add tooltip for the aesthetic objects (lines, bars)
			var tooltipAes = d3.select('body').append('div')
			    .attr('class', 'tooltip')
			    .attr('id', 'aes')
			    .style('opacity', 0);
		
			// some constants		
			var currentColor; // for tooltip
			var dur = 100;


			// add tooltip for the explanations
			var tooltipExplain = d3.select('body').append('div')
			    .attr('class', 'tooltip')
			    .attr('id', 'explain')
					.style('opacity', 0)
					.style('z-index', 10);

			// explanation text for main graphs
			var explainTrendIndicators = "<span style='font-size:14px'>Trends by category</span> </br></br> \
				Comparing 2 set of countries with different development levels. </br></br> \
				Find a thought along 3 lines: </br></br> \
				1. Choose the line graphs for trends and pick countries of interest. </br> \
				2. Choose the bar graphs for ranking and pick the year of your choice. </br> \
				3. Download the data (use Chrome for this)";
		
			// event listeners and handlers
			d3.select('li.explanation')
				.on('mouseover', function() {
					tooltipExplain.html(explainTrendIndicators)
						.style('opacity', .9)
						.style('right', '2.48%')
						.style('top', '4.5em')
						.style('z-index', 12);
				})
				.on('mouseout', function() {
					tooltipExplain.transition().duration(1000).style('opacity', 0);
				});



			// listener function
			function listeners(x){
					
					x.on('mouseover', function(d){
							svgId = d3.select(this.parentNode.parentNode).attr('id');
							gId = d3.select(this.parentNode).attr('id');
							aesClass = concatClassName(d3.select(this).attr('class')).replace('hoverHelp','main'); // aes = aesthetic object (can be path, rect, circle)
							elementType = d3.select(this)[0][0].nodeName;
							interact(d);
						})
				
						.on('mousedown', function(){
							d3.selectAll('g#' + gId).classed('locked', d3.select(this.parentNode).classed('locked') ? false : true);

							d3.selectAll('#btn_' + gId).classed('locked', d3.selectAll('#btn_' + gId).classed('locked') ? false : true);

							if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == false){
								btnStateCurrent = 0; // no lock, no top answer
							} else if (d3.selectAll('#btn_' + gId).classed('locked')){
								btnStateCurrent = 1; // lock
							} else if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == true){
								btnStateCurrent = 2; // no lock but top answer
							} else {
								console.log('error');
							}

							d3.selectAll('#btn_' + gId)
								.style('background-color', btnState[btnStateCurrent]['background-color'])
								.style('color', btnState[btnStateCurrent]['color']);
						})
				
						.on('mouseout', function(){
							tooltipAes.style('opacity', 0);
							d3.select(this.parentNode).classed('locked') ? null : deInteract();
						});
					
			} // listeners()

			function interact(d) {
				// d passed in only for tooltipAes

				// var line = d3.select('g#' + gId)[0][0];
				// document.querySelector('svg#' + svgId).appendChild(blub); // logic to bring chosen line forward. some issues unresolved - if important continue here
			
				d3.selectAll('path.main.' + aesClass)
					.transition().duration(dur)
					.style('stroke', function(d) {
						currentColor = colors(spaceLess(d.answer)); 
						return currentColor;
					})
					.style('stroke-width', '2.5px');

				d3.selectAll('circle.' + aesClass)
					.transition().duration(dur)
					.attr('r', function(d) {
						if (isNaN(d.value)){
						 return 0; 
					 } else if (screenSize < 500) {
						 return 1;
					 } else {
						 return 2;
					 }
					}) // conditional circle size based on media query (smaller circles for mobile landscape and smaller)
					.style('fill', currentColor);

				d3.selectAll('text.last.' + aesClass)
					.transition().duration(dur)
					.style('fill', currentColor)
					.style('fill-opacity', 1);

				d3.selectAll('rect.' + aesClass)
					.transition().duration(dur)
					.style('fill', function(d) {
						currentColor = colors(spaceLess(d.answer)); 
						return currentColor;
					});
				
				d3.selectAll('text.bar.' + aesClass)
					.transition().duration(dur + 30)
					.style('fill', currentColor)
					.style('fill-opacity', 1);

				// 3 nest-levels: (1) path vs non-path (circle) (2) percent vs absolute (3) target vs non-target
				tooltipAes.html(function(){
					if (elementType == 'path') {
						return d.answer;

					} else {

						if (d.format == 'percent'){

							if (target === 'Men') {
								return d.answer + ': ' + round(d.valueM) + '% </br>' + formatDate(d.date);

							} else if (target === 'Women') {
								return d.answer + ': ' + round(d.valueF) + '% </br>' + formatDate(d.date);

							} else {
								return d.answer + ': ' + round(d.value) + '% </br>' + formatDate(d.date);
							}

						} else if (d.format === 'absolute') {

							var val = d.value;

							if (val < 1000) {
								val = val;
							} else if (val < 1e+6) {
								val = thousandsPrep(val);
							} else if (val < 1e+9) {
								val = thousands(val) + 'k';
							} else {
								val = thousands(d3.round(val/1e+3,0)) + 'mil';
							}
							return d.answer + ': ' + val + '</br>' + formatDate(d.date);
						}
					}
				})
					.style('opacity', .9)
					.style('left', (d3.event.pageX) + 'px')
					.style('top', (d3.event.pageY + 10) + 'px')
					.style('color', elementType == 'rect' ? '#777' : currentColor);

			} // interact()
			
			function deInteract() {
	
				d3.selectAll('path.main.' + aesClass)
					.transition().duration(dur)
					.style({'stroke': '#ccc', 'stroke-width':'1.5px'});

				d3.selectAll('circle.' + aesClass)
					.transition().duration(dur)
					.attr('r', 0);

				if(elementType == 'path' || elementType == 'circle' || elementType == 'BUTTON') {

					d3.selectAll('text.' + aesClass)
						.transition().duration(dur)
						.style('fill-opacity', 0);

				} else if (elementType == 'rect') {

					d3.selectAll('text.axisLabel.' + gId)
						.transition().duration(dur)
						.style('fill', '#000');
					d3.selectAll('text.barLabel.' + gId)
						.transition().duration(dur)
						.style('fill-opacity', 0);

				} 

				d3.selectAll('rect.' + aesClass)
					.transition().duration(dur)
					.style('fill', 'steelblue');
			} // deInteract()
			
			// button interactivity
			function answerBtnHover(d) {
				gId = spaceLess(d);
				aesClass = spaceLess(d); // removed 'line. +' (see version 14 for example) as it works without
				elementType = d3.select(this)[0][0].nodeName;
				interact(d);
				tooltipAes.style('opacity',0);
			}

			function answerBtnLock() {

			
					d3.selectAll('g#' + gId).classed('locked', d3.selectAll('g#' + gId).classed('locked') ? false : true);
					d3.selectAll('#btn_' + gId).classed('locked', d3.selectAll('#btn_' + gId).classed('locked') ? false : true);
					// determine button state
					if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == false){
						btnStateCurrent = 0; // no lock, no top answer
					} else if (d3.selectAll('#btn_' + gId).classed('locked')){
						btnStateCurrent = 1; // lock
					} else if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == true){
						btnStateCurrent = 2; // no lock but top answer
					} else {
						console.log('error');
					}
					// apply button state format
					d3.selectAll('#btn_' + gId)
						.style('background-color', btnState[btnStateCurrent]['background-color'])
						.style('color', btnState[btnStateCurrent]['color']);
			}

			function answerBtnHoverOut() {
				tooltipAes.style('opacity', 0);
				if(d3.select('g#' + gId).classed('locked')){
					null
				} else {
					deInteract();
					d3.selectAll('text.axisLabel.' + gId)
						.transition().duration(dur)
						.style('fill', '#000'); 
					d3.selectAll('text.barLabel.' + gId)
						.transition().duration(dur)
						.style('fill-opacity', 0); // necessary as deInteract doesn't change text back as the hovered element is not a 'rect'
				}
			}
		
			function removeBtnDown() {
				d3.selectAll('.locked').classed('locked', false);

				d3.selectAll('.btn:not(.extra)')
					.style('background-color', '#e6e6e6')
					.style('color', '#000');

				d3.selectAll('.btn.topAnswer')
					.style('background-color', '#ccc')
					.style('color', '#000');

				d3.selectAll('path.main')
					.transition().duration(dur)
					.style({'stroke': '#ccc', 'stroke-width':'1.5px'});

				d3.selectAll('circle.line')
					.transition().duration(dur)
					.attr('r', 0);

				d3.selectAll('text.line')
					.transition().duration(dur)
					.style('fill-opacity', 0);

				d3.selectAll('rect.bar')
					.transition().duration(dur)
					.style('fill', 'steelblue');

				d3.selectAll('text.axisLabel')
					.transition().duration(dur)
					.style('fill', '#000');

				d3.selectAll('text.barLabel')
					.transition().duration(dur)
					.style('fill-opacity', 0);
			
			}

			function toggleNumbersBtnDown() {
			
				d3.selectAll('g.locked').selectAll('text:not(.last)')
					.transition()
					.duration(500)
					.style('fill', function(d) { return colors(spaceLess(d.answer)); })
					.style('fill-opacity', function() { return d3.select('g.locked').select('text:not(.last)').style('fill-opacity') == 0 ? 1 : 0; });

			}


			// show selection of brands at start
 			var displayBrands = {
				'Denmark': {
	 				'Operator': ['Viaplay', 'Viasat'],
	 				'BestContent': ['Viaplay', 'Viasat'],
	 				'Values': ['Viaplay', 'Viasat'],
	 				'Sports': ['Viaplay', 'TV3Sportchannels'],
	 				'Film': ['Viaplay', 'ViasatFilmchannels'],
	 				'Docs': ['ViasatHistory'],
	 				'Market': ['Viaplay', 'Netflix', 'HBONORDIC']
				},
				'Other': {
	 				'Operator': ['Viaplay', 'Viasat'],
	 				'BestContent': ['Viaplay', 'Viasat'],
	 				'Values': ['Viaplay', 'Viasat'],
	 				'Sports': ['Viaplay', 'ViasatSportchannels'],
	 				'Film': ['Viaplay', 'ViasatFilmchannels'],
	 				'Docs': ['ViasatHistory'],
	 				'Market': ['Viaplay', 'Netflix', 'HBONORDIC']
				}
			};
		

			// let data decide about layout
			function singleColumn() {
				if (dataBouncer == 0) {
					d3.selectAll('.inside').style('width', '50%'); // normal setting for 2-column layout
					d3.selectAll('.box').style('width', '100%').style('float', 'none');  // normal setting for 2-column layout
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', false); // removes potential class with shorter top-padding to the :before element
				} else if (dataBouncer == 1) {
					d3.selectAll('.inside#left').style('width', '100%'); // left column gets full width
					d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left'); // all boxes (i.e. graphs) get half the width unless when viewed on mobile (needs to be tested!)
					d3.selectAll('.inside#right').selectAll('*').remove(); // remove all children of the right inside wrapper = remove all right .box-elements
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
					d3.selectAll('.boxFilters').style('width', '100%'); // the box for the filters and the context need a width of 100% 
					// d3.selectAll('.boxFilters')[0][1].remove();
					d3.selectAll('.boxContext').classed('boxContextSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
					d3.selectAll('.boxContext').style('width', '100%'); // the box for the filters and the context need a width of 100% 
				} else if (dataBouncer == 2) {
					d3.selectAll('.inside#right').style('width', '100%'); // all as above
					d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left');
					d3.selectAll('.inside#left').selectAll('*').remove();
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true);
					d3.selectAll('.boxFilters').style('width', '100%');
					d3.selectAll('.boxContext').classed('boxContextSingleCol', true); 
					d3.selectAll('.boxContext').style('width', '100%'); 
				} else {
					console.log('dataBouncer on fire')
				}
			}


		}); // d3.csv - read in data, write visual


	} // navFunc(); build line, bar and data vis



	function bubble(file, country, category, perspective, xVar, yVar, zVar, headline, yLabel, xLabelRight, xLabelLeft, xBarLabel, yBarLabel, zBarLabel) {


		// allow filter-div space
		moveContentDown();

		// test for 2 dimensional- or 3 dimensional scatter plot (including bubble-size)
		var dim;
		zVar === '2D' ? dim = 2 : dim = 3;

		// read in data, write visual
		d3.csv(file, function(rawData) {


			// get the maximum date (= the latest half year) so the graph always shows the latest period first
			var period = d3.max(rawData, function(d) { return d.date });
			
			// change color of chosen (= the latest) period
			var liId = 'p' + period.replace(/-/g,'');
			d3.selectAll('li.period').style('color', '#ccc');
			d3.select('li.period#' + liId).style('color', '#FBEEC2');
			
			// only show answers of one country (World) and period
			var dataWork = rawData.filter(function(d) {
				return d.country === country && d.date === period;
			});

			// log(dataWork);
			
			// calculate mean of a particular variable for the line
			var getMean = function(variable) {
	 		  var mean = dataWork.filter(function(d) { return d.question === variable; }); // filter only objects of one country, one period and one variable
				mean = mean.map(function(d) { return d.value; }); // get array of all object-values
				mean = d3.mean(mean); // calculate its mean
				return mean;
			}

			// get extent of each variable per country for all half year periods (used for now)
			var xRawD = rawData.filter(function(d) { return d.country === country && d.question === xVar; }); // attention gRaw = xRaw
			var xRawMinMaxPrep = d3.extent(xRawD, function(d) { return +d.value; });
			var xRawMinMax = [xRawMinMaxPrep[0], xRawMinMaxPrep[1]]; // attention - this and previous line maybe only for 2D?
			
			var yRawD = rawData.filter(function(d) { return d.country === country && d.question === yVar; }); // attention aRaw = yRaw
			var yRawMinMaxPrep = d3.extent(yRawD, function(d) { return +d.value; });
			var yRawMinMax = [yRawMinMaxPrep[0], yRawMinMaxPrep[1]];

			
			// z domain array
			if(dim === 3) {
				var zRawD = rawData.filter(function(d) { return d.question === zVar; });
				var zRawMinMax = d3.extent(zRawD, function(d) { return +d.value; });
				
		
				function xMinMaxFunc (array) {

					var xMinMax = [];

					var minDist = 50-array[0], 
							maxDist = array[1]-50, 
							minLee = .99, 
							maxLee = 1.01;

					if (minDist < 0) {
						xMinMax = [(50-maxDist)*minLee, array[1]*maxLee];
					} else if (maxDist < 0) {
						xMinMax = [array[0]*minLee, (50+minDist)*maxLee];
					} else {
						g2();
					}


					function g2 () {
						if (minDist < maxDist) {
							return xMinMax = [(50-maxDist)*minLee, array[1]*maxLee];
						} else if (minDist > maxDist){
						  return xMinMax = [array[0]*minLee, (50+minDist)*maxLee];	
						} else {
							console.log("xMinMax on fire")
						}
					}

					return xMinMax;
				} // centers the 3D chart at 50
			
			}
			
		// --- bubble graph set up ---------------------------------------------------------------------------------
			
			// measures for svg
			var width = (document.getElementById('wrapperContent').clientWidth * .55); // depends on the width of the enclosing div
			var height = width * .6; // height/width aspect-ratio as determined in css of pseudo-elements padding-top (not quite, in order to allow the visual to be pulled over to [nearly] full width)
			var margin = { top: height * 0.07, right: width * 0.15, bottom: height * 0.07, left: width * 0.15 };

			// x scale
			if(xRawMinMax[0] < 0) {
				[xRawMinMax[0]*1.1, xRawMinMax[1]*1.1]
			} else {
				[xRawMinMax[0]*.9, xRawMinMax[1]*1.1]; // push the bubbles a little into the graph
			}
			
			
		  var x = d3.scale.linear()
				.range([margin.left, width-margin.right]);

			dim === 3 ?	x.domain(xMinMaxFunc(xRawMinMax)) : x.domain(xRawMinMax);	// different set-up for graphs with and without z-variable

			// y scale
		 	if(yRawMinMax[0] < 0) {
			 [yRawMinMax[0]*1.1, yRawMinMax[1]*1.1]
		 } else {
			 [yRawMinMax[0]*.9, yRawMinMax[1]*1.1]; // push the bubbles a little into the graph
		 }

		  var y = d3.scale.linear()
				.range([height-margin.bottom, margin.top])
				.domain(yRawMinMax);
				
			// z scale only for 3 dimensional scatter
			if(dim === 3) {
				var z = d3.scale.sqrt()
					.range([height*0.02, height*0.1])
					.domain(zRawMinMax)
			} // end if-statement
			
			// axis
			var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(6).tickSize(0).tickPadding(15)
				.tickFormat(function(d){
					var prefix = d3.formatPrefix(d);
					return prefix.scale(d) + prefix.symbol;
				});

			var yAxis = d3.svg.axis().scale(y).orient('left').ticks(6).tickSize(0).tickPadding(15)
				.tickFormat(function(d){
					var prefix = d3.formatPrefix(d);
					return prefix.scale(d) + prefix.symbol;
				});

			// data ==================================================================================
						
			// (1) nest data by answer/brand (top-level) and question (2nd level) (unsure where I split it by question, but it works)
			var data = d3.nest()
				.key(function(d) { return d.answer; })
				.entries(dataWork); // nest data by answer

			data.forEach(function(d) {
				d.answer = d.key;
				d.answerValues = d.values;
				delete d.key; delete d.values;

			}); // rename key and values variables

			data.forEach(function(d) {
				d.answerValues = d.answerValues.filter(function(dd){
					if(dim === 2) {
						return dd.question === xVar || dd.question === yVar;
					} else if(dim === 3) {
						return dd.question === xVar || dd.question === yVar || dd.question === zVar;
					}
				});
			}); // loop through each datapoint ... to filter dataset based on chosen variables

			data = data.filter(function(d) {
				return d.answerValues.length === dim;
			}); // only keep datapoints with all 3 variables available


			// (2) reduce Data randomly keeping a set of countries of interest
			// this needs to be done once here for the first visual. the array of indeeces needs to be applied to resort() and update() to keep the same dataset
			
			var reduceData = function(countriesToKeep, nAdditional) {

				var dataFiltered = []; // new data 
				var indexToKeep = []; // indeces of elements to keep

				// (1) save indeces of all must-includes (if we feed it an array)
				if(countriesToKeep.length > 0) {
					var index; // save array indeces of countries to keep

					for (var i = 0; i < countriesToKeep.length; i++) {
						index = _.findIndex(data, function(el) { return el.answer === countriesToKeep[i];})

						if (indexToKeep.indexOf(index) === -1) {
							indexToKeep.push(index);
						} // push indeces of the countriesToKeep into our index array

					} // loop through each country to keep .. to save each countryToKeep's index
					
				} // only do if we have countries
	
				// (2) save a set number of random indeces
				var l = data.length; // length of old data

				for (var i = 0; i < nAdditional; i++) {
					var r = Math.floor(Math.random() * l);
					if (indexToKeep.indexOf(r) === -1) {
						indexToKeep.push(r);
					} // push a set number of random element indeces into our index array
				} // iterate a set number of times over our data

				// (3) get all elements from the index array into the data
				indexToKeep.forEach(function(el) {
					dataFiltered.push(data[el]);
				});
				
				// note: the set number of elements (countries) can only be the maximum number of elements as a random number doesn't get saved as an index if it already exists (which can happen).
				// (4) return object with data and index
				var output = {};
				output.data = dataFiltered;
				output.index = indexToKeep;

				return output;
		
			} // reduceData() - reduce dataset to some random and some chosen countries (handy for what we want to do with the 3D chart). countriesToKeep = array of country names, nAdditional = max number of additional countries we would like in final data array 

			// var keepCountries = dim === 3 ? ['Bahrain', 'Bhutan', 'Kuwait', 'Oman', 'Qatar', 'Saudi Arabia', 'United Arab Emirates', 'Germany', 'United Kingdom', 'United States'] : ['India', 'China', 'Pakistan', 'Nigeria', 'Germany', 'United Kingdom', 'United States']; // this is bespoke input for the chosen scatter plots
			var keepCountries = dim === 3 ? ['Bahrain', 'Bhutan', 'Kuwait', 'Oman', 'Qatar', 'Saudi Arabia', 'United Arab Emirates', 'Germany', 'United Kingdom', 'United States'] : []; // this is bespoke input for the chosen scatter plots
			var dataOutput = reduceData(keepCountries, 30); // get the output			
			var dataReduced = dataOutput.data; // the data to be used in the first vis
			var dataIndeces = dataOutput.index; // the index to be used for resort() and update()

			data = dataReduced.sort(function(a,b) {
				var valueA = +access(a)[dim-1].value; // sorts by the 3rd array if 3-dimensional (dim-1 = [2]) and by the 2nd array if 2-dimensional (dim-1 = [1])
				var valueB = +access(b)[dim-1].value; // see above
					    if (valueA < valueB) {
					        return 1;
					    } else if (valueA > valueB) {
					        return -1;
					    } else {
					return 0;
				}
			}); // sort from highest to lowest as later data objects are on top of earlier data-objects




			// =======================================================================================


			function getIndex(data) {
				var arrX = [], arrY = [], arrZ = [];
				var i = {};
				data[0].answerValues.forEach(function(d){
					d.question === xVar ? arrX.push(1) : arrX.push(0);
					d.question === yVar ? arrY.push(1) : arrY.push(0);
					d.question === zVar ? arrZ.push(1) : arrZ.push(0);
				});
				i.x = arrX.indexOf(1), i.y = arrY.indexOf(1), i.z = arrZ.indexOf(1);
				return i;
			} // function to get the array index of each question array of the answerValues 
			var ind = getIndex(data);

			// map colors
			var sortedBrands = data.map(function(m) { return spaceLess(m.answer); });
			var colors = d3.scale.category10().domain(sortedBrands);

			// set column layout
			var dataBouncer = 0; // use both columns (different widths get assigned below after the singleColumn() check)


			// add container
			var container = d3.select('.contentInner#left')
				.append('div')
				.attr('class', 'boxContentScatter graph box')
				.append('div')
				.attr('class', 'containerContent contain');


			// log(data);



	// --- bubble graph ---------------------------------------------------------------------------------

			// svg (incl. viewBox for responsiveness)
			var svg = container
				.append('svg')
				.attr('width', '100%')
				.attr('height', '100%')
				.attr('viewBox', '0 0 ' + width + ' ' + height)
				.attr('preserveAspectRatio', 'xMinYMin')
				.attr('class','question');
			
			// add axes
			svg.append('g')
			  .attr('class', 'x axis')
				.attr('transform', 'translate( 0, ' + (height-margin.bottom) + ' )')
				.call(xAxis);

			svg.append('g')
			  .attr('class', 'y axis')
				.attr('transform', 'translate( ' + margin.left + ', 0 )')
				.call(yAxis);
			
			// switch off axis line (do here instead of css in order to not produce another variable)
			d3.selectAll('path.domain').style('stroke','none');


			
			// create frame and create lines only for 3 dimensional vis (with bubble size)
			svg.append('rect')
				.attr('class','backgroundBox')
				.attr('x', margin.left)
				.attr('y', margin.top)
				.attr('width', width-margin.left-margin.right)
				.attr('height', height-margin.top-margin.bottom)
				.style('fill', 'none') // move to css
				.style('stroke', '#ccc')
				.style('stroke-width', '1px')
				.style('pointer-events', 'none');
			
							
			if(dim === 3){
				
				svg.append('line')
					.attr('class', 'backgroundLine')
					.attr('x1', margin.left)
					.attr('y1', margin.top + height/2 - margin.bottom)
					.attr('x2', width - margin.right)
					.attr('y2', margin.top  + height/2  - margin.bottom)
					.style('stroke', '#ccc');  // move to css


				svg.append('line')
					.attr('class', 'backgroundLine')
					.attr('x1', margin.left + width/2 - margin.right)
					.attr('y1', margin.top)
					.attr('x2', margin.left + width/2 - margin.right)
					.attr('y2', height - margin.bottom)
					.style('stroke', '#ccc');  // move to css
			
			} // if-statement


			// add 'average' line

			// clip-path definitions which are called upon by the line via CSS. 
			// So: the line that requires the clip-path gets a specific id ('#line' in this case)
			// the CSS for this id retrieves the information from the clip-path (via the css-function 'url') and applies it accordingly
			svg.append('defs').append('clipPath')
		    .attr('id', 'clip')
				.append('rect')
		    .attr('width', width-margin.right-margin.left)
		    .attr('height', height-margin.top-margin.bottom) // allowed to use all margin.top space for higher percentages
				.attr('transform', 'translate(' + [margin.left, margin.top] + ')'); // see above
			
			
			if(dim === 2){

				// mung relevant values into shape
				var getDataValues = function(dt, variable) {

					var dt = _.cloneDeep(dt);

					dt.forEach(function(d) {
						d.answerValues = d.answerValues.filter(function(dd){
							return dd.question == variable;
						});
					}); // loop through each datapoint ... to filter dataset based on chosen variable

					dt = dt.map(function(d) { return Number(d.answerValues[0].value); }); // get array of all object-values

					return dt;
				} // takes a specific array of objects and returns only specific values
				
				// get array of x- and y-values
				var xArr = getDataValues(data, xVar);
				var yArr = getDataValues(data, yVar);
				
				// get points for a least square line
				var bestFitLine = leastSquareLine(xArr, yArr);

				// get correlation for the data 
				var thisPearson = pearson(new Array(xArr, yArr), 0, 1);

				// define x and y values
				var x1 = d3.min(bestFitLine[0]);
				var y1 = d3.min(bestFitLine[1]);
						x2 = d3.max(bestFitLine[0]);
						y2 = d3.max(bestFitLine[1]);

				// add the line of best fit 
				var fitLine = svg.selectAll('.line')
					.data([x1, y1, x2, y2])
					.enter()
					.append('line')
					.attr('id', 'line')
					.attr('x1', x(x1))
					.attr('y1', thisPearson < 0 ? y(y2) : y(y1))
					.attr('x2', x(x2))
					.attr('y2', thisPearson < 0 ? y(y1) : y(y2))
					.style('stroke-width', 1)
					.style('stroke', '#ccc')
					.style('pointer-events', 'none');  // the y position is dependent on the correlation sign
					
			} // end if-statement

					
				// add bubbles					
				var bubble = svg.selectAll('.bubble')
					.data(data, function(d) { return d.answer; })
					.enter()
					.append('circle')
					.attr('class', 'bubble')
					.attr('id', function(d) { return spaceLess(d.answer); });

				var bubbleUpdate = bubble
					.style('fill', function(d) { return colors(spaceLess(d.answer)); })
					.attr('cx', function(d,i) { return x(Number(access(d)[ind.x].value)); })
					.attr('cy', function(d,i) { return y(Number(access(d)[ind.y].value)); })
					.attr('r', 0)
				
				// bubble size depending on dimensions
				bubbleUpdate.transition().duration(1000).ease('linear')
						.attr('r', function(d) { return dim === 3 ? z(access(d)[ind.z].value) : height*.02; });
				
				// add text-label
				var text = svg.selectAll('.text.bubble')
					.data(data, function(d) { return d.answer; })
					.enter()
					.append('text')
					.attr('class', 'text bubble')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', function(d) { return x(access(d)[ind.x].value); })
					.attr('y', function(d) { return y(access(d)[ind.y].value); })
					.text(function(d){ return d.answer })
					.attr('pointer-events', 'none')
					.style('font-size', '0px');

				// add headlline labels
				svg.append('text')
					.attr('class', 'headline scatter')
					.attr('x', width/2)
					.attr('y', margin.top * 0.45)
					.text(headline + ' - ' + d3.select('li.period#' + liId).html()) // add period label
					.attr('text-anchor', 'middle')
					.style('fill', '#666')
					.style('font-size', '1.6em');

				svg.append('text')
					.attr('class', 'label y')
					.attr('transform', 'translate(' + margin.left * 1.13 + ', ' + margin.top * 1.3 + ')rotate(270)') // see http://stackoverflow.com/questions/11252753/rotate-x-axis-text-in-d3
					.text(yLabel)
					.style('text-anchor', 'end')
					.style('fill', '#ccc');

				svg.append('text')
					.attr('class', 'label xRight')
					.attr('x', width - margin.right - 10)
					.attr('y', height - margin.bottom - 10)
					.text(xLabelRight)
					.style('text-anchor', 'end')
					.style('fill', '#ccc')
					.style('font-size', '1.1em');

				svg.append('text')
					.attr('class', 'label xLeft')
					.attr('x', margin.right + 10)
					.attr('y', height - margin.bottom - 10)
					.text(xLabelLeft)
					.style('text-anchor', 'start')
					.style('fill', '#ccc')
					.style('font-size', '1.1em');

				svg.append('text')
					.attr('class', 'removeFocus')
					.attr('x', (width - margin.right) - width*0.01)
					.attr('y', margin.top + height*0.028)
					.text('remove focus')
					.style('text-anchor', 'end')
					.style('fill', 'tomato')
					.style('fill-opacity', .6)
					.style('cursor', 'pointer')
					.style('cursor', 'hand')
					.style('display', 'none')
					.style('font-size', '1.1em');
					
				d3.select('text.removeFocus')
					.on('mouseover', function() { d3.select(this).transition().style('fill-opacity', 1); })
					.on('mouseout', function() { d3.select(this).transition().style('fill-opacity', .6); })



		// --- bars set-up ------------------------------------------------------------------------------
				
				// measures for svg
				var barWidth = (document.getElementById('wrapperContent').clientWidth * .45);
				var barHeight = width * .732; // height/width aspect-ratio as determined in css of pseudo-elements padding-top (not quite in order to allow the visual to be pulled over to [nearly] full width)
				var barMargin = { top: barHeight * 0.07, right: barWidth * 0.01, bottom: barHeight * 0.07, left: barWidth * 0.2 };
				var graphWidth = (barWidth - barMargin.left - barMargin.right) / 3;

				// scale ranges
				var xY = d3.scale.linear() // x scale for yVar (eg. Age in profile)
					.range([0, graphWidth * .95]);

				if(yRawMinMax[0] >= 0){
					xY.domain([0, yRawMinMax[1]]);
				} else{
					xY.domain(yRawMinMax);
				}

				var xX = d3.scale.linear() // x scale for xVar (eg. Gender in profile)
					.range([0, graphWidth * .95]);
					
				if(xRawMinMax[0] >= 0){
					xX.domain([0, xRawMinMax[1]]);
				} else{
					xX.domain(xRawMinMax);
				}

				if (dim === 3){
					var xZ = d3.scale.linear() // x scale for zVar (eg. Subscription in profile)
						.range([0, graphWidth * .95]);
						
					if(zRawMinMax[0] >= 0){
						xZ.domain([0, zRawMinMax[1]]);
					} else{
						xZ.domain(zRawMinMax);
					}
					
				} // set up z-domain
			
				// ordinal scale for the vertical bar axis
				var l = [];
				for(var i = 0; i < data.length; i++) { l.push(i); }
				var yBar = d3.scale.ordinal()
					.rangeRoundBands([barMargin.top, (barHeight - barMargin.bottom)], .1)
					.domain(l);

				// horizontal linear axis for the bars (for the xVar and the yVar - eg. Gender and Age)
				var xAxisX = d3.svg.axis().scale(xX).orient('top');
				var xAxisY = d3.svg.axis().scale(xY).orient('top');
				if(dim === 3) var xAxisZ = d3.svg.axis().scale(xZ).orient('top'); 

				// vertical oridnal axes for all bars
				var yAxisBar = d3.svg.axis().scale(yBar).orient('left').tickSize(0);




		// --- bar graphs ------------------------------------------------------------------------------------
				
				var dur = 250;

				// add container
				var containerRight = d3.select('.contentInner#right')
					.append('div')
					.attr('class', 'boxContentScatterBars graph box')
					.append('div')
					.attr('class', 'containerContent contain');

				// svg (incl. viewBox for responsiveness)
				var svgBars = containerRight
					.append('svg')
					.attr('width', '100%')
					.attr('height', '100%')
					.attr('viewBox', '0 0 ' + barWidth + ' ' + barHeight)
					.attr('preserveAspectRatio', 'xMinYMin')
					.attr('class','bars');

				// if 3rd dimension: add z-variable bars and text (eg. 'Subscription' in profile vis)
				if(dim === 3){
					
					var barsZvar = svgBars.selectAll('.bars.zVar')
						.data(data)
						.enter()
						.append('rect')
						.attr('class', 'bars zVar')
						.attr('id', function(d) { return spaceLess(d.answer); })
						.attr('x', function(d) {
							return access(d)[ind.y].value >= 0
								? barMargin.left + xZ(0)
								: barMargin.left + xZ(access(d)[ind.z].value);
						}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
						.attr('y', function(d,i) { return yBar(i); })
						.attr('width', 0)
						.attr('height', yBar.rangeBand())
						.style('fill', '#d9d9d9');

					barsZvar.transition().duration(dur)
						.attr('width', function(d) {
							return access(d)[ind.z].value >= 0
								? xZ(access(d)[ind.z].value) - xZ(0)
								: xZ(0) - xY(access(d)[ind.z].value);
						}); // width is from 0 to value


					var textZvar = svgBars.selectAll('.bartext.zVar')
						.data(data)
						.enter()
						.append('text')
						.attr('class', 'bartext zVar')
						.attr('id', function(d) { return spaceLess(d.answer); })
						.attr('x', barMargin.left)
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
						.text(function(d) { return pointFormat(access(d)[ind.z].value); })
						.style('font-size', 0);
				
					textZvar.transition().duration(dur)
						.attr('x', function(d) {
							return xZ(access(d)[ind.z].value)/(graphWidth * .95) > 0.6 
								? barMargin.left + xZ(access(d)[ind.z].value) - 5 
								: barMargin.left + xZ(access(d)[ind.z].value) + 5; 
						})
						.style('text-anchor', function(d) {
							return xZ(access(d)[ind.z].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start';
						})
						.style('font-size', '1.2em');
						


				} // end if-statement


				// add labels for the whole bar-graph
				var labelBar = svgBars.selectAll('.barlabel.bar')
					.data(data)
					.enter()
					.append('text')
					.attr('class', 'barlabel bar')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', function(d) { return barMargin.left - 10; })
					.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
					.text(function(d) { return d.answer.slice(0,16); })
					.style('font-size', '1.2em')
					.style('text-anchor', 'end')
					.style('fill', '#fff');
			
				labelBar.transition().duration(dur)
					.style('fill', '#000');
						
						
						
						
				// add yVar bars, text ------------------------------------------------------------------
					
				var barsYvar = svgBars.selectAll('.bars.yVar')
					.data(data)
					.enter()
					.append('rect')
					.attr('class', 'bars yVar')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', function(d) {
						return access(d)[ind.y].value >= 0
							? barMargin.left + graphWidth * (dim - 2) + xY(0)
							: barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value);
					}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
					.attr('y', function(d,i) { return yBar(i); })
					.attr('width', 0)
					.attr('height', yBar.rangeBand())
					.style('fill', '#ccece6');

				barsYvar.transition().duration(dur)
					.attr('width', function(d) {
						return access(d)[ind.y].value >= 0
							? xY(access(d)[ind.y].value) - xY(0)
							: xY(0) - xY(access(d)[ind.y].value);
					});

				var textYvar = svgBars.selectAll('.bartext.yVar')
					.data(data)
					.enter()
					.append('text')
					.attr('class', 'bartext yVar')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', barMargin.left + graphWidth * (dim - 2) + xY(0)) // see above
					.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
					.text(function(d) { return pointFormat(access(d)[ind.y].value); })
					.style('text-anchor', 'end')
					.style('font-size', 0);

				textYvar.transition().duration(dur)
					.attr('x', function(d) {
						return xY(access(d)[ind.y].value)/(graphWidth * .95) > 0.6 
							? barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value) - 5 
							: barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value) + 5;
					})
					.style('text-anchor', function(d) {
						return xY(access(d)[ind.y].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start';
					})
					.style('font-size', '1.2em');


				// add xVar bars, text ------------------------------------------------------------------
					
				var barsXvar = svgBars.selectAll('.bars.xVar')
					.data(data)
					.enter()
					.append('rect')
					.attr('class', 'bars xVar')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', function(d) {
						return access(d)[ind.x].value >= 0
							? barMargin.left + graphWidth * (dim - 1) + xX(0)
							: barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value);
					}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
					.attr('y', function(d,i) { return yBar(i); })
					.attr('width', 0)
					.attr('height', yBar.rangeBand())
					.style('fill', '#deebf7');

				barsXvar.transition().duration(dur)
					.attr('width', function(d) {
						return access(d)[ind.x].value >= 0 
							? xX(access(d)[ind.x].value) - xX(0)
							:	xX(0) - xX(access(d)[ind.x].value);
					});
					
				var textXvar = svgBars.selectAll('.bartext.xVar')
					.data(data)
					.enter()
					.append('text')
					.attr('class', 'bartext xVar')
					.attr('id', function(d) { return spaceLess(d.answer); })
					.attr('x', barMargin.left + graphWidth * (dim - 1)) // see above
					.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
					.text(function(d) { return pointFormat(access(d)[ind.x].value); })
					.style('font-size', 0);

				textXvar.transition().duration(dur)
					.attr('x', function(d) {
						return xX(access(d)[ind.x].value)/(graphWidth * .95) > 0.6 
							? barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value) - 5 
							: barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value) + 5;
					})
					.style('text-anchor', function(d) {
						return xX(access(d)[ind.x].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start';
					})
					.style('font-size', '1.2em');



				// add axes
				svgBars.append('g')
					.attr('class', 'x axis xVar')
					.attr('transform', 'translate(' + (barMargin.left + graphWidth * (dim - 1)) + ', ' + barMargin.top + ')') // regarding  (dim - 1) calcs see below
					.call(xAxisX);

				svgBars.append('g')
					.attr('class', 'y axis xVar')
					.attr('transform', 'translate(' + (barMargin.left + graphWidth * (dim - 1) - 1 + xX(0)) + ', 0)') // - 1, otherwise axis disappears behind bars (unsure why)
					.call(yAxisBar);

				svgBars.append('g')
					.attr('class', 'x axis yVar')
					.attr('transform', 'translate(' + (barMargin.left + graphWidth * (dim - 2)) + ', ' + barMargin.top + ')')
					.call(xAxisY);

				svgBars.append('g')
					.attr('class', 'y axis yVar')
					.attr('transform', 'translate(' + (barMargin.left + graphWidth * (dim - 2) - 1 + xY(0)) + ', 0)') // - 1, otherwise axis disappears behind bars (unsure why)
					.call(yAxisBar);

				// dependent on the dimensions in vis
				if(dim === 3){

					svgBars.append('g')
						.attr('class', 'x axis zVar')
						.attr('transform', 'translate(' + barMargin.left + ', ' + barMargin.top + ')')
						.call(xAxisZ);

					svgBars.append('g')
						.attr('class', 'y axis zVar')
						.attr('transform', 'translate(' + (barMargin.left + xZ(0)) + ', 0 )')
						.call(yAxisBar);

				} // end if-statement



				// add headline labels

				if(dim === 3) {

					svgBars.append('text')
						.attr('class','headline zVar')
						.attr('x', barMargin.left)
						.attr('y', barMargin.top - 10)
						.text('size: ' + zBarLabel)
						.style('fill', '#fff')
					.style('font-size', '1.3em')
						.transition().duration(dur)
						.style('fill', '#000');

				}

					svgBars.append('text')
						.attr('class','headline yVar')
						.attr('x', barMargin.left + graphWidth * (dim - 2)) // (dim - 2) calc see above
						.attr('y', barMargin.top - 10)
						.text('y: ' + yBarLabel)
						.style('fill', '#fff')
					.style('font-size', '1.3em')
						.transition().duration(dur)
						.style('fill', '#000');

					svgBars.append('text')
						.attr('class','headline xVar')
						.attr('x', barMargin.left + graphWidth * (dim - 1)) // (dim - 1) calc see above
						.attr('y', barMargin.top - 10)
						.text('x: ' + xBarLabel)
						.style('fill', '#fff')
						.style('font-size', '1.3em')
						.transition().duration(dur)
						.style('fill', '#000');
								
			
			
  // --- resort data ------------------------------------------------------------------------------------

				function resort(lever) {

					var currentPeriod = periodLookup[liId.substr(1,4)]();

					dataWork = rawData.filter(function(d) {
						return d.country === country && d.date == currentPeriod;
					});


					// nest data by answer/brand (top-level) and question (2nd level) (unsure where I split it by question, but it works)
					var dataNew = d3.nest()
						.key(function(d) { return d.answer; })
						.entries(dataWork); // nest data by answer
								
					dataNew.forEach(function(d) {
						d.answer = d.key;
						d.answerValues = d.values;
						delete d.key; delete d.values;

					}); // rename key and values variables

					dataNew.forEach(function(d) {
						d.answerValues = d.answerValues.filter(function(dd){
							if(dim === 2) {
								return dd.question === xVar || dd.question === yVar;
							} else if(dim === 3) {
								return dd.question === xVar || dd.question === yVar || dd.question === zVar;
							}
						});
					}); // loop through each datapoint ... to filter dataset based on chosen variables

					dataNew = dataNew.filter(function(d) {
						return d.answerValues.length === dim;
					}); // only keep datapoints with all 3 variables available

					dataNew = reduceToIndeces(dataNew, dataIndeces); // reduceToIndeces() lives in the uility section - it takes data and an array of indeces and returns a reduced set of data containing only the indexed elements
					
					dataNew = dataNew.sort(function(a,b) {
							if(lever === 0 || lever === 1 || lever === 2) {
								var valueA = +access(a)[lever].value; // sorts by the 3rd array if 3-dimensional (dim-1 = [2]) and by the 2nd array if 2-dimensional (dim-1 = [1])
								var valueB = +access(b)[lever].value; // see above
								return valueA < valueB ? 1 : -1;
							} else if(lever === 'answer') {
								return b.answer < a.answer ? 1 : -1;
							}
					}); // different sort to previous sorts

					var dur = 500;
					var n = dataNew.length;
					
					// update labels
					labelBar
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; });
			
					// update z bar rects and text
					if(dim === 3){
						barsZvar
							.data(dataNew, function(d) { return d.answer; })
							.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
							.attr('y', function(d,i) { return yBar(i); })
							.attr('x', function(d) {
								return access(d)[ind.z].value >= 0
									? barMargin.left + xZ(0)
									: barMargin.left + xZ(access(d)[ind.z].value);
							}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
							.attr('width', function(d) {
								return access(d)[ind.z].value >= 0 
									? xZ(access(d)[ind.z].value) - xZ(0)
									:	xZ(0) - xZ(access(d)[ind.z].value);
							});
							
						textZvar = svgBars.selectAll('.bartext.zVar')
							.data(dataNew, function(d) { return d.answer; })
							.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
							.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
							.attr('x', function(d) {
								return xZ(access(d)[ind.z].value)/(graphWidth * .95) > 0.6 
									? barMargin.left + xZ(access(d)[ind.z].value) - 5 
									: barMargin.left + xZ(access(d)[ind.z].value) + 5; 
							})
							.style('text-anchor', function(d) {
								return xZ(access(d)[ind.z].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start';
							});
							
							
					} // update z variable aesthetics

					barsYvar
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
						.attr('y', function(d,i) { return yBar(i); })
						.attr('x', function(d) {
							return access(d)[ind.y].value >= 0
								? barMargin.left + graphWidth * (dim - 2) + xY(0)
								: barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value);
						}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
						.attr('width', function(d) {
							return access(d)[ind.y].value >= 0 
								? xY(access(d)[ind.y].value) - xY(0)
								:	xY(0) - xY(access(d)[ind.y].value);
						});


					barsXvar
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
						.attr('y', function(d,i) { return yBar(i); })
						.attr('x', function(d) {
							return access(d)[ind.x].value >= 0
								? barMargin.left + graphWidth * (dim - 1) + xX(0)
								: barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value);
						}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
						.attr('width', function(d) {
							return access(d)[ind.x].value >= 0 
								? xX(access(d)[ind.x].value) - xX(0)
								:	xX(0) - xX(access(d)[ind.x].value);
						});
		
					// update bar text
					textYvar
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
						.attr('x', function(d) {
							return xY(access(d)[ind.y].value)/(graphWidth * .95) > 0.6 
								? barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value) - 5 
								: barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value) + 5;
						})
						.style('text-anchor', function(d) {
							return xY(access(d)[ind.y].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start';
						});
						

					textXvar
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).delay(function(d,i) { return i / n * dur; })
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
						.attr('x', function(d) {
							return xX(access(d)[ind.x].value)/(graphWidth * .95) > 0.6 
								? barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value) - 5 
								: barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value) + 5;
						})
						.style('text-anchor', function(d) {
							return xX(access(d)[ind.x].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start';
						});
						
						
		
		
				} // resort() sorting data to update bars 
				
				d3.select('.headline.zVar')
					.on('mousedown', function() { resort(ind.z); })
					.on('dblclick', function() { resort('answer'); })
					.on('mouseover', function() {
						tooltipExplain.html('click to sort by variable | double-click to sort by names')
							.style('opacity', .9)
							.style('left', d3.event.pageX + 'px')
							.style('top', (d3.event.pageY - 30) + 'px')
							.style('right', 'auto');
					})
					.on('mouseout', function() {
						tooltipExplain.transition().duration(500).style('opacity', 0);
					});
				

				d3.select('.headline.yVar')
					.on('mousedown', function() { resort(ind.y); })
					.on('dblclick', function() { resort('answer'); })
					.on('mouseover', function() {
						tooltipExplain.html('click to sort by variable | double-click to sort by names')
							.style('opacity', .9)
							.style('left', d3.event.pageX + 'px')
							.style('top', (d3.event.pageY - 30) + 'px')
							.style('right', 'auto');
					})
					.on('mouseout', function() {
						tooltipExplain.transition().duration(500).style('opacity', 0);
					});
					

				d3.select('.headline.xVar')
					.on('mousedown', function() { resort(ind.x); })
					.on('dblclick', function() { resort('answer'); })
					.on('mouseover', function() {
						tooltipExplain.html('click to sort by variable | double-click to sort by names')
							.style('opacity', .9)
							.style('left', d3.event.pageX + 'px')
							.style('top', (d3.event.pageY - 30) + 'px')
							.style('right', 'auto');
					})
					.on('mouseout', function() {
						tooltipExplain.transition().duration(500).style('opacity', 0);
					});
					


				
					
  // --- update data ------------------------------------------------------------------------------------

				// lookup table for date
				var periodLookup = {
					'1961': function() { return '1961-01-01' },
					'1962': function() { return '1962-01-01' },
					'1963': function() { return '1963-01-01' },
					'1964': function() { return '1964-01-01' },
					'1965': function() { return '1965-01-01' },
					'1966': function() { return '1966-01-01' },
					'1967': function() { return '1967-01-01' },
					'1968': function() { return '1968-01-01' },
					'1969': function() { return '1969-01-01' },
					'1970': function() { return '1970-01-01' },
					'1971': function() { return '1971-01-01' },
					'1972': function() { return '1972-01-01' },
					'1973': function() { return '1973-01-01' },
					'1974': function() { return '1974-01-01' },
					'1975': function() { return '1975-01-01' },
					'1976': function() { return '1976-01-01' },
					'1977': function() { return '1977-01-01' },
					'1978': function() { return '1978-01-01' },
					'1979': function() { return '1979-01-01' },
					'1980': function() { return '1980-01-01' },
					'1981': function() { return '1981-01-01' },
					'1982': function() { return '1982-01-01' },
					'1983': function() { return '1983-01-01' },
					'1984': function() { return '1984-01-01' },
					'1985': function() { return '1985-01-01' },
					'1986': function() { return '1986-01-01' },
					'1987': function() { return '1987-01-01' },
					'1988': function() { return '1988-01-01' },
					'1989': function() { return '1989-01-01' },
					'1990': function() { return '1990-01-01' },
					'1991': function() { return '1991-01-01' },
					'1992': function() { return '1992-01-01' },
					'1993': function() { return '1993-01-01' },
					'1994': function() { return '1994-01-01' },
					'1995': function() { return '1995-01-01' },
					'1996': function() { return '1996-01-01' },
					'1997': function() { return '1997-01-01' },
					'1998': function() { return '1998-01-01' },
					'1999': function() { return '1999-01-01' },
					'2000': function() { return '2000-01-01' },
					'2001': function() { return '2001-01-01' },
					'2002': function() { return '2002-01-01' },
					'2003': function() { return '2003-01-01' },
					'2004': function() { return '2004-01-01' },
					'2005': function() { return '2005-01-01' },
					'2006': function() { return '2006-01-01' },
					'2007': function() { return '2007-01-01' },
					'2008': function() { return '2008-01-01' },
					'2009': function() { return '2009-01-01' },
					'2010': function() { return '2010-01-01' },
					'2011': function() { return '2011-01-01' },
					'2012': function() { return '2012-01-01' },
					'2013': function() { return '2013-01-01' }
				};


				// event-handler update
				function update(period, dur, eas) {
					if(dur === undefined) { var dur = 1000; } // taking care of optional arguments
					if(eas === undefined) { var eas = 'cubic-in-out'; }
					
					dataWork = rawData.filter(function(d) {
						return d.country === country && d.date == period;
					});


					// nest data by answer/brand (top-level) and question (2nd level) (unsure where I split it by question, but it works)
					var dataNew = d3.nest()
						.key(function(d) { return d.answer; })
						.entries(dataWork); // nest data by answer
								
					dataNew.forEach(function(d) {
						d.answer = d.key;
						d.answerValues = d.values;
						delete d.key; delete d.values;

					}); // rename key and values variables

					dataNew.forEach(function(d) {
						d.answerValues = d.answerValues.filter(function(dd){
							if(dim === 2) {
								return dd.question === xVar || dd.question === yVar;
							} else if(dim === 3) {
								return dd.question === xVar || dd.question === yVar || dd.question === zVar;
							}
						});
					}); // loop through each datapoint ... to filter dataset based on chosen variables

					dataNew = dataNew.filter(function(d) {
						return d.answerValues.length === dim;
					}); // only keep datapoints with all 3 variables available

					dataNew = reduceToIndeces(dataNew, dataIndeces); // reduceToIndeces() lives in the uility section - it takes data and an array of indeces and returns a reduced set of data containing only the indexed elements

					dataNew = dataNew.sort(function(a,b) {
						var valueA = +access(a)[dim-1].value; // sorts by the 3rd array if 3-dimensional (dim-1 = [2]) and by the 2nd array if 2-dimensional (dim-1 = [1])
						var valueB = +access(b)[dim-1].value; // see above
							    if (valueA < valueB) {
							        return 1;
							    } else if (valueA > valueB) {
							        return -1;
							    } else {
							return 0;
						}
					}); // sort from highest to lowest as later data objects are on top of earlier data-objects


					// update bubble parameters
					svg.selectAll('.bubble')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).ease(eas)
						.attr('cx', function(d) { return x(access(d)[ind.x].value); })
						.attr('cy', function(d) { return y(access(d)[ind.y].value); })
						.attr('r', function(d) { return dim === 3 ? z(access(d)[ind.z].value) : height * .02; }); // dependent on variable-dimensions
						
					// update bubble text parameters
					svg.selectAll('.text.bubble')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur).ease(eas)
						.attr('x', function(d) { return x(access(d)[ind.x].value); })
						.attr('y', function(d) { return y(access(d)[ind.y].value); });

					// update headlline labels
					liId = 'p' + period.replace(/-/g,''); // update the current ID for the headline of the bubble graph
					svg.select('.headline.scatter')
						.text(headline + ' - ' + d3.select('li.period#' + liId).html()); 
					

					if(dim === 2){

							// get array of x- and y-values
							xArr = getDataValues(dataNew, xVar);
							yArr = getDataValues(dataNew, yVar);

							// get points for a least square line
							bestFitLine = leastSquareLine(xArr, yArr);

							// get correlation for the data
							thisPearson = pearson(new Array(xArr, yArr), 0, 1);

							// define x and y values
							x1 = d3.min(bestFitLine[0]);
							y1 = d3.min(bestFitLine[1]);
							x2 = d3.max(bestFitLine[0]);
							y2 = d3.max(bestFitLine[1]);

							// update the mean line 
							fitLine.transition().duration(dur)
								.attr('x1', x(x1))
								.attr('y1', thisPearson < 0 ? y(y2) : y(y1))
								.attr('x2', x(x2))
								.attr('y2', thisPearson < 0 ? y(y1) : y(y2)); // the y position is dependent on the correlation sign

					}
					
					// update bar parameters
					if(dim === 3){
						svgBars.selectAll('.bars.zVar')
							.data(dataNew, function(d) { return d.answer; })
							.transition().duration(dur)
							.attr('y', function(d,i) { return yBar(i); })
							.attr('height', yBar.rangeBand())
							.attr('x', function(d) {
								return access(d)[ind.z].value >= 0
									? barMargin.left + xZ(0)
									: barMargin.left + xZ(access(d)[ind.z].value);
							}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
							.attr('width', function(d) {
								return access(d)[ind.z].value >= 0 
									? xZ(access(d)[ind.z].value) - xZ(0)
									:	xZ(0) - xZ(access(d)[ind.z].value);
							});

					}

					svgBars.selectAll('.bars.yVar')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur)
						.attr('y', function(d,i) { return yBar(i); })
						.attr('height', yBar.rangeBand()) // don't need this ?
						.attr('x', function(d) {
							return access(d)[ind.y].value >= 0
								? barMargin.left + graphWidth * (dim - 2) + xY(0)
								: barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value);
						}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
						.attr('width', function(d) {

							// log(access(d)[ind.y].answer, access(d)[ind.y].date, access(d)[ind.y].value)

							return access(d)[ind.y].value >= 0 
								? xY(access(d)[ind.y].value) - xY(0)
								:	xY(0) - xY(access(d)[ind.y].value);
						});



					svgBars.selectAll('.bars.xVar')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur)
						.attr('y', function(d,i) { return yBar(i); })
						.attr('height', yBar.rangeBand()) // can go?
						.attr('x', function(d) {
							return access(d)[ind.x].value >= 0
								? barMargin.left + graphWidth * (dim - 1) + xX(0)
								: barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value);
						}) // if value > 0 start rect at 0, otherwise start at 0 MINUS value
						.attr('width', function(d) {
							return access(d)[ind.x].value >= 0 
								? xX(access(d)[ind.x].value) - xX(0)
								:	xX(0) - xX(access(d)[ind.x].value);
						});

						
					// update bar text parameters
					if(dim === 3){
						svgBars.selectAll('.bartext.zVar')
							.data(dataNew, function(d) { return d.answer; })
							.transition().duration(dur)
							// .attr('x', function(d) { return access(d)[ind.z].value > 0.04 ? barMargin.left + xZ(access(d)[ind.z].value) - 5 : barMargin.left + xZ(access(d)[ind.z].value) + 18 ; })
							.attr('x', function(d) { 
								return xZ(access(d)[ind.z].value)/(graphWidth * .95) > 0.6 
									? barMargin.left + xZ(access(d)[ind.z].value) - 5 
									: barMargin.left + xZ(access(d)[ind.z].value) + 5; 
							})
							.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
							.text(function(d) { return pointFormat(access(d)[ind.z].value); });
					}
					
					svgBars.selectAll('.bartext.yVar')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur)
						.attr('x', function(d) { 
							return xY(access(d)[ind.y].value)/(graphWidth * .95) > 0.6 
								? barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value) - 5 
								: barMargin.left + graphWidth * (dim - 2) + xY(access(d)[ind.y].value) + 5; 
						})
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
						.text(function(d) { return pointFormat(access(d)[ind.y].value); })
						.style('text-anchor', function(d) { return xY(access(d)[ind.y].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start'; });
					
					svgBars.selectAll('.bartext.xVar')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur)
						.attr('x', function(d) { 
							return xX(access(d)[ind.x].value)/(graphWidth * .95) > 0.6 
								? barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value) - 5 
								: barMargin.left + graphWidth * (dim - 1) + xX(access(d)[ind.x].value) + 5; 
						})
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; })
						.text(function(d) { return pointFormat(access(d)[ind.x].value); })
						.style('text-anchor', function(d) { return xX(access(d)[ind.x].value)/(graphWidth * .95) > 0.6 ? 'end' : 'start'; });


					// update bar label parameters (only one set of labels for the left most bars)
					svgBars.selectAll('.barlabel.bar')
						.data(dataNew, function(d) { return d.answer; })
						.transition().duration(dur)
						.attr('y', function(d,i) { return yBar(i) + (yBar.rangeBand()/2) + 4; });

				}
				

  // --- interactivity ------------------------------------------------------------------------------------

				// event-handler named transition to change specified colour
				function changeColour(aes, dur, col, opac) {
					aes.transition('changeColour')
						.duration(dur)
						.style('fill', col)
						.style('opacity', opac === undefined ? null : opac);
				}

				// event-handler named transition to change to aesthetic item's colour
				function coloured(aes, dur, opac) {
					aes.transition('coloured')
					.duration(dur)
					.style('fill', function(d) { return colors(spaceLess(d.answer)); })
					.style('opacity', opac === undefined ? null : opac);
				}

				// event-handler named transition to set text 
				function setBubbleText(aes, dur, event) {
					// event == 'add' or 'remove'
					aes.transition('addBubbleText')
						.duration(dur)
						.style('font-size', event === 'add' ? '10px' : '0px')
						.style('fill', '#333');
				}

				// event-handler mouseout no locked items
				function mouseoutNormalColours() {
					
					// all bubble items back to normal colours
					d3.selectAll('circle.bubble').call(coloured, 250);
					d3.selectAll('text.bubble').call(changeColour, 250, '#333');

					// all bar items back to normal colours
					if(dim === 3) d3.selectAll('rect.bars.zVar').call(changeColour, 250, '#d9d9d9');
					d3.selectAll('rect.bars.yVar').call(changeColour, 250, '#ccece6');
					d3.selectAll('rect.bars.xVar').call(changeColour, 250, '#deebf7');
					d3.selectAll('text.bartext').call(changeColour, 250, '#333');
					d3.selectAll('text.barlabel').call(changeColour, 250, '#333');
				}
 

				// event-handler for bubble animation
				function playBubbles() {
					d3.selectAll('li.period').style('color','#ccc'); // remove all period-button highlights
					d3.select(this)
						.html('playing')
						.style('color','#F64747') // change play-button html and color
						.style('pointer-events', 'none');
					// get unique dates for the bubble-data 
					var arrayDate = rawData.map(getDate); // get all dates from the raw Data into an array (uses utility function that just gets x.date)
					var periods = unik(arrayDate); // get a unique array of the periods (in date-form)
					var periodsIndex = 1;
					update(periods[0],500); // the first transition is a quick transition to the first period
					// to be followed by period-1 transitions through the rest of the periods..
					var interval = setInterval(function() {
						update(periods[periodsIndex++], 500, 'linear');
						periodsIndex === periods.length ? clearInterval(interval) : null;
					}, 500);

					setTimeout(timer, 500 * periods.length); // change the button colouring accordingly

					function timer(){ 
						d3.select('li#p' + periods[periods.length-1].replace(/-/g,'')).style('color','#FBEEC2'); // highlight last period
						d3.select('li#play')
							.html('play it')
							.style('color','#ccc') // change back play-button html and color
							.style('pointer-events', 'inherit');
					}	
				}
				

				function mousedown() {
					var aesId = d3.select(this).attr('id');

					// lock all items related to the selected bubble
					d3.selectAll('#' + aesId).classed('locked', d3.select(this).classed('locked') ? false : true);

					// change locked to colour
					d3.selectAll('circle.bubble.locked').call(coloured, 250, 1);
					d3.selectAll('text.bubble.locked').call(changeColour, 250, '#333');

					// change non-locked to grey
					d3.selectAll('circle.bubble:not(.locked)').call(changeColour, 250, '#ccc');
					d3.selectAll('text.bubble:not(.locked)').call(changeColour, 250, '#999');
	
					// show 'remove focus' button
					d3.select('.removeFocus').style('display', 'inherit');

					// note: this can't be put in sub-function - uncertain why

				}

				function mouseover() {
					var aesId = d3.select(this).attr('id');
					
					var bubbleChild = d3.select('circle#' + aesId)[0][0];
					var textChild = d3.select('text.bubble#' + aesId)[0][0];
					var svgParent = document.querySelector('svg.question');

					svgParent.appendChild(bubbleChild);
					svgParent.appendChild(textChild);
					
					// all bubble items grey apart from the hovered over and the locked ones
					d3.selectAll('circle.bubble:not(.locked)').call(changeColour, 250, '#ccc', .5);
					d3.selectAll('circle.bubble.locked').call(coloured, 250, 1);

					d3.selectAll('text.bubble:not(.locked)').call(changeColour, 250, '#999');
					d3.selectAll('text.bubble.locked').call(changeColour, 250, '#333');

					d3.select('circle.bubble#' + aesId).call(coloured, 250, 1);
					d3.selectAll('text.bubble#' + aesId).call(changeColour, 250, '#333');
					d3.selectAll('text.bubble#' + aesId).call(setBubbleText, 250, 'add'); // 1em

					// all bars and text grey apart from the hovered over and the locked ones
					d3.selectAll('rect.bars:not(.locked)').call(changeColour, 250, '#d9d9d9');
					d3.selectAll('rect.bars.locked').call(coloured, 250);

					d3.selectAll('text.bartext:not(.locked)').call(changeColour, 250, '#999');
					d3.selectAll('text.bartext.locked').call(changeColour, 250, '#333');

					d3.selectAll('text.barlabel:not(.locked)').call(changeColour, 250, '#999');
					d3.selectAll('text.barlabel.locked').call(coloured, 250);

					d3.selectAll('rect.bars#' + aesId).call(coloured, 250);
					d3.selectAll('text.bartext#' + aesId).call(changeColour, 250, '#333');
					d3.selectAll('text.barlabel#' + aesId).call(coloured, 250);

					// note: this can't be put in sub-function as named transition function 'coloured' 
					// requires access to d it can get here but not in outsourced function - uncertain why
	
				}

				function mouseout() {
					var aesId = d3.select(this).attr('id');

					d3.selectAll('text.bubble:not(.locked)').call(setBubbleText, 250, 'remove');

					// test for locked items 
					if(d3.selectAll('circle.bubble.locked').empty()) {

						// all bubble items back to normal colours
						d3.selectAll('circle.bubble').call(coloured, 250, .5);
						d3.selectAll('text.bubble').call(changeColour, 250, '#333');
						d3.selectAll('text.bubble').call(setBubbleText, 250, 'remove');

						// all bar items back to normal colours
						if(dim === 3) d3.selectAll('rect.bars.zVar').call(changeColour, 250, '#d9d9d9');
						d3.selectAll('rect.bars.yVar').call(changeColour, 250, '#ccece6');
						d3.selectAll('rect.bars.xVar').call(changeColour, 250, '#deebf7');
						d3.selectAll('text.bartext').call(changeColour, 250, '#333');
						d3.selectAll('text.barlabel').call(changeColour, 250, '#333');

						d3.select('.removeFocus').style('display', 'none');


					} else if (!d3.selectAll('circle.bubble.locked').empty()) {

						// non-locked bubble items stay grey
						d3.selectAll('circle.bubble.locked').call(coloured, 250, 1);
						d3.selectAll('circle.bubble:not(.locked)').call(changeColour, 250, '#ccc');

						d3.selectAll('text.bubble.locked').call(changeColour, 250, '#333');
						// d3.selectAll('text.bubble:not(.locked)').call(changeColour, 250, '#999');

						// locked bar items stay highlighted
						if(dim === 3) d3.selectAll('rect.bars.zVar.locked').call(coloured, 250);
						d3.selectAll('rect.bars.yVar.locked').call(coloured, 250);
						d3.selectAll('rect.bars.xVar.locked').call(coloured, 250);
						d3.selectAll('text.bartext.locked').call(changeColour, 250, '#333');
						d3.selectAll('text.barlabel.locked').call(coloured, 250);

						// all locked bar items back to normal
						if(dim === 3) d3.selectAll('rect.bars.zVar:not(.locked)').call(changeColour, 250, '#d9d9d9');
						d3.selectAll('rect.bars.yVar:not(.locked)').call(changeColour, 250, '#d9d9d9');
						d3.selectAll('rect.bars.xVar:not(.locked)').call(changeColour, 250, '#d9d9d9');
						d3.selectAll('text.bartext:not(.locked)').call(changeColour, 250, '#999');
						d3.selectAll('text.barlabel:not(.locked)').call(changeColour, 250, '#999');

					} else {
						console.error('mouseout scatter graph on fire')
					}

				}

				// event-listener update
				d3.selectAll('li.period > ul.drop > li.period').on('mousedown', function() {
					d3.selectAll('li.period > ul.drop > li.period').style('color','#ccc');
					d3.select(this).style('color','#FBEEC2');
					var period = d3.select(this).html();
					period = periodLookup[period]();
					update(period);
				});

				// event-listener click
				d3.selectAll('.bubble').on('mousedown', mousedown);

				d3.selectAll('.barlabel').on('mousedown', mousedown);

				// event-listener highlight
				d3.selectAll('.bubble').on('mouseover', mouseover);

				d3.selectAll('.barlabel').on('mouseover', mouseover);

				// event-listener de-highlight
				d3.selectAll('.bubble').on('mouseout', mouseout);

				d3.selectAll('.barlabel').on('mouseout', mouseout);
				
				// remove focus
				d3.select('.removeFocus').on('mousedown', function() {
					d3.selectAll('*').classed('locked', false);
					mouseoutNormalColours();
					d3.select('.removeFocus').style('display', 'none');
					d3.selectAll('text.bubble').call(setBubbleText, 250, 'remove');
					
				})

				// event-listener for bubble animation
				d3.select('li#play').on('mousedown', playBubbles);



	// --- tooltip explanation ------------------------------------------------------------------------------------

			// add tooltip
			var tooltipExplain = d3.select('body').append('div')
		    .attr('class', 'tooltip')
		    .attr('id', 'explain')
				.style('opacity', 0)
				.style('z-index', 10);

			if(dim === 2){
				// explanation text for dashboard
				var explainScatter = "<span style='font-size:14px'>Scatter plot</span> </br></br> \
					Showing how 2 variables are related to each other. </br> \
					The countries shown are a random set of all available countries. </br> \
					Hit the menu button again to update the countries shown. </br></br> \
					The 'average' line indicates the mean fit (not 'least squared') of the relation. </br> \
					It can be meaningful to locate the country of interest in relation to the average line. </br></br> \
					Hit 'play it' and see developments over time. </br> \
					Focus on the countries your most interested by selecting them.";
			} else if(dim === 3){
				// explanation text for dashboard
				var explainScatter = "<span style='font-size:14px'>Scatter plot</span> </br></br> \
					Showing how 2 variables are related to each other. </br> \
					The countries shown are a random set of all available countries. </br> \
					Hit the menu button again to update the countries shown. </br></br> \
					Hit 'play it' and see developments over time. </br> \
					Focus on the countries your most interested by selecting them.";
			} else {
				console.error('dim is not defined as either 2 or 3')
			}


			// event listeners and handlers
			d3.select('li.explanation')
				.on('mouseover', function() {
					tooltipExplain.html(explainScatter)
						.style('opacity', .9)
						.style('right', '2.48%')
						.style('top', '4.5em');
				})
				.on('mouseout', function() {
					tooltipExplain.transition().duration(1000).style('opacity', 0);
				});



				// at last check for number of data sets and apply single column layout if necessary
				// (needs to be after all accessed elements have been built)
				singleColumn();
				d3.selectAll('.contentInner#left').style('width', '55%')
				d3.selectAll('.contentInner#right').style('width', '45%')


			function singleColumn() {
				if (dataBouncer == 0) {
					d3.selectAll('.inside').style('width', '50%'); // normal setting for 2-column layout
					d3.selectAll('.box').style('width', '100%').style('float', 'none');  // normal setting for 2-column layout
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', false); // removes potential class with shorter top-padding to the :before element
				} else if (dataBouncer == 1) {
					d3.selectAll('.inside#left').style('width', '100%'); // left column gets full width
					d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left'); // all boxes (i.e. graphs) get half the width unless when viewed on mobile (needs to be tested!)
					d3.selectAll('.inside#right').selectAll('*').remove(); // remove all children of the right inside wrapper = remove all right .box-elements
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
					d3.selectAll('.boxFilters').style('width', '100%'); // the box for the filters and the context need a width of 100%
					// d3.selectAll('.boxFilters')[0][1].remove();
					d3.selectAll('.boxContext').classed('boxContextSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
					d3.selectAll('.boxContext').style('width', '100%'); // the box for the filters and the context need a width of 100%
				} else if (dataBouncer == 2) {
					d3.selectAll('.inside#right').style('width', '100%'); // all as above
					d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left');
					d3.selectAll('.inside#left').selectAll('*').remove();
					d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true);
					d3.selectAll('.boxFilters').style('width', '100%');
					d3.selectAll('.boxContext').classed('boxContextSingleCol', true);
					d3.selectAll('.boxContext').style('width', '100%');
				} else {
					console.log('dataBouncer on fire')
				}
			}


		}); // d3.csv(); read in the data
		
	} // bubble(); function to build 2D and 3D scatter



	function builder(file, country, perspective){
		
		// allow space for filter divs
		moveContentDown();
		
		// reset the filter section css
		setFilterSectionCSS();
				
		// set column layout
		var dataBouncer = 0; // use both columns (different widths get assigned below after the singleColumn() check)
		

// -- add HTML structure (data independent)------------------------------------------------------
		
		// add container
		var container = d3.select('.contentInner#left')
			.append('div')
			.attr('class', 'boxContent graph box')
			.append('div')
			.attr('class', 'containerContent contain');

		// add filter container
		var filtersL = d3.select('.filters#left')
			.append('div')
			.attr('class', 'boxFilters box')
			.append('div')
			.attr('class', 'containerFiltersHidden contain')
			
			
		filtersL.append('p')
			.attr('id', 'buildHeadOne')
			.html('Select a metric below to be graphed on the right.')
			.style('font-size', (document.getElementById('wrapperContent').clientWidth / 2) *0.035 + 'px');
			
		filtersL.append('p')
			.attr('id', 'buildHeadTwo')
			.html('Go on.')
			.style('font-size', (document.getElementById('wrapperContent').clientWidth / 2) *0.035 + 'px');


			// attention: if I don't build a left filter box the right one slips over to the left. Probably due to position relative.

		// add filter container
		var filtersR = d3.select('.filters#right')
			.append('div')
			.attr('class', 'boxFilters box')
			.append('div')
			.attr('class', 'containerFiltersHidden contain');


// -- data-dependent -----------------------------------------------------------------------------
		
		d3.csv(file, function(rawData){
		
		
			// filter out noshows...
			var smallData = rawData
				.filter(function(d) { return +d.show === 1; })
				.map(function(d) {
					return {
						question: d.question,
						category: d.category
					}
				})
				.sort(function(a,b) {
					if(a.category < b.category) return -1;
					if(a.category > b.category) return 1;
					return 0;
				}); // shape the data to get a unique array
				
			// map unique question names
			var unikQs = smallData.map(function(d) { return d.question + '%' + d.category; });
			unikQs = unik(unikQs);

			var count = -1, arr = [];
			unikQs.forEach(function(d) {
				count++;
				arr.push(d);
				if(arr.length === 3) arr.shift();
				if(arr.length === 1 || cutCategory(arr[0]) !== cutCategory(arr[1])) {
					var insert = arr.length === 1 ? cutCategory(arr[0]) : cutCategory(arr[1]);
					unikQs.splice(count,0,insert);
				}
			}); // insert the category name before each new category element
			
				
			var listColour = d3.scale.ordinal()
				.domain(['Age', 'Economy', 'Health', 'Population', 'Rates', 'Urbanisation']) // all category options
				.range(['#f7f7f7', '#ededed', '#ddd', '#ccc', '#bbb', '#aaa']); // different grey tones

// -- add question-list (data-driven) ------------------------------------------------------------
		
			// create list of questions
			var list = container.selectAll('.questions')
				.data(unikQs)
				.enter()
				.append('div')
				.attr('class', function(d) { return d.indexOf('%') !== -1 ? 'questions' : 'label'; })
				.attr('id', function(d) { return d.indexOf('%') !== -1 ? spaceLess(cutQuestion(d)) : d ; })
				.html(function(d) { return d.indexOf('%') !== -1 ? cutQuestion(d) : d; })
				.style('background-color', function(d) { return listColour(cutCategory(d)); });
				 
				 
			// add question category on mousehover
			d3.selectAll('.questions').on('mouseover', function(d) {
				d3.select(this).html(function(d) { return cutQuestion(d) + ' | category: ' + cutCategory(d); });
			});
			
			d3.selectAll('.questions').on('mouseout', function(d) {
				d3.select(this).html(function(d) { return cutQuestion(d); });
			});

		
// -- build visual --------------------------------------------------------------------------------
		
			var draw = function(){


				d3.selectAll('.questions').style('color', '#555');
				d3.select(this).style('color', 'royalblue');
							
								
				// == data ================================================================================
				
				// get and shape the data
				var	q = d3.select(this).html(); 
				q = cutQuestion2(q); // cut q to just the question text (removing the question category)

				var qData = rawData.filter(function(d) { return d.question === q; });

				var data = d3.nest()
					.key(function(d) { return d.question; })
					.key(function(d) { return d.answer; })
					.entries(qData); // nest the data

				data.forEach(function(d){
					d.question = d.key;
					d.questionValues = d.values;
					delete d.key; delete d.values; 

					d.questionValues.forEach(function(d) {
						d.answer = d.key;
						d.answerValues = d.values;
						d.rank = d3.mean(d.values, function(d) { return +d.rank; }); 
						d.max = d3.max(d.values, function(d) { return Number(d.value); }); 
						d.min = d3.min(d.values, function(d) { return Number(d.value); }); 
						d.develop = d.values[0].answerRecep;
						delete d.key; delete d.values;
					}); // change variable names in second nest and add hellper variables
				}); // change variable names in first nest

				data.forEach(function(d){
					d.max = d3.max(d.questionValues, function(dd){ return Number(dd.max)});
					d.min = d3.min(d.questionValues, function(dd){ return Number(dd.min)});
				}); // calculate max and min for each question


				// array of names for buttons
 				var btnKeys = unik(qData.map(function(d) { return d.answer; }));

				// calculate values for axis
				var minMaxDate = d3.extent(rawData, function(d) { return Date.parse(d.date); });

				var minV = d3.min(qData, function(d) { return +d.value; }),
						minM = d3.min(qData, function(d) { return +d.valueM; }),
						minF = d3.min(qData, function(d) { return +d.valueF; });	
				var maxV = d3.max(qData, function(d) { return +d.value; }),
						maxM = d3.max(qData, function(d) { return +d.valueM; }),
						maxF = d3.max(qData, function(d) { return +d.valueF; });	

				var minArray = [minV, minM, minF];
				var maxArray = [maxV, maxM, maxF];

				var yMinMaxBuilder = [];
				yMinMaxBuilder = [d3.min(minArray), d3.max(maxArray)];
				yMinMaxBuilder[0] = yMinMaxBuilder[0] >=0 ? 0 : yMinMaxBuilder[0];

				

				// == colours ==============================================================================
				
				// function to sort rawData by rank
				function average(arr) {
				    var sums = {}, counts = {}, results = [], answer;
				    for (var i = 0; i < arr.length; i++) {  // for each object in the array
				        answer = arr[i].answer;  // get the answer
				        if (!(answer in sums)) { // if the answer is not yet in the variable sums (this step removes duplicates - a good guess)
				            sums[answer] = 0; // in the 'sums' object set the value of the answer key to 0 
				            counts[answer] = 0; // in the 'counts' object set the value of the answer key to 0 
				        }
				        sums[answer] += Number(arr[i].rank); // add the rank to the 'sums' object answer-key
				        counts[answer]++; // add the number of ranks to the 'counts' object answer key
							}
							for(answer in sums) { // for each unique answer in the 'sums'-object
				        results.push({ answer: answer, rank: sums[answer] / counts[answer] }); 
								// create an object with key answer holding the answer and key rank dividing 
								// this answers' sum by this answers' count and push it into the array
				    }
				    return results; // return the array
				}

				// create sorted array of unique values
				var sorted = average(rawData);
				sorted = sorted.sort(function(a,b){ return b.rank - a.rank; });
				sorted = sorted.map(function(m){ return spaceLess(m.answer); }) // spaceLess() added in v22 for showBrandsAtStart()

				// create sorted arrays for button keys
				var buttonList = unik(qData.map(function(d) { return d.answer; }));
				buttonList = buttonList.sort();

				// colour function
				var colors = d3.scale.category10()
					.domain(sorted);

				// var colors = d3.scale.ordinal()
				// 	.domain(sorted)
				// 	.range(colorbrewer.Dark2[8]);


				// == vis dimensions and axes ==============================================================

				// measures for svg
				var width = document.getElementById('wrapperContent').clientWidth / 2;
				var height = width * .55; // height/width aspect-ratio as determined in css of pseudo-elements padding-top
				var margin = { top: height * 0.2, right: width * 0.15, bottom: height * 0.11,left: width * 0.085 };

				// scale ranges
				var x = d3.time.scale()
					.range([margin.left, width - margin.right])
					.domain(minMaxDate);
					
				var y = d3.scale.linear()
					.range([height - margin.bottom, margin.top])
					.domain(yMinMaxBuilder);


				// x and y axis
				var xAxis = d3.svg.axis()
					.scale(x)
					.orient('bottom')
					.tickFormat(d3.time.format('%Y'))
					.tickSize(4)
					.tickPadding(10);

				var yAxis = d3.svg.axis()
					.scale(y)
					.orient('left').ticks(5).tickSize(5).tickPadding(10)
					.tickFormat(function(d){
						var prefix = d3.formatPrefix(d);
						return prefix.scale(d) + prefix.symbol;
					});
			

				// == path generators ========================================================================

				// path generators
				var line = d3.svg.line()
					.defined(function(d) { return !isNaN(d.value); })
					.x(function(d) { return x(Date.parse(d.date)); })
					.y(function(d) { return y(+d.value); })
					.interpolate('linear');
		
				var lineMen = d3.svg.line()
					.defined(function(d) { return !isNaN(d.value); })
					.x(function(d) { return x(Date.parse(d.date)); })
					.y(function(d) { return y(+d.valueM); })
					.interpolate('linear');

				var lineWomen = d3.svg.line()
					.defined(function(d) { return !isNaN(d.value); })
					.x(function(d) { return x(Date.parse(d.date)); })
					.y(function(d) { return y(+d.valueF); })
					.interpolate('linear');
					

				// target maps (saves text)
				var dataObj = {};

				var pathGen = {
					All: line,
					Men: lineMen,
					Women: lineWomen
				};
				
				// ! add new targets in pathGen

			
				// == draw vis by perspective ======================================================================
			
				// button controls
				switch(perspective) {

					case 'Lines': lines();
						break;

					case 'Bars': bars();
						break;

					case 'Tables': tables();
						break;

					default:
						console.error('perspective button on fire');
				
				}


				// wrapper draw functions
				function lines() {
					// d3.selectAll('li.zoom').style('display', 'inherit'); // zoom attention: can be re-activated when needed
					drawLines();
				}

				function bars() {
					// d3.selectAll('li.zoom').style('display', 'inherit'); // zoom
					drawBars();
				}

				function tables() {
					// d3.selectAll('li.zoom').style('display', 'none'); // zoom
					drawTables();
				}
			
				function drawLines() {
			
					// switch filter section CSS back on (in case user comes from table vis, which switches these conditions off)
					setFilterSectionCSS();
			
					d3.select('#right .boxContent').remove();
					d3.selectAll('.btn').remove();
					d3.selectAll('.legend').remove();
			

					// switch on scrolling only when there's a graph and not when there's a table
					filtersR.classed('containerFiltersHidden', false);
					filtersR.classed('containerFilters', true);

			
					// add container
					var container = d3.select('.contentInner#right')
						.selectAll('.containerInner')
						.data(data)
						.enter()
						.append('div')
						.attr('class', 'boxContent graph box')
						.append('div')
						.attr('class', 'containerContent contain')
						.attr('id', function(d) { return 'outer_' + spaceLess(d.question); });
						
					d3.select('.contentInner#right')
						.style('position','fixed')
						.style('left', width + 'px');
						
			// --- filters ----------------------------------------------------------------------------------
					
					// add answer buttons
					var answerBtns = filtersR.selectAll('.buttons')
						.data(buttonList)
						.enter()
						.append('button')
						.html(function(d) { return d; })
						.attr('class', 'btn')
						.attr('id', function(d) { return 'btn_' + spaceLess(d); });


					// add remove focus button
					var removeFocusBtn = filtersR.append('button')
						.attr('class', 'btn extra focus')
						.html('Remove all focus');
		
					// add toggle numbers button
					var toggleNumbersBtn = filtersR.append('button')
						.attr('class', 'btn extra numbers')
						.html('Toggle numbers');

					var rand = Math.floor(Math.random()*qData.length);
					var genderBouncer = isNaN(+qData[rand].valueM) ? false : true;

					if(genderBouncer) {
						// add gender-split button
						var splitGenderBtn = filtersR.append('button')
							.attr('class', 'btn extra gender')
							.html('Split Gender');
					}



					// interactivity buttons
					answerBtns.on('mouseover', answerBtnHover);
			
					answerBtns.on('mousedown', answerBtnLock);
			
					answerBtns.on('mouseout', answerBtnHoverOut);
			
					removeFocusBtn.on('mousedown', removeBtnDown);
				
					toggleNumbersBtn.on('mousedown', toggleNumbersBtnDown);

					if(genderBouncer) {
						splitGenderBtn.on('mousedown', splitGenderBtnDown);
					}
					


			// --- graph ------------------------------------------------------------------------------------
				
					// svg (incl. viewBox for responsiveness)
					var svg = container.append('svg')
						.attr('width', '100%')
						.attr('height', '100%')
						.attr('viewBox', '0 0 ' + width + ' ' + height)
						.attr('preserveAspectRatio', 'xMinYMin')
						.attr('class','question')
						.attr('id', function(d, i) { return spaceLess(d.question); });

					var min = d3.min(minArray); 
					
					if(min < 0) {

						svg.append('g')
						  .attr('class', 'x axis zero ')
							.attr('transform', 'translate( 0, ' + y(0) + ' )')
						.call(xAxis.tickSize(4).tickFormat('')); // zero line main axis

						svg.append('g')
						  .attr('class', 'x axis zerolabels')
							.attr('transform', 'translate( 0, ' + (height-margin.bottom) + ' )')
							.style('stroke-width', 0)
						  .call(xAxis.tickSize(0).tickFormat(d3.time.format('%Y'))); // bottom oriented axis only to show for labels

					} else {

						svg.append('g')
						  .attr('class', 'x axis')
							.attr('transform', 'translate( 0, ' + (height-margin.bottom) + ' )')
						.call(xAxis.tickSize(4).tickFormat(d3.time.format('%Y'))); // normal x axis for values < 0

					} // condition x axis on existance of positive or negative values


					svg.append('g')
					  .attr('class', 'y axis')
						.attr('transform', 'translate( ' + margin.left + ', 0 )')
						.call(yAxis);

					// add clip-path details
					svg.append('defs').append('clipPath')
				    .attr('id', 'clip')
						.append('rect')
				    .attr('width', width-margin.right-margin.left)
				    .attr('height', height-margin.bottom) // allowed to use all margin.top space for higher percentages
						.attr('transform', 'translate(' + margin.left + ', 0)'); // see above
					
					// append title
					var graphHeader = svg.append('text')
						.attr('class', 'graphHeader')
						.attr('transform', 'translate(' + (margin.left + (width - margin.right)) / 2 + ',' + (height * .1) + ')')
						.text(function(d) { return d.question; }); // needs to be .text not .html to be displayed in Safari

					// append question text
					var questionText = container.append('div')
						.attr('class', 'qt')
						.attr('id', function(d) { return d3.select(this.parentNode).attr('id').split('_')[1]; })
						.style('top', -height * .94 + 'px')
						.style('display','none')
						.html(function(d) { return getText(d); });

					// switch question Text on off
					d3.selectAll('.graphHeader').on('mousedown', function() {
						var qtId = d3.select(this.parentNode.parentNode).attr('id').split('_')[1];
						d3.selectAll('.qt#' + qtId).style('display', function() {
							return d3.select(this).style('display') == 'none' ? 'inherit' : 'none';
						})
					});


// -----------------------------------------------------------------------------------------------------------
				
				
					// add chart g
					var chart = svg.selectAll('.chart') // define on higher scope level for toggleTopAnswer interactivity
						.data(function(d) { return d.questionValues; }, rankKey)
						.enter()
						.append('g')
						.attr('class', 'chart')
						.attr('id', function(d) { return spaceLess(d.answer); })
						.style('display', 'inherit');

					if(genderBouncer) {
						// add lines Men (drawn before line main to remain in background)
						var answerLines = chart.append('path')
							.attr('class', function(d) { return 'line main gender men ' + spaceLess(d.answer); })
							.attr('d', function(d) { return lineMen(d.answerValues); });

						// add lines Women (drawn before line main to remain in background)
						var answerLines = chart.append('path')
							.attr('class', function(d) { return 'line main gender women ' + spaceLess(d.answer); })
							.attr('d', function(d) { return lineWomen(d.answerValues); });
					}
			

					// add lines
					var answerLines = chart.append('path')
						.attr('class', function(d) { return 'line main ' + spaceLess(d.answer); })
						.attr('d', function(d) { return line(d.answerValues); });
			
					// add hover helper lines 
					answerLinesHelp = chart.append('path')
						.attr('class', function(d) { return 'line hoverHelp ' + spaceLess(d.answer); })
						.attr('d', function(d) { return line(d.answerValues); });

					// add circles
					circles = chart.selectAll('circle')
						.data(function(d) { return d.answerValues; })
						.enter()
						.append('circle')
						.attr('class', function(d) { return 'line main ' + spaceLess(d.answer); })
						.attr('cx', function(d) { return x(Date.parse(d.date)); })
						.attr('cy', function(d) { return isNaN(d.value) ? 0 : y(d.value); })
						.attr('r', 0);

					// get number of time-series points
					var n = numberOfAnswerValues(data);
					
					// add text
					var text = chart.selectAll('text')
						.data(function(d, i) { return d.answerValues.slice(0, n-1); }) // don't return the last value
						.enter()
						.append('text')
						.attr('class', function(d) { return 'line main ' + spaceLess(d.answer); }) 
						.attr('x', function(d) { return x(Date.parse(d.date)); })
						.attr('y', function(d) { return isNaN(d.value) ? 0 : y(d.value) - 8; })
						.text(function(d) { return isNaN(d.value) ? null : pointFormat(d.value); })
						.style('fill-opacity', 0)
						.style('pointer-events', 'none');


					// add answer name to last series point
					var label = chart.selectAll('.last')
						.data(function(d) { return [d.answerValues[d.answerValues.length-1]]; })
						.enter()
						.append('text')
						.attr('class', function(d) { return 'last line main ' + spaceLess(d.answer); })
						.attr('x', function(d) { return x(Date.parse(d.date)) + 5 + 'px'; })
						.attr('y', function(d) { return isNaN(d.value) ? null : y(d.value) + 2 + 'px'; }) 
						.text(function(d) { return isNaN(d.value) ? null : pointFormat(d.value)  + ' ' + d.answer.slice(0,16); })
						.style('fill-opacity', 0)
						.style('pointer-events', 'none');


				// draw gender legend
				var legendGender = d3.select('div.contentInner#right')
						.append('div')
						.attr('class', 'legend')
						.attr('id', 'legendGender');
						
				var svgLGender = legendGender.append('svg')
						.attr('width', '100%')
						.attr('height', '100%');
						// svgLegendGender

				var legendEGender = svgLGender.append('g');
						// svgElementsGender
				
				legendEGender.append('text')
						.attr('class', 'legendGender')
						.attr('x', '45%')
						.attr('y', '90%')
						.style('text-anchor', 'middle')
						.text('men')
						.style('fill', 'steelblue')
						.style('font-size', width*.016 + 'px');

				legendEGender.append('text')
						.attr('class', 'legendGender')
						.attr('x', '55%')
						.attr('y', '90%')
						.style('text-anchor', 'middle')
						.text('women')
						.style('fill', 'tomato')
						.style('font-size', width*.016 + 'px');


				} // drawLines()
				
				function drawTables() {
	
					d3.select('#right .boxContent').remove();
					d3.selectAll('.btn').remove();
					d3.selectAll('.legend').remove();
					
						
					// function allows control over which target-values are being produced in the table

					var value = 'value'; // sets the target-value

					whichTable(value); // calls the function for the overall target value ()
				
					function whichTable(value){

						console.log(data);

						// add container
						var container = d3.select('.contentInner#right')
							.selectAll('.containerInner')
							.data(data)
							.enter()
							.append('div')
							.attr('class', 'boxContent graph box')
							.append('div')
							.attr('class', 'containerContent contain')
							.attr('id', function(d) { return 'outer_' + spaceLess(d.question); });
						
						d3.select('.contentInner#right')
							.style('position','fixed')
							.style('left', width + 'px');

						var tableHeader = container.append('h1')
							.attr('class', 'tableHeader')
							.html(function(d) { return d.question; });

						var containerInner = container.append('div')
							.attr('class', 'containerInnerBox')
							.append('div')
							.attr('class', 'containerInner')
							.attr('id', function(d) { return 'inner_' + spaceLess(d.question); });
						
						var xls = container.append('div')
							.attr('class', 'excelExport')
							.html('xls');
	
						var heatMapBtn = container.append('div')
							.attr('class', 'heatMapBtn')
							.attr('id', function(d) { return d.questionValues[0].answerValues[0].format; }) // id either 'absolute' or 'percent'
							.html('heat map');		

						// add label table
						var tableAns = containerInner
							.append('div')
							.attr('class','containerNumber')
							.append('table')
							.attr('class','answerCategories')
							.attr('id', function(d) { return spaceLess(d.question); });
		
						var headAns = tableAns.append('thead').append('tr').append('th')
							.html('Answers')
							.style('color', 'white');
	
						var rowsAns = tableAns.append('tbody').selectAll('tr')
							.data(function(d) { return d.questionValues; })
							.enter()
							.append('tr');
			
						var cellsAns = rowsAns.append('td')
							.html(function(d) { return d.answer }); 

						// add number table
						var tableNum = containerInner
							.append('div')
							.attr('class', 'containerNumber')
							.attr('id', function(d) {
								var ansCatTableID = spaceLess(d.question);
								return ansCatTableID;
							})
							.style('width', function(d) {
								var ansCatTableID = spaceLess(d.question);
								var ansCatTableWidth = Number(d3.select('.answerCategories#' + ansCatTableID).style('width').replace(/px/,''));
								var containerInnerWidth = Number(d3.select('.containerInner#inner_' + ansCatTableID).style('width').replace(/px/,''));
								var widthBouncer = containerInnerWidth > window.innerWidth/2; // explained in notes
								if (widthBouncer) {
									var containerNumberWidth = ((containerInnerWidth - ansCatTableWidth*2) / containerInnerWidth)*100;
								} else {
									var containerNumberWidth = ((containerInnerWidth - ansCatTableWidth) / containerInnerWidth)*100;
								}
								return containerNumberWidth + '%';
							})
							.append('table')
							.attr('class','numbers');

						var headNum = tableNum.append('thead').append('tr').selectAll('th')
							.data(function (d) { return d.questionValues[0].answerValues; })
							.enter()
							.append('th')
							.html(function(d) { return formatDate(d.date); });

						var rowsNum = tableNum.append('tbody').selectAll('tr')
							.data(function(d) { return d.questionValues; })
							.enter()
							.append('tr');	
	 
						var cellsNum = rowsNum.selectAll('td')
							.data(function(d) { return d.answerValues; })
							.enter()
							.append('td')
							.attr('class', 'cellsNum')
							.attr('id', function(d) {  return d.format; })
							.html(function(d) { return d[value] == 'NA' ? '-' : pointFormat(+d[value]) }); 


						function heatMapComponent(d,i) {
							var thisHere = d3.select(this);

							// get the min and max for this graph from the parental div holding all data 
							var q = thisHere.data()[0].question;
							q = spaceLess(q);
							
							var min = d3.select('div#outer_' + q).data()[0].min;
							var max = d3.select('div#outer_' + q).data()[0].max;

							heatMap.domain([min,max]); // set domain for each graph individually

							
							d3.select(this).style('background', function(d) { return heatMap(+d[value]); }); // apply heatmap
						
						} // heatMapComponent(), simple reusable component to set the colour domain individually per graph
					
						heatMapBtn.on('mousedown', function(d) {
							heatSwitch = 1 - heatSwitch;
							if (heatSwitch) {
								d3.selectAll('td.cellsNum').each(heatMapComponent);
							} else {
								d3.selectAll('td.cellsNum').style('background', null);
								rowsAns.style('background', null);
							}
						}); // heatMapBtn listener and handler


						xls.on('mousedown', function() {
							containerId = d3.select(this.parentNode).attr('id').replace('outer','export');
							buildExportTable(value);
							exportTable();
							// remove existing table elements before page reload (different to xls listener in navFunc())
							d3.selectAll('.containerExport').remove();
							tables();
						});
					
					} // which table() drawing the table
	
					// at last check for number of data sets and apply single column layout if necessary 
					// (needs to be after all accessed elements have been built)
					singleColumn();
	
					// -----------------------------------------------------------------------------------------------
					// download functions
		
					function buildExportTable(value) {
		
						data = data.filter(function(d) { return 'export_' + spaceLess(d.question) === containerId; });
				
						// add container div for Export Table
					 	var containerExp = d3.select('body').selectAll('.containerExp')
							.data(data)
							.enter()
							.append('div')
							.attr('class', 'containerExport')
							.attr('id', function(d) { return 'export_' + spaceLess(d.question); })
							.style('width', '700px') // unneccessary but might help with debugging
							.style('height', '300px') // unneccessary but might help with debugging
							.style('display', 'none');
				
						// add table
						var table = containerExp.append('table')
							.attr('id','exportTable')
							.attr('id', function(d) { return spaceLess(d.question); });
		
						var head = table.append('thead')
							.append('tr');

						var headLine = head.append('th')
							.html(function(d) { return d.question; });

						var headData = head.selectAll('.numbersHead') // unique placeholder name necessary here 
							.data(function (d) { return d.questionValues[0].answerValues; })
							.enter()
							.append('th')
							.attr('class', 'numbers')
							.html(function(d) { return formatDate(d.date); });

						var tableBody = table.append('tbody')
							.selectAll('tr')
							.data(function(d) { return d.questionValues; })
							.enter()
							.append('tr');

						var categories = tableBody.append('td')
							.html(function(d) { return d.answer; });

						var cell = tableBody.selectAll('.numbersBody') // unique placeholder name necessary here
							.data(function(d) { return d.answerValues; })
							.enter()
							.append('td')
							.attr('class', 'numbers')
							.html(function(d) { return d.value == 'NA' ? '-' : d.format == 'percent' ? round(+d[value]) + '%' : d3.round(+d[value],0) });
			
		
					}
	
					function exportTable(){

					  //getting values of current time for generating the file name
					  var dt = new Date();
					  var day = dt.getDate();
					  var month = dt.getMonth() + 1;
					  var year = dt.getFullYear();
					  var hour = dt.getHours();
					  var mins = dt.getMinutes();
					  var postfix = day + '.' + month + '.' + year + '_' + hour + '.' + mins;
					  //creating a temporary HTML link element (they support setting file names)
					  var a = document.createElement('a');
					  //getting data from our div that contains the HTML table
					  var data_type = 'data:application/vnd.ms-excel';
					  var table_div = document.getElementById(containerId);
						var table_html = table_div.outerHTML.replace(/ /g, '%20');
					  a.href = data_type + ', ' + table_html;
					  //setting the file name
					  a.download = 'export_' + postfix + '.xls';
					  //triggering the function
					  a.click();

					}
	
		
		
				} // drawTables()

				

// --- Interactivity -------------------------------------------------------------------------------------------------

				// some constants		
				var currentColor; // for tooltip
				var dur = 150;

				var splitGender = false,
						splitSegment = false,
						locked = false; // used in answerButtonHoverOut()

			
// -------------------------------------------------------------------------------------------

				listeners(answerLinesHelp);
				listeners(circles);

				// listener function
				function listeners(x){

					if(x !== undefined) {

						x.on('mouseover', function(d) {

							// set locked-bounce used for deInteractSplit[Target]() to decide what to do with the lines
							d3.selectAll('.locked').empty() ? locked = false : locked = true;
						
							svgId = d3.select(this.parentNode.parentNode).attr('id');
							gId = d3.select(this.parentNode).attr('id');
							aesClass = concatClassName(d3.select(this).attr('class')).replace('hoverHelp','main'); // aes = aesthetic object (can be path, rect, circle)
							elementType = d3.select(this)[0][0].nodeName;

							if (splitGender) {
								interactSplitGender(d);
							} else {
								splitGender = false;
								interact(d);
							}

						})

						.on('mousedown', function() {
							d3.selectAll('g#' + gId).classed('locked', d3.select(this.parentNode).classed('locked') ? false : true);

							d3.selectAll('#btn_' + gId).classed('locked', d3.selectAll('#btn_' + gId).classed('locked') ? false : true);

							if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == false){
								btnStateCurrent = 0; // no lock, no top answer
							} else if (d3.selectAll('#btn_' + gId).classed('locked')){
								btnStateCurrent = 1; // lock
							} else if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == true){
								btnStateCurrent = 2; // no lock but top answer
							} else {
								console.warn('error');
							}

							d3.selectAll('#btn_' + gId)
								.style('background-color', btnState[btnStateCurrent]['background-color'])
								.style('color', btnState[btnStateCurrent]['color']);

							// set locked-bounce used for deInteractSplit[target]() to decide what to do with the lines
							d3.selectAll('.locked').empty() ? locked = false : locked = true;


						})

						.on('mouseout', function() {

							tooltipAes.style('opacity', 0);

							if (d3.select(this.parentNode).classed('locked')) {
								null;
							} else if (splitGender) {
								deInteractSplitGender();
							} else {
								deInteract();
							}
						});
						
					} // for some reason chart builder triggers an undefined error on this listeners() function when we go directly to the data perspective. this little conditional wrapper solves it.
				}

				function interact(d) {
					// d passed in only for tooltipAes
	
					var line = d3.select('g#' + gId)[0][0];
					document.querySelector('svg#' + svgId).appendChild(line); // logic to bring chosen line forward. some issues unresolved - if important continue here

					// switch on hovered over line
					d3.selectAll('path.main.' + aesClass)
						.transition().duration(dur)
						.style('stroke', function(d) {
							currentColor = colors(spaceLess(d.answer)); 
							return currentColor;
						})
						.style('stroke-width', '2.5px');

					// switch off gender lines
					d3.selectAll('path.main.gender')
						.transition().duration(dur) // necessary trans() to counter the trans() just above
						.style('stroke-width', '0px');

					// switch off segment lines
					d3.selectAll('path.main.segment')
						.transition().duration(dur) // necessary trans() to counter the trans() just above
						.style('stroke-width', '0px');

					// ! add new target logic

					// switch on circles
					d3.selectAll('circle.' + aesClass)
						.transition().duration(dur)
						.attr('r', function(d) {
							if (isNaN(d.value)){
							 return 0; 
						 } else if (screenSize < 500) {
							 return 1;
						 } else {
							 return 2;
						 }
						}) // conditional circle size based on media query (smaller circles for mobile landscape and smaller)
						.style('fill', currentColor);

					// switch on last text element
					d3.selectAll('text.last.' + aesClass)
						.transition().duration(dur)
						.style('fill', currentColor)
						.style('fill-opacity', 1);

					d3.selectAll('rect.' + aesClass)
						.transition().duration(dur)
						.style('fill', function(d) {
							currentColor = colors(spaceLess(d.answer)); 
							return currentColor;
						});
		
					d3.selectAll('text.bar.' + aesClass)
						.transition().duration(dur + 30)
						.style('fill', currentColor)
						.style('fill-opacity', 1);

					// 3 nest-levels: (1) path vs non-path (circle) (2) percent vs absolute (3) target vs non-target
					tooltipAes.html(function(){
						if (elementType == 'path') {
							return d.answer;

						} else {

							if (d.format == 'percent'){

								if (target === 'Men') {
									return d.answer + ': ' + round(d.valueM) + '% </br>' + formatDate(d.date);

								} else if (target === 'Women') {
									return d.answer + ': ' + round(d.valueF) + '% </br>' + formatDate(d.date);

								} else {
									return d.answer + ': ' + round(d.value) + '% </br>' + formatDate(d.date);
								}

							} else if (d.format === 'absolute') {
								var val = d.value;
								if (val < 1000) {
									val = val;
								} else if (val < 1e+6) {
									val = thousandsPrep(val);
								} else if (val < 1e+9) {
									val = thousands(val) + 'k';
								} else {
									val = thousands(d3.round(val/1e+3,0)) + 'mil';
								}
								return d.answer + ': ' + val + '</br>' + formatDate(d.date);
							}
						}
					})
						.style('opacity', .9)
						.style('left', (d3.event.pageX) + 'px')
						.style('top', (d3.event.pageY + 10) + 'px')
						.style('color', elementType == 'rect' ? '#777' : currentColor);

				}
	
				function deInteract() {

					// switch back selected paths
					d3.selectAll('path.main.' + aesClass)
						.transition().duration(dur)
						.style({'stroke': '#ccc', 'stroke-width':'1.5px'});

					// switch off all gender paths
					d3.selectAll('path.main.gender')
						.transition().duration(dur)
						.style('stroke-width', '0px');
						
					// switch off all gender paths
					d3.selectAll('path.main.segment')
						.transition().duration(dur)
						.style('stroke-width', '0px');
						
					// ! add target logic

					d3.selectAll('circle.' + aesClass)
						.transition().duration(dur)
						.attr('r', 0);

					if(elementType == 'path' | elementType == 'circle' | elementType == 'BUTTON') {

						d3.selectAll('text.' + aesClass)
							.transition().duration(dur)
							.style('fill-opacity', 0);

					} else if (elementType == 'rect') {

						d3.selectAll('text.axisLabel.' + gId)
							.transition().duration(dur)
							.style('fill', '#000');
						d3.selectAll('text.barLabel.' + gId)
							.transition().duration(dur)
							.style('fill-opacity', 0);

					} 

					d3.selectAll('rect.' + aesClass)
						.transition().duration(dur)
						.style('fill', 'steelblue');
				}

				function interactSplitGender(d) {
				// d passed in only for tooltipAes

					// switch off all lines
					d3.selectAll('path.main')
						.transition().duration(dur)
						.style('stroke-width', '0px');

					// switch back on all locked lines
					d3.selectAll('g.locked').selectAll('path.main:not(.segment)')
						.transition().duration(dur)
						.style('stroke-width', '2.5px');
						
					// ! add new target logic

					// switch on the gender lines 
					d3.selectAll('path.main.gender.' + aesClass)
						.transition().duration(dur)
						.style('stroke-width', '2.5px');

					d3.selectAll('path.main.men.' + aesClass)
						.style('stroke', 'steelblue');

					d3.selectAll('path.main.women.' + aesClass)
						.style('stroke', 'tomato');

					// switch on the hovered line only but not the target class
					d3.selectAll('path.main.' + aesClass + ':not(.segment)')
						.transition().duration(dur)
						.style('stroke-width', '2.5px');
						
					// ! add new target logic

					// switch on the circles
					d3.selectAll('circle.' + aesClass)
						.transition().duration(dur)
						.attr('r', function(d) {
							if (isNaN(d.value)){
							 return 0; 
						 } else if (screenSize < 500) {
							 return 1.8;
						 } else {
							 return 2.8;
						 }
						}) // conditional circle size based on media query (smaller circles for mobile landscape and smaller)
						.style('stroke', 'white')
						.style('fill', '#ccc');

					// switch on the text
					d3.selectAll('text.last.' + aesClass)
						.transition().duration(dur)
						.style('fill', '#999')
						.style('fill-opacity', 1);
						
					// switch on the tootltip
					tooltipAes.html(function(){
						if (elementType == 'path') {
							return d.answer;

						} else {

							if (d.format == 'percent' && svgId != 'SVODexclTVE'){
									return d.answer + ': ' + round(d.value) + '% </br>' + formatDate(d.date);

							} else if (d.format == 'absolute' && svgId != 'SVODexclTVE') {
									return d.answer + ': ' + thousands(d.value) + 'k</br>' + formatDate(d.date);

							} else if (d.format == 'percent' && svgId == 'SVODexclTVE'){
									return d.answer + ': ' + round(d.valueO) + '% </br>' + formatDate(d.date);

							} else if (d.format == 'absolute' && svgId == 'SVODexclTVE') {
									return d.answer + ': ' + thousands(d.valueO) + 'k</br>' + formatDate(d.date);
							}

						}
					})
						.style('opacity', .9)
						.style('left', (d3.event.pageX) + 'px')
						.style('top', (d3.event.pageY + 10) + 'px')
						.style('color', '#777');

				}

				function deInteractSplitGender() {
			
					if (!locked){

						// switch back all lines
						d3.selectAll('path.main')
							.transition().duration(dur)
							.style('stroke-width', '1.5px');

						// switch off the gender lines 
						d3.selectAll('path.main.gender')
							.transition().duration(dur)
							.style('stroke-width', '0px');

						// switch off the segment lines 
						d3.selectAll('path.main.segment')
							.transition().duration(dur)
							.style('stroke-width', '0px');
							
						// ! add new target

					} else if (locked) {

						// switch back all lines
						d3.selectAll('path.main.' + aesClass)
							.transition().duration(dur)
							.style('stroke-width', '0px');

						// switch off the gender lines 
						d3.selectAll('path.main.gender.' + aesClass)
							.transition().duration(dur)
							.style('stroke-width', '0px');

						// switch off the gender lines 
						d3.selectAll('path.main.segment.' + aesClass)
							.transition().duration(dur)
							.style('stroke-width', '0px');
							
						// ! add new target

					}

					// switch off the circles
					d3.selectAll('circle.' + aesClass)
						.transition().duration(dur)
						.attr('r', 0);


					if(elementType == 'path' | elementType == 'circle' | elementType == 'BUTTON') {

						d3.selectAll('text.' + aesClass)
							.transition().duration(dur)
							.style('fill-opacity', 0);

					} else if (elementType == 'rect') {

						d3.selectAll('text.axisLabel.' + gId)
							.transition().duration(dur)
							.style('fill', '#000');
						d3.selectAll('text.barLabel.' + gId)
							.transition().duration(dur)
							.style('fill-opacity', 0);

					} 

				}


		
				// button interactivity
				function answerBtnHover(d) {
					gId = spaceLess(d);
					aesClass = spaceLess(d); // removed 'line. +' (see version 14 for example) as it works without
					elementType = d3.select(this)[0][0].nodeName;

					if (splitGender) {
						splitSegment = false;
						interactSplitGender(d);
					} else if (splitSegment) {
						splitGender = false;
						interactSplitSegment(d);
					} else {
						splitGender = false;
						splitSegment = false;
						interact(d);
					}


					tooltipAes.style('opacity',0);
					
					// add new target logic
				}

				function answerBtnLock() {

					d3.selectAll('g#' + gId).classed('locked', d3.selectAll('g#' + gId).classed('locked') ? false : true);
					d3.selectAll('#btn_' + gId).classed('locked', d3.selectAll('#btn_' + gId).classed('locked') ? false : true);
					// determine button state
					if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == false){
						btnStateCurrent = 0; // no lock, no top answer
					} else if (d3.selectAll('#btn_' + gId).classed('locked')){
						btnStateCurrent = 1; // lock
					} else if (d3.selectAll('#btn_' + gId).classed('locked') == false && d3.select('#btn_' + gId).classed('topAnswer') == true){
						btnStateCurrent = 2; // no lock but top answer
					} else {
						console.log('error');
					}
					// apply button state format
					d3.selectAll('#btn_' + gId)
						.style('background-color', btnState[btnStateCurrent]['background-color'])
						.style('color', btnState[btnStateCurrent]['color']);

					// set locked-bounce used for deInteractSplitGender() to decide what to do with the lines
					// also set in listeners()
					d3.selectAll('.locked').empty() ? locked = false : locked = true;

			  }

				function answerBtnHoverOut() {

					// set locked-bounce used for deInteractSplit[target]() to decide what to do with the lines
					d3.selectAll('.locked').empty() ? locked = false : locked = true;

					tooltipAes.style('opacity', 0);
										
					if (d3.select(this).classed('locked')) {
						null;
					} else if (splitGender) {
						deInteractSplitGender();
						byeText();
					} else if (splitSegment) {
						deInteractSplitSegment();
						byeText();
					} else {
						deInteract();
						byeText();
					}
				
					// ! add new target logic
				
				
					function byeText(){
						d3.selectAll('text.axisLabel.' + gId)
							.transition().duration(dur)
							.style('fill', '#000'); 
						d3.selectAll('text.barLabel.' + gId)
							.transition().duration(dur)
							.style('fill-opacity', 0); // necessary as deInteract doesn't change text back as the hovered element is not a 'rect'
					}

				}
	
				function removeBtnDown() {
					d3.selectAll('.locked').classed('locked', false);
					
					locked ? !locked : locked; 

					d3.selectAll('.btn:not(.extra)')
						.style('background-color', '#e6e6e6')
						.style('color', '#000');

					d3.selectAll('path.main')
						.transition().duration(dur)
						.style({'stroke': '#ccc', 'stroke-width':'1.5px'});

					d3.selectAll('path.main.gender')
						.transition().duration(dur)
						.style('stroke-width', '0px');

					d3.selectAll('path.main.segment')
						.transition().duration(dur)
						.style('stroke-width', '0px');

					// ! add new target logic 
						
					d3.selectAll('circle.line')
						.transition().duration(dur)
						.attr('r', 0);

					d3.selectAll('text.line')
						.transition().duration(dur)
						.style('fill-opacity', 0);

					d3.selectAll('rect.bar')
						.transition().duration(dur)
						.style('fill', 'steelblue');

					d3.selectAll('text.axisLabel')
						.transition().duration(dur)
						.style('fill', '#000');

					d3.selectAll('text.barLabel')
						.transition().duration(dur)
						.style('fill-opacity', 0);
		
				}

				function toggleNumbersBtnDown() {
							
					d3.selectAll('g.locked').selectAll('text:not(.last)')
						.transition()
						.duration(500)
						.style('fill', splitGender ? '#999' : function(d, i){ return colors(spaceLess(d.answer)); })
						.style('fill-opacity', function() { return d3.select('g.locked').select('text:not(.last)').style('fill-opacity') == 0 ? 1 : 0; });

				}

				function splitGenderBtnDown() {

					removeBtnDown();
				 	splitGender = !splitGender;
				 	splitGender ? d3.select(this).html('Unsplit Gender') : d3.select(this).html('Split Gender');
					d3.select('div#legendGender').style('display', splitGender ? 'inherit' : 'none');

					splitSegment = false;
					d3.selectAll('.btn.segment').html('Split Segment');
					d3.select('div#legendSegment').style('display', 'none');

					// ! add new target logic
					
				}


// -------------------------------------------------------------------------------------------
				
		 	} // draw()
		
		 
			// listener
			d3.selectAll('.questions').on('mousedown', draw);
		
			// add tooltip for the aesthetic objects (lines, bars)
			d3.selectAll('.tooltip#aes').remove(); // remove any previous 
			var tooltipAes = d3.select('body').append('div')
			    .attr('class', 'tooltip')
			    .attr('id', 'aes')
			    .style('opacity', 0);
			
			
	// --- tooltip transition ------------------------------------------------------------------------------------

			// add tooltip
			var tooltipExplain = d3.select('body').append('div')
		    .attr('class', 'tooltip')
		    .attr('id', 'explain')
				.style('opacity', 0)
				.style('z-index', 10);
		
			// explanation text for dashboard
			var explainBuilder = "<span style='font-size:14px'>Chart Builder</span> </br></br> \
				Select a metric to the left to be graphed on the right. </br></br> \
				Focus on the country by hovering over the line or button. </br> \
				Use the gender buttons to see the gender-splits per country </br> \
				(Life expectancy, Survival to age 65 and Mortality rates, adult)";
			
			// event listeners and handlers
			d3.select('li.explanation')
				.on('mouseover', function() {
					tooltipExplain.html(explainBuilder)
						.style('opacity', .9)
						.style('right', '2.48%')
						.style('top', '4.5em');
				})
				.on('mouseout', function() {
					tooltipExplain.transition().duration(1000).style('opacity', 0);
				});
			
			
			singleColumn();

		}); // d3.csv()


		
		
		function singleColumn() {
			if (dataBouncer == 0) {
				d3.selectAll('.inside').style('width', '50%'); // normal setting for 2-column layout
				d3.selectAll('.box').style('width', '100%').style('float', 'none');  // normal setting for 2-column layout
				d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', false); // removes potential class with shorter top-padding to the :before element
			} else if (dataBouncer == 1) {
				d3.selectAll('.inside#left').style('width', '100%'); // left column gets full width
				d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left'); // all boxes (i.e. graphs) get half the width unless when viewed on mobile (needs to be tested!)
				d3.selectAll('.inside#right').selectAll('*').remove(); // remove all children of the right inside wrapper = remove all right .box-elements
				d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
				d3.selectAll('.boxFilters').style('width', '100%'); // the box for the filters and the context need a width of 100%
				// d3.selectAll('.boxFilters')[0][1].remove();
				d3.selectAll('.boxContext').classed('boxContextSingleCol', true); // add class to apply a shorter top-padding to the :before element (it doesn't seem necessary to remove the original class)
				d3.selectAll('.boxContext').style('width', '100%'); // the box for the filters and the context need a width of 100%
			} else if (dataBouncer == 2) {
				d3.selectAll('.inside#right').style('width', '100%'); // all as above
				d3.selectAll('.box').style('width', function()  { return screenSize < 500 ? '100%' : '50%' }).style('float', 'left');
				d3.selectAll('.inside#left').selectAll('*').remove();
				d3.selectAll('.boxFilters').classed('boxFiltersSingleCol', true);
				d3.selectAll('.boxFilters').style('width', '100%');
				d3.selectAll('.boxContext').classed('boxContextSingleCol', true);
				d3.selectAll('.boxContext').style('width', '100%');
			} else {
				console.log('dataBouncer on fire')
			}
		}
		
		
	} // builder(); chart builder function



} // god() namespace


