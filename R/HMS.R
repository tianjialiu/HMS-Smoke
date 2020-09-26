library("raster"); library("rgdal"); library("rgeos")

setwd("/Volumes/TLIU_DATA/HMS/Smoke_Polygons/")

xYears <- 2005:2020

nDaysLeap <- c(31,29,31,30,31,30,31,31,30,31,30,31)
nDaysNonLeap <- c(31,28,31,30,31,30,31,31,30,31,30,31)

ymd_hhmm <- function(y,m,d,hhmm) {
  as.POSIXct(paste0(y,"-",sprintf("%02d",m),"-",sprintf("%02d",d)," ",
                    substr(sprintf("%04d",hhmm),1,2),":",substr(sprintf("%04d",hhmm),3,4),":00"),
             tz="UTC")
}

for (iYear in xYears) {
  
  shpYr <- list()
  counter <- 0
  
  for (iMonth in 1:12) {
    if (iYear %% 4 == 0) {
      nDay <- nDaysLeap[iMonth]
    } else {
      nDay <- nDaysNonLeap[iMonth]
    }
    
    for (iDay in 1:nDay) {
      fileName <- paste0(iYear,"/",sprintf("%02d",iMonth),"/hms_smoke",iYear*1e4+iMonth*1e2+iDay,".shp")
      
      if (file.exists(fileName)) {
        nShp <- suppressWarnings(ogrInfo(substr(fileName,1,7),substr(fileName,9,25))$nrows)
        
        if (nShp > 0) {
          counter <- counter + 1
          
          # Input shapefile
          inShp <- readOGR(substr(fileName,1,7),substr(fileName,9,25),verbose=F)
          
          # Projection
          crs(inShp) <- crs(raster())
          
          # ID
          JDay <- as.numeric(format(as.Date(substr(fileName,18,25),"%Y%m%d"),"%j"))
          if (is.null(inShp$ID[1])) {
            inShp$ID <- iYear*1e7+JDay*1e4+(1:length(inShp))
          } else {inShp$ID <- iYear*1e7+JDay*1e4+(as.numeric(inShp$ID)+1)}
          
          if (is.null(inShp$Start[1]) | is.na(inShp$Start[1])) {
            inShp$Start <- NA
            inShp$End <- NA
          } else {
            if (nchar(as.character(inShp$Start[1])) <= 4) {
              inShp$Start <- as.numeric(as.character(inShp$Start))
              inShp$End <- as.numeric(as.character(inShp$End))
            } else {
              inShp$Start <- as.numeric(do.call(rbind,strsplit(as.character(inShp$Start)," "))[,2])
              inShp$End <- as.numeric(do.call(rbind,strsplit(as.character(inShp$End)," "))[,2])
            }
          }
          
          # Date Y-M-D
          inShp$Year <- iYear
          inShp$Month <- iMonth
          inShp$Day <- iDay
          inShp$JDay <- JDay
          
          # Duration, in hours
          stTime <- ymd_hhmm(inShp$Year,inShp$Month,inShp$Day,inShp$Start)
          endTime <- ymd_hhmm(inShp$Year,inShp$Month,inShp$Day,inShp$End)
          endTime[which(endTime < stTime)] <- endTime[which(endTime < stTime)] + 24*60*60
          
          inShp$Duration <- as.numeric(difftime(endTime,stTime,units="mins"))/60
          
          stTimeAbs <- as.POSIXct("1970-01-01 00:00",tz="UTC")
          stTime <- as.POSIXct(paste0(iYear*1e7+JDay*1e4+inShp$Start),tz="UTC",format="%Y%j%H%M")
          inShp$StSec <- as.numeric(difftime(stTime,stTimeAbs,units="secs"))
          inShp$EndSec <- inShp$StSec+inShp$Duration*60*60
          
          inShp$Duration <- inShp$Duration + 0.25
          
          # Density
          if (is.null(inShp$Density[1])) {
            inShp$Density <- 0
          } else if (is.na(inShp$Density[1])) {
            inShp$Density <- 0
          } else {inShp$Density <- as.numeric(as.character(inShp$Density))}
          
          # Satellite
          if (is.null(inShp$Satellite[1])) {
            inShp$Satellite <- "Unspecified"
          } else if (is.na(inShp$Satellite[1])) {
            inShp$Satellite <- "Unspecified"
          } else {inShp$Satellite <- inShp$Satellite}
          
          inShp <- inShp[,c("ID","Year","Month","Day","JDay",
                            "Start","End","StSec","EndSec",
                            "Duration","Density","Satellite")]
          shpYr[[counter]] <- inShp
        }
      }
    }
  }
  
  shpYr <- do.call(rbind,shpYr)
  
  # remove bad geometries
  # 1. outside extent of satellite view
  inExt <- as.vector(extent(shpYr))
  if (inExt[1] < -180 | inExt[2] > 0 | inExt[3] < -90 | inExt[4] > 90) {
    
    extShp <- matrix(NA,length(shpYr),4)
    for (iShp in 1:length(shpYr)) {
      extShp[iShp,] <- as.vector(extent(shpYr[iShp,]))
    }
    
    badGeom <- unique(c(which(extShp[,1] < -180),which(extShp[,2] > 0),which(extShp[,3] < -90),which(extShp[,4] > 90)))
    shpYr <- shpYr[-badGeom,]
  }
  
  # 2. drawn as lines, not polygons
  nVertex <- sapply(shpYr@polygons,function(y) nrow(y@Polygons[[1]]@coords))
  shpYr <- shpYr[which(nVertex > 3),]
  
  # calculate area, sq. km
  shpYrEqArea <- spTransform(shpYr,crs("+proj=cea +lon_0=0 +lat_ts=45 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs"))
  shpYr$Area <- gArea(shpYrEqArea,byid=T)/1e6
  
  writeOGR(shpYr,"processed",paste0("HMS_",iYear),driver="ESRI Shapefile",overwrite_layer=T)
  timestamp(prefix=paste("Year",iYear,": ##------"))
}
