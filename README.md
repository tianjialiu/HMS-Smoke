# HMS-Smoke
NOAA's Hazard Mapping System ([HMS](https://www.ospo.noaa.gov/Products/land/hms.html)) Smoke Product

The [HMS Smoke Explorer](https://globalfires.earthengine.app/view/hms-smoke) allows end-users to visualize NOAA's Hazard Mapping System (HMS) smoke product, MODIS active fires and aerosol optical depth, and GOES-16/17/18 (East/West) RGB imagery. Since 2005, NOAA analysts manually inspect visible imagery (e.g. GOES, MODIS, VIIRS) and outline the extent of smoke across North America, classified into three density categories: light, medium, and heavy, to produce the HMS smoke product.

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
| [GOES-17/West](https://developers.google.com/earth-engine/datasets/tags/goes-17) | 2018/12-present | 2 km |
| [GOES-18/West](https://developers.google.com/earth-engine/datasets/tags/goes-18) | 2022/10-present | 2 km |

### Caveats
* The HMS smoke product represents smoke as seen from satellites. In some places, smoke may be aloft and may not affect surface air quality.
* Use caution when assessing trends in smoke using the HMS smoke product outside of CONUS. Note the lower spatial coverage in pre-GOES-16/17 years, as denoted by the artificial boundaries in annual aggregates.
* The HMS 'Duration' is calculated from the start and end times of satellite images used to outline the smoke. Thus, it is not an estimate of the true smoke duration. HMS analysts outline smoke using only daytime satellite imagery and generally analyze heavy smoke twice per day in the morning and late afternoon.
* HMS smoke polygons in 2005-2007 and 2009 are not classified into smoke density classes (light, medium, heavy).
* HMS smoke polygons with bad geometries and throws an error in R (i.e. drawn as lines rather than polygons, edges crossing edges) have been removed.
* GOES-16 became operational on December 18, 2017, GOES-17 on February 12, 2019, and GOES-18 on January 4, 2023(replacing GOES-17)

### Updates
* July 2023: updated R code to process HMS from rgdal to sf, code is now more inclusive of out-of-bounds polygons and attempts to fix some bad geometries
* September 2020: added option to select GOES-East or GOES-West full disk imagery, added CAMS PM<sub>2.5</sub> and AOD
* August 2020: added visualization of GOES RGB imagery, HMS smoke days and 'duration'

### HMS Quality Control
| Year | Total | Invalid |
| :--- | :--- | :--- | 
| 2005 | 6296 | 8 |
| 2006 | 15453 | 18 |
| 2007 | 19881 | 16 |
| 2008 | 23203 | 23 |
| 2009 | 23517 | 43 |
| 2010 | 27241 | 34 |
| 2011 | 33721 | 20 |
| 2012 | 27972 | 9 |
| 2013 | 23162 | 19 |
| 2014 | 18565 | 9 |
| 2015 | 16356 | 7 |
| 2016 | 21280 | 7 |
| 2017 | 25843 | 2 |
| 2018 | 41331 | 10 |
| 2019 | 42945 | 11 |
| 2020 | 45440 | 2 |
| 2021 | 27573 | 1 |
| 2022 | 21906 | 3 |







