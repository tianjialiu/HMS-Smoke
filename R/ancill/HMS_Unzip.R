# ====================================================
# HMS_Unzip.R
# ----------------------------------------------------
# unzip HMS smoke product zip files
# ====================================================
# last updated: September 22, 2023
# Tianjia Liu (tianjia.liu@columbia.edu)
# ----------------------------------------------------
library(R.utils)
homeDir <- "/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Smoke_Polygons/"
xYears <- 2023
inMode <- "unzip"

if (inMode == "unzip") {
  for (inYear in xYears) {
    setwd(homeDir)
    xMonths <- dir(as.character(inYear))
    for (inMonth in xMonths) {
      setwd(file.path(homeDir,as.character(inYear),inMonth))
      zippedFiles <- dir(".","*\\.gz")
      if (length(zippedFiles) > 0) {
        for (inFile in zippedFiles) {gunzip(inFile,overwrite=T)}
      }
      
      zippedFiles <- dir(".","*\\.zip")
      if (length(zippedFiles) > 0) {
        for (inFile in zippedFiles) {unzip(inFile,overwrite=T)}
      }
      
      file.remove(dir(".","*\\.gz"))
      file.remove(dir(".","*\\.zip"))
      if (file.exists("data")) {unlink("data",recursive=T)}
    }
    timestamp(prefix=paste(inYear,"##------ "))
  }
}

if (inMode == "diag") {
  fileMat <- matrix(NA,length(xYears),12)
  for (inYear in xYears) {
    setwd(homeDir)
    xMonths <- dir(as.character(inYear))
    for (inMonth in xMonths) {
      setwd(file.path(homeDir,as.character(inYear),inMonth))
      shpFiles <- dir(".","*\\.shp")
      fileMat[inYear-xYears[1]+1,as.numeric(inMonth)] <- length(shpFiles)
    }
  }
  print(fileMat)
}
