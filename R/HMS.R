# ====================================================
# HMS.R
# ----------------------------------------------------
# process daily HMS shapefiles and combine by year
# ====================================================
# last updated: June 2, 2025
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")
homeDir <- file.path(projDir,"Smoke_Polygons/")
setwd(homeDir)

xYears <- 2003:2025

nDaysLeap <- c(31,29,31,30,31,30,31,31,30,31,30,31)
nDaysNonLeap <- c(31,28,31,30,31,30,31,31,30,31,30,31)

yj_hhmm <- function(inTime) {
  as.POSIXct(inTime,format="%Y%j %H%M",tz="UTC")
}

shp_rowNames <- c("ID","Year","Month","Day","JDay",
                  "Start","End","StSec","EndSec",
                  "Duration","Density","Satellite","Area","QAFlag","IsMulti")

for (inYear in xYears) {
  shpYr <- list(); shpTally <- list(); shpMat <- list()
  counter <- 0
  
  for (inMonth in 1:12) {
    if (inYear %% 4 == 0 && (inYear %% 100 != 0 || inYear %% 400 == 0)) {
      nDay <- nDaysLeap[inMonth]
    } else {
      nDay <- nDaysNonLeap[inMonth]
    }
    
    for (inDay in 1:nDay) {
      fileName <- paste0(inYear,"/",sprintf("%02d",inMonth),"/hms_smoke",inYear*1e4+inMonth*1e2+inDay,".shp")
      
      if (file.exists(fileName)) {
        # Input shapefile
        inShp <- suppressWarnings(st_read(substr(fileName,1,7),substr(fileName,9,25),quiet=T))
        nShp <- nrow(inShp)
        
        if (nShp > 0) {
          counter <- counter + 1
          
          # ID
          JDay <- as.numeric(format(as.Date(substr(fileName,18,25),"%Y%m%d"),"%j"))
          if (is.null(inShp$ID[1])) {
            inShp$ID <- inYear*1e7+JDay*1e4+(1:nrow(inShp))
          } else {inShp$ID <- inYear*1e7+JDay*1e4+(as.numeric(inShp$ID)+1)}
          
          stTime <- yj_hhmm(inShp$Start)
          endTime <- yj_hhmm(inShp$End)
          
          inShp$Start <- as.numeric(do.call(rbind,strsplit(as.character(inShp$Start)," "))[,2])
          inShp$End <- as.numeric(do.call(rbind,strsplit(as.character(inShp$End)," "))[,2])
          
          # Date Y-M-D
          inShp$Year <- inYear
          inShp$Month <- inMonth
          inShp$Day <- inDay
          inShp$JDay <- JDay
          
          inShp$Duration <- as.numeric(difftime(endTime,stTime,units="mins"))/60
          
          stTimeAbs <- as.POSIXct("1970-01-01 00:00",tz="UTC")
          stTime <- as.POSIXct(paste0(inYear*1e7+JDay*1e4+inShp$Start),tz="UTC",format="%Y%j%H%M")
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
          
          # QA flags
          # valid: 0 = good, 1 = coords adjusted, 2 = unclosed rings
          # invalid: 3 = linestring, 4 = point / empty, 5 = crossed edges
          inShp$QAFlag <- NA
          
          # remove invalid geometries: unclosed rings, edges crossing each other, too few vertices 
          for (iShp in 1:nrow(inShp)) {
            inShp$QAFlag[iShp] <- 4
            iShpCoords <- st_coordinates(inShp[iShp,])[,1:2]
            
            # make sure the geometry is not a point or empty
            if (as.numeric(length(iShpCoords)) > 2) {
              inShp$QAFlag[iShp] <- 3
              
              # make sure the geometry is not a linestring
              if (nrow(iShpCoords) > 3) {
                inShp$QAFlag[iShp] <- 0
                
                # check if the first coordinate is repeated
                firstLastDiff <- sum(abs(iShpCoords[1,]-iShpCoords[nrow(iShpCoords),]))
                if (firstLastDiff > 0) {
                  inShp$QAFlag[iShp] <- 2
                  
                  # repeat first coordinate to close unclosed rings if necessary
                  inShp$geometry[iShp] <- st_polygon(list(rbind(iShpCoords,iShpCoords[1,])))
                  iShpCoords <- st_coordinates(inShp[iShp,])[,1:2]
                }
                
                if (length(which(iShpCoords[,2] < -90 | iShpCoords[,2] > 90 | iShpCoords[,1] < -180)) > 0) {
                  inShp$QAFlag[iShp] <- 1
                  
                  # remove invalid y coordinates 
                  iShpCoords <- iShpCoords[which(iShpCoords[,2] >= -90 & iShpCoords[,2] <= 90),]
                  
                  # make out-of-bounds x coordinates valid
                  iShpCoords[,1][which(iShpCoords[,1] < -180)] <- -180
                  inShp$geometry[iShp] <- st_polygon(list(iShpCoords))
                }
                
                if (max(st_coordinates(inShp[iShp,])[,-c(1:2)]) > 1) {
                  inShp$IsMulti[iShp] <- 'Y'
                }
              }
            }
          }
          inShp <- st_make_valid(inShp)
          inShp$QAFlag[str_starts(st_is_valid(inShp,reason=T),"Edge")] <- 5
          
          # Is the geometry a multipolygon?
          inShp$IsMulti <- 'N'
          for (iShp in 1:nrow(inShp)) {
            if (length(inShp[iShp,]$geometry[[1]]) > 1) {
              inShp$IsMulti[iShp] <- 'Y'
            }
          }
          
          shpMat[[counter]] <- as.data.frame(inShp)[,shp_rowNames[-which(shp_rowNames=="Area")]]
          
          inShp <- inShp[st_is_valid(inShp),]
          
          # Projection
          inShp <- st_set_crs(inShp, 4326)
          
          # Area (sq. km)
          inShp$Area <- as.numeric(st_area(inShp)/1e6)
          inShp <- inShp[inShp$Area > 0,] # removes points, linestrings
          
          # calculate number of valid, invalid polygons
          valid_rows <- nrow(inShp)
          invalid_rows <- raw_rows-valid_rows
          
          inShp <- inShp[,shp_rowNames]
          shpYr[[counter]] <- inShp
          shpTally[[counter]] <- data.frame(Year=inYear,Month=inMonth,Day=inDay,JDay=JDay,
                                            Raw=raw_rows,Valid=valid_rows,Invalid=invalid_rows)
        }
      }
    }
  }
  
  shpYr <- do.call(rbind,shpYr)
  shpTally <- do.call(rbind,shpTally)
  shpMat <- do.call(rbind,shpMat)
  
  suppressWarnings(st_write(shpYr,paste0("processed/HMS_",inYear,".shp"),quiet=T,append=F))
  write.csv(shpTally,paste0("processed/HMS_",inYear,"_QA_count.csv"),row.names=F)
  write.csv(shpMat,paste0("processed/HMS_",inYear,"_QA.csv"),row.names=F)
  timestamp(prefix=paste("Year",inYear,": ##------"))
  
  print(colSums(shpTally[,c("Raw","Valid","Invalid")]))
  print(table(shpMat$QAFlag))
}
