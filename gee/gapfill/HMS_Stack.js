// ==================================================
// HMS_Stack.js
// --------------------------------------------------
// @author Tianjia Liu (tianjia.liu@columbia.edu)
// Last updated: September 22, 2023
// --------------------------------------------------
// Calculate the "overlap" fraction of each polygon
// with other polygons on the same day, used
// for gap-filling model
// ==================================================
var projFolder = 'projects/GlobalFires/';

var sYear = 2005;
var eYear = 2022;

var getStackVal = function(inHMS) {
  var jday = inHMS.getNumber('JDay');
  var id = inHMS.get('ID');
  
  var hmsDay = ee.FeatureCollection(hmsYr).filter(ee.Filter.eq('JDay',jday));
  var hmsDayOverlap = ee.Feature(hmsDay.filter(ee.Filter.neq('ID',id)).union().first())
    .intersection(inHMS);
    
  var overlapPer = hmsDayOverlap.area().divide(inHMS.area());
  
  return inHMS.set('Overlap',overlapPer).setGeometry(null);
};

for (var inYear = sYear; inYear <= eYear; inYear++) {
  var hmsYr = ee.FeatureCollection(projFolder + 'HMS/HMS_' + inYear);
  var hmsYrStack = ee.FeatureCollection(hmsYr).map(getStackVal)
    .sort('ID');

  Export.table.toDrive({
    collection: hmsYrStack,
    description: 'HMS_' + inYear + '_Stack',
    selectors: ['ID','Year','Month','Day','JDay',
      'Area','Density','Overlap'],
  });
}
