library("raster"); library("sf"); library("stringr"); library("R.utils")
library("rvest"); library("RCurl"); library("dplyr")

projDir <- "/Users/TLiu/Projects/HMS_ISD/HMS/"
setwd(projDir)

source(paste0(projDir,'R/functions/blankDates.R'))

# new HMS dates to process
inDatesYMDseq <- seq(as.Date("2025-05-08"),as.Date("2025-05-29"),"day")
