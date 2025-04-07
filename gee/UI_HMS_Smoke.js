/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var maiac = ee.ImageCollection("MODIS/006/MCD19A2_GRANULES"),
    cams = ee.ImageCollection("ECMWF/CAMS/NRT");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// *****************************************************************
// =================================================================
// --------------------- HMS Smoke Explorer --------------------- ||
// =================================================================
// *****************************************************************
/*
// @author Tianjia Liu (embrslab@gmail.com)
// Last updated: April 7, 2025

// Purpose: visualize HMS smoke with MODIS active fires
// and aerosol optical depth
*/
// =================================================================
// **********************   --    Code    --   *********************
// =================================================================
// ================
// Load Packages
// ================
var baseMap = require('users/embrslab/packages:baseMap.js');
var colPal = require('users/embrslab/packages:colorPalette.js');

var projFolder = 'projects/GlobalFires/';

var sYear = 2005;
var eYear = 2024;
var nrtYear = eYear + 1;
var nrtEnd = '2025-04-06';

var region = ee.Geometry.Rectangle([-180,0,0,90],null,false);
maiac = maiac.filterBounds(region);

// filter HMS smoke
var smokeLabels = ['Light','Medium','Heavy'];
var colPal_smoke = ['#E7D516','#DAA520','#964B00'];

var applyHMScolor = function(hmsDay,hmsCat,hmsColor) {
  return hmsDay.filter(ee.Filter.eq('Density',hmsCat))
    .map(function(x) {return x.set('styleProperty', ee.Dictionary({'color': hmsColor}))});
};

var getHMS = function(year,month,day) {
  var hmsYr = ee.FeatureCollection(projFolder + 'HMS/Smoke_Polygons/HMS_' + year);
  
  var hmsDay = hmsYr.filter(ee.Filter.eq('Month',month))
    .filter(ee.Filter.eq('Day',day));
  
  var hmsDayLight = applyHMScolor(hmsDay,'Light',colPal_smoke[0]);
  var hmsDayMedium = applyHMScolor(hmsDay,'Medium',colPal_smoke[1]);
  var hmsDayHeavy = applyHMScolor(hmsDay,'Heavy',colPal_smoke[2]);
  
  return hmsDayLight.merge(hmsDayMedium).merge(hmsDayHeavy);
};

var getFire = function(year,month,day) {
  var hmsFireYr = ee.FeatureCollection(projFolder + 'HMS/Fire_Points/HMS_Fire_' + year);
  
  var hmsFireDay = hmsFireYr.filter(ee.Filter.eq('Month',month))
    .filter(ee.Filter.eq('Day',day));
  
  return hmsFireDay;
};

// filter MODIS AOD
var getAOD_MAIAC = function(year,month,day) {
  var inDate = ee.Date.fromYMD(year,month,day);
  
  var modisAODgranules = maiac.select('Optical_Depth_055')
    .filterDate(inDate,inDate.advance(1,'day'));
  
  var modisAODday = ee.Algorithms.If(modisAODgranules.size().gt(0),
    modisAODgranules.median().multiply(0.001),ee.Image(0).selfMask());
  
  return ee.Image(modisAODday);
};

// filter CAMS PM2.5
var pm25_ramp =
  '<RasterSymbolizer>' +
    '<ColorMap type="ramp" extended="false" >' +
      '<ColorMapEntry color="#FEFF54" quantity="35.4" label="Moderate" />' +
      '<ColorMapEntry color="#EF8532" quantity="55.4" label="Unhealthy for Sensitive Groups" />' +
      '<ColorMapEntry color="#EA3423" quantity="150.4" label="Unhealthy" />' +
      '<ColorMapEntry color="#8C1B4B" quantity="250.4" label="Very Unhealthy" />' +
      '<ColorMapEntry color="#741425" quantity="5000" label="Hazardous" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';

var camsBandsList = {
  'aod': 'total_aerosol_optical_depth_at_550nm_surface',
  'pm25': 'particulate_matter_d_less_than_25_um_surface'
};

var getCAMS = function(year,month,day,camsBand) {
  var inDate = ee.Date.fromYMD(year,month,day);
  
  var cams_day = cams.select(camsBandsList[camsBand])
    .filterDate(inDate,inDate.advance(1,'day'))
    .filter(ee.Filter.eq('model_initialization_hour',0));
  
  var cams_closestHr = ee.Number(cams_day.aggregate_min('model_forecast_hour'));
  
  var camsBand_day = ee.Algorithms.If(cams_day.size().gt(0),
    cams_day.filter(ee.Filter.gte('model_forecast_hour',cams_closestHr))
      .filter(ee.Filter.lt('model_forecast_hour',cams_closestHr.add(23)))
      .mean(),ee.Image(0).selfMask());
  
  return ee.Image(camsBand_day);
};

// define collections for GOES-East and GOES-West
var goesRGB_IDs = ee.Dictionary({
  'GOES-East': ee.List([ee.ImageCollection('NOAA/GOES/16/MCMIPF')]),
  'GOES-West': ee.List([ee.ImageCollection('NOAA/GOES/17/MCMIPF'),
    ee.ImageCollection('NOAA/GOES/18/MCMIPF')])
});

var goesFire_IDs = ee.Dictionary({
  'GOES-East': ee.List([ee.ImageCollection('NOAA/GOES/16/FDCF')]),
  'GOES-West': ee.List([ee.ImageCollection('NOAA/GOES/17/FDCF'),
    ee.ImageCollection('NOAA/GOES/18/FDCF')])
});

var goesBreakPts = ee.Dictionary({
  'GOES-East': ee.FeatureCollection([
      ee.Feature(null,{idx: 0, breakPt: ee.Date('2017-07-10')})
    ]),
  'GOES-West': ee.FeatureCollection([
      ee.Feature(null,{idx: 0, breakPt: ee.Date('2018-08-28')}),
      ee.Feature(null,{idx: 1, breakPt: ee.Date('2023-01-04')})
    ])
});

var goes_sDate = ee.Dictionary({
  'GOES-East': 'July 10, 2017',
  'GOES-West': 'August 28, 2018'
});

// filter and calculate GOES RGB
var maxVisHrGOES = ee.Dictionary({
  0: 0.6,
  1: 0.6,
  2: 0.6,
  3: 0.6,
  11: 0.6,
  12: 0.65,
  13: 0.7,
  14: 0.75,
  15: 0.8,
  16: 0.85,
  17: 0.85,
  18: 0.85,
  19: 0.9,
  20: 0.8,
  21: 0.7,
  22: 0.6,
  23: 0.6,
});

var applyScaleAndOffset = function(image,bandName) {
  var scale = ee.Number(image.get(bandName + '_scale'));
  var offset = ee.Number(image.get(bandName + '_offset'));
  
  return image.select(bandName).multiply(scale).add(offset);
};

