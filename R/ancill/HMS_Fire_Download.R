# ====================================================
# HMS_Fire_Download.R
# ----------------------------------------------------
# download HMS fire product zip files
# ====================================================
# last updated: March 31, 2026
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/R/globalParams.R")
homeDir <- file.path(projDir,"Fire_Points/")

proMode <- "daily" # daily: inDatesYMDseq, annual: xYears

# global variables in globalParams.R
#inDatesYMDseq <- seq(as.Date("2026-01-22"),as.Date("2026-03-19"),"day")
#xYears <- 2005:2026

if (proMode %in% c("daily", "all")) {
  inDates <- blankDates(1,12,unique(as.numeric(format(inDatesYMDseq,"%Y"))))
  inDatesYMD <- as.Date(paste0(inDates$Year,"-",sprintf("%02d",inDates$Month),"-",sprintf("%02d",inDates$Day)))
  inDates <- inDates[which(inDatesYMD %in% inDatesYMDseq),]
  
  for (iDate in 1:dim(inDates)[1]) {
    inFolder <- paste0(inDates$Year[iDate],"/",sprintf("%02d",inDates$Month[iDate]))
    ifelse(dir.exists(paste0(homeDir,inFolder)),NA,dir.create(paste0(homeDir,inFolder),recursive=T))
    
    inFile <- paste0(inFolder,"/hms_fire",inDates$Year[iDate]*1e4+
                       inDates$Month[iDate]*1e2+inDates$Day[iDate],".zip")
    
    try(download.file(paste0("https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Fire_Points/Shapefile/",inFile),
                      paste0(homeDir,inFile),"wget"))
    
    print(inFile)
  }
}

if (proMode %in% c("annual", "all")) {
  for (inYear in xYears) {
    inFolder <- "Annual_Bundles"
    ifelse(dir.exists(paste0(homeDir,inFolder)),NA,dir.create(paste0(homeDir,inFolder),recursive=T))
    
    inFile <- paste0(inFolder,"/hms_fire",inYear,".zip")
    
    download.file(paste0("https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Fire_Points/Shapefile/",inFile),
                  paste0(homeDir,inFile),"wget")
    
    print(inFile)
  }
}
