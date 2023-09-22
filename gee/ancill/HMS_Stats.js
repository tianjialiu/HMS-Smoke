// ==================================================
// HMS_Stats.js
// --------------------------------------------------
// @author Tianjia Liu (tianjia.liu@columbia.edu)
// Last updated: September 22, 2023
// --------------------------------------------------
// Output smoke days and "duration" as annual images
// in EE Assets
// ==================================================
Map.setCenter(-100,45,0);

var projFolder = 'projects/GlobalFires/';

var getYrDuration = function(hmsYr, density) {
  return hmsYr.filter(ee.Filter.eq('Density',density))
    .reduceToImage(['Duration'],'sum').rename(density)
    .reproject({crs:'EPSG:4326', scale:1000});
};

for (var inYear = 2005; inYear <= 2022; inYear++) {
  var hmsYr = ee.FeatureCollection(projFolder + 'HMS/HMS_' + inYear);

  var hmsUnSpec = getYrDuration(hmsYr,'Unspecified');
  var hmsLight = getYrDuration(hmsYr,'Light');
  var hmsMedium = getYrDuration(hmsYr,'Medium');
  var hmsHeavy = getYrDuration(hmsYr,'Heavy');

  var hmsYrDuration = hmsUnSpec.addBands(hmsLight)
    .addBands(hmsMedium).addBands(hmsHeavy);
    
  hmsYrDuration = hmsYrDuration
    .addBands(hmsYrDuration.reduce(ee.Reducer.sum()).rename('Total'));

  var hmsSmokeDays = hmsYr
    .reduceToImage(['JDay'],ee.Reducer.countDistinct())
    .reproject({crs:'EPSG:4326', scale:1000})
    .rename('SmokeDays').toInt();
  
  var hmsYrStats = hmsYrDuration.addBands(hmsSmokeDays)
    .set('Year',inYear)
    .set('system:time_start',ee.Date.fromYMD(inYear,1,1).millis());

  Export.image.toAsset({
    image: hmsYrStats,
    description: 'HMS_Stats_' + inYear,
    assetId: 'projects/GlobalFires/HMS/HMS_Stats/HMS_Stats_' + inYear,
    region: ee.Geometry.Rectangle([-180,0,0,90],null,false),
    scale: 1000,
    crs: 'EPSG:4326',
    maxPixels: 1e12
  });
}
  
