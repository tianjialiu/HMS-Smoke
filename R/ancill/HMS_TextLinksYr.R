# ====================================================
# HMS_TextLinksYr.R
# ----------------------------------------------------
# retrieve links to HMS text descriptions, 
# combine into a yearly table
# ====================================================
# last updated: August 7, 2024
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
library("rvest"); library("stringr")

setwd("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Smoke_Text/")
xYears <- 2005:2024

hms_text <- "https://www.ssd.noaa.gov/PS/FIRE/DATA/SMOKE/"

getLinks <- function(html_link) {
  page <- read_html(html_link)
  links <- page %>% html_nodes("a") %>% html_attr('href')
  links <- links[nchar(links) == 16]
  return(links)
}

getYrFolders <- function(html_link) {
  page <- read_html(html_link)
  links <- page %>% html_nodes("a") %>% html_attr('href')
  links <- as.numeric(substr(links[nchar(links) == 5],1,4))
  return(links)
}

getTime <- function(link) {
  html_date <- str_replace_all(html_text(html_nodes(read_html(link),"strong"))[1],"\n","")
  html_date <- str_replace_all(html_date,"\n","")
  html_date <- str_replace_all(html_date,",","")
  html_date <- as.Date(paste(strsplit(html_date," ")[[1]][2:4],collapse=", "),"%B, %d, %Y")
  return(as.numeric(c(format(html_date,"%Y"),format(html_date,"%m"),format(html_date,"%d"))))
}

main_links <- getLinks(hms_text)
yr_folders <- getYrFolders(hms_text)
  
for (inYear in xYears) {
  
  if (inYear %in% yr_folders) {
    yr_links <- getLinks(paste0(hms_text,inYear,"/"))
    main_links_yr <- main_links[as.numeric(substr(main_links,1,4)) == inYear & !main_links %in% yr_links]
    order_links <- order(c(yr_links,main_links_yr))
    
    hms_links_yr <- c(paste0(hms_text,inYear,"/",yr_links),
                      paste0(hms_text,main_links_yr))[order_links]
  } else {
    main_links_yr <- main_links[as.numeric(substr(main_links,1,4)) == inYear]
    order_links <- order(main_links_yr)
    
    hms_links_yr <- paste0(hms_text,main_links_yr)[order_links]
  }
  
  hms_links_yr <- hms_links_yr[grepl("html", hms_links_yr, fixed = TRUE)]
  
  write.table(hms_links_yr,paste0("HMS",inYear,".txt"),sep="\n",quote=F,row.names=F,col.names=F)
  
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
                     function(iLink) {getTime(hmsLinks[iLink])})
  hmsDates <- do.call(rbind,hmsDates)
  
  badDatesIdx <- which(complete.cases(hmsDates)==F)
  for (idx in badDatesIdx) {
    hmsDates[idx,] <- c(hmsYear[idx],hmsMonth[idx],hmsDay[idx])
  }
  
  hmsLinksYr <- data.frame(Year=hmsDates[,1],Month=hmsDates[,2],Day=hmsDates[,3],
                           HHMM=hmsHHMM,HHMMstr=hmsHHMMStr,
                           Name=hmsFileNames,
                           HtmlLink=hmsLinksHtml,Link=hmsLinks)
  hmsLinksAll <- hmsLinksYr[order(hmsMonth*1e3+hmsDay),]
  write.table(hmsLinksAll,paste0("HMS_SmokeText_",inYear,".csv"),sep=",",row.names=F)
  
  timestamp(prefix=paste("Year",inYear,": ##------"))
}

