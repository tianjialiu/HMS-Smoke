# ====================================================
# HMS_gapfill_shp.R
# ----------------------------------------------------
# export yearly shapfiles of HMS smoke polygons
# with the gapfilled density and related flags
# (only relevant for 2005-2010)
# ====================================================
# last updated: September 22, 2023
# Tianjia Liu (tianjia.liu@columbia.edu)
# ----------------------------------------------------
setwd("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/")
library("raster"); library("sf")

xYears <- 2005:2010

gapfill_pre <- read.csv("HMS_gapfill/HMS_gapfill_pre.csv")
gapfill_post <- read.csv("HMS_gapfill/HMS_gapfill_post.csv")

for (inYear in xYears) {
  hmsYr <- st_read(paste0("Smoke_Polygons/processed/",paste0("HMS_",inYear),".shp"),quiet=T)
  hmsYr_noCatIdx <- which(hmsYr$Density == "Unspecified")
  hmsYr_noCatID <- hmsYr$ID[hmsYr_noCatIdx]
  hmsYr$Density[hmsYr_noCatIdx] <- gapfill_post$Density[gapfill_post$ID %in% hmsYr_noCatID]
  
  hmsYr$fillFlag <- gapfill_post$Flag[gapfill_post$Year == inYear]
  hmsYr$fillConf <- gapfill_post$Conf[gapfill_post$Year == inYear]
  
  suppressWarnings(st_write(hmsYr,paste0("Smoke_Polygons/gapfill/",paste0("HMS_",inYear),".shp"),append=F,quiet=T))
}

