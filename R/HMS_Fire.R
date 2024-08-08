# =======================================================
# HMS_Fire.R
# -------------------------------------------------------
# process daily HMS fire shapefiles and combine by year
# =======================================================
# last updated: August 7, 2024
# Tianjia Liu (embrslab@gmail.com)
# -------------------------------------------------------
library("raster"); library("sf"); library("stringr")
setwd("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Fire_Points/")

xYears <- 2003:2024

nDaysLeap <- c(31,29,31,30,31,30,31,31,30,31,30,31)
nDaysNonLeap <- c(31,28,31,30,31,30,31,31,30,31,30,31)

yj_hhmm <- function(inTime) {
  as.POSIXct(inTime,format="%Y%j %H%M",tz="UTC")
}

shp_rowNames <- c("Lon","Lat","Year","Month","Day","JDay",
                  "YearSat","MonthSat","DaySat","JDaySat","HHMMSat",
                  "QAFlag","Satellite","Method","Ecosystem","FRP")

for (inYear in xYears) {
  shpYr <- list()
  counter <- 0
  
  for (inMonth in 1:12) {
    if (inYear %% 4 == 0 && (inYear %% 100 != 0 || inYear %% 400 == 0)) {
      nDay <- nDaysLeap[inMonth]
    } else {
      nDay <- nDaysNonLeap[inMonth]
    }
    
    for (inDay in 1:nDay) {
      fileName <- paste0(inYear,"/",sprintf("%02d",inMonth),"/hms_fire",inYear*1e4+inMonth*1e2+inDay,".shp")
      
      if (file.exists(fileName)) {
        # Input shapefile
        inShp <- suppressWarnings(st_read(substr(fileName,1,7),substr(fileName,9,24),quiet=T))
        nShp <- nrow(inShp)
        
        if (nShp > 0) {
          counter <- counter + 1
          
          inDateSat <- as.Date(as.character(inShp$YearDay),format="%Y%j")
          inDate <- as.Date(substr(fileName,17,24),format="%Y%m%d")
          
          # Date Y-M-D
          inShp$YearSat <- as.numeric(format(inDateSat,"%Y"))
          inShp$MonthSat <- as.numeric(format(inDateSat,"%m"))
          inShp$DaySat <- as.numeric(format(inDateSat,"%d"))
          inShp$JDaySat <- as.numeric(format(inDateSat,"%j"))
          
          inShp$Year <- as.numeric(format(inDate,"%Y"))
          inShp$Month <- as.numeric(format(inDate,"%m"))
          inShp$Day <- as.numeric(format(inDate,"%d"))
          inShp$JDay <- as.numeric(format(inDate,"%j"))
          
          inShp$QAFlag <- 0
          inShp$QAFlag[is.na(inShp$YearSat)] <- 1
          
          inShp$YearSat[inShp$QAFlag == 1] <- inShp$Year[inShp$QAFlag == 1]
          inShp$MonthSat[inShp$QAFlag == 1] <- inShp$Month[inShp$QAFlag == 1]
          inShp$DaySat[inShp$QAFlag == 1] <- inShp$Day[inShp$QAFlag == 1]
          inShp$JDaySat[inShp$QAFlag == 1] <- inShp$JDay[inShp$QAFlag == 1]
          
          inShp$HHMMSat <- as.numeric(inShp$Time)
          inShp$HHMMSat[which(inShp$HHMMSat < 0 | inShp$HHMMSat > 2400)] <- NA
          
          inShp$FRP[which(inShp$FRP < 0)] <- NA
          
          # Projection
          inShp <- st_transform(inShp, crs=4326)
          
          inShp <- inShp[,shp_rowNames]
          shpYr[[counter]] <- inShp
        }
      }
    }
  }
  
  shpYr <- do.call(rbind,shpYr)
  
  suppressWarnings(st_write(shpYr,paste0("processed/HMS_Fire_",inYear,".shp"),quiet=T,append=F))
  timestamp(prefix=paste("Year",inYear,": ##------"))
}
