# ====================================================
# blankDates.R
# ----------------------------------------------------
# functions for processing date/time
# ====================================================
# last updated: August 7, 2024
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------

blankDates <- function(sMonth,eMonth,inYears,NAcols=F,cutMonths=F) {
  sYear <- inYears[1]
  eYear <- inYears[length(inYears)]
  
  if (inYears[length(inYears)] %% 4 == 0) {
    nDays <- c(31,29,31,30,31,30,31,31,30,31,30,31)
  } else {nDays <- c(31,28,31,30,31,30,31,31,30,31,30,31)}
  
  sDate <- paste0(sYear,"-",sprintf("%02d",sMonth),"-01")
  eDate <- paste0(eYear,"-",sprintf("%02d",eMonth),"-",sprintf("%02d",nDays[eMonth]))
  datesAll <- seq(as.Date(sDate),as.Date(eDate),"day")
    
  YEARS <- as.numeric(format(datesAll,"%Y"))
  MONTHS <- as.numeric(format(datesAll,"%m"))
  DAYS <- as.numeric(format(datesAll,"%d"))
  JDAYS <- as.numeric(format(datesAll,"%j"))
  
  datesTable <- data.frame(cbind(YEARS,MONTHS,DAYS,JDAYS))
  colnames(datesTable) <- c("Year","Month","Day","Julian")
  if (cutMonths == T) {datesTable <- datesTable[datesTable$Month %in% sMonth:eMonth,]}
  
  if (is.character(NAcols) == T | is.numeric(NAcols) == T ) {
    datesTable <- cbind(datesTable,matrix(NA,dim(datesTable)[1],length(NAcols)))
    colnames(datesTable) <- c(colnames(datesTable)[1:4],NAcols)
  }
  
  return(datesTable)
}

dig2 <- function(x) {
  return(sprintf("%02d",x))
}

datefromYMD <- function(blankDatesMat) {
  ymdDate <- as.Date(paste0(blankDatesMat$Year,"-",
                     dig2(blankDatesMat$Month),"-",
                     dig2(blankDatesMat$Day)))
  return(ymdDate)
}
  