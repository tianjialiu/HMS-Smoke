# HMS-Smoke
NOAA's Hazard Mapping System ([HMS](https://www.ospo.noaa.gov/Products/land/hms.html)) Smoke Product

The [HMS Smoke Explorer](https://globalfires.earthengine.app/view/hms-smoke) allows end-users to visualize NOAA's Hazard Mapping System (HMS) smoke product, MODIS active fires and aerosol optical depth, and GOES-16/17 (East/West) RGB imagery. Since 2005, NOAA analysts manually inspect visible imagery (e.g. GOES, MODIS, VIIRS) and outline the extent of smoke across North America, classified into three density categories: light, medium, and heavy, to produce the HMS smoke product.

![banner image](https://github.com/tianjialiu/HMS-Smoke/blob/master/docs/imgs/HMS_Smoke_Explorer.png)

### Datasets
| Dataset | Time Range | Spatial Resolution |
| :--- | :--- | :--- |
| [HMS Smoke](https://www.ospo.noaa.gov/Products/land/hms.html) | 2005/08-present | -- |
| [FIRMS/MODIS Active Fires](https://developers.google.com/earth-engine/datasets/catalog/FIRMS) | 2000/10-present | 1 km |
| [MODIS Burned Area](https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MCD64A1) | 2000/10-present | 500 m |
| [MODIS MAIAC Aerosol Optical Depth (AOD)](https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MCD19A2_GRANULES) | 2000/02-present | 1 km |
| [GOES-16/17](https://developers.google.com/earth-engine/datasets/tags/goes) | 2017/07-present | 2 km |

### Updates
* September 2020: updated HMS to 2020, added option to select GOES-East or GOES-West full disk imagery
* August 2020: added visualization of GOES RGB imagery, HMS smoke days and 'duration'
