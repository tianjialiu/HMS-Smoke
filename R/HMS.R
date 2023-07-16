# ====================================================
# Process HMS daily files, convert to yearly files
# ====================================================
# last updated: July 15, 2023
# Tianjia Liu

library("raster"); library("sf")
setwd("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Smoke_Polygons/")

xYears <- 2005:2023

nDaysLeap <- c(31,29,31,30,31,30,31,31,30,31,30,31)
nDaysNonLeap <- c(31,28,31,30,31,30,31,31,30,31,30,31)

yj_hhmm <- function(inTime) {
  as.POSIXct(inTime,format="%Y%j %H%M",tz="UTC")
}

world_boundary <- st_polygon(list(cbind(c(-180,180,180,-180,-180),c(-90,-90,90,90,-90))))

for (iYear in xYears) {
  shpYr <- list(); shpTally <- list()
  counter <- 0
  
  for (iMonth in 1:12) {
    if (iYear %% 4 == 0 && (iYear %% 100 != 0 || iYear %% 400 == 0)) {
      nDay <- nDaysLeap[iMonth]
    } else {
      nDay <- nDaysNonLeap[iMonth]
    }
    
    for (iDay in 1:nDay) {
      fileName <- paste0(iYear,"/",sprintf("%02d",iMonth),"/hms_smoke",iYear*1e4+iMonth*1e2+iDay,".shp")
      
      if (file.exists(fileName)) {
        inShp <- st_read(substr(fileName,1,7),substr(fileName,9,25),quiet=T)
        nShp <- nrow(inShp)
        
        if (nShp > 0) {
          counter <- counter + 1
          
          # Input shapefile
          inShp <- st_read(substr(fileName,1,7),substr(fileName,9,25),quiet=T)
          
          # ID
          JDay <- as.numeric(format(as.Date(substr(fileName,18,25),"%Y%m%d"),"%j"))
          if (is.null(inShp$ID[1])) {
            inShp$ID <- iYear*1e7+JDay*1e4+(1:nrow(inShp))
          } else {inShp$ID <- iYear*1e7+JDay*1e4+(as.numeric(inShp$ID)+1)}
          
          stTime <- yj_hhmm(inShp$Start)
          endTime <- yj_hhmm(inShp$End)
          
          inShp$Start <- as.numeric(do.call(rbind,strsplit(as.character(inShp$Start)," "))[,2])
          inShp$End <- as.numeric(do.call(rbind,strsplit(as.character(inShp$End)," "))[,2])
          
          # Date Y-M-D
          inShp$Year <- iYear
          inShp$Month <- iMonth
          inShp$Day <- iDay
          inShp$JDay <- JDay
          
          inShp$Duration <- as.numeric(difftime(endTime,stTime,units="mins"))/60
          
          stTimeAbs <- as.POSIXct("1970-01-01 00:00",tz="UTC")
          stTime <- as.POSIXct(paste0(iYear*1e7+JDay*1e4+inShp$Start),tz="UTC",format="%Y%j%H%M")
          inShp$StSec <- as.numeric(difftime(stTime,stTimeAbs,units="secs"))
          inShp$EndSec <- inShp$StSec+inShp$Duration*60*60
          
          inShp$Duration <- inShp$Duration + 0.25
          
          # Density
          if (inShp$Density[1] == "NA") {
            inShp$Density <- "Unspecified"
          }
          
          # Satellite
          if (inShp$Satellite[1] == "NA") {
            inShp$Satellite <- "Unspecified"
          }
          
          # Quality control
          raw_rows <- nrow(inShp)
          
          # remove invalid geometries: unclosed rings, edges crossing each other, too few vertices 
          for (iShp in 1:nrow(inShp)) {
            iShpCoords <- st_coordinates(inShp[iShp,])[,1:2]
            
            # make sure the geometry is not a point
            if (length(as.numeric(iShpCoords)) > 2) {
              # make sure the geometry is not a linestring
              if (nrow(iShpCoords) > 3) {
                # remove invalid coordinates 
                iShpCoords <- iShpCoords[which(iShpCoords[,2] >= -90 & iShpCoords[,2] <= 90),]
                
                # check if first coordinate is repeated
                firstLastDiff <- sum(abs(iShpCoords[1,]-iShpCoords[nrow(iShpCoords),]))
                if (firstLastDiff > 0) {
                  # repeat first coordinate to close unclosed rings if necessary
                  inShp$geometry[iShp] <- st_polygon(list(rbind(iShpCoords,iShpCoords[1,])))
                }
              }
            }
          }
          invalid_rows <- length(which(!st_is_valid(inShp)))
          inShp <- inShp[st_is_valid(inShp),] 
          
          # Projection
          inShp <- st_set_crs(inShp, 4326)
          
          # Area (sq. km)
          inShp$Area <- as.numeric(st_area(inShp)/1e6)
          
          inShp <- inShp[,c("ID","Year","Month","Day","JDay",
                            "Start","End","StSec","EndSec",
                            "Duration","Density","Satellite","Area")]
          shpYr[[counter]] <- inShp
          shpTally[[counter]] <- data.frame(Year=iYear,Month=iMonth,Day=iDay,JDay=JDay,
                                            Raw=raw_rows,Invalid=invalid_rows)
        }
      }
    }
  }
  
  shpYr <- do.call(rbind,shpYr)
  shpTally <- do.call(rbind,shpTally)
  
  suppressWarnings(st_write(shpYr,paste0("processed/HMS_",iYear,".shp"),quiet=T,append=F))
  write.csv(shpTally,paste0("processed/HMS_",iYear,"_QA.csv"),row.names=F)
  timestamp(prefix=paste("Year",iYear,": ##------"))
  
  print(colSums(shpTally[,c("Raw","Invalid")]))
}
