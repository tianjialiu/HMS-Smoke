# ====================================================
# RFmodel_withAOD.R
# ----------------------------------------------------
# run random forest classification model to 
# gapfill unspecified densities, using AOD as a
# predictor
# ====================================================
# last updated: March 31, 2026
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
library("randomForest"); library("caTools"); library("readr")
source("~/Projects/HMS_ISD/HMS/R/globalParams.R")
homeDir <- file.path(projDir,"HMS_gapfill")
setwd(homeDir)

hmsAODall <- read.csv("HMS_gapfill_pre.csv")
var_names <- c("Density","Area","Month","Start","End","Duration","AOD","Overlap")

hmsAODall_valid <- hmsAODall[hmsAODall$Density != 0 & !is.na(hmsAODall$AOD),]
hmsAODall_fill <- hmsAODall[hmsAODall$Density == 0 & !is.na(hmsAODall$AOD),]

n <- 500
varImp <- matrix(NA,n,length(var_names)-1)
accuracy <- matrix(NA,n,3)
pred_fill <- matrix(NA,n,nrow(hmsAODall_fill))
  
for (i in 1:n) {
  hmsAODall_valid <- hmsAODall[hmsAODall$Density != 0 & !is.na(hmsAODall$AOD),]
  hmsAODall_fill <- hmsAODall[hmsAODall$Density == 0 & !is.na(hmsAODall$AOD),]
  
  hmsAODall_valid <- hmsAODall_valid[,var_names]
  hmsAODall_fill <- hmsAODall_fill[,var_names]
  
  idxValues <- unique(hmsAODall_valid$Density)
  idxCountMin <- min(table(hmsAODall_valid$Density))
  undersampleIdx <- tapply(idxValues,idxValues,function(x) sample(which(hmsAODall_valid$Density==x),idxCountMin))
  undersampleIdx <- sort(do.call(c,undersampleIdx))
  
  hmsAODall_valid <- hmsAODall_valid[undersampleIdx,]
  hmsAODall_valid$Density <- as.factor(hmsAODall_valid$Density)
  
  sample <- sample.split(hmsAODall_valid$Density, SplitRatio = 2/3)
  train <- subset(hmsAODall_valid, sample == T)
  test <- subset(hmsAODall_valid, sample == F)
  
  rf <- randomForest(Density~.,data=train,importance=T)
  
  varImp[i,] <- importance(rf)[,"MeanDecreaseAccuracy"]
  
  pred <- predict(rf, newdata=test[,-1])
  cm <- table(test[,1], pred)
  accuracy[i,] <- tapply(1:3,1:3,function(x) cm[x,][x]/sum(cm[x,]))
  pred_fill[i,] <- predict(rf, newdata=hmsAODall_fill[,-1])
  
  # save as rds files
  outputFolder <- "HMS_gapfill_temp/"
  write_rds(varImp[i,],paste0(outputFolder,"rf_importance_",sprintf("%03d",i),".rds"))
  write_rds(accuracy[i,],paste0(outputFolder,"rf_test_accuracy_",sprintf("%03d",i),".rds"))
  write_rds(pred_fill[i,],paste0(outputFolder,"rf_pred_density_",sprintf("%03d",i),".rds"))
  
  timestamp(prefix=paste(i,": ##------ "))
}

# save final files
colnames(varImp) <- var_names[-1]
colnames(accuracy) <- c("Light","Medium","Heavy")

write.csv(varImp,"rf_importance.csv",row.names=F)
write.csv(accuracy,"rf_test_accuracy.csv",row.names=F)
write.csv(pred_fill,"rf_pred_density_fill.csv",row.names=F)