var filterGOESday = function(year,month,day,goesRGB_col) {
  var inDate = ee.Date.fromYMD(year,month,day);
  var goesDay = ee.ImageCollection(goesRGB_col)
    .filterDate(inDate.advance(5,'hour'),inDate.advance(28,'hour'));
  
  var goesHr = goesDay.filter(ee.Filter.calendarRange(0,3,'hour'))
    .merge(goesDay.filter(ee.Filter.calendarRange(11,23,'hour')));
    
  goesHr = goesHr.filter(ee.Filter.calendarRange(0,5,'minute'))
    .merge(goesHr.filter(ee.Filter.calendarRange(30,35,'minute')))
    .sort('system:time_start');
  
  return goesHr;
};

var getGOESdates = function(year,month,day,goesRGB_col) {
  
  var goes_dates = filterGOESday(year,month,day,goesRGB_col).toList(50).map(function(image) {
    return ee.String(ee.Date(ee.Image(image).get('system:time_start'))
      .format('Y-MM-dd HH:mm'));
  });
  
  return goes_dates;
};

var getGOESdateFirst = function(goesDates) {
  return goesDates.sort(goesDates.map(function(x) {
    var goesDate = ee.Date.parse('Y-MM-dd HH:mm',x);
    return goesDate.get('hour').add(goesDate.get('minute').divide(60)).subtract(22).abs();
  })).get(0);
};

var getGOESrgb = function(dateTime,goesRGB_col,goesFire_col) {
  dateTime = ee.Date.parse({format: 'Y-MM-dd HH:mm',date: dateTime});
  var hour = dateTime.get('hour');
  var maxVis = maxVisHrGOES.getNumber(hour);
  
  var goesHr = ee.ImageCollection(goesRGB_col)
    .filterDate(dateTime,dateTime.advance(1,'hour')).first();
    
  var red = applyScaleAndOffset(goesHr,'CMI_C02').rename('RED');
  var blue = applyScaleAndOffset(goesHr,'CMI_C01').rename('BLUE');
  var veggie = applyScaleAndOffset(goesHr,'CMI_C03').rename('VEGGIE');
  
  // Bah, Gunshor, Schmit, Generation of GOES-16 True Color Imagery without a
  // Green Band, 2018. https://doi.org/10.1029/2018EA000379
  // Green = 0.45 * Red + 0.10 * NIR + 0.45 * Blue
  var green1 = red.multiply(0.4);
  var green2 = veggie.multiply(0.1);
  var green3 = blue.multiply(0.45);
  var green = green1.add(green2).add(green3).rename('GREEN');
  
  var goesRGB = red.addBands(green).addBands(blue);
  
  var goesFireCol = goesFire_col
    .filterDate(dateTime,dateTime.advance(1,'hour')).select('DQF');
    
  var goesFire = ee.Algorithms.If(goesFireCol.size().gt(0),
    ee.Image(goesFireCol.min().eq(0).selfMask()),ee.Image(0).selfMask());
   
  return goesRGB.visualize({min:0, max:maxVis, gamma: 1.5})
    .blend(ee.Image(goesFire).visualize({palette: 'red', opacity: 0.4}));
};

var getGOESrgb_mask = function(dateTime,goesRGB_col,goesFire_col) {
  dateTime = ee.Date.parse({format: 'Y-MM-dd HH:mm',date: dateTime});
  var hour = dateTime.get('hour');
  var maxVis = maxVisHrGOES.getNumber(hour);
  
  var goesHr = ee.ImageCollection(goesRGB_col)
    .filterDate(dateTime,dateTime.advance(1,'hour')).first();
    
  var red = applyScaleAndOffset(goesHr,'CMI_C02').rename('RED');
  var blue = applyScaleAndOffset(goesHr,'CMI_C01').rename('BLUE');
  var veggie = applyScaleAndOffset(goesHr,'CMI_C03').rename('VEGGIE');
  
  // Bah, Gunshor, Schmit, Generation of GOES-16 True Color Imagery without a
  // Green Band, 2018. https://doi.org/10.1029/2018EA000379
  // Green = 0.45 * Red + 0.10 * NIR + 0.45 * Blue
  var green1 = red.multiply(0.4);
  var green2 = veggie.multiply(0.1);
  var green3 = blue.multiply(0.45);
  var green = green1.add(green2).add(green3).rename('GREEN');
  
  var goesMask = red.gt(0).multiply(green.gt(0)).multiply(blue.gt(0));
  
  var goesRGB = red.addBands(green).addBands(blue)
    .updateMask(goesMask);
  
  var goesFireCol = goesFire_col
    .filterDate(dateTime,dateTime.advance(1,'hour')).select('DQF');
    
  var goesFire = ee.Algorithms.If(goesFireCol.size().gt(0),
    ee.Image(goesFireCol.min().eq(0).selfMask()),ee.Image(0).selfMask());
  
  return goesRGB.visualize({min:0, max:maxVis, gamma: 1.5})
    .blend(ee.Image(goesFire).visualize({palette: 'red', opacity: 0.4}));
};

// HMS extent
var hmsExtent = ee.FeatureCollection(projFolder + 'HMS/HMS_Extent');

var getSmokeStats = function(year,month,day) {
  
  var yyyymmdd = ee.Number(year).multiply(1e4)
    .add(ee.Number(month).multiply(1e2)).add(day);
    
  var hmsDayExtent = hmsExtent.filter(ee.Filter.eq('YYYYMMDD',yyyymmdd));
  
  var smokeExtentTitle = ui.Label('Smoke Extent',
    {fontWeight:'bold', fontSize: '18px', margin: '3px 8px 2px 8px'});
  
  hmsDayExtent = ee.List(['Light','Medium','Heavy','Total'])
    .map(function(hmsCat) {return hmsDayExtent.filter(ee.Filter.eq('Density',hmsCat)).first()});
  hmsDayExtent = ee.FeatureCollection(hmsDayExtent);
  
  var smokeExtent = ui.Chart.feature.byFeature(hmsDayExtent,
      'Density', ['Area','Count']
    ).setChartType('Table');
  
  return ui.Panel({
    widgets: [smokeExtentTitle,smokeExtent],
    style: {
      width: '250px',
      height: '180px',
      position: 'bottom-right'
    }
  });
};  

// HMS smoke duration
var hmsStats = ee.ImageCollection(projFolder + 'HMS/HMS_Stats');

