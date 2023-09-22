# ====================================================
# HMS_Download.R
# ----------------------------------------------------
# download HMS smoke product zip files
# ====================================================
# last updated: September 22, 2023
# Tianjia Liu (tianjia.liu@columbia.edu)
# ----------------------------------------------------
source('/Users/TLiu/Google Drive/My Drive/scripts/R/blankDates.R')

inDatesYMDseq <- seq(as.Date("2023-09-15"),as.Date("2023-09-20"),"day")

inDates <- blankDates(1,12,2023)
inDatesYMD <- as.Date(paste0(inDates$Year,"-",sprintf("%02d",inDates$Month),"-",sprintf("%02d",inDates$Day)))
inDates <- inDates[which(inDatesYMD %in% inDatesYMDseq),]
  
homeFolder <- "/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Smoke_Polygons/"
setwd(homeFolder)

for (iDate in 1:dim(inDates)[1]) {
  inFolder <- paste0(inDates$Year[iDate],"/",sprintf("%02d",inDates$Month[iDate]))
  ifelse(dir.exists(paste0(homeFolder,inFolder)),NA,dir.create(paste0(homeFolder,inFolder),recursive=T))
  
  inFile <- paste0(inFolder,"/hms_smoke",inDates$Year[iDate]*1e4+
                     inDates$Month[iDate]*1e2+inDates$Day[iDate],".zip")

  download.file(paste0("https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/",inFile),
                paste0("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Smoke_Polygons/",inFile),"wget")
  
  print(inFile)
}
