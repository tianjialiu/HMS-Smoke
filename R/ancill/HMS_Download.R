# ====================================================
# HMS_Download.R
# ----------------------------------------------------
# download HMS smoke product zip files
# ====================================================
# last updated: August 13, 2024
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")
homeDir <- file.path(projDir,"Smoke_Polygons/")

inDatesYMDseq <- seq(as.Date("2024-08-06"),as.Date("2024-08-25"),"day")

inDates <- blankDates(1,12,unique(as.numeric(format(inDatesYMDseq,"%Y"))))
inDatesYMD <- as.Date(paste0(inDates$Year,"-",sprintf("%02d",inDates$Month),"-",sprintf("%02d",inDates$Day)))
inDates <- inDates[which(inDatesYMD %in% inDatesYMDseq),]

for (iDate in 1:dim(inDates)[1]) {
  inFolder <- paste0(inDates$Year[iDate],"/",sprintf("%02d",inDates$Month[iDate]))
  ifelse(dir.exists(paste0(homeDir,inFolder)),NA,dir.create(paste0(homeDir,inFolder),recursive=T))
  
  inFile <- paste0(inFolder,"/hms_smoke",inDates$Year[iDate]*1e4+
                     inDates$Month[iDate]*1e2+inDates$Day[iDate],".zip")

  download.file(paste0("https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/",inFile),
                paste0(homeDir,inFile),"wget")
  
  print(inFile)
}
