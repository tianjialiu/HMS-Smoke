# ====================================================
# HMS_Extent.R
# ----------------------------------------------------
# combine HMS extent statistics downloaded from EE
# into a single table
# ====================================================
# last updated: June 2, 2025
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")
homeDir <- file.path(projDir,"HMS_Extent")
setwd(homeDir)

xYears <- 2005:2025

hmsExtAll <- list()
for (iYear in seq_along(xYears)) {
  hmsExtAll[[iYear]] <- read.csv(paste0("HMS_Extent_",xYears[iYear],".csv"))
}

hmsExtAll <- data.frame(do.call(rbind,hmsExtAll))

hmsExtAll$Valid <- "No"
hmsExtAll$Valid[which(hmsExtAll$YYYYMMDD %in% hmsExtAll$YYYYMMDD[hmsExtAll$Density == "Total" & hmsExtAll$Area > 0])] <- "Yes"

hmsExtAll$Year <- as.numeric(format(as.Date(as.character(hmsExtAll$YYYYMMDD),"%Y%m%d"),"%Y"))
hmsExtAll$JDay <- as.numeric(format(as.Date(as.character(hmsExtAll$YYYYMMDD),"%Y%m%d"),"%j"))

hmsExtAll <- hmsExtAll[,c("YYYYMMDD","Year","JDay","Density","Area","Count","Valid")]

write.table(hmsExtAll,"HMS_Extent.csv",sep=",",row.names=F)
