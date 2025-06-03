# ====================================================
# HMS_Unzip.R
# ----------------------------------------------------
# unzip HMS smoke product zip files
# ====================================================
# last updated: June 2, 2025
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")
homeDir <- file.path(projDir,"Smoke_Polygons/")

xYears <- 2005:2025
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
