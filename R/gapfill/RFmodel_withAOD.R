# ====================================================
# RFmodel_withAOD.R
# ----------------------------------------------------
# run random forest classification model to 
# gapfill unspecified densities, using AOD as a
# predictor
# ====================================================
# last updated: September 22, 2023
# Tianjia Liu (tianjia.liu@columbia.edu)
# ----------------------------------------------------
library("randomForest"); library("caTools")
setwd("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/HMS_gapfill/")

hmsAODall <- read.csv("HMS_gapfill.csv")
var_names <- c("Density","Area","Month","Start","End","Duration","AOD","Overlap")
hmsAODall <- hmsAODall[,var_names]

hmsAODall_valid <- hmsAODall[hmsAODall$Density != 0 & !is.na(hmsAODall$AOD),]
hmsAODall_fill <- hmsAODall[hmsAODall$Density == 0 & !is.na(hmsAODall$AOD),]

n <- 500
varImp <- matrix(NA,n,length(var_names)-1)
accuracy <- matrix(NA,n,3)
pred_fill <- matrix(NA,n,nrow(hmsAODall_fill))
  
for (i in 1:n) {
  hmsAODall_valid <- hmsAODall[hmsAODall$Density != 0 & !is.na(hmsAODall$AOD),]
  hmsAODall_fill <- hmsAODall[hmsAODall$Density == 0 & !is.na(hmsAODall$AOD),]
  
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
  
  write_rds(varImp[i,],paste0("HMS_gapfill_temp/rf_importance_",sprintf("%03d",i)))
  write_rds(accuracy[i,],paste0("HMS_gapfill_temp/rf_test_accuracy_",sprintf("%03d",i)))
  write_rds(pred_fill[i,],paste0("HMS_gapfill_temp/rf_pred_density_",sprintf("%03d",i)))
  
  timestamp(prefix=paste(i,": ##------ "))
}

colnames(varImp) <- var_names[-1]
colnames(accuracy) <- c("Light","Medium","Heavy")

write.csv(varImp,"rf_importance.csv",row.names=F)
write.csv(accuracy,"rf_test_accuracy.csv",row.names=F)
write.csv(pred_fill,"rf_pred_density_fill.csv",row.names=F)