// Time series chart for HMS smoke plumes
var getSmokeTSChart = function(year,hmsCat) {
  
  var smokeExtYr = hmsExtent.filter(ee.Filter.eq('Year',year));
  var smokeExtHistYrs = hmsExtent.filter(ee.Filter.gte('Year',sYear+1))
    .filter(ee.Filter.lte('Year',eYear));
  
  var nDay = ee.Date.fromYMD(year,12,31)
    .difference(ee.Date.fromYMD(year,1,1),'day').add(1);
    
  var smokeExt = ee.FeatureCollection(ee.List.sequence(1,nDay,1).map(function(JDay) {
    
    var hmsDay_currentYr = smokeExtYr.filter(ee.Filter.eq('JDay',JDay))
      .filter(ee.Filter.eq('Density',hmsCat)).first();
    var hmsDay_historicalYrs = smokeExtHistYrs.filter(ee.Filter.eq('JDay',JDay))
      .filter(ee.Filter.eq('Density',hmsCat));
    
    var historicalPer = hmsDay_historicalYrs.reduceColumns(ee.Reducer.percentile([25,75]),['Area']);

    return ee.Feature(null, {
      Day: JDay,
      Date: ee.Date.fromYMD(year,1,1).advance(ee.Number(JDay).subtract(1),'day'),
      Current: hmsDay_currentYr.getNumber('Area'),
      Historical: hmsDay_historicalYrs.aggregate_mean('Area'),
      Historical25: historicalPer.getNumber('p25'),
      Historical75: historicalPer.getNumber('p75'),
      Valid: hmsDay_currentYr.get('Valid')
    });
  }));
  
  smokeExt = smokeExt.filter(ee.Filter.eq('Valid',true));
  
  var smokeChart = ui.Chart.feature.byFeature(smokeExt,'Date',['Current','Historical','Historical25','Historical75'])
    .setSeriesNames(['Current Year','Average (2006-2022)','p25 (2006-2022)','p75 (2006-2022)'])
    .setOptions({
      title: 'Smoke Plumes',
      titleTextStyle: {fontSize: '13.5'},
      vAxis: {
        format: 'scientific',
        title: 'Smoke Extent (km²)',
        titleTextStyle: {fontSize: '12'},
      },
      hAxis: {
        format: 'MMM', 
        viewWindowMode: 'explicit',
        viewWindow: {
          min: ee.Date.fromYMD(year,1,1).millis().getInfo(),
          max: ee.Date.fromYMD(year,12,31).millis().getInfo()
        },
      },
      series: {
        0: {color: '#333333',lineWidth: 1.5},
        1: {color: '#F28C28',lineWidth: 1},
        2: {color: '#FFC000',lineWidth: 0.75},
        3: {color: '#FF0000',lineWidth: 0.75},
      },
      legend: {textStyle: {fontSize: 10.5}},
      height: '220px',
    });
  
  var chartDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '3px 0px 3px 0px',height:'0.1px',border:'0.75px solid black',stretch:'horizontal'});
  var chartSectionLabel = ui.Label('Time Series Chart', {margin: '10px 8px 3px 8px', fontWeight: 'bold', fontSize: '20px'});
  
  var chartPanel = ui.Panel({
    style: {
      margin: '0 0px 0px 0px',
    }
  });
  
  chartPanel.add(chartDivider);
  chartPanel.add(chartSectionLabel);
  chartPanel.add(smokeChart);
  
  return chartPanel;
};

var hmsSmokeText = ee.FeatureCollection(projFolder + 'HMS/HMS_SmokeText');

var getSmokeText = function(year,month,day) {
  var smokeTxtTitle = ui.Label('Smoke Text Description',
    {fontWeight:'bold', fontSize: '18px', margin: '3px 8px 6px 8px'});
  
  // as a table
  var smokeTextDay = hmsSmokeText
    .filter(ee.Filter.eq('Year',year))
    .filter(ee.Filter.eq('Month',month))
    .filter(ee.Filter.eq('Day',day))
    .select(['HHMMstr','HtmlLink'],['HHMM','Link']);
  
  var smokeTxtChart = ui.Chart.feature.byFeature(smokeTextDay,'HHMM',['Link'])
    .setChartType('Table').setOptions({
      allowHtml: true
    });

  // as text
  // var smokeTextDay = hmsSmokeText
  //   .filter(ee.Filter.eq('Year',year))
  //   .filter(ee.Filter.eq('Month',month))
  //   .filter(ee.Filter.eq('Day',day))
  //   .select(['HHMMstr','Link','Name'],['HHMM','Link','Name']);
  
  // var smokeList = smokeTextDay.toList(100).map(function(smokeTxt) {
  //   return [
  //     ee.Feature(smokeTxt).get('HHMM'),
  //     ee.Feature(smokeTxt).get('Name'),
  //     ee.Feature(smokeTxt).get('Link')
  //   ];
  // });

  // var smokeTxtChart = ui.Panel([]);
  // smokeList.evaluate(function(clientList) {
  //   for (var i in clientList) {
  //     var smokeLinkPanel = ui.Panel([ui.Label(clientList[i][0]),
  //       ui.Label(clientList[i][1],{color: '#5886E8'},clientList[i][2])],
  //       ui.Panel.Layout.flow('horizontal'),
  //       {margin: '-4px 0px -2px 0px',stretch:'horizontal'});
      
  //     smokeTxtChart.add(smokeLinkPanel);
  //   }
  // });
  
  return ui.Panel({widgets: [smokeTxtTitle,smokeTxtChart],
    style: {
      width: '250px',
      position: 'bottom-right',
    }
  });
};

// MODIS burned area
var BA = ee.ImageCollection('MODIS/061/MCD64A1').select('BurnDate');
var outputRegion = ee.Geometry.Rectangle([-180,0,0,90],null,false);

// ===============
// User Interface
// ===============
// Info panel
var infoPanel = function() {
  var hmsToolLabel = ui.Label('HMS Smoke Explorer', {margin: '12px 0px 0px 8px', fontWeight: 'bold', fontSize: '24px', border: '1px solid black', padding: '5px'});
  
  var infoLabel = ui.Label('NOAA\'s Hazard Mapping System (HMS) smoke product maps the extent of fire-related smoke plumes across the U.S. and adjacent areas.',
    {margin: '8px 20px 2px 8px', fontSize: '12.5px', color: '#777'});
  
  var dataLabel = ui.Label('[Data/Info]', {margin: '3px 5px 3px 8px', fontSize: '12.5px', color: '#5886E8'}, 'https://www.ospo.noaa.gov/Products/land/hms.html');
  var codeLabel = ui.Label('[Code]', {margin: '3px 5px 3px 3px', fontSize: '12.5px', color: '#5886E8'}, 'https://github.com/tianjialiu/HMS-Smoke');
  var noaaLabel = ui.Label('[NOAA HRRR-Smoke]', {margin: '3px 5px 3px 3px', fontSize: '12.5px', color: '#5886E8'}, 'https://hwp-viz.gsd.esrl.noaa.gov/smoke/index.html');
  var epaLabel = ui.Label('[EPA AirNow]', {margin: '3px 5px 3px 3px', fontSize: '12.5px', color: '#5886E8'}, 'https://fire.airnow.gov/#');
  
  var introDetails = ui.Label('',{margin: '5px 20px 0px 8px',fontSize: '12px', color: '#999'});
  var introDetailsText = 'The HMS smoke product should be used with caution as an indicator of surface smoke presence. We find that inclusion of HMS light plumes leads to inflation of the number and trend in smoke days. Outside the western U.S. and Alaska, we find no to low agreement with ground observations and model estimates and often low separation of PM2.5 levels on smoke and non-smoke days. We recommend careful evaluation of biases in HMS for air quality and public health studies. Here we also gap-fill polygons with unspecified smoke density from 2005-2010 using random forest classification. Details on our evaluation of HMS with other datasets and on methods for gap-filling smoke polygons with unspecified density can be found in our paper.';
  
  var introDetailsLink = ui.Label('', {margin: '22px 5px 3px 10px', fontSize: '12.5px', color: '#5886E8'}, 'https://doi.org/10.1071/WF23148');
  var introDetailsLinkText = '[Paper: Liu et al. (2024, IJWF)]';
  
  var hideIntroMode = true;
  var hideShowIntroButton = ui.Button({
    label: 'Show Details',
    onClick: function() {
      hideIntroMode = !hideIntroMode;
      hideShowIntroButton.setLabel(hideIntroMode ? 'Show Details': 'Hide Details');
      if (!hideIntroMode) {
        introDetails.setValue(introDetailsText);
        introDetailsLink.setValue(introDetailsLinkText);
      } else {
        introDetails.setValue('');
        introDetailsLink.setValue('');
      }
    },
      style: {padding: '0', margin: '8px 0 0 8px'}
  });
  
  var introWrapper = ui.Panel({
    widgets: [ui.Panel([hideShowIntroButton,introDetailsLink],
        ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
      introDetails],
    style: {
      padding: '0',
    }
  });
  
  var headDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '12px 0px 5px 0px',height:'1px',border:'0.75px solid black',stretch:'horizontal'});
   
  var inputSectionLabel = ui.Label('Input Parameters', {margin: '8px 8px 5px 8px', fontWeight: 'bold', fontSize: '20px'});
  
  return ui.Panel([
    hmsToolLabel, infoLabel,
    ui.Panel([dataLabel, codeLabel, noaaLabel, epaLabel], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    introWrapper, headDivider, inputSectionLabel
  ]);
};

