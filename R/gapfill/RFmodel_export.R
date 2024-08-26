# ====================================================
# RFmodel_export.R
# ----------------------------------------------------
# export a table of all HMS data with the gap-filled
# densities as another CSV file
# ====================================================
# last updated: August 26, 2024
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")

gapfill <- read.csv("HMS_gapfill/HMS_gapfill_pre.csv")

fillIdx <- which(gapfill$Density == 0 & !is.na(gapfill$AOD))
fillIdxNoAOD <- which(gapfill$Density == 0 & is.na(gapfill$AOD))

remap_cat <- function(inMat) {
  inMat[inMat=="1"] <- 5
  inMat[inMat=="2"] <- 16
  inMat[inMat=="3"] <- 27
  return(inMat)
}

mode_remap <- function(x) {
  x_count <- sort(table(x),decreasing=T)
  x_mode <- names(x_count)[which(x_count==max(x_count))[1]]
  return (x_mode)
}

conf_remap <- function(x) {
  x_count <- sort(table(x),decreasing=T)
  x_mode <- names(x_count)[which(x_count==max(x_count))[1]]
  x_conf <- length(which(x==x_mode))/length(x)
  return (x_conf)
}

pred_density <- read.csv("HMS_gapfill/rf_pred_density_fill.csv")
pred_density_noAOD <- read.csv("HMS_gapfill/rf_pred_density_fill_noAOD.csv")

# remap density codes
pred_density <- remap_cat(pred_density)
pred_density_noAOD <- remap_cat(pred_density_noAOD)

# gapfill unspecified densities with the mode of modeled densities
# if there's an equal number of 2 classes, the lower density class is used
pred_density_mode <- apply(pred_density,2,mode_remap)
pred_density_noAOD_mode <- apply(pred_density_noAOD,2,mode_remap)

gapfill$Density[fillIdx] <- pred_density_mode
gapfill$Density[fillIdxNoAOD] <- pred_density_noAOD_mode

gapfill$Density[gapfill$Density==5] <- "Light"
gapfill$Density[gapfill$Density==16] <- "Medium"
gapfill$Density[gapfill$Density==27] <- "Heavy"

pred_density_conf <- apply(pred_density,2,conf_remap)
pred_density_noAOD_conf <- apply(pred_density_noAOD,2,conf_remap)

# confidence of the classification
gapfill$Conf <- 1
gapfill$Conf[fillIdx] <- pred_density_conf
gapfill$Conf[fillIdxNoAOD] <- pred_density_noAOD_conf

# gapfill model mode
gapfill$Flag <- 0 # no gapfill
gapfill$Flag[fillIdx] <- 1 # rf model with AOD
gapfill$Flag[fillIdxNoAOD] <- 2 # rf model without AOD

write.csv(gapfill,"HMS_gapfill/HMS_gapfill_post.csv",row.names=F)
