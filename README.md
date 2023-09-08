# HMS-Smoke
NOAA's Hazard Mapping System ([HMS](https://www.ospo.noaa.gov/Products/land/hms.html)) Smoke Product

The [HMS Smoke Explorer](https://globalfires.earthengine.app/view/hms-smoke) allows end-users to visualize NOAA's Hazard Mapping System (HMS) smoke product, MODIS active fires and aerosol optical depth, and GOES-East/West RGB imagery. Since 2005, NOAA analysts manually inspect visible imagery (e.g. GOES, MODIS, VIIRS) and outline the extent of smoke across North America, classified into three density categories: light, medium, and heavy, to produce the HMS smoke product.

![banner image](https://github.com/tianjialiu/HMS-Smoke/blob/main/docs/imgs/HMS_Smoke_Explorer.png)

### Tool Capabilities
<img src="https://github.com/tianjialiu/HMS-Smoke/blob/main/docs/imgs/smoke_animation_2017aug01.gif" width="512">

* Make an animation looping GOES-East/West RGB imagery. Right-click on the GIF and select "Save Image As..." to save the animation to your local storage.
* View satellite-derived (MODIS) and model forecast (CAMS) aerosol optical depth and surface PM<sub>2.5</sub> with HMS smoke.
* View HMS smoke text descriptions and summary statistics.

### Datasets
| Dataset | Time Range | Spatial Resolution |
| :--- | :--- | :--- |
| [HMS Smoke](https://www.ospo.noaa.gov/Products/land/hms.html) | 2005/08-present | -- |
| [FIRMS/MODIS Active Fires](https://developers.google.com/earth-engine/datasets/catalog/FIRMS) | 2000/10-present | 1 km |
| [MODIS Burned Area](https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MCD64A1) | 2000/10-present | 500 m |
| [MODIS MAIAC Aerosol Optical Depth (AOD)](https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MCD19A2_GRANULES) | 2000/02-present | 1 km |
| [ECMWF/CAMS AOD, PM<sub>2.5</sub>](https://developers.google.com/earth-engine/datasets/catalog/ECMWF_CAMS_NRT) | 2016/06-present | 0.4° |
| [GOES-16/East](https://developers.google.com/earth-engine/datasets/tags/goes-16) | 2017/07-present | 2 km |
| [GOES-17/West](https://developers.google.com/earth-engine/datasets/tags/goes-17) | 2018/12-2023/01 | 2 km |
| [GOES-18/West](https://developers.google.com/earth-engine/datasets/tags/goes-18) | 2022/10-present | 2 km |

### HMS on EE
```
// read HMS polygons by year
var inYear = 2020;
var HMS = ee.FeatureCollection('projects/GlobalFires/HMS/HMS_' + inYear);

// filter by month and day
var inMonth = 8;
var inDay = 1
var HMSday = HMS.filter(ee.Filter.eq('Month',8)).filter(ee.Filter.eq('Day',1))
```

| Variable | Description | Format |
| :--- | :--- | :--- |
ID | Unique ID for each polygon | YYYYJJJ (1-4 = year, 5-7 = day of year, 8-11 = original row of a polygon in that day's raw HMS file)
Year | Year | 2005-present
Month | Month | 1-12
Day | Day | 1-31
JDay | Julian day or DOY | 1-365 
Start | Start time | HHMM
End | End time | HHMM
StSec | Start time | seconds since 1970-01-01
EndSec | End time | seconds since 1970-01-01
Duration | End time minus start time, with a 15-min buffer | hours
Density | Density of smoke polygon | 'Light', 'Medium', 'Heavy', or 'Unspecified'
Satellite | Satellite used as a reference for the polygon | e.g., 'GOES-EAST', 'GOES-WEST'
Area | Area of polygon | km<sup>2</sup>
QAFlag | QA flag | 0-5 (valid: 0 = good, 1 = coordinates adjusted, 2 = unclosed rings; invalid and not included in SHP: 3 = linestring, 4 = point / empty, 5 = crossed edges)
IsMulti | Is the polygon a multipolygon? | 'Y' or 'N'

Notes:
* The start and end time represent the time bounds of the satellite images used to draw the HMS polygons, not the actual persistence duration of the smoke plume
* In the tool, duration is used to estimate the annual contribution of each smoke density category at a particular location
* For QA = 1, out-of-bounds coordinates with y > 90 or y < -90 are removed (removes some anomalous coordinates), x < -180 is forced to be x = -180 as this may lead to disfigured polygons on EE
* For QA = 2, the first coordinate is repeated at the end of the list of coordinates to close the polygon ring

### Caveats
* The HMS smoke product represents smoke as seen from satellites. In some places, smoke may be aloft and may not affect surface air quality. This is particularly true for light smoke.
* Use caution when assessing trends in smoke using the HMS smoke product outside of CONUS. Note the lower spatial coverage in earlier years, which can be seen from the artificial boundaries in annual aggregates.
* The HMS 'Duration' is calculated from the start and end times of satellite images used to outline the smoke. Thus, it is not an estimate of the true smoke duration. HMS analysts outline smoke using only daytime satellite imagery and generally analyze heavy smoke twice per day in the morning and late afternoon.
* HMS smoke polygons in 2005-2007, 2009, and some in 2008 and 2010 are not classified into smoke density classes (light, medium, heavy).
* HMS smoke polygons with bad geometries and throws an error in R (i.e. drawn as lines rather than polygons, edges crossing edges) have been removed.
* GOES-16/East became operational on December 18, 2017, GOES-17/West on February 12, 2019, and GOES-18/West on January 4, 2023 (replacing GOES-17/West). Note these dates when selecting the GOES RGB images.

### HMS Quality Control
Number of HMS polygons in each year, and how many are invalid after processing in R (up to Sep 6, 2023).
| Year | Total | Valid | Invalid | 
| :--- | :--- | :--- | :--- | 
2005 | 6296 | 6291 | 5
2006 | 15453 | 15441 | 12
2007 | 19881 | 19870 | 11
2008 | 23203 | 23186 | 17
2009 | 23517 | 23480 | 37
2010 | 27241 | 27215 | 26
2011 | 33721 | 33704 | 17
2012 | 27972 | 27964 | 8
2013 | 23162 | 23143 | 19
2014 | 18565 | 18557 | 8
2015 | 16356 | 16344 | 12
2016 | 21280 | 21268 | 12
2017 | 25843 | 25841 | 2
2018 | 41331 | 41320 | 11
2019 | 42945 | 42934 | 11
2020 | 45440 | 45438 | 2
2021 | 27573 | 27572 | 1
2022 | 21906 | 21904 | 2
2023 | 15024 | 15023 | 1 

### Updates
* July 2023: updated R code to process HMS from rgdal to sf, code is now more inclusive of out-of-bounds polygons and attempts to fix some bad geometries (unclosed rings and out-of-bounds coordinates) but excludes polygons with crossed edges as sf cannot fix them; added QA flags; added jump to latest button
* September 2020: added option to select GOES-East or GOES-West full disk imagery, added CAMS PM<sub>2.5</sub> and AOD
* August 2020: added visualization of GOES RGB imagery, HMS smoke days and 'duration'
