# ====================================================
# RFmodel_prepare.R
# ----------------------------------------------------
# export a table of all HMS data as a CSV file
# for the gap-filling random forest model
# ====================================================
# last updated: August 26, 2024
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
library("randomForest"); library("caTools")
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")

xYears <- 2005:2022

hmsAODall <- list()
for (iYear in 1:length(xYears)) {
  inYear <- xYears[iYear]
  hmsStack <- read.csv(paste0("HMS_Stack/HMS_",inYear,"_Stack.csv"))
  hmsPoly <- st_read(paste0("Smoke_Polygons/processed/HMS_",inYear,".shp"),quiet=T)

  xMonths <- 1:12
  if (inYear == 2005) {xMonths <- 8:12}
  hmsAODyr <- list()
  for (inMonth in 1:12) {
    hmsAODmon <- read.csv(paste0("HMS_AOD/HMS_",inYear*1e2+inMonth,"_AOD.csv"))
    hmsAODyr[[inMonth]] <- hmsAODmon[order(hmsAODmon$ID),]
  }
  hmsAODyr <- do.call(rbind,hmsAODyr)
  
  hmsAODyr$Start <- hmsPoly$Start
  hmsAODyr$End <- hmsPoly$End
  hmsAODyr$Duration <- hmsPoly$Duration
  hmsAODyr$Overlap <- hmsStack$Overlap
  
  hmsAODall[[iYear]] <- hmsAODyr
}

hmsAODall <- do.call(rbind,hmsAODall)

densityToNum <- rep(0,length(hmsAODall$Density))
densityToNum[hmsAODall$Density=="Light"] <- 5
densityToNum[hmsAODall$Density=="Medium"] <- 16
densityToNum[hmsAODall$Density=="Heavy"] <- 27

hmsAODall$Density <- densityToNum

write.csv(hmsAODall,"HMS_gapfill/HMS_gapfill_pre.csv",row.names=F)
