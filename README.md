# HMS-Smoke
NOAA's Hazard Mapping System ([HMS](https://www.ospo.noaa.gov/Products/land/hms.html))

The [HMS Smoke Explorer](https://globalfires.earthengine.app/view/hms-smoke) allows end-users to visualize NOAA's Hazard Mapping System (HMS) smoke and fire products, MODIS aerosol optical depth, and GOES-East/West RGB imagery. Since 2005, NOAA analysts have been inspecting satellite imagery (e.g. GOES, MODIS, VIIRS) and manually outlining the extent of smoke across North America, classified into three density categories: light, medium, and heavy, to produce the HMS smoke product. A corresponding HMS fire product includes active fire detections from multiple satellites/sensors (e.g., MODIS, VIIRS, GOES, AVHRR) with quality control by the analysts.

The latest date available in the HMS Smoke Explorer is May 29, 2025.

![banner image](https://github.com/tianjialiu/HMS-Smoke/blob/main/docs/imgs/HMSSmokeExplorer.png)

### Tool Capabilities
<img src="https://github.com/tianjialiu/HMS-Smoke/blob/main/docs/imgs/smoke_animation_2017aug01.gif" width="512">

* Make an animation looping GOES-East/West RGB imagery. Right-click on the GIF and select "Save Image As..." to save the animation to your local storage.
* View satellite-derived (MODIS) and model forecast (CAMS) aerosol optical depth and surface PM<sub>2.5</sub> with HMS smoke.
* View HMS smoke text descriptions and summary statistics.

### Datasets on HMS Smoke Explorer
The HMS Smoke Explorer covers the time range of the HMS Smoke Product (2005/08-present). Ancillary datasets for visualization are listed below.
| Dataset | Time Range | Spatial Resolution |
| :--- | :--- | :--- |
| [HMS Smoke](https://www.ospo.noaa.gov/Products/land/hms.html) | 2005/08-present | -- |
| [HMS Fire](https://www.ospo.noaa.gov/Products/land/hms.html) | 2003/04-present | -- |
| [HMS Smoke Text](https://www.ospo.noaa.gov/Products/land/hms.html) | 2005/07-present | -- |
| [MODIS Burned Area](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD64A1) | 2000/10-present | 500 m |
| [MODIS MAIAC Aerosol Optical Depth (AOD)](https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MCD19A2_GRANULES) | 2000/02-present | 1 km |
| [ECMWF/CAMS AOD, PM<sub>2.5</sub>](https://developers.google.com/earth-engine/datasets/catalog/ECMWF_CAMS_NRT) | 2016/06-present | 0.4° |
| [GOES-16/East](https://developers.google.com/earth-engine/datasets/tags/goes-16) | 2017/07-present | 2 km |
| [GOES-17/West](https://developers.google.com/earth-engine/datasets/tags/goes-17) | 2018/12-2023/01 | 2 km |
| [GOES-18/West](https://developers.google.com/earth-engine/datasets/tags/goes-18) | 2022/10-present | 2 km |
| [GOES-19/East](https://developers.google.com/earth-engine/datasets/tags/goes-19) | 2025/04-present | 2 km |

### HMS on Google Earth Engine
The processed HMS smoke product can be used for analysis on Google Earth Engine (EE) and downloaded as yearly files.
```
// read HMS smoke polygons and active fires by year
var inYear = 2020;
var HMS = ee.FeatureCollection('projects/GlobalFires/HMS/Smoke_Polygons/HMS_' + inYear);
var HMS_Fire = ee.FeatureCollection('projects/GlobalFires/HMS/Fire_Points/HMS_Fire_' + inYear);

// filter by month and day
var inMonth = 8;
var inDay = 1;
var HMS_day = HMS.filter(ee.Filter.eq('Month',8)).filter(ee.Filter.eq('Day',1));
var HMSFire_day = HMS_Fire.filter(ee.Filter.eq('Month',8)).filter(ee.Filter.eq('Day',1));

Map.addLayer(HMS_day);
Map.addLayer(HMSFire_day, {color:'red'});
Map.centerObject(HMS_day);

print(HMS_day);
print(HMSFire_day);
```

## HMS Smoke Product
| Variable | Description | Format |
| :--- | :--- | :--- |
ID | Unique ID for each polygon | YYYYJJJ (1-4 = year, 5-7 = day of year, 8-11 = original row of a polygon in that day's raw HMS file)
Year | Year | 2005-present
Month | Month | 1-12
Day | Day | 1-31
JDay | Julian day or DOY | 1-365 
Start | Start time, UTC  | HHMM
End | End time, UTC  | HHMM
StSec | Start time | seconds since 1970-01-01
EndSec | End time | seconds since 1970-01-01
Duration | End time minus start time, with a 15-min buffer | hours
Density | Density of smoke polygon | 'Light', 'Medium', 'Heavy', or 'Unspecified'
Satellite | Satellite used as a reference for the polygon | e.g., 'GOES-EAST', 'GOES-WEST'
Area | Area of polygon | km<sup>2</sup>
QAFlag | QA flag | 0-5 (valid: 0 = good, 1 = coordinates adjusted, 2 = unclosed rings; invalid and not included in SHP: 3 = linestring, 4 = point / empty, 5 = crossed edges)
IsMulti | Is the polygon a multipolygon? | 'Y' or 'N'
fillFlag* | Flag on gap-filling smoke density | 0 = no gapfill, 1 = gapfill (model with AOD), 2 = gapfill (model without AOD)
fillConf* | Confidence on gap-filled density based on predicted model outcomes from bootstrapping (polygons that did not need gap-filling are automatically labeled with a value of 1) | 0-1

&ast; only relevant for 2005-2010, so HMS files for only those years have these columns on EE

Notes:
* The start and end time represent the time bounds of the satellite images used to draw the HMS polygons, not the actual persistence duration of the smoke plume
* In the tool, duration is used to estimate the annual contribution of each smoke density category at a particular location
* For QA = 1, out-of-bounds coordinates with y > 90 or y < -90 are removed (removes some anomalous coordinates), x < -180 is forced to be x = -180 as this may lead to disfigured polygons on EE
* For QA = 2, the first coordinate is repeated at the end of the list of coordinates to close the polygon ring

### Caveats
* The HMS smoke product represents smoke as seen from satellites. In some places, smoke may be aloft and may not affect surface air quality. This is particularly true for light smoke.
* Use caution when assessing trends in smoke using the HMS smoke product outside of CONUS. Note the lower spatial coverage in earlier years, which can be seen from the artificial boundaries in annual aggregates.
* The HMS 'Duration' is calculated from the start and end times of satellite images used to outline the smoke. Thus, it is not an estimate of the true smoke duration. HMS analysts outline smoke using only daytime satellite imagery and generally analyze heavy smoke twice per day in the morning and late afternoon.
* HMS smoke polygons in 2005-2007, 2009, and some in 2008 and 2010 are not classified into smoke density classes (light, medium, heavy). We used random forest modeling to assign densities to all such polygons.
* HMS smoke polygons with bad geometries and throws an error in R (i.e. drawn as lines rather than polygons, edges crossing edges) have been removed.
* GOES-16/East became operational on December 18, 2017, GOES-17/West on February 12, 2019, and GOES-18/West on January 4, 2023 (replacing GOES-17/West). Note these dates when selecting the GOES RGB images.

### Summary Stats and Quality Control
Number of HMS polygons in each year, and how many are invalid after processing in R. The number of smoke polygons with gapfilled densities are also shown below.
| Year | Total | Valid | Invalid | Gapfill | 
| :--- | :--- | :--- | :--- | :--- | 
2005 | 6296 | 6291 | 5 | 6291 |
2006 | 15453 | 15441 | 12 | 15441 |
2007 | 19881 | 19870 | 11 | 19612 |
2008 | 23203 | 23186 | 17 | 5073 |
2009 | 23517 | 23480 | 37 | 23332 |
2010 | 27241 | 27215 | 26 | 7437 |
2011 | 33721 | 33704 | 17 | 0 |
2012 | 27972 | 27964 | 8 | 0 |
2013 | 23162 | 23143 | 19 | 0 |
2014 | 18565 | 18557 | 8 | 0 |
2015 | 16356 | 16344 | 12 | 0 |
2016 | 21280 | 21268 | 12 | 0 |
2017 | 25843 | 25841 | 2 | 0 |
2018 | 41331 | 41320 | 11 | 0 |
2019 | 42945 | 42934 | 11 | 0 |
2020 | 45440 | 45438 | 2 | 0 |
2021 | 27573 | 27572 | 1 | 0 |
2022 | 21906 | 21904 | 2 | 0 |
2023 | 20303 | 20302 | 1 | 0 |
2024 | 12544 | 12541 | 3 | 0 |
2025 | 8275 | 8273 | 2 | 0 |

Missing Dates
```
20050809,20050810,20060327,20060401,20060714,20060715,20061104,20070331,20070821,20080123,20080124,20080305,20081005,20090130,20090408,20121007,20150602,20150820,20160306,20161112,20170427,20170531,20170601,20170622,20170718,20190710,20190810
```

### Caveats
* The availability of the satellites is not uniform throughout the record. For example, recent years have higher-resolution active fire detections from VIIRS, which is more capable at detecting small fires.
* The geolocation error for active fire detections varies among different satellites/sensors (e.g., 10s-100s m for VIIRS and up to 1 km for GOES) [(see NOAA's HMS FAQ)](https://www.ospo.noaa.gov/products/land/hms.html#about)
* There are missing HMS fire data (no .zip files) on some days.
* Some entries have malformed and/or missing date/time.

## HMS Fire Product
| Variable | Description | Format |
| :--- | :--- | :--- |
Lon | Longitude (center) of active fire coordinates | float
Lat | Latitude (center) of active fire coordinates | float
Year | Year (HMS filename) | 2003-present
Month | Month (HMS filename) | 1-12
Day | Day (HMS filename) | 1-31
JDay | Julian day or DOY (HMS filename) | 1-365 
YearSat | Year (satellite) | 2003-present
MonthSat | Month (satellite) | 1-12
DaySat | Day (satellite) | 1-31
JDaySat | Julian day or DOY (satellite) | 1-365 
HHMMSat | Hour/minute of active fire detection, UTC | HHMM
Satellite | Satellite origin of active fire detection | e.g., 'GOES-EAST', 'GOES-WEST'
Method | Method of active fire detection | ANALYSIS = manual input, other labels = automated
Ecosystem | Ecosystem category derived from the [Global Land Cover Characterization database](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-land-cover-products-global-land-cover-characterization-glcc?qt-science_center_objects=0#qt-science_center_objects) | integer
QAFlag | QA flag for satellite detection date/time | 0, 1 (valid: 0 = good, 1 = date/time invalid and filled with HMS filename)

### Summary Stats and Quality Control
Number of HMS active fires from various satellites and missing days since April 1, 2003. MODIS includes Aqua and Terra, VIIRS includes S-NPP, NOAA-20, and NOAA-21, GOES includes GOES-East and GOES-West, and AVHRR includes NOAA-15 to NOAA-19 and METOP-A/B/2.
| Year | Available Days | Total Active Fires | MODIS | VIIRS | GOES | AVHRR | Unspecified | Malformed Datetime (%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
2003 | 219 | 192264 | 56661 | 0 | 78422 | 41818 | 15363 | 0 |
2004 | 362 | 531036 | 175776 | 0 | 134872 | 220388 | 0 | 0 |
2005 | 360 | 651044 | 228018 | 0 | 192847 | 230179 | 0 | 0 |
2006 | 360 | 285921 | 106080 | 0 | 72423 | 107418 | 0 | 0 |
2007 | 363 | 313656 | 106602 | 0 | 55716 | 151338 | 0 | 0 |
2008 | 366 | 481666 | 173927 | 0 | 86507 | 221232 | 0 | 0 |
2009 | 363 | 270833 | 93843 | 0 | 44733 | 132257 | 0 | 0 |
2010 | 365 | 330678 | 120127 | 0 | 63237 | 147314 | 0 | 0.02 |
2011 | 365 | 520365 | 173393 | 0 | 127661 | 219238 | 16 | 0.03 |
2012 | 366 | 433654 | 144903 | 0 | 104570 | 184181 | 0 | 0 |
2013 | 365 | 465282 | 160832 | 0 | 118188 | 186195 | 67 | 0.01 |
2014 | 364 | 359249 | 137836 | 343 | 74664 | 146406 | 0 | 0 |
2015 | 363 | 322907 | 130829 | 0 | 67129 | 124938 | 11 | 0 |
2016 | 362 | 326909 | 106902 | 14137 | 85019 | 120814 | 37 | 0.01 |
2017 | 360 | 712701 | 177054 | 210278 | 148459 | 176910 | 0 | 0 |
2018 | 362 | 1651738 | 130387 | 443825 | 990863 | 86653 | 10 | 0 |
2019 | 362 | 2579824 | 101782 | 2143731 | 293974 | 40337 | 0 | 0 |
2020 | 366 | 2493748 | 96669 | 2044170 | 352909 | 0 | 0 | 0 |
2021 | 365 | 4166429 | 142898 | 2597493 | 1426038 | 0 | 0 | 0 |
2022 | 365 | 3570747 | 80920 | 1834499 | 1655328 | 0 | 0 | 0 |
2023 | 365 | 8196303 | 0 | 5036609 | 3159694 | 0 | 0 | 0 |
2024 | 366 | 8434632 | 0 | 4773062 | 3661570 | 0 | 0 | 0 |
2025 | 147 | 3381422 | 0 | 1452865 | 1928557 | 0 | 0 | 0 |

Missing Dates or Corrupt Files
```
20030501,20030502,20030503,20030504,20030505,20030506,20030507,20030508,20030509,20030510,20030511,20030512,20030513,20030514,20030515,20030516,20030517,20030518,20030519,20030520,20030521,20030522,20030523,20030524,20030525,20030526,20030527,20030528,20030529,20030530,20030531,20030601,20030602,20030603,20030604,20030605,20030606,20030607,20030608,20030609,20030610,20030611,20030612,20030613,20030614,20030615,20030711,20030731,20030830,20030831,20030905,20030907,20030914,20031102,20031210,20031215,20040225,20040402,20040624,20041209,20050511,20050624,20050626,20050703,20050706,20060327,20060401,20060714,20060715,20061104,20070331,20070821,20090130,20090408,20140705,20150602,20150820,20160306,20161108,20161112,20161209,20170427,20170531,20170601,20170622,20170718,20180501,20181220,20181230,20190225,20190709,20190710,20250508,20250511
```

### Basic Code for Processing HMS Products
<b>Folder Structure</b>:
```
HMS/ 
	Fire_Points/
		2003/
		...
		2024/
		processed/
	HMS_Extent/
	Smoke_Polygons/
		2003/
		...
		2024/
		processed/
	Smoke_Text/
```
<b>Steps</b>:
1. Download the HMS .zip files to `HMS/Smoke_Polygons/` and `HMS/Fire_Points/` using `ancill/HMS_Download.R` and `ancill/HMS_Fire_Download.R`. Unzip using `ancill/HMS_Unzip.R` and `ancill/HMS_Fire_Unzip.R`.
2. Process HMS daily shapefiles and output yearly shapefiles to `HMS/Smoke_Polygons/processed/` and `HMS/Fire_Points/processed/` using `HMS.R` and `HMS_Fire.R`.
3. Retrieve HMS smoke text description links as .txt and output as yearly .csv tables in `HMS/Smoke_Text/` using `ancill/HMS_TextLinksYr.R`; combine the .csv files into a single file, `HMS/Smoke_Text/HMS_SmokeText.csv`, using `ancill/HMS_TextLinks.R`

### Gap-filling Unspecified Densities
We used random forest classification to assign densities (light, medium, or heavy) to polygons with unspecified densities from 2005-2010. This procedure is described in [Liu et al. (2024, IJWF)](https://doi.org/10.31223/X51963). Note that the code has recently been updated to use `sf` instead of `rgdal`, and additional processing has been done to fix more bad geometries. The code workflow uses EE to generate some input data for the random forest model (`HMS_Stack.js`,`HMS_AOD.js`). The rest of the workflow is in R with `RFmodel_prepare.R` to output a CSV table of data for all HMS polygons from 2005-2022, `RFmodel_withAOD.R` and `RFmodel_withoutAOD.R` to run the random forest classification models, `RFmodel_export.R` to output another CSV table now with the gap-filled densities, and finally `HMS_gapfill_shp.R` to rewrite HMS files from 2005-2010 with the gap-filled densities and associated flags.

### Updates
* May 2025: update `UI_HMS_Smoke.js` with GOES-19/East imagery and active fires
* April 2025: update `HMS_TextLinksYr.R` using the [NOAA OSPO archive](https://www.ospo.noaa.gov/products/land/smoke/); the FTP server used previously is no longer available
* October 2024: fixed missing HMS fire points in 2007
* August 2024: replaced FIRMS with the HMS fire product for the active fires layer on the app, update MODIS burned area layer from Collection 6 to 6.1
* July 2024: added VIIRS active fires to app; there seems to be some issues with recent active fire images in the Earth Engine / FIRMS dataset
* September 2023: uploaded gap-filled HMS polygons from 2005-2010 and added related code; added ancillary code for preprocessing; added note about evaluation of the HMS smoke product on the app
* July 2023: updated R code to process HMS from rgdal to sf, code is now more inclusive of out-of-bounds polygons and attempts to fix some bad geometries (unclosed rings and out-of-bounds coordinates) but excludes polygons with crossed edges as sf cannot fix them; added QA flags; added jump to latest button
* September 2020: added option to select GOES-East or GOES-West full disk imagery, added CAMS PM<sub>2.5</sub> and AOD
* August 2020: added visualization of GOES RGB imagery, HMS smoke days and 'duration'

### Publications
Liu, T., F.M. Panday, M.C. Caine, M. Kelp, D.C. Pendergrass, L.J. Mickley, E.A. Ellicott, M.E. Marlier, R. Ahmadov, and E.P. James (2024). Is the smoke aloft? Caveats regarding the use of the Hazard Mapping System (HMS) smoke product as a proxy for surface smoke presence across the United States. Int. J. Wildland Fire, 33, WF23148. https://doi.org/10.1071/WF23148