// View panel
var viewPanel = function() {
  
  var viewInfoLabel = ui.Label('1) View Mode:', {fontSize: '14.5px', margin: '8px 8px 8px 8px'});
  var viewSelect = ui.Select({
    items: ['By Day','By Year','Summary'],
    value: 'By Day',
    style: {margin: '3px 75px 5px 8px', stretch: 'horizontal'}
  });
  
  var viewPanel = ui.Panel([viewInfoLabel, viewSelect], ui.Panel.Layout.Flow('horizontal'),
    {stretch: 'horizontal', margin: '5px 0 0 0'});
  
  viewSelect.onChange(function(selected) {
      timeModePanel.clear();
      if (selected == 'By Day') {setTimePanel('By Day')}
      if (selected == 'By Year') {setTimePanel('By Year')}
      if (selected == 'Summary') {
        timeModePanel.add(ui.Label('Note that 2005 & 2025 are not included in the summary due to partial data availability.',
          {fontSize: '13px', margin: '5px 8px 8px 8px', color: '#777'}));
      }
    });
  
  return viewPanel;
};

var getViewMode = function(viewPanel) {
  return viewPanel.widgets().get(1).getValue();
};

// Time panel
var setTimePanel = function(viewMode) {
  
  var dateInfoLabel = ui.Label('Filter HMS smoke and MODIS active fires by date. Note that 2005 & 2025 have partial data availability.',
    {fontSize: '13px', margin: '10px 8px 5px 8px', color: '#777'});
  
  var updateLabel = ui.Label('Date Range: (2005-08-05 to ' + nrtEnd +')',
    {margin: '-3px 20px 5px 8px', fontSize: '12.5px', color: '#777'});
    
  var yearLabel = ui.Label('2) Select Year:', {fontSize: '14.5px', margin: '8px 8px 8px 8px'});
  var yearSlider = ui.Slider({min: sYear, max: nrtYear, value: 2017, step: 1});
  if (viewMode == 'By Day') {yearSlider.setMax(nrtYear);}
  yearSlider.style().set('stretch', 'horizontal');
  var yearPanel = ui.Panel([yearLabel, yearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  
  var jumpToLatestButton = ui.Button({label: 'Jump to Latest',  
    style: {stretch: 'horizontal',width:'35%',margin:'3px 8px 8px 220px'}});
  var jumpToLatestPanel = ui.Panel([jumpToLatestButton],
    ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  
  var dateLabel = ui.Label('3) Select Date:', {fontSize: '14.5px', margin: '12px 8px 8px 8px'});
  var dateSlider = ui.DateSlider({start: '2017-01-01', end: '2018-01-01', value: '2017-08-01'});
  dateSlider.style().set('stretch', 'horizontal');
  var datePanel = ui.Panel([dateLabel, dateSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  
  jumpToLatestButton.onClick(function() {
    yearSlider.setValue(nrtYear);
    var startDate = ee.Date.fromYMD(nrtYear,1,1).format('Y-MM-dd').getInfo();
    var inDate = ee.Date(nrtEnd).format('Y-MM-dd').getInfo();
    var endDate = ee.Date(nrtEnd).advance(1,'day').format('Y-MM-dd').getInfo();
      
    dateSlider = ui.DateSlider({start: startDate, end: endDate, value: inDate});
    dateSlider.style().set('stretch', 'horizontal');
    
    datePanel.remove(datePanel.widgets().get(1));
    datePanel.insert(1, dateSlider);
  });
  
  var timePanel = ui.Panel([dateInfoLabel,yearPanel]);
    
  if (viewMode == 'By Day') {
    yearSlider.onChange(function(inYear) {
      var startDate = ee.Date.fromYMD(inYear,1,1).format('Y-MM-dd').getInfo();
      var endDate = ee.Date.fromYMD(ee.Number(inYear).add(1),1,1).format('Y-MM-dd').getInfo();
      var inDate = ee.Date.fromYMD(inYear,8,1).format('Y-MM-dd').getInfo();
      
      if (inYear == sYear) {
        startDate = '2005-08-05';
        inDate = startDate;
      }
      
      if (inYear == nrtYear) {
        endDate = ee.Date(nrtEnd).advance(1,'day').format('Y-MM-dd').getInfo();
      }
      
      dateSlider = ui.DateSlider({start: startDate, end: endDate, value: inDate});
      dateSlider.style().set('stretch', 'horizontal');
    
      datePanel.remove(datePanel.widgets().get(1));
      datePanel.insert(1, dateSlider);
    });

  
    var satLabel = ui.Label('4) Select Satellite:', {fontSize: '14.5px', margin: '8px 8px 8px 8px'});
      var satSelect = ui.Select({
        items: ['GOES-East','GOES-West'],
        value: 'GOES-East',
        style: {margin: '3px 50px 5px 8px', stretch: 'horizontal'}
      });
    
    var satPanel = ui.Panel([satLabel, satSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});

    timePanel = ui.Panel([ui.Panel([dateInfoLabel,updateLabel]),yearPanel,datePanel,jumpToLatestPanel,satPanel]);
  }

  return timeModePanel.add(timePanel);
};


var getDate = function(timeModePanel) {
  var inDate = timeModePanel.widgets().get(0).widgets().get(2).widgets().get(1).getValue();

  return ee.Date(inDate[0]);
};

var getYear = function(timeModePanel,viewMode) {
  if (viewMode != 'Summary') {
    return timeModePanel.widgets().get(0).widgets().get(1).widgets().get(1).getValue();
  } else {
    return null;
  }
};

var getSat = function(timeModePanel) {
  var satName = timeModePanel.widgets().get(0).widgets().get(4).widgets().get(1).getValue();

  return satName;
};

// Run button
var runButton = ui.Button({label: 'Run',  style: {stretch: 'horizontal'}});

// Legend
var getLayerCheck = function(map, label, value, layerPos, opacity, description, opacitySpacing) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontWeight: 'bold', fontSize: '15px', margin: '0px 3px 3px 8px'}});

  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  var opacityLayer = ui.Slider({min: 0, max: 1, value: opacity, step: 0.01,
    style: {margin: opacitySpacing + ' 3px 3px 8px'}
  });
  
  opacityLayer.onChange(function(value) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setOpacity(value);
  });
  
  var legendSubtitle = ui.Label(description,
    {fontSize: '13px', fontWeight: '50px', color: '#666', margin: '0px 3px 8px 8px'});
  
  return ui.Panel([
    ui.Panel([checkLayer,opacityLayer],ui.Panel.Layout.flow('horizontal')),
  legendSubtitle]);
};

