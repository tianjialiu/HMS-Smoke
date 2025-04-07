# ====================================================
# HMS_TextLinksYr.R
# ----------------------------------------------------
# retrieve links to HMS text descriptions, 
# combine into a yearly table
# ====================================================
# last updated: April 1, 2025
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/R/globalParams.R")
homeDir <- file.path(projDir,"Smoke_Text/")
setwd(homeDir)

xYears <- 2005
currYear <- 2025
forceCheckURL <- F

hms_text <- "https://www.ospo.noaa.gov/products/land/smoke/"
hms_text_loc <- "https://www.ospo.noaa.gov/"

getLinksYr <- function(html_link,year) {
  page <- read_html(html_link)
  links <- page %>% html_nodes("a") %>% html_attr('href')
  links <- links[grepl("smoke-data/",links) & grepl("[0-9]",links)] %>% sort()
  links <- paste0(hms_text_loc,links) %>% 
    str_replace(.,"//smoke","/smoke")
  
  return(links)
}

getYrArchive <- function(year) {
  if (year < currYear) {
    hms_text_yr <- paste0(hms_text,year,"_archive_smoke.html")
  } else {
    hms_text_yr <- hms_text
  }
  return(hms_text_yr)
}

checkValidURL <- function(link,year) {
  hmsFileName <- str_replace(lapply(strsplit(link,"/"),function(x) x[length(x)])[[1]],".html","")
  hmsTextYr <- as.numeric(substr(hmsFileName,1,4))
  
  link_rsp <- T
  if (year != hmsTextYr) {
    link_rsp <- url.exists(link)
  }
  
  return(link_rsp)
}

getTime <- function(link) {
  html_date <- html_text(html_nodes(read_html(link),"strong"))[1] %>%
    str_replace_all(.,"\n","") %>% str_replace_all(.,"\n","") %>%
    str_replace_all(.,"st","") %>% str_replace_all(.,"nd","") %>%
    str_replace_all(.,"rd","") %>% str_replace_all(.,"th","") %>%
    str_replace_all(.," , ",", ") %>% str_replace_all(.,",","") %>%
    str_replace_all(.,"  "," ") %>% 
    str_squish()
  
  html_date_parse <- as.Date(paste(strsplit(html_date," ")[[1]][2:4],
                                   collapse=", "),"%B, %d, %Y")
  
  html_date_parse <- as.numeric(c(format(html_date_parse,"%Y"),
                                  format(html_date_parse,"%m"),
                                  format(html_date_parse,"%d")))
  return(html_date_parse)
}

for (inYear in xYears) {
  # url of the yearly HMS smoke text archive page
  yr_html <- getYrArchive(inYear)
  
  # get all urls for HMS smoke text
  hms_links_yr <- getLinksYr(yr_html,inYear)
  hms_links_yr <- hms_links_yr[grepl("html",hms_links_yr,fixed=T)]
  
  # save as a text file as intermediate save point
  write.table(hms_links_yr,paste0("HMS",inYear,".txt"),
              sep="\n",quote=F,row.names=F,col.names=F)
  
  # read in the text file
  hmsLinks <- as.character(read.table(paste0("HMS",inYear,".txt"))[,1])
  hmsYear <- rep(inYear,length(hmsLinks))
  
  hmsFileNames <- do.call(rbind,strsplit(do.call(c,lapply(strsplit(hmsLinks,"/"),function(x) x[length(x)])),".html"))[,1]
  
  hmsMonthStr <- substr(hmsFileNames,5,5)
  monthLetter <- LETTERS[1:12]
  hmsMonth <- as.numeric(tapply(seq_along(hmsMonthStr),seq_along(hmsMonthStr),
                                function(x) {return(which(hmsMonthStr[x]==monthLetter))}))
  
  hmsDay <- as.numeric(substr(hmsFileNames,6,7))
  hmsHHMM <- as.numeric(substr(hmsFileNames,8,11))
  hmsHHMMStr <- paste(substr(hmsFileNames,8,11),"UTC")
  hmsLinksHtml <- paste0("<a target='_blank' href=",hmsLinks,">",hmsFileNames,"</a>")
  
  hmsDates <- tapply(seq_along(hmsLinks),seq_along(hmsLinks),
                     function(iLink) {
                       readTry <- try(read_html(hmsLinks[iLink]))
                       if (!"try-error" %in% class(readTry)) {
                         hmsDate <- getTime(hmsLinks[iLink])
                       } else {hmsDate <- rep(-1,3)}
                       return(hmsDate)
                     })
  hmsDates <- do.call(rbind,hmsDates)
  
  validLinks <- which(as.numeric(hmsDates[,1]) > -1)
  
  dateQA <- rep(0,length(hmsLinks))
  badDatesIdx <- which(complete.cases(hmsDates)==F)
  for (idx in badDatesIdx) {
    hmsDates[idx,] <- c(hmsYear[idx],hmsMonth[idx],hmsDay[idx])
    dateQA[idx] <- 1
  }
  
  hmsLinksYr <- data.frame(Year=hmsDates[,1],Month=hmsDates[,2],Day=hmsDates[,3],
                           HHMM=hmsHHMM,HHMMstr=hmsHHMMStr,
                           Name=hmsFileNames,
                           HtmlLink=hmsLinksHtml,Link=hmsLinks,
                           dateQA=dateQA)
  
  
  hmsLinksYr <- hmsLinksYr[validLinks,]
  hmsLinksYr <- hmsLinksYr[with(hmsLinksYr,order(Year,Month,Day)),]
  
  write.table(hmsLinksYr,paste0("HMS_SmokeText_",inYear,".csv"),sep=",",row.names=F)
  
  timestamp(prefix=paste("Year",inYear,": ##------"))
}
