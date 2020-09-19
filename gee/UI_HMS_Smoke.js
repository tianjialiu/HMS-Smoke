/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var firms = ee.ImageCollection("FIRMS"),
    maiac = ee.ImageCollection("MODIS/006/MCD19A2_GRANULES"),
    cams = ee.ImageCollection("ECMWF/CAMS/NRT");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// *****************************************************************
// =================================================================
// --------------------- HMS Smoke Explorer --------------------- ||
// =================================================================
// *****************************************************************
/*
// @author Tianjia Liu (tianjialiu@g.harvard.edu)
// Last updated: September 18, 2020

// Purpose: visualize HMS smoke with MODIS active fires
// and aerosol optical depth
*/
// =================================================================
// **********************   --    Code    --   *********************
// =================================================================
// ================
// Load Packages
// ================
var baseMap = require('users/tl2581/packages:baseMap.js');
var colPal = require('users/tl2581/packages:colorPalette.js');

var projFolder = 'projects/GlobalFires/';

var sYear = 2005;
var eYear = 2019;
var nrtYear = eYear + 1;
var nrtEnd = '2020-09-18';
var maiacEnd = 'Aug 15, 2020';

var region = ee.Geometry.Rectangle([-180,0,0,90],null,false);
maiac = maiac.filterBounds(region);

// filter HMS smoke
var smokeLabels = ['Unspecified','Light','Medium','Heavy'];
var colPal_smoke = ['#000000','#E7D516','#DAA520','#964B00'];

var hmsCatList = {
  'Unspecified': 0,
  'Light': 5,
  'Medium': 16,
  'Heavy': 27
};

var applyHMScolor = function(hmsDay,hmsCat,hmsColor) {
  return hmsDay.filter(ee.Filter.eq('Density',hmsCatList[hmsCat]))
    .map(function(x) {return x.set('styleProperty', ee.Dictionary({'color': hmsColor}))});
};

var getHMS = function(year,month,day) {
  var hmsYr = ee.FeatureCollection(projFolder + 'HMS/HMS_' + year);
  
  var hmsDay = hmsYr.filter(ee.Filter.eq('Month',month))
    .filter(ee.Filter.eq('Day',day));
  
  var hmsDayUnSpec = applyHMScolor(hmsDay,'Unspecified',colPal_smoke[0]);
  var hmsDayLight = applyHMScolor(hmsDay,'Light',colPal_smoke[1]);
  var hmsDayMedium = applyHMScolor(hmsDay,'Medium',colPal_smoke[2]);
  var hmsDayHeavy = applyHMScolor(hmsDay,'Heavy',colPal_smoke[3]);
  
  return hmsDayUnSpec.merge(hmsDayLight)
    .merge(hmsDayMedium).merge(hmsDayHeavy);
};

