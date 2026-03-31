# ====================================================
# HMS_Fire_Fill.R
# ----------------------------------------------------
# replace missing daily files from annual bundles
# ====================================================
# last updated: March 31, 2026
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/R/globalParams.R")
homeDir <- file.path(projDir,"Fire_Points/")
setwd(homeDir)

missingDates <- c("20250508","20250511")
missingYears <- as.numeric(substr(missingDates,1,4))

for (inYear in unique(missingYears)) {
  missingDatesYr <- missingDates[missingYears %in% inYear]
  
  hms_fireYr <- st_read(paste0("Annual_Bundles/hms_fire",inYear,".shp"),quiet=T)
  
  for (missingDate in missingDatesYr) {
    inMonthStr <- substr(missingDate,5,6)
    yj <- as.numeric(ymd2yj(missingDate))
    
    hms_fireDay <- hms_fireYr %>%
      dplyr::filter(YearDay == yj)
    
    st_write(hms_fireDay,paste0(inYear,"/",inMonthStr,"/hms_fire",missingDate,".shp"),append=F)
  }
}