var getLayerCheckSimple = function(map, label, value, layerPos, opacity) {
  var checkLayer = ui.Checkbox({label: label, value: value,  
    style: {fontWeight: 'bold', fontSize: '15px', margin: '0px 3px 5px 8px'}});
  
  checkLayer.onChange(function(checked) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setShown(checked);
  });
  
  var opacityLayer = ui.Slider({min: 0, max: 1, value: opacity, step: 0.01,
    style: {margin: '1px 3px 5px 8px'}
  });
  
  opacityLayer.onChange(function(value) {
    var mapLayer = map.layers().get(layerPos);
    mapLayer.setOpacity(value);
  });
  
  return ui.Panel([checkLayer,opacityLayer],ui.Panel.Layout.flow('horizontal'));
};

var getLegendDiscrete = function(labels, colPal) {

  var legendPanel = ui.Panel({
    style: {
      padding: '2px 9px 8px 5px',
      position: 'bottom-left'
    }
  });

  var makeRow = function(colPal, labels) {
    var colorBox = ui.Label({
      style: {
        padding: '10px',
        margin: '0px 0 4px 8px',
        fontSize: '13.5px',
        backgroundColor: colPal
      }
    });

    var description = ui.Label({value: labels, style: {margin: '2px 1px 4px 6px', fontSize: '13.5px'}});
    return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
  };
  
  for (var i = 0; i < labels.length; i++) {
    legendPanel.add(makeRow(colPal[i], labels[i]));
  }
  
  return legendPanel;
};

var getLegendContinuous = function(maxVal, colPal) {
  
  var vis = {min: 0, max: maxVal, palette: colPal};

  var makeColorBarParams = function(palette) {
    return {
      bbox: [0, 0, 1, 0.1],
      dimensions: '120x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: palette,
    };
  };

  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(vis.palette),
    style: {stretch: 'horizontal', margin: '5px 8px 0px 8px', height: '18px'},
  });

  var legendLabels = ui.Panel({
    widgets: [
      ui.Label(vis.min, {margin: '4px 8px'}),
      ui.Label((vis.max / 2),
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label(vis.max, {margin: '4px 8px'}),
      ],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  var legendPanel = ui.Panel({
    widgets: [colorBar, legendLabels],
    style: {
      margin: '3px 10px 8px 0px',
    }});
  
  return legendPanel;
};

var symbol = {
  smoke: '( ⬛ )',
  fire: '(️ 🔴 )'
};

var getLegend = function(map) {
  var footDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '10px 0px 6px 0px',height:'1px',border:'0.75px solid black',stretch:'horizontal'});
  
  var legendPanel = ui.Panel({
    widgets: [
      footDivider,
      ui.Label('️Legend',{fontWeight:'bold',fontSize:'20px',margin:'8px 3px 8px 8px'}),
      getLayerCheck(map,symbol.smoke + ' Smoke', true, 3, 0.6,
        'Extent and density of smoke plumes observed from satellite images (e.g. GOES, VIIRS, MODIS) by NOAA\'s HMS analysts, spatially aggregated by highest smoke density category', '6px'),
      getLegendDiscrete(smokeLabels,colPal_smoke),
      getLayerCheck(map,symbol.fire + ' Active Fires', true, 4, 0.65,
        'Sallite-derived active fires from the HMS fire product, including detections from MODIS, VIIRS, GOES, and AVHRR', '6px'),
      ui.Label('Aerosol Optical Depth',{fontWeight:'bold',fontSize:'16px',margin:'2px 3px 0px 8px'}),
      ui.Label('MODIS Terra/Aqua MAIAC and ECMWF/CAMS Aerosol Optical Depth (AOD) at 550 nm',{fontSize:'13px',color:'#666',margin:'2px 3px 4px 8px'}),
      ui.Label('Note: MAIAC AOD may not be up-to-date; CAMS AOD is available from June 21, 2016',{fontSize:'12.5px',color:'#999',margin:'0px 3px 8px 8px'}),
      getLayerCheckSimple(map,'MAIAC', false, 1, 0.75),
      getLayerCheckSimple(map,'CAMS', false, 2, 0.75),
      getLegendContinuous(0.5,colPal.Spectral),
      getLayerCheck(map,'Surface PM2.5', false, 0, 0.55,
        'ECMWF/CAMS daily average particulate matter (with diameter < 2.5 μm) concentrations, in μg/m³', '0px'),
      getLegendDiscrete(['Moderate (12.1 – 35.4)','Unhealthy for Sensitive Groups (35.5 – 55.4)',
          'Unhealthy (55.5 – 150.4)','Very Unhealthy (150.5 – 250.4)','Hazardous (> 250.5)'],
        ['#FEFF54','#EF8532','#EA3423','#8C1B4B','#741425'])
    ],
    style: {
      margin: '0px 0px 0px 0px',
      position: 'bottom-left'
    }});
    
  return legendPanel;
};

var getLegendYr = function(map) {
  var footDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '10px 0px 6px 0px',height:'1px',border:'0.75px solid black',stretch:'horizontal'});
  
  var legendPanel = ui.Panel({
    widgets: [
      footDivider,
      ui.Label('️Legend',{fontWeight:'bold',fontSize:'20px',margin: '8px 3px 13px 8px'}),
      getLayerCheck(map,'Smoke Days', true, 0, 0.75,
        'Number of days with at least one HMS observation', '1px'),
      ui.Label('',{margin:'-8px 0 0 0'}),
      getLegendContinuous(70,colPal.Grays),
      getLayerCheck(map,'Maximum Smoke \'Duration\'', false, 1, 0.75,
        'Maximum smoke duration, in hours, indicated by the start and end times of satellite images used to outline smoke polygons', '2px'),
      ui.Label('',{margin:'-8px 0 0 0'}),
      getLegendContinuous(500,colPal.Sunset),
      getLayerCheck(map,symbol.smoke + ' Burned Area', false, 2, 0.75,
        'MODIS burned area extent (lag of 2-3 months)', '6px'),
      ui.Label('',{margin:'0 0 6px 0'})
    ],
    style: {
      margin: '0px 0px 0px 0px',
      position: 'bottom-left'
    }});
    
  return legendPanel;
};

