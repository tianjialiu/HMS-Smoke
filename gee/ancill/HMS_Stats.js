// ==================================================
// HMS_Stats.js
// --------------------------------------------------
// @author Tianjia Liu (embrslab@gmail.com)
// Last updated: January 19, 2024
// --------------------------------------------------
// Output smoke days and "duration" as annual images
// in EE Assets
// ==================================================
Map.setCenter(-100,45,0);

var projFolder = 'projects/GlobalFires/';

var getDuration = function(hmsYr, density) {
  return hmsYr.filter(ee.Filter.eq('Density',density))
    .reduceToImage(['Duration'],'sum').rename(density)
    .reproject({crs:'EPSG:4326', scale:1000});
};

var getSmokeDays = function(hmsYr, density) {
  return hmsYr.filter(ee.Filter.inList('Density',density))
    .reduceToImage(['JDay'],ee.Reducer.countDistinct())
    .reproject({crs:'EPSG:4326', scale:1000})
    .rename('SmokeDays').toInt();
};

for (var inYear = 2005; inYear <= 2024; inYear++) {
  var hmsYr = ee.FeatureCollection(projFolder + 'HMS/Smoke_Polygons/HMS_' + inYear);

  var hmsLight = getDuration(hmsYr,'Light');
  var hmsMedium = getDuration(hmsYr,'Medium');
  var hmsHeavy = getDuration(hmsYr,'Heavy');

  var hmsDuration = hmsLight.addBands(hmsMedium).addBands(hmsHeavy)
    .rename(['Duration_Light','Duration_Medium','Duration_Heavy']);
    
  hmsDuration = hmsDuration
    .addBands(hmsDuration.reduce(ee.Reducer.sum()).rename('Duration_Total'));

  var hmsSmokeDays_Light = getSmokeDays(hmsYr,['Light','Medium','Heavy']);
  var hmsSmokeDays_Medium = getSmokeDays(hmsYr,['Medium','Heavy']);
  var hmsSmokeDays_Heavy = getSmokeDays(hmsYr,['Heavy']);
  
  var hmsSmokeDays = hmsSmokeDays_Light.addBands(hmsSmokeDays_Medium).addBands(hmsSmokeDays_Heavy)
    .rename(['SmokeDays_Light','SmokeDays_Medium','SmokeDays_Heavy']);
    
  var hmsYrStats = hmsDuration.addBands(hmsSmokeDays)
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
  
