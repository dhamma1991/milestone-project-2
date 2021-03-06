// Declare cloud9 global variables to prevent cloud9 warnings
/*global $*/
/*global crossfilter*/
/*global queue*/
/*global d3*/
/*global dc*/

/* QUEUE */
queue()
    .defer(d3.json, "assets/data/data.json") // Fetch the data
    .await(makeGraph); // Call makeGraph when the data is ready 

/* Global Color Variables */
var generalColor = "#0b9c00",
    carsPetrolColor = "#9dc183",
    carsDieselColor = "#708238",
    lgvPetrolColor = "#c7ea46",
    lgvDieselColor = "#3f704d",
    hgvColor = "#00A86B",
    busesAndCoachesColor = "#8F9779",
    motorcyclesColor = "#4F7942",
    mopedsColor = "#29AB87",
    lpgColor = "#A9BA9D";
/* /Global Color Variables */
    
/* Global Selector Vars */
// Declare outside of main function for use in resetSelects()
var sourceSelectMenu;
var yearSelectMenu;
/* /Global Selector Vars */

// defaultText is global as it is called both within makeGraph() as well as in resetSelects()
function defaultText(sourceSelect, periodSelect) { // Two arguments used here to make it easier to add more if additional select boxes were ever added
    if (sourceSelect) { // Default text for total emissions over time section
        $('#show-source-span').html("There was a total of ");
        $('#accounted').html("");
        $('#percentage-p').css('visibility', 'hidden');
    } else if (periodSelect) { // Default text for total emissions by type of vehicle section
        $('#period-span').html(" throughout the whole period");
    }
}