// Control panel
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '350px', maxWidth: '350px'}
});

// Map panel
var mapPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
});

var map0 = ui.Map();
map0.style().set({cursor:'crosshair'});
map0.setCenter(-97,38.5,4);
map0.setControlVisibility({fullscreenControl: false, layerList: false});

var map1 = ui.Map();
map1.style().set({cursor:'crosshair'});
map1.setCenter(-97,38.5,4);
map1.setControlVisibility({fullscreenControl: false, layerList: false});

ui.root.clear();

var init_panels = ui.SplitPanel({firstPanel: controlPanel,
  secondPanel: mapPanel});

mapPanel.add(map0);

ui.root.add(init_panels);

var infoPanel = infoPanel();
var viewPanel = viewPanel();
var timeModePanel = ui.Panel();
setTimePanel('By Day');

controlPanel.add(infoPanel).add(viewPanel).add(timeModePanel)
  .add(runButton);

var counter = 0;

// Run calculations, linked to submit button
runButton.onClick(function() {
  counter = counter + 1;
  
  mapPanel.clear();
  map0 = ui.Map(); map0.clear();
  map0.style().set({cursor:'crosshair'});
  map0.setCenter(-97,38.5,4);
  map0.setControlVisibility({fullscreenControl: false, layerList: false});
  map0.unlisten();
  
  map1 = ui.Map(); map1.clear();
  map1.style().set({cursor:'crosshair'});
  map1.setCenter(-97,38.5,4);
  map1.setControlVisibility({fullscreenControl: false, layerList: false});

  mapPanel.add(map0);
  
  if (counter > 1) {
    controlPanel.remove(controlPanel.widgets().get(6));
    controlPanel.remove(controlPanel.widgets().get(5));
    controlPanel.remove(controlPanel.widgets().get(4));
  }
    
  // Input parameters:
  var viewMode = getViewMode(viewPanel);
  var inYear = getYear(timeModePanel,viewMode);
  
  if (viewMode == 'By Day') {
    var inDate = getDate(timeModePanel);
    var inMonth = inDate.get('month');
    var inDay = inDate.get('day');
    var satName = getSat(timeModePanel);
    
    var goesBreakPt = goesBreakPts.get(satName);
    var goesDateDiff = ee.FeatureCollection(goesBreakPt)
      .map(function(breakPt) {
        var dateDiff = inDate.difference(breakPt.get('breakPt'),'day');
        return breakPt.set('dateDiff',dateDiff);
    }).filter(ee.Filter.gte('dateDiff',0));
 
    var goesIdx = ee.Number(ee.Algorithms.If(goesDateDiff.size().gt(0),
      goesDateDiff.sort('dateDiff').first().getNumber('idx'),0));
      
    var goesRGB_col = ee.ImageCollection(ee.List(goesRGB_IDs.get(satName)).get(goesIdx));
    var goesFire_col = ee.ImageCollection(ee.List(goesFire_IDs.get(satName)).get(goesIdx));

    var hmsDay = getHMS(inYear,inMonth,inDay);
    var fireDay = getFire(inYear,inMonth,inDay);
    var aodDay_maiac = getAOD_MAIAC(inYear,inMonth,inDay,'green');
    var aodDay_cams = getCAMS(inYear,inMonth,inDay,'aod');
    var pm25 = getCAMS(inYear,inMonth,inDay,'pm25').multiply(1e9);
  
    // Display maps:
    map0.addLayer(pm25.updateMask(pm25.gt(12)).sldStyle(pm25_ramp),{},
      'PM25',false,0.55);
    map0.addLayer(aodDay_maiac,{min:0,max:0.5,palette:colPal.Spectral},
      'AOD (MAIAC)',false,0.75);
    map0.addLayer(aodDay_cams,{min:0,max:0.5,palette:colPal.Spectral},
      'AOD (CAMS)',false,0.75);
    map0.addLayer(hmsDay.style({styleProperty:'styleProperty',width:0.5}),{},
      'HMS Smoke',true,0.6);
    map0.addLayer(fireDay.style({color:'red',pointSize:1,width:0.7}),{},
      'Active Fires',true,0.65);

    // Legend:
    var legendPanel = getLegend(map0);
    controlPanel.add(legendPanel);
    
    var smokeStats = getSmokeStats(inYear,inMonth,inDay);
    var smokeText = getSmokeText(inYear,inMonth,inDay);
    map0.add(smokeStats); map0.add(smokeText);
    
    var goesDates = getGOESdates(inYear,inMonth,inDay,goesRGB_col);

    var dateText = ui.Label(ee.String('Date: ').cat(ee.Date(inDate).format('Y-MM-dd')).getInfo(),
      {fontSize: '16px', fontWeight: 'bold', margin: '8px 8px 0px 8px'});
    var satCheckbox = ui.Checkbox({label: 'See ' + satName + ' RGB Images',
      style: {fontSize: '14.5px', position: 'bottom-left', margin: '0'}});
    var satMessage = ui.Label('* Available from ' + goes_sDate.get(satName).getInfo() + ' to present',
      {fontSize: '11px', margin: '0 8px 8px 8px', color: '#777'});
    
    var satCheckBool = goesDates.size().eq(0).getInfo();
    satCheckbox.setDisabled(satCheckBool);
    var satPanel = ui.Panel({
      widgets: [dateText,satCheckbox,satMessage],
      style: {
        position: 'bottom-left',
        padding: '0'
      }
    });
    
    map0.add(satPanel);
    
    // Display GOES images and animations in split panel:
    satCheckbox.onChange(function(checked) {
      satCheckbox.setDisabled(true);
      map0.remove(smokeStats); map0.remove(smokeText);
      
      controlPanel.remove(legendPanel);
      legendPanel = getLegend(map0);
      controlPanel.insert(4,legendPanel);
      
      if (checked) {
        mapPanel.clear();
        smokeStats = getSmokeStats(inYear,inMonth,inDay);
        smokeText = getSmokeText(inYear,inMonth,inDay);
        map0.add(smokeStats); map0.add(smokeText);
        
        var map_panels = ui.SplitPanel({
          firstPanel: map0,
          secondPanel: map1,
          wipe: true
        });
        var linker = ui.Map.Linker([map0,map1]);

        mapPanel.add(map_panels);
        map1.clear();
        map1.setControlVisibility({mapTypeControl: false, fullscreenControl: false, layerList: false});
        
        var goesRGBcol = ee.ImageCollection(goesDates.map(function(dateTime) {
            return getGOESrgb_mask(dateTime,goesRGB_col,goesFire_col);
          }));

        var goesLabel = ui.Label(satName + ' RGB Images', {fontSize: '15px', margin: '0 0 6px 0', fontWeight: 'bold'});
        var hrLabel = ui.Label('Select Date/HH:MM (UTC):', {fontSize: '14.5px', margin: '0 8px 0 0'});
        var hrSelect = ui.Select({items: goesDates.getInfo(), placeholder: 'Select a timestamp',
          value: getGOESdateFirst(goesDates).getInfo(),
          style: {stretch: 'horizontal', margin: '8px 0 5px 0'}});
        var goesButton = ui.Button({label: 'Plot Image on Map', style: {margin: '6px 0 0 0', color: '#FF0000'}});
        var hrPanel = ui.Panel([
          goesLabel,
          ui.Panel([hrLabel, hrSelect], ui.Panel.Layout.Flow('vertical'),
            {stretch: 'horizontal', width: '220px', margin: '0'}),
          goesButton
        ], ui.Panel.Layout.Flow('vertical'), {position: 'bottom-right'});
        map1.add(hrPanel);
        
        var goesCounter = 0;
        goesButton.onClick(function() {
          
          goesCounter = goesCounter + 1;
          
          if (goesCounter > 1) {
            hrPanel.remove(hrPanel.widgets().get(3));
            map1.remove(map1.layers().get(0));
            map1.remove(map1.widgets().get(1));
          }
          if (goesCounter >= 1) {
            var goesCheck = getLayerCheckSimple(map1,'RGB Image', true, 0, 0.88);
            goesCheck.style().set({margin: '10px 0 -3px -8px', stretch: 'horizontal'});
            hrPanel.add(goesCheck);
          }
          
          var inDateTime = hrSelect.getValue();
          var goesRGB = getGOESrgb(inDateTime,goesRGB_col,goesFire_col);
          
          var goesLayer = ui.Map.Layer(goesRGB,{},'RGB',true,1).setOpacity(0.88);
          map1.layers().set(0, goesLayer);
          
          var zoomBox = ui.Panel({style: {margin: '0'}});
           
          var instructions = ui.Label('Click the map on the right to generate an animation of GOES RGB images.', {
            stretch: 'both',
            textAlign: 'center'
          });
          
          var panel = ui.Panel({
            widgets: [zoomBox, instructions],
            style: {
              position: 'top-right',
              width: '300px',
              padding: '0'
            }
          });

          if (goesCounter > 1) {map1.remove(panel)}
          map1.add(panel);
          
          map1.onClick(function(coords) {
            centerZoomBox(coords.lon, coords.lat);
          });

          var centerZoomBox = function(lon, lat) {
            instructions.style().set('shown', false);

            var w = lon-4.5, e = lon+4.5;
            var n = lat-3, s = lat+3;
            var outline = ee.Geometry.MultiLineString([
              [[w, s], [w, n]],
              [[e, s], [e, n]],
              [[w, s], [e, s]],
              [[w, n], [e, n]],
            ],null,false);
            
            var region = ee.Geometry.Rectangle([w,s,e,n],null,false);
            
            var VID_params = {
              dimensions: 512,
              region: region,
              framesPerSecond: 6,
              crs: 'EPSG:3857',
            };
            
            var goesVID = ui.Thumbnail(goesRGBcol, VID_params);
            var goesVIDlink = ui.Label('Download GIF',{margin: '0 8px 8px 8px', color: '#5886E8'},
              goesRGBcol.getVideoThumbURL(VID_params));

            panel.clear(); panel.add(goesVID);
            panel.add(goesVIDlink);
            
            var layer = ui.Map.Layer(outline, {color: 'FFFFFF'}, 'Zoom Box Bounds');
            map1.layers().set(1, layer);
          };
        
        });
      }
    });
  }
  
  // By year mode:
  if (viewMode == 'By Year') {
    var hmsStatsYr = hmsStats.filter(ee.Filter.eq('Year',inYear)).first();
    map0.addLayer(hmsStatsYr.select('SmokeDays_Light').selfMask(),
      {min: 0, max: 70, palette: colPal.Grays},'Smoke Days',true,0.75);
    map0.addLayer(hmsStatsYr.select('Duration_Total').selfMask(),
      {min: 0, max: 500, palette: colPal.Sunset},'Duration',false,0.75);
    
    var BAyr = BA.filter(ee.Filter.calendarRange(inYear,inYear,'year'))
      .max().gt(0).selfMask();
    map0.addLayer(BAyr,{palette: ['#000000']},'Burned Area',false,0.75);
    
    var legendPanelYr = getLegendYr(map0);
    controlPanel.add(legendPanelYr);
    
    var chartHrsPanel = ui.Panel({
      widgets: [],
      style: {
        position: 'bottom-right',
        width: '280px',
        height: '363px'
      }});
    
    map0.add(chartHrsPanel);
    var chartStatsTitle = ui.Label('Smoke Statistics', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px 0px 8px'});
    var chartStatsInfo = ui.Label('(Click on map...)', {fontSize: '14px', color: '#666', margin: '8px 3px 0px 8px'});
    var chartDaysTitle = ui.Label('Smoke Day', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px 0px 8px'});
    var chartHrsTitle = ui.Label('Max Smoke \'Duration\'', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px 0px 8px'});
    chartHrsPanel.add(chartStatsTitle).add(chartStatsInfo);
    
    map0.onClick(function(coords) {
      chartHrsPanel.clear();
      
      var point = ee.Geometry.Point([coords.lon,coords.lat]);
      var smokeHrs = hmsStatsYr.reduceRegions({
        collection: point,
        reducer: ee.Reducer.mean(),
        crs: 'EPSG:4326',
        scale: 1000
      }).first();
      
      var totalSmokeDays_Light = ui.Label('All: ' + smokeHrs.getNumber('SmokeDays_Light').round().getInfo() + ' days', 
        {fontSize: '14px', margin: '5px 3px 0px 8px'});
      var totalSmokeDays_Medium = ui.Label('Medium & Heavy: ' + smokeHrs.getNumber('SmokeDays_Medium').round().getInfo() + ' days',
        {fontSize: '14px', margin: '2px 3px 0px 8px'});
      var totalSmokeDays_Heavy = ui.Label('Heavy Only: ' + smokeHrs.getNumber('SmokeDays_Heavy').round().getInfo() + ' days',
        {fontSize: '14px', margin: '2px 3px 8px 8px'});
      var totalSmokeHrs = ui.Label('Total: ' + smokeHrs.getNumber('Duration_Total').round().getInfo() + ' hours',
        {fontSize: '14px', margin: '5px 3px -5px 8px'});
      
      var smokeHrsList = ee.FeatureCollection([
        ee.Feature(null,{HMS:'Light',Duration:smokeHrs.getNumber('Duration_Light')}),
        ee.Feature(null,{HMS:'Medium',Duration:smokeHrs.getNumber('Duration_Medium')}),
        ee.Feature(null,{HMS:'Heavy',Duration:smokeHrs.getNumber('Duration_Heavy')}),
      ]);
      
      var smokeHrsChart = ui.Chart.feature.byFeature(smokeHrsList,'HMS',['Duration'])
        .setChartType('PieChart')
        .setOptions({
          title: '',
          titleTextStyle: {fontSize: '13.5'},
          fontSize: '12.5',
          slices: {
            0: {color: colPal_smoke[0]},
            1: {color: colPal_smoke[1]},
            2: {color: colPal_smoke[2]},
          },
          legend: {textStyle: {fontSize: '12.5'}},
          height: '190px'
        });
      
      var lonLatCoords = ui.Label('Lon (x): ' + Math.round(coords.lon*100)/100
          + ' | Lat (y): ' + Math.round(coords.lat*100)/100,
        {fontSize: '14px', margin: '-10px 3px 0px 8px'});
    
      chartHrsPanel.add(chartDaysTitle)
        .add(totalSmokeDays_Light).add(totalSmokeDays_Medium).add(totalSmokeDays_Heavy)
        .add(chartHrsTitle).add(totalSmokeHrs)
        .add(smokeHrsChart).add(lonLatCoords);
    });
  }
  
  // Display smoke timeseries of areal extent:
  if (viewMode != 'Summary') {
    var tsChart = getSmokeTSChart(inYear,'Total');
    controlPanel.add(tsChart);
    
    var hmsCatLabel = ui.Label('Select Density:', {fontSize: '14.5px', margin: '8px 8px 8px 20px'});
    var hmsCatSelect = ui.Select({
      items: ['Total','Light','Medium','Heavy'],
      value: 'Total',
      style: {margin: '3px 65px 5px 8px', stretch: 'horizontal'}
    });
    
    var hmsCatPanel = ui.Panel([hmsCatLabel, hmsCatSelect], ui.Panel.Layout.Flow('horizontal'),
      {stretch: 'horizontal', margin: '-20px 0 8px 0px'});
    
    controlPanel.add(hmsCatPanel);
    
    hmsCatSelect.onChange(function(selected) {
      controlPanel.remove(tsChart);
      tsChart = getSmokeTSChart(inYear,selected);
      controlPanel.insert(5,tsChart);
    });
  }
  
  // Summary mode:
  if (viewMode == 'Summary') {
    var hmsYrAvg = hmsStats.filter(ee.Filter.gt('Year',sYear))
      .filter(ee.Filter.lte('Year',eYear)).mean();
    map0.addLayer(hmsYrAvg.select('SmokeDays_Light').selfMask(),
      {min: 0, max: 70, palette: colPal.Grays},'Smoke Days',true,0.75);
    map0.addLayer(hmsYrAvg.select('Duration_Total').selfMask(),
      {min: 0, max: 500, palette: colPal.Sunset},'Duration',false,0.75);
    
    var BAavg = BA.filter(ee.Filter.calendarRange(sYear+1,eYear,'year'))
      .max().gt(0).selfMask();
    map0.addLayer(BAavg,{palette: ['#000000']},'Burned Area',false,0.75);
    
    var legendPanelTS = getLegendYr(map0);
    controlPanel.add(legendPanelTS);
    
    var chartHrsTSPanel = ui.Panel({
      widgets: [],
      style: {
        position: 'bottom-right',
        width: '360px',
      }});
    
    map0.add(chartHrsTSPanel);
    var chartStatsTSTitle = ui.Label('Smoke Statistics', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px -3px 8px'});
    var chartStatsTSInfo = ui.Label('(Click on map...)', {fontSize: '14px', color: '#666', margin: '18px 3px 10px 8px'});
    chartHrsTSPanel.add(chartStatsTSTitle).add(chartStatsTSInfo);
   
    map0.onClick(function(coords) {
      chartHrsTSPanel.clear();
      
      var point = ee.Geometry.Point([coords.lon,coords.lat]);
      
      var smokeDays = hmsStats.filter(ee.Filter.gt('Year',sYear))
        .filter(ee.Filter.lte('Year',eYear))
        .select(['SmokeDays_Light','SmokeDays_Medium','SmokeDays_Heavy'],['b1','b2','b3'])
        .map(function(x) {
          return x.reduceRegions({
            collection: point,
            reducer: ee.Reducer.mean(),
            crs: 'EPSG:4326',
            scale: 1000
          }).first().set('Year',ee.Number(x.get('Year')).format('%04d'));
        });
      
      var smokeDaysChart = ui.Chart.feature.byFeature(smokeDays,'Year')
        .setSeriesNames(['All','Medium & Heavy','Heavy Only'])
        .setChartType('LineChart')
        .setOptions({
          title: 'Smoke Day Definition',
          titleTextStyle: {fontSize: '13.5'},
          fontSize: '12',
          vAxis: {
            title: 'Smoke Days',
            titleTextStyle: {fontSize: '12'},
            format: '####.#'
          },
          hAxis: {
            format: '####', 
          },
          height: '205px',
          series: {
            0: {color: colPal_smoke[0]},
            1: {color: colPal_smoke[1]},
            2: {color: colPal_smoke[2]}
          }
        });
        
      var smokeHrs = hmsStats.filter(ee.Filter.gt('Year',sYear))
        .filter(ee.Filter.lte('Year',eYear))
        .select(['Duration_Light','Duration_Medium','Duration_Heavy'],
          ['b1','b2','b3'])
        .map(function(x) {
          return x.reduceRegions({
            collection: point,
            reducer: ee.Reducer.mean(),
            crs: 'EPSG:4326',
            scale: 1000
          }).first().set('Year',ee.Number(x.get('Year')).format('%04d'));
        });
      
      var smokeHrsChart = ui.Chart.feature.byFeature(smokeHrs,'Year')
        .setSeriesNames(smokeLabels)
        .setChartType('ColumnChart')
        .setOptions({
          title: 'Maximum Smoke \'Duration\'',
          titleTextStyle: {fontSize: '13.5'},
          isStacked: true,
          fontSize: '12',
          vAxis: {
            title: 'Smoke Duration (hours)',
            titleTextStyle: {fontSize: '12'},
            format: '####.#'
          },
          hAxis: {
            format: '####', 
          },
          height: '205px',
          series: {
            0: {color: colPal_smoke[0]},
            1: {color: colPal_smoke[1]},
            2: {color: colPal_smoke[2]},
          }
        });
        
        var lonLatCoords = ui.Label('Lon (x): ' + Math.round(coords.lon*100)/100
          + ' | Lat (y): ' + Math.round(coords.lat*100)/100,
        {fontSize: '14px', margin: '-2px 3px 3px 8px'});
        
        chartHrsTSPanel.add(chartStatsTSTitle)
          .add(smokeDaysChart).add(smokeHrsChart).add(lonLatCoords);
      });
  }
});