// filter MODIS active fires
var getFire = function(year,month,day) {
  var sDate = ee.Date.fromYMD(year,month,day);
  var eDate = sDate.advance(1,'day');
  
  var firmsDay = firms.filterDate(sDate,eDate).first().select('T21').toInt().selfMask()
    .reduceToVectors({geometryType: 'centroid',
      eightConnected: false, geometry: region,
       bestEffort: true, maxPixels: 1e10});
  
  return firmsDay;
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
      
var getPM25 = function(year,month,day) {
  var inDate = ee.Date.fromYMD(year,month,day);
  
  var cams_day = cams.select('particulate_matter_d_less_than_25_um_surface')
    .filterDate(inDate,inDate.advance(1,'day'));
  
  var pm25_day = ee.Algorithms.If(cams_day.size().gt(0),
     cams_day.mean().multiply(1e9),ee.Image(0).selfMask());
  
  return ee.Image(pm25_day);
};

var getAOD_CAMS = function(year,month,day) {
  var inDate = ee.Date.fromYMD(year,month,day);
  
  var cams_day = cams.select('total_aerosol_optical_depth_at_550nm_surface')
    .filterDate(inDate,inDate.advance(1,'day'));
  
  var aod_day = ee.Algorithms.If(cams_day.size().gt(0),
     cams_day.mean(),ee.Image(0).selfMask());
  
  return ee.Image(aod_day);
};

// filter and calculate GOES RGB
var goesRGB_ID = {
  'GOES-16/East': 'NOAA/GOES/16/MCMIPF',
  'GOES-17/West': 'NOAA/GOES/17/MCMIPF'
};

var goesFire_ID = {
  'GOES-16/East': 'NOAA/GOES/16/FDCF',
  'GOES-17/West': 'NOAA/GOES/17/FDCF'
};

var goes_sDate = {
  'GOES-16/East': 'July 17, 2017',
  'GOES-17/West': 'December 4, 2018'
};

var applyScaleAndOffset = function(image,bandName) {
  var scale = ee.Number(image.get(bandName + '_scale'));
  var offset = ee.Number(image.get(bandName + '_offset'));
  
  return image.select(bandName).multiply(scale).add(offset);
};

var filterGOESday = function(satName,year,month,day) {
  var inDate = ee.Date.fromYMD(year,month,day);
  var goesDay = ee.ImageCollection(goesRGB_ID[satName])
    .filterDate(inDate.advance(5,'hour'),inDate.advance(28,'hour'));
  
  var goesHr = goesDay.filter(ee.Filter.calendarRange(0,3,'hour'))
    .merge(goesDay.filter(ee.Filter.calendarRange(11,23,'hour')));
    
  goesHr = goesHr.filter(ee.Filter.calendarRange(0,0,'minute'))
    .merge(goesHr.filter(ee.Filter.calendarRange(30,30,'minute')))
    .sort('system:time_start');
  
  return goesHr;
};

var getGOESdates = function(satName,year,month,day) {
  
  var goes_dates = filterGOESday(satName,year,month,day).toList(50).map(function(image) {
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

var getGOESrgb = function(satName,dateTime) {
  dateTime = ee.Date.parse({format: 'Y-MM-dd HH:mm',date: dateTime});
  var goesHr = ee.ImageCollection(goesRGB_ID[satName])
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
  
  var goesFire = ee.ImageCollection(goesFire_ID[satName])
    .filterDate(dateTime,dateTime.advance(1,'hour')).first()
    .select('DQF').eq(0).selfMask();
  
  return goesRGB.visualize({min:0, max:0.6, gamma: 1.25})
    .blend(goesFire.visualize({palette: 'red', opacity: 0.4}));
};

var getGOESrgb_mask = function(satName,dateTime) {
  dateTime = ee.Date.parse({format: 'Y-MM-dd HH:mm',date: dateTime});
  var goesHr = ee.ImageCollection(goesRGB_ID[satName])
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
  
  var goesMask = red.updateMask(green).updateMask(blue)
    .gt(0).selfMask().unmask(0);
  
  var goesRGB = red.addBands(green).addBands(blue)
    .multiply(goesMask).unmask(0);
  
  var goesFire = ee.ImageCollection(goesFire_ID[satName])
    .filterDate(dateTime,dateTime.advance(1,'hour')).first()
    .select('DQF').eq(0).selfMask();
  
  return goesRGB.visualize({min:0, max:0.6, gamma: 1.25})
    .blend(goesFire.visualize({palette: 'red', opacity: 0.4}));
};

// HMS extent
var hmsExtent = ee.FeatureCollection(projFolder + 'HMS/HMS_Extent');

var getSmokeStats = function(year,month,day) {
  
  var yyyymmdd = ee.Number(year).multiply(1e4)
    .add(ee.Number(month).multiply(1e2)).add(day);
    
  var hmsDayExtent = hmsExtent.filter(ee.Filter.eq('YYYYMMDD',yyyymmdd));
  
  var smokeExtentTitle = ui.Label('Smoke Extent',
    {fontWeight:'bold', fontSize: '18px', margin: '3px 8px 2px 8px'});
  
  hmsDayExtent = ee.List(['Unspecified','Light','Medium','Heavy','Total'])
    .map(function(hmsCat) {return hmsDayExtent.filter(ee.Filter.eq('Density',hmsCat)).first()});
  hmsDayExtent = ee.FeatureCollection(hmsDayExtent);
  
  var smokeExtent = ui.Chart.feature.byFeature(hmsDayExtent,
      'Density', ['Area','Count']
    ).setChartType('Table');
  
  return ui.Panel({
    widgets: [smokeExtentTitle,smokeExtent],
    style: {
      width: '250px',
      height: '200px',
      position: 'bottom-right'
    }
  });
};  

// HMS smoke duration
var hmsStats = ee.ImageCollection(projFolder + 'HMS/HMS_Stats');

// Time series chart for HMS smoke plumes
var getSmokeTSChart = function(year,hmsCat) {
  
  var smokeExtYr = hmsExtent.filter(ee.Filter.eq('Year',year));
  var nDay = ee.Date.fromYMD(year,12,31)
    .difference(ee.Date.fromYMD(year,1,1),'day').add(1);
    
  var smokeExt = ee.FeatureCollection(ee.List.sequence(1,nDay,1).map(function(JDay) {
    
    var hmsDay = smokeExtYr.filter(ee.Filter.eq('JDay',JDay))
      .filter(ee.Filter.eq('Density',hmsCat)).first();
    
    return hmsDay.set('Day',JDay,
      'Date', ee.Date.fromYMD(year,1,1).advance(ee.Number(JDay).subtract(1),'day'));
    }));
  
  smokeExt = smokeExt.filter(ee.Filter.eq('Valid',true));
  
  var smokeChart = ui.Chart.feature.byFeature(smokeExt,'Date',['Area'])
    .setOptions({
      title: 'Smoke Plumes in ' + year,
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
      lineWidth: 1.5,
      series: {0: {color: '#333'}},
      legend: {position: 'none'},
      height: '220px',
    });
  
  var chartDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '3px 0px 3px 0px',height:'0.2px',border:'1px solid black',stretch:'horizontal'});
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
    {fontWeight:'bold', fontSize: '18px', margin: '3px 8px 2px 8px'});
  
  var smokeTextDay = hmsSmokeText
    .filter(ee.Filter.eq('Year',year))
    .filter(ee.Filter.eq('Month',month))
    .filter(ee.Filter.eq('Day',day))
    .select(['HHMMstr','HtmlLink'],['HHMM','Link']);
  
  var nLinks = smokeTextDay.size();
  
  var smokeTxtChart = ui.Chart.feature.byFeature(smokeTextDay,'HHMM',['Link'])
    .setChartType('Table').setOptions({
      allowHtml: true
    });

  return ui.Panel({widgets: [smokeTxtTitle,smokeTxtChart],
    style: {
      width: '250px',
      position: 'bottom-right'
    }
  });
};

// MODIS burned area
var BA = ee.ImageCollection('MODIS/006/MCD64A1').select('BurnDate');
var outputRegion = ee.Geometry.Rectangle([-180,0,0,90],null,false);

// ===============
// User Interface
// ===============
// Info panel
var infoPanel = function() {
  var hmsToolLabel = ui.Label('HMS Smoke Explorer', {margin: '12px 0px 0px 8px', fontWeight: 'bold', fontSize: '24px', border: '1px solid black', padding: '3px 3px 3px 3px'});
  
  var infoLabel = ui.Label('NOAA\'s Hazard Mapping System (HMS) smoke product maps the extent of fire-related smoke plumes across the U.S. and adjacent areas.',
    {margin: '8px 20px 2px 8px', fontSize: '12.5px', color: '#777'});
  
  var dataLabel = ui.Label('[Data/Info]', {margin: '3px 5px 3px 8px', fontSize: '12.5px'}, 'https://www.ospo.noaa.gov/Products/land/hms.html');
  var codeLabel = ui.Label('[Code]', {margin: '3px 5px 3px 3px', fontSize: '12.5px'}, 'https://github.com/tianjialiu/HMS-Smoke');
  
  var headDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '12px 0px 5px 0px',height:'1.25px',border:'0.75px solid black',stretch:'horizontal'});
   
  var inputSectionLabel = ui.Label('Input Parameters', {margin: '8px 8px 5px 8px', fontWeight: 'bold', fontSize: '20px'});
  
  return ui.Panel([
    hmsToolLabel, infoLabel,
    ui.Panel([dataLabel, codeLabel], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    headDivider, inputSectionLabel
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
        timeModePanel.add(ui.Label('Note: 2005 & 2020 are not included in the summary due to partial data availability.',
          {fontSize: '12.5px', margin: '5px 8px 8px 8px', color: '#777'}));
      }
    });
  
  return viewPanel;
};