/* DATA VISUALISATION FUNCTION */
function makeGraph(error, ggData) {
    if (error) throw error;
    
    var ndx = crossfilter(ggData); // Load the data into a crossfilter
    
    /* Dimensions */
    var sourceDim = ndx.dimension(dc.pluck("Source")),
        yearDim = ndx.dimension(dc.pluck("Year"));
    /* /Dimensions */
    
    /* Groups */
    var totalEmissionsPerSourceGroup = sourceDim.group().reduceSum(dc.pluck("Emissions")),
        
        totalEmissionsPerYearGroup = yearDim.group().reduceSum(dc.pluck("Emissions")),
        totalEmissionsPerYearGroupSum = yearDim.groupAll().reduceSum(dc.pluck("Emissions")),
        
        sumEmissions = sourceDim.groupAll().reduceSum(dc.pluck("Emissions")),
        sumEmissionsValue = sumEmissions.value(),
        
        countYears = yearDim.group().reduceCount().size();
        
    /* Source Groups */
    var totalEmissionsCarPetrolGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "Cars - Petrol") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsCarDieselGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "Cars - Diesel") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsLgvPetrolGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "LGV - Petrol") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsLGVDieselGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "LGV - Diesel") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsBusAndCoachGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "Buses and Coaches") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsHgvGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "HGV") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsMotorcyclesGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "Motorcycles - >50cc") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsMopedsGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "Mopeds - <50cc") {
                return d.Emissions;
            } else {
                return 0;
            }
        }),
        totalEmissionsLPGGroup = yearDim.group().reduceSum(function(d) {
            if (d.Source === "All LPG Vehicles") {
                return d.Emissions;
            } else {
                return 0;
            }
        });
    /* /Source Groups */
    /* /Groups */
    
    /* Axes */
    // Explicitly map the domain in order to get custom tick layout for x axis on some charts
    var domain = ggData.map(function(d) {
        return d.Year;
    }),
        ticks = domain.filter(function(v, i) {
        /* Without the while loop, the years are returned several times over. 
            I only want them returned once, hence the size of the countYears var is used as a reference */
        while (i < countYears) {
            return i % 2 === 0;
        }
    });
    /* /Axes */
    
    /* FUNCTION CALLS */
    totalEmissionsFigure(ndx); // Render total emissions throughout the period
    highlightsFigure(ndx, sumEmissions, true); // Render average emissions over the period
    
    /* This highlightsFigure call does not currently work as intended and has been replaced with a hard coded value 
        More info about this can be found in the readme */
    //  highlightsFigure(ndx, totalEmissionsPerYearGroup); // Render the most polluting year
    
    showSourceSelector(ndx); // Render the vehicle selector box
    timeFigure(ndx); // Render the figure representing the emissions of selected vehicle types
    timeFigurePercentage(ndx); // Render the figure representing the emissions percentage of selected vehicle types
    
    totalEmissionsOverTime(ndx); // Render the line chart
    compositeChart(ndx); // Render the composite chart
    
    showYearSelector(ndx); // Render the year select box
    periodFigure(ndx); // Render the figure representing total emissions in selected years

    totalEmissionsPerSourcePie(ndx); // Render the pie chart
    totalEmissionsPerSource(ndx); // Render the bar chart

    dc.renderAll(); // Render all charts to page
    
    addForceCenter(); // Ensure charts are position correctly
    /* /FUNCTION CALLS */
    
    /* DEFINE FUNCTIONS */
    /* GENERAL FUNCTIONS */
    // Responsiveness function, this adds a degree of responsiveness to the charts and works alongside bootstrap's rows system
    function chartsResponsive(chartType, chartWidthSmall, chartWidthLarge, renderChart, chartLegend, legendXSmall, legendXLarge) {
        if ($(window).width() > 1180 && $(window).width() < 1433) { // If the browser window is within the target width range
            chartType
                .width(chartWidthSmall);
            if (renderChart == true) { // Chart render only has to be called when the window resize function is invoked, not when the page is loaded initially
                chartType.render();
            }
            if (chartLegend == true) { // Only some chart types need a legend
                chartType
                    .legend(dc.legend()
                        .x(legendXSmall)
                        .y(20)
                        .itemHeight(13)
                        .gap(5));
            }
        } else { // Else the chart width is able to be higher
            chartType
                .width(chartWidthLarge);
            if (renderChart == true) {
                chartType.render();
            }
            if (chartLegend == true) { // Only some chart types need a legend
                chartType
                    .legend(dc.legend()
                        .x(legendXLarge)
                        .y(20)
                        .itemHeight(13)
                        .gap(5));
            }
        }
        
        addForceCenter(); // Rerendering the chart removes the force center class, this has to be added back in
    }
    
    // This function helps totalEmissionsPerSource's x axis ticks be more legible
    function adjustXTicks() {
        // Move every 2nd tick text down slightly
        d3.selectAll("#total-emissions-per-source .x.axis .tick:nth-child(even) text")
            .style("transform", "translate(0,20px)");
            
        // Increase the length of every 2nd tick line
        d3.selectAll("#total-emissions-per-source .x.axis .tick:nth-child(even) line")
            .attr("y2", "20");
    }
    
    // Add a class used to center the charts in the viewport
    function addForceCenter() {
        d3.selectAll('svg')
            .attr('class', 'force-center');
    }
    /* /GENERAL FUNCTIONS */
    
    /* CHART RENDERING FUNCTIONS */
    // Render the total emissions figure
    function totalEmissionsFigure(ndx) {
        dc.numberDisplay("#total-emissions-figure")
            .group(sumEmissions)
            .formatNumber(d3.format("0,000"))
            .valueAccessor(function(d) {
                return d;
            });
    }
    
    /* Render the figures that reside in the Highlights section
        The figures are generated using dc numberDisplay. However, since I want the figures to remain static and not be changed via crossfilter, 
        the dc numberDisplay values are then rendered using jQuery */
    var averageGeneratedValue, topYearValue; // Declare the vars where generated values will live
    function highlightsFigure(ndx, group, averageValue) {
        dc.numberDisplay("null") // I don't actually want dc to render the value, hence I provide a dummy parent
            .group(group)
            .valueAccessor(function(d) {
                if (averageValue) { // If it is the average emissions per year value we want
                    averageGeneratedValue = d / countYears; // Generate a value and assign it to the variable  
                    $('#average-emissions-figure').html(averageGeneratedValue.toLocaleString("en", {maximumFractionDigits: 2})); // jQuery is used to print the value to the document.
                } else { // Else the desired value is the most polluting year
                    topYearValue = d.key;    
                    /* The jQuery here does not actually work as intended. A value is rendered to the page, but the value changes depending on the selection
                        the user makes in the source select box
                        This was noticed late in the development process, so a hardcoded value has been used in its stead
                        The call to highlightsFigure without the averageValue arg being passed in has been commented out, so
                        this else block is currently unreachable */ 
                    $('#top-year-figure').html(topYearValue.toLocaleString("en", {maximumFractionDigits: 2}));
                }
            });
    }    

    // Render the select menu to show data for a particular vehicle type
    function showSourceSelector(ndx) {
        sourceSelectMenu = dc.selectMenu('#source-selector');
        sourceSelectMenu
            .dimension(sourceDim)
            .group(totalEmissionsPerSourceGroup)
            .promptText("All Vehicles")
            .multiple(true)
            .title(function(d) {
                return d.key;
            });
    }
    
    // Render the figure that interacts with the emissions over time charts
    function timeFigure(ndx) {
        dc.numberDisplay("#show-time-figure")
            .group(totalEmissionsPerYearGroupSum)
            .formatNumber(d3.format("0,000"))
            .transitionDuration(0)
            .valueAccessor(function(d) {
                return d;
            });
    }
    
    // Render the figure that expresses emissions over time as a percentage of total emissions
    function timeFigurePercentage(ndx) {
        dc.numberDisplay("#show-time-figure-percentage")
            .group(totalEmissionsPerYearGroupSum)
            .formatNumber(d3.format(".2%"))
            .transitionDuration(0)
            .valueAccessor(function(d) {
                return d / sumEmissionsValue;
            });    
    }
    
    // Render the total emissions over time chart
    function totalEmissionsOverTime(ndx) {
        var lineChart = dc.lineChart("#total-emissions-over-time"); // Define the call to lineChart
            
        chartsResponsive(lineChart, 600, 700, false); // Make sure the chart is responsive
        
        lineChart
            .height(700)
            .margins({top:10, right:50, bottom: 40, left:60})
            .dimension(yearDim)
            .group(totalEmissionsPerYearGroup)
            .x(d3.scale.ordinal().domain(domain))
            .xUnits(dc.units.ordinal)
            .elasticY(true)
            .interpolate("basis")
            .renderArea(true)
            .renderHorizontalGridLines(true)
            .renderVerticalGridLines(true)
            .xAxisLabel("Year")
            .yAxisLabel("Emissions (kilotons)")
            .yAxisPadding("5")
            .dotRadius(10)
            .title(function(d) {
                // Format the number as thousands with comma separator
                return d.key + ": " + d.value.toLocaleString("en") + " kilotons";
            })
            .colorAccessor(d => d.key)
            .ordinalColors([generalColor]);
        
        /* Call the axes outside of the main chart initialization code as recommended 
            here https://stackoverflow.com/questions/40924437/skipping-overlapping-labels-on-x-axis-for-a-barchart-in-dc-js#40940081 */    
        lineChart
            .xAxis()
                .tickValues(ticks);
        lineChart
            .yAxis()
                .ticks([20]);

        // Add a degree of responsiveness to the chart to ensure charts remain responsive if the user resizes the window
        $(window).resize(function() {
            chartsResponsive(lineChart, 600, 700, true);
        });
    }
    
    // Render a composite chart showing all source's emissions over time
    function compositeChart(ndx) {
        // Function to give each line on the composite chart a title
        function lineTitle(sourceArg, dataArg) {
            return sourceArg + dataArg.key + ": " + dataArg.value.toLocaleString("en") + " kilotons";
        }
        
        var compositeChart = dc.compositeChart("#composite-chart"); // Define the call to compositeChart
            
        chartsResponsive(compositeChart, 600, 700, false, true, 400, 500);
        
        // Define the lines to go on the composite chart
        var carsPetrolLine =    dc.lineChart(compositeChart)
                                    .colors(carsPetrolColor)
                                    .group(totalEmissionsCarPetrolGroup, "Cars - Petrol")
                                    .title(function(d) {
                                        return lineTitle("Cars - Petrol, ", d);
                                    }),
            carsDieselLine =    dc.lineChart(compositeChart)
                                    .colors(carsDieselColor)
                                    .group(totalEmissionsCarDieselGroup, "Cars - Diesel")
                                    .title(function(d) {
                                        return lineTitle("Cars - Diesel, ", d);
                                    }),
            lgvPetrolLine =      dc.lineChart(compositeChart)
                                    .colors(lgvPetrolColor)
                                    .group(totalEmissionsLgvPetrolGroup, "LGV - Petrol")
                                    .title(function(d) {
                                        return lineTitle("LGV - Petrol, ", d);
                                    }),
            lgvDieselLine =     dc.lineChart(compositeChart)
                                    .colors(lgvDieselColor)
                                    .group(totalEmissionsLGVDieselGroup, "LGV - Diesel")
                                    .title(function(d) {
                                        return lineTitle("LGV - Diesel, ", d);
                                    }),
            hgvLine =           dc.lineChart(compositeChart)
                                    .colors(hgvColor)
                                    .group(totalEmissionsHgvGroup, "HGV")
                                    .title(function(d) {
                                        return lineTitle("HGV, ", d);
                                    }),
            busAndCoachLine =   dc.lineChart(compositeChart)
                                    .colors(busesAndCoachesColor)
                                    .group(totalEmissionsBusAndCoachGroup, "Buses and Coaches")
                                    .title(function(d) {
                                        return lineTitle("Buses and Coaches, ", d);
                                    }),
            motorcycleLine =    dc.lineChart(compositeChart)
                                    .colors(motorcyclesColor)
                                    .group(totalEmissionsMotorcyclesGroup, "Motorcycles - >50cc")
                                    .title(function(d) {
                                        return lineTitle("Motorcycles - >50cc, ", d);
                                    }),
            mopedLine =         dc.lineChart(compositeChart)
                                    .colors(mopedsColor)
                                    .group(totalEmissionsMopedsGroup, "Mopeds - <50cc")
                                    .title(function(d) {
                                        return lineTitle("Mopeds - <50cc, ", d);
                                    }),
            lpgLine =           dc.lineChart(compositeChart)
                                    .colors(lpgColor)
                                    .group(totalEmissionsLPGGroup, "All LPG Vehicles")
                                    .title(function(d) {
                                        return lineTitle("All LPG Vehicles, ", d);
                                    });

        compositeChart
            .height(700)
            .margins({top:10, right:60, bottom: 40, left:60})
            .dimension(yearDim)
            .group(totalEmissionsCarPetrolGroup) // It doesn't matter here which source group is used
            .x(d3.scale.ordinal())
            .xUnits(dc.units.ordinal)
            .renderHorizontalGridLines(true)
            .renderVerticalGridLines(true)
            .xAxisLabel("Year")
            .yAxisLabel("Emissions (kilotons)")
            .yAxisPadding("31")
            .elasticY(true)
            .brushOn(false)
            .shareTitle(false)
            .childOptions({
                dotRadius: 10  
            })
            .compose([carsPetrolLine, 
                      carsDieselLine,
                      lgvPetrolLine,
                      lgvDieselLine,
                      hgvLine,
                      busAndCoachLine,
                      motorcycleLine,
                      mopedLine,
                      lpgLine]);
                      
        /* Call the x axis outside of the main chart initialization code as recommended 
            here https://stackoverflow.com/questions/40924437/skipping-overlapping-labels-on-x-axis-for-a-barchart-in-dc-js#40940081 */  
        compositeChart
            .xAxis()
                .tickValues(ticks);
        compositeChart
            .yAxis()
                .ticks([20]);

        // Add a degree of responsiveness to the chart to ensure charts remain responsive if the user resizes the window
        $(window).resize(function() {
            chartsResponsive(compositeChart, 600, 700, true, true, 400, 500);
        });
    }
    
    // Render the select menu to show data for a particular year
    function showYearSelector(ndx) {
        yearSelectMenu = dc.selectMenu('#year-selector');
        yearSelectMenu
            .dimension(yearDim)
            .group(totalEmissionsPerYearGroup)
            .promptText("Whole Period")
            .multiple(true)
            .title(function(d) {
                return d.key;
            });
    }
    
    // Render the figure showing the amount of emissions within the period or for a given year
    function periodFigure(ndx) {
        dc.numberDisplay("#show-period-figure")
            .group(sumEmissions)
            .formatNumber(d3.format("0,000"))
            .transitionDuration(0)
            .valueAccessor(function(d) {
                return d;
            });    
    }
    
    // Render the pie chart breaking down emissions by source
    function totalEmissionsPerSourcePie(ndx) {
        
        var pieChart = dc.pieChart("#total-emissions-per-source-pie");

        chartsResponsive(pieChart, 500, 600, false);
        
        pieChart
            .height(700)
            .radius(275)
            .dimension(sourceDim)
            .group(totalEmissionsPerSourceGroup)
            .label(function(d) { // Hide the labels, rely on the legend to orientate the user
                return "";
            })
            .title(function(d) {
                // sumEmissions.value(), rather than the var sumEmissionsValue I defined above, must be used here or else it won't return the values I want
                // Format the title as the key + the value with commas separator + the percentage expressed by the pie chart's slice
                return d.key + ": " + d.value.toLocaleString("en") + " kilotons" + " | " + ((d.value / sumEmissions.value()) * 100).toFixed(2) + "%"; 
            })
            // The colors here go in order of highest to lowest value for the whole period
            .ordinalColors([carsPetrolColor, hgvColor, carsDieselColor, lgvDieselColor, busesAndCoachesColor, lgvPetrolColor, motorcyclesColor, lpgColor, mopedsColor])
            .legend(dc.legend()
                .itemHeight(13)
                .gap(2));

        /* Remove click functionality from chart, this has to be done both here and on the bar chart to 
            prevent clicks from rerendering the values that are displayed above the bar chart's bars */
        pieChart.on('pretransition', function(chart) {
            pieChart.selectAll('path,.dc-legend-item').on('click', null);
        });
        
        // Add a degree of responsiveness to the chart to ensure charts remain responsive if the user resizes the window
        $(window).resize(function() {
            pieChart
                .transitionDuration(0); // Remove transitionDuration before the chart has been resized
            chartsResponsive(pieChart, 500, 600, true);
            pieChart
                .transitionDuration(250); // Reset transitionDuration to default once the size changes have been applied
        });
    }
    
    // Render the bar chart breaking down emissions by source
    function totalEmissionsPerSource(ndx) {
        var barChart = dc.barChart("#total-emissions-per-source");
        
        chartsResponsive(barChart, 600, 700, false);
        
        barChart
            .height(700)
            .margins({top:10, right:60, bottom: 60, left:60})
            .dimension(sourceDim)
            .group(totalEmissionsPerSourceGroup)
            .x(d3.scale.ordinal())
            .xUnits(dc.units.ordinal)
            .elasticY(true)
            .xAxisLabel("Type of Vehicle")
            .yAxisLabel("Emissions (kilotons)")
            .yAxisPadding('5')
            .title(function(d) {
                return d.key + ": " + d.value.toLocaleString("en") + " kilotons";
            })
            .colorAccessor(d => d.key) /* Required to give each bar an individual color
                The ordinal data is ordered alphabetically, so colors are assigned in the same way
                Note: lpgColor is refering to "All LPG Vehicles", hence why it comes first */
            .ordinalColors([lpgColor, busesAndCoachesColor, carsDieselColor, carsPetrolColor, hgvColor, lgvDieselColor, lgvPetrolColor, mopedsColor, motorcyclesColor]);
 
        // Remove click functionality from chart, this conflicts with the values that are dislayed above the bars
        barChart.on('pretransition', function(chart) {
            barChart.selectAll('rect.bar').on('click', null);
        });
        
        // Show values on top of the bars
        barChart.on('renderlet', function(chart){
        
            var barsData = [];
            var bars = chart.selectAll('.bar').each(function(d) { barsData.push(d); });
            
            // Create group for labels 
            var gLabels = d3.select(bars[0][0].parentNode).append('g').attr('id','inline-labels');
        
            for (var i = bars[0].length - 1; i >= 0; i--) {
        
                var b = bars[0][i];
        
                gLabels
                    .append("text")
                    .text((barsData[i].data.value).toLocaleString('en'))
                    .attr('x', +b.getAttribute('x') + (b.getAttribute('width')/2) )
                    .attr('y', +b.getAttribute('y') + -10)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'black')
                    .style({'font-size': '0.7rem', 'font-style': 'italic'});
            }
        });
        
        // Remove values on top of bars when chart is being redrawn
        barChart.on('preRedraw', function(chart){
            chart.select('#inline-labels').remove();
        });
    
        $(window).resize(function() {
            barChart
                .transitionDuration(0); // Remove transitionDuration before the chart has been resized
            chartsResponsive(barChart, 600, 700, true);
            barChart
                .transitionDuration(250); // Reset transitionDuration to default once the size changes have been applied
            
            adjustXTicks(); // The x ticks must also be rerendered or else they revert to their default and unwanted position
        });
    }
    /* /CHART RENDERING FUNCTIONS */
    
    /* JQUERY */
    $(document).ready(function() { // jQuery works on the DOM with charts already rendered, this makes things either possible or easier
        var valueArray; // Declare the variable which the array of select options are contained in. The exact array depends upon the user's selection
        
        /* For the All Vehicles option which shows in the source select initially, hide the percentage information. 
            It doesn't make sense to show "That is 100% of emissions" */
        $('#percentage-p').css('visibility', 'hidden'); 
        
        adjustXTicks(); // This function, for the bar chart, must be called once the document is ready

        /* Select Change Function Call
            Needs to be invoked for both selection boxes */
        selectChange('#source-selector select', sourceSelectMenu);
        selectChange('#year-selector select', yearSelectMenu);
        
        function checkArray(valueArray) {
            /* This function checks to see if any of the select box option values are empty
                Since the only empty value is the default option, this function is essentially checking if 
                the default option is selected or not. */
            for (var i=0; i < valueArray.length; i++){ // Loop through the array
                if (valueArray[i] === "") // If the default option is selected   
                    return false;
            }
           return true;
        }
                
        function selectChange(targetDiv, targetMenu) {
            /* Main function for select box change. This function:
                1. Changes the selection-description text depending on what option(s) is selected in the select boxes
                2. Ensures charts always update when any select box is changed */
            $(targetDiv).change(function() { // When the select box the user clicks on changes
                /* These two vars tell the function which select box is currently being manipulated. 
                    Only one boolean var could be used here since there are only two types of select box in the current release of the app. 
                    However, doing it this way makes it easier to add more select boxes in the future */
                var sourceSelect = false,
                    periodSelect = false;
                
                /* sourceSelect will be true if the select box in the TOTAL EMISSIONS OVER TIME section is manipulated
                    periodSelect will be true if the select box in the TOTAL EMISSIONS BY TYPE OF VEHICLE is manipulated */
                if (targetDiv == '#source-selector select') {
                    sourceSelect = true;
                    
                } else if (targetDiv == '#year-selector select') {
                    periodSelect = true;
                }
                
                /* Fix required for Microsoft Edge browser only
                    If the user manipulates the first select box, the page will scroll to the second select box.
                    However, if the second select box is NOT on its default value and the user manipulates the first select box, the page won't scroll.
                    No issues occur if both select boxes are NOT set to their default values.
                    The page will also scroll to the first select box when the second select box is clicked after the user has clicked the 
                    reset button for the first select box.
                    Fix by force setting the page to scroll to the first select box when the select box is manipulated and vice versa. */
                if (document.documentMode || /Edge/.test(navigator.userAgent)) { // If the user's browser is Edge...
                    setTimeout(function () { // In order for this to work there needs to be a delay
                        if (sourceSelect) { // If the user has manipulated the first select box
                            document.getElementById('source-selector-container').scrollIntoView(); // Scroll that select box's container into view                    
                        } else if (periodSelect) { // Else if second select box
                            document.getElementById('year-selector-container').scrollIntoView(); // Scroll that select box's container into view   
                            }
                    }, 1);
                }
                
                if (sourceSelect) {
                    // I want to ensure that the paragraph with the percentage information is shown for all selection options bar 'All Vehicles'
                    $('#percentage-p').css('visibility', 'visible');
                }
                
                valueArray = $(targetDiv).val(); // Since the select boxes are multiple, they return an array. The array elements are composed of the user's selection

                if (checkArray(valueArray)) { // If no empty value is found (the empty value represents "All", since all other options have values)
                    var valueArrayLength = valueArray.length - 1; // Save valueArrayLength as a convenience var
                    
                    // For when there are 3 or more array items, I want them to print with commas separating them. This var is only used for the source selector section
                    var multiArray = valueArray.map(function(valueArray) {
                        return valueArray + ", ";
                    });
                    
                    if (sourceSelect) {
                        $('#accounted').html("accounted for"); // Add this string after the printed array so the sentence reads better
                    }
                    
                    // The below logic chain checks for how many select options are currently selected
                    if (valueArrayLength == 0) { // If the user has only selected one value
                        // Simply print the value they have selected
                        if (sourceSelect) { // For first two charts
                            $('#show-source-span').html(" " + valueArray); 
                        } else if (periodSelect) { // For last two charts
                           $('#period-span').html("in " + valueArray);
                        }
                    } else if (valueArrayLength == 1) { // Else if the user has selected 2 values
                        var andArray = valueArray.join(" and "); // Join the two elements and separate them with "and"
                        // And then print the joined array
                        if (sourceSelect) { // For first two charts
                            $('#show-source-span').html(andArray);
                        } else if (periodSelect) { // For last two charts
                            $('#period-span').html("in " + andArray);
                        }
                    } else if (valueArrayLength > 1) { // Else if there are more than 2 values selected
                            var lastItem = multiArray[valueArrayLength]; // Get the last item of the array
                            /*  Modify the last item of the array to have "and" before it, so that when the entire array is printed 
                                it reads like proper English. Remove the trailing ',' as it is unnecessary for the very last item */
                            multiArray[valueArrayLength] = " and " + lastItem.replace(/,/g, '');
                            if (sourceSelect) {
                                $('#show-source-span').html(multiArray); // Then print the array
                            } else if (periodSelect) {
                                var firstItem = multiArray[0]; // The first item here also needs changing
                                multiArray[0] = "in " + firstItem;
                                // Replace the last white space so that the last item is snug with the ending '.'
                                multiArray[valueArrayLength] = multiArray[valueArrayLength].replace(/ ([^ ]*)$/,'$1');
                                $('#period-span').html(multiArray);// Then print the array          
                            }
                    }
                } else { // Else the user has selected "All Vehicles" or "Whole Period"
                    /* It doesn't make sense for the user to be able to select all types along with individual types
                        So if the user tries to select the 'all' option along with separate types, only the 'all' option will be selected */
                    $(targetDiv).val("");
                    // Then draw graph to represent all data
                    targetMenu
                        .filterAll()
                        .redrawGroup();
                    if (sourceSelect) { 
                        defaultText(true);
                    } else if (periodSelect) {
                        defaultText(false, true);
                    }
                }
            });
        }
    });
    /* JQUERY */
}
/* /DATA VISUALISATION FUNCTION */

// Reset charts to default when user clicks the reset button
function resetSelects(select) { // The arg passed into the select parameter depends upon which reset button (of the 2) the user clicks
    // Reset the charts
    select.filterAll();
    
    select.redrawGroup(); // The reset button must redraw the charts
    
    // Reset to correct default text
    if (select == sourceSelectMenu) {
        defaultText(true);
    } else if (select == yearSelectMenu) {
        defaultText(false, true);
    }
}