/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var maiac = ee.ImageCollection("MODIS/006/MCD19A2_GRANULES");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ==================================================
// HMS_AOD.js
// --------------------------------------------------
// @author Tianjia Liu (tianjia.liu@columbia.edu)
// Last updated: September 22, 2023
// --------------------------------------------------
// Calculate the mean MODIS MAIAC AOD within each
// polygon, used for gap-filling model
// ==================================================
var projFolder = 'projects/GlobalFires/';

var sYear = 2005;
var eYear = 2022;

var crs = maiac.first().select('Optical_Depth_055').projection();
var scale = crs.nominalScale();

var getAOD = function(inHMS) {
  var year = inHMS.getNumber('Year');
  var jday = inHMS.getNumber('JDay');
  
  var maiacDayCol = maiac.select('Optical_Depth_055')
    .filter(ee.Filter.calendarRange(year,year,'year'))
    .filter(ee.Filter.calendarRange(jday,jday,'day_of_year'));
  var maiacDayCol_mean = maiacDayCol.mean();
  
  var n_maiac = maiacDayCol.size();
  
  var emptyImg = ee.Image().toFloat().rename('Optical_Depth_055');
  maiacDayCol = ee.Algorithms.If(n_maiac.gt(0),maiacDayCol_mean,emptyImg);

  var maiacDay = ee.Image(maiacDayCol).multiply(0.001).reduceRegions({
      collection: inHMS,
      reducer: ee.Reducer.mean().setOutputs(['AOD']),
      crs: crs,
      scale: scale
    }).first();
  
  return maiacDay;
};

for (var inYear = sYear; inYear <= eYear; inYear++) {
  for (var inMonth = 1; inMonth <= 12; inMonth++) {
    var hmsYr = ee.FeatureCollection(projFolder + 'HMS/HMS_' + inYear)
      .filter(ee.Filter.eq('Month',inMonth))
      .sort('ID');
      
    var hmsYrAOD = ee.FeatureCollection(hmsYr).map(getAOD);
  
    Export.table.toDrive({
      collection: hmsYrAOD,
      description: 'HMS_' + (inYear*1e2 + inMonth) +  '_AOD',
      selectors: ['ID','Year','Month','Day','JDay',
        'Area','Density','AOD'],
    });
  }
}
  

