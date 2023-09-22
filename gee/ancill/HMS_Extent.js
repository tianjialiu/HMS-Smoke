// ==================================================
// HMS_Extent.js
// --------------------------------------------------
// @author Tianjia Liu (tianjia.liu@columbia.edu)
// Last updated: September 22, 2023
// --------------------------------------------------
// Calculate the daily areal extent of smoke polygons
// by density category
// ==================================================
var projFolder = 'projects/GlobalFires/';

var sYear = 2005;
var eYear = 2023;

// filter HMS smoke
var getSmokeExtent = function(hmsDay,hmsCat,YYYYMMDD) {
  var hmsDaySmoke = hmsDay.filter(ee.Filter.eq('Density',hmsCat));
  var hmsDayCount = hmsDaySmoke.size();
  var hmsDayArea = hmsDaySmoke.union().geometry().area().divide(1e6).round().toInt();
 
  return ee.Feature(null,{YYYYMMDD: YYYYMMDD, Density: hmsCat,
    'Area': hmsDayArea, Count: hmsDayCount});
};

var getSmokeStats = function(year,month,day) {
  var hmsYr = ee.FeatureCollection(projFolder + 'HMS/HMS_' + year);
  
  var YYYYMMDD = ee.Number(year).multiply(1e4)
    .add(ee.Number(month).multiply(1e2)).add(day);
    
  var hmsDay = hmsYr.filter(ee.Filter.eq('Month',month))
    .filter(ee.Filter.eq('Day',day));
  
  var hmsDayLight = getSmokeExtent(hmsDay,'Light',YYYYMMDD);
  var hmsDayMedium = getSmokeExtent(hmsDay,'Medium',YYYYMMDD);
  var hmsDayHeavy = getSmokeExtent(hmsDay,'Heavy',YYYYMMDD);
  
  var hmsDayCount = hmsDay.size();
  var hmsDayArea = hmsDay.union().geometry().area().divide(1e6).round().toInt();
  var hmsDayTotal = ee.Feature(null,{YYYYMMDD: YYYYMMDD, Density: 'Total',
    'Area': hmsDayArea, Count: hmsDayCount});

  return ee.FeatureCollection([hmsDayLight,hmsDayMedium,hmsDayHeavy,hmsDayTotal]);
};  

var getSmokeStatsYr = function(iDay) {
  var inDate = firstDay.advance(iDay,'day');
  return getSmokeStats(inYear,inDate.get('month'),inDate.get('day'));
};

for (var inYear = sYear; inYear <= eYear; inYear++) {
  var firstDay = ee.Date.fromYMD(inYear,1,1);
  var lastDay = ee.Date.fromYMD(inYear,12,31);
  var nDay = lastDay.difference(firstDay,'day');
  
  var hmsExtent = ee.FeatureCollection(ee.List.sequence(0,nDay,1).map(getSmokeStatsYr))
    .flatten();
  
  Export.table.toDrive({
    collection: hmsExtent,
    description: 'HMS_Extent_' + inYear,
    selectors: ['YYYYMMDD','Density','Area','Count']
  });
}