var getViewMode = function(viewPanel) {
  return viewPanel.widgets().get(1).getValue();
};

// Time panel
var setTimePanel = function(viewMode) {
  
  var dateInfoLabel = ui.Label('Filter HMS smoke and MODIS active fires by date.',
    {fontSize: '13px', margin: '10px 8px 5px 8px', color: '#777'});
  
  var yearLabel = ui.Label('2) Select Year:', {fontSize: '14.5px', margin: '8px 8px 8px 8px'});
  var yearSlider = ui.Slider({min: sYear, max: eYear, value: 2017, step: 1});
  if (viewMode == 'By Day') {yearSlider.setMax(nrtYear);}
  yearSlider.style().set('stretch', 'horizontal');
  var yearPanel = ui.Panel([yearLabel, yearSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  
  var dateLabel = ui.Label('3) Select Date:', {fontSize: '14.5px', margin: '12px 8px 8px 8px'});
  var dateSlider = ui.DateSlider({start: '2017-01-01', end: '2018-01-01', value: '2017-08-01'});
  dateSlider.style().set('stretch', 'horizontal');
  var datePanel = ui.Panel([dateLabel, dateSlider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  
  var timePanel = ui.Panel([dateInfoLabel,yearPanel]);
  
  if (viewMode == 'By Day') {
    yearSlider.onChange(function(inYear) {
      var startDate = ee.Date.fromYMD(inYear,1,1).format('Y-MM-dd').getInfo();
      var endDate = ee.Date.fromYMD(ee.Number(inYear).add(1),1,1).format('Y-MM-dd').getInfo();
      var inDate = ee.Date.fromYMD(inYear,8,1).format('Y-MM-dd').getInfo();
      
      if (inYear == sYear) {
        startDate = ee.Date.fromYMD(inYear,8,5).format('Y-MM-dd').getInfo();
        inDate = startDate;
      }
      
      if (inYear == nrtYear) {
        endDate = nrtEnd;
        inDate = endDate;
      }
      
      dateSlider = ui.DateSlider({start: startDate, end: endDate, value: inDate});
      dateSlider.style().set('stretch', 'horizontal');
    
      datePanel.remove(datePanel.widgets().get(1));
      datePanel.insert(1, dateSlider);
    });
    
    var satLabel = ui.Label('4) Select Satellite:', {fontSize: '14.5px', margin: '8px 8px 8px 8px'});
    var satSelect = ui.Select({
      items: ['GOES-16/East','GOES-17/West'],
      value: 'GOES-16/East',
      style: {margin: '3px 50px 5px 8px', stretch: 'horizontal'}
    });

    var satPanel = ui.Panel([satLabel, satSelect], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});

    timePanel = ui.Panel([dateInfoLabel,yearPanel,datePanel,satPanel]);
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
  var satName = timeModePanel.widgets().get(0).widgets().get(3).widgets().get(1).getValue();

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
  smoke: '( ⬛)',
  fire: '(️ 🔴)'
};

var getLegend = function(map) {
  var footDivider = ui.Panel(ui.Label(),ui.Panel.Layout.flow('horizontal'),
    {margin: '10px 0px 6px 0px',height:'1.25px',border:'0.75px solid black',stretch:'horizontal'});
  
  var legendPanel = ui.Panel({
    widgets: [
      footDivider,
      ui.Label('️Legend',{fontWeight:'bold',fontSize:'20px',margin:'8px 3px 8px 8px'}),
      getLayerCheck(map,symbol.smoke + ' Smoke', true, 3, 0.6,
        'Extent and density of smoke plumes observed from satellite images (e.g. GOES, VIIRS, MODIS) by NOAA\'s HMS analysts, spatially aggregated by highest smoke density category', '6px'),
      getLegendDiscrete(smokeLabels,colPal_smoke),
      getLayerCheck(map,symbol.fire + ' Active Fires', true, 4, 0.65,
        'Active fires detected by the MODIS sensor aboard the Terra and Aqua satellites', '6px'),
      ui.Label('Aerosol Optical Depth',{fontWeight:'bold',fontSize:'16px',margin:'2px 3px 0px 8px'}),
      ui.Label('MODIS Terra/Aqua MAIAC and ECMWF/CAMS Aerosol Optical Depth (AOD) at 550 nm',{fontSize:'13px',color:'#666',margin:'2px 3px 2px 8px'}),
      ui.Label('Note: MAIAC AOD is not yet updated past ' + maiacEnd + '; CAMS AOD is available from June 21, 2016',{fontSize:'12.5px',color:'#999',margin:'0px 3px 8px 8px'}),
      getLayerCheckSimple(map,'MAIAC', false, 1, 0.75),
      getLayerCheckSimple(map,'CAMS', false, 2, 0.75),
      getLegendContinuous(0.5,colPal.Spectral),
      getLayerCheck(map,'Surface PM2.5', false, 0, 0.55,
        'ECMWF/CAMS 24-hr average particulate matter (with diameter < 2.5 μm) concentrations, in μg/m³', '0px'),
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
    {margin: '10px 0px 6px 0px',height:'1.25px',border:'0.75px solid black',stretch:'horizontal'});
  
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
        'MODIS burned area extent', '6px'),
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
map0.setOptions('Map', {'Dark': baseMap.darkTheme});

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

controlPanel.add(infoPanel).add(viewPanel).add(timeModePanel).add(runButton);

var counter = 0;

// Run calculations, linked to submit button
runButton.onClick(function() {
  counter = counter + 1;
  
  mapPanel.clear();
  map0 = ui.Map(); map0.clear();
  map0.style().set({cursor:'crosshair'});
  map0.setCenter(-97,38.5,4);
  map0.setControlVisibility({fullscreenControl: false, layerList: false});
  map0.setOptions('Map', {'Dark': baseMap.darkTheme});
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
   
    var hmsDay = getHMS(inYear,inMonth,inDay);
    var fireDay = getFire(inYear,inMonth,inDay);
    var aodDay_maiac = getAOD_MAIAC(inYear,inMonth,inDay,'green');
    var aodDay_cams = getAOD_CAMS(inYear,inMonth,inDay);
    var pm25 = getPM25(inYear,inMonth,inDay);
  
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
    
    var goesDates = getGOESdates(satName,inYear,inMonth,inDay);
    var satCheckbox = ui.Checkbox({label: 'See ' + satName + ' RGB Images',
      style: {fontSize: '14.5px', position: 'bottom-left'}});
    var satMessage = ui.Label('* Available from ' + goes_sDate[satName] + ' to present',
      {fontSize: '11px', margin: '0 8px 8px 8px', color: '#777'});
    var satCheckBool = goesDates.size().eq(0).getInfo();
    satCheckbox.setDisabled(satCheckBool);
    var satPanel = ui.Panel({
      widgets: [satCheckbox,satMessage],
      style: {
        position: 'bottom-left',
        padding: '0'
      }
    });
    map0.add(satPanel);
    
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
            return getGOESrgb_mask(satName,dateTime);
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
          var goesRGB = getGOESrgb(satName,inDateTime);
          
          var goesLayer = ui.Map.Layer(goesRGB,{},'RGB',true,1).setOpacity(0.88);
          map1.layers().set(0, goesLayer);
          
          var zoomBox = ui.Panel({style: {margin: '0'}});
           
          // Add a label and the zoom box map to the default map.
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
          
          // Update the center of the zoom box map when the base map is clicked.
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
            
            // Define video parameters.
            var VID_params = {
              dimensions: 512,
              region: region,
              framesPerSecond: 6,
              crs: 'EPSG:3857',
            };
            
            var goesVID = ui.Thumbnail(goesRGBcol, VID_params);
           
            panel.clear(); panel.add(goesVID);
            
            var layer = ui.Map.Layer(outline, {color: 'FFFFFF'}, 'Zoom Box Bounds');
            map1.layers().set(1, layer);
          };
        
        });
      }
    });
  }
  
  if (viewMode == 'By Year') {
    var hmsStatsYr = hmsStats.filter(ee.Filter.eq('Year',inYear)).first();
    map0.addLayer(hmsStatsYr.select('SmokeDays').selfMask(),
      {min: 0, max: 70, palette: colPal.Grays},'Smoke Days',true,0.75);
    map0.addLayer(hmsStatsYr.select('Total').selfMask(),
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
        height: '325px'
      }});
    
    map0.add(chartHrsPanel);
    var chartStatsTitle = ui.Label('Smoke Statistics', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px 0px 8px'});
    var chartStatsInfo = ui.Label('(Click on map...)', {fontSize: '14px', color: '#666', margin: '8px 3px 0px 8px'});
    var chartDaysTitle = ui.Label('Smoke Days', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px 0px 8px'});
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
      
      var totalSmokeDays = ui.Label('Total: ' + smokeHrs.getNumber('SmokeDays').round().getInfo() + ' days',
        {fontSize: '14px', margin: '5px 3px 8px 8px'});
      var totalSmokeHrs = ui.Label('Total: ' + smokeHrs.getNumber('Total').round().getInfo() + ' hours',
        {fontSize: '14px', margin: '5px 3px -5px 8px'});
      
      var smokeHrsList = ee.FeatureCollection([
        ee.Feature(null,{HMS:'Unspecified',Duration:smokeHrs.getNumber('Unspecified')}),
        ee.Feature(null,{HMS:'Light',Duration:smokeHrs.getNumber('Light')}),
        ee.Feature(null,{HMS:'Medium',Duration:smokeHrs.getNumber('Medium')}),
        ee.Feature(null,{HMS:'Heavy',Duration:smokeHrs.getNumber('Heavy')}),
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
            3: {color: colPal_smoke[3]}
          },
          legend: {textStyle: {fontSize: '12.5'}},
          height: '190px'
        });
      
      var lonLatCoords = ui.Label('Lon (x): ' + Math.round(coords.lon*100)/100
          + ' | Lat (y): ' + Math.round(coords.lat*100)/100,
        {fontSize: '14px', margin: '-10px 3px 0px 8px'});
    
      chartHrsPanel.add(chartDaysTitle).add(totalSmokeDays)
        .add(chartHrsTitle).add(totalSmokeHrs)
        .add(smokeHrsChart).add(lonLatCoords);
    });
  }
  
  if (viewMode != 'Summary') {
    // Display times series chart:
    var tsChart = getSmokeTSChart(inYear,'Total');
    controlPanel.add(tsChart);
    
    var hmsCatLabel = ui.Label('Select Density:', {fontSize: '14.5px', margin: '8px 8px 8px 20px'});
    var hmsCatSelect = ui.Select({
      items: ['Total','Light','Medium','Heavy','Unspecified'],
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
  
  if (viewMode == 'Summary') {
    var hmsYrAvg = hmsStats.filter(ee.Filter.gt('Year',sYear)).mean();
    map0.addLayer(hmsYrAvg.select('SmokeDays').selfMask(),
      {min: 0, max: 70, palette: colPal.Grays},'Smoke Days',true,0.75);
    map0.addLayer(hmsYrAvg.select('Total').selfMask(),
      {min: 0, max: 500, palette: colPal.Sunset},'Total',false,0.75);
    
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
    var chartStatsTSTitle = ui.Label('Smoke Statistics', {fontSize: '18px', fontWeight: 'bold', margin: '3px 3px -8px 8px'});
    var chartStatsTSInfo = ui.Label('(Click on map...)', {fontSize: '14px', color: '#666', margin: '18px 3px 10px 8px'});
    chartHrsTSPanel.add(chartStatsTSTitle).add(chartStatsTSInfo);
    
    map0.onClick(function(coords) {
      chartHrsTSPanel.clear();
      
      var point = ee.Geometry.Point([coords.lon,coords.lat]);
      
      var smokeDays = hmsStats.filter(ee.Filter.gt('Year',sYear))
        .select('SmokeDays')
        .map(function(x) {
          return x.reduceRegions({
            collection: point,
            reducer: ee.Reducer.mean(),
            crs: 'EPSG:4326',
            scale: 1000
          }).first().set('Year',ee.Number(x.get('Year')).format('%04d'));
        });
      
      var smokeDaysChart = ui.Chart.feature.byFeature(smokeDays,'Year')
        .setSeriesNames(['Smoke Days'])
        .setChartType('LineChart')
        .setOptions({
          title: 'Smoke Days',
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
          legend: {position: 'none'},
          series: {0: {color: '000000'}}
        });
        
      var smokeHrs = hmsStats.filter(ee.Filter.gt('Year',sYear))
        .select(smokeLabels,['b1','b2','b3','b4'])
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
            3: {color: colPal_smoke[3]},
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
