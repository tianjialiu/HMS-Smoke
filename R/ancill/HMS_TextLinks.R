# ====================================================
# HMS_TextLinks.R
# ----------------------------------------------------
# combine all links to HMS text descriptions
# into a single table
# ====================================================
# last updated: August 7, 2024
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
library("stringr")

setwd("/Users/TLiu/Google Drive/My Drive/HMS_ISD/HMS/Smoke_Text/")

xYears <- 2005:2024

hmsLinksAll <- list()
for (iYear in seq_along(xYears)) {
  hmsLinksAll[[iYear]] <- read.csv(paste0("HMS_SmokeText_",xYears[iYear],".csv"))
}

hmsLinksAll <- do.call(rbind,hmsLinksAll)

# remove test text files
hmsLinksAll <- hmsLinksAll[!hmsLinksAll$Name %in% "2005G030258",]

# sort by date
hmsDatesAll <- as.Date(paste(hmsLinksAll$Year,hmsLinksAll$Month,hmsLinksAll$Day),"%Y %m %d")
hmsLinksAll <- hmsLinksAll[order(hmsDatesAll,hmsLinksAll$Name),]

write.table(hmsLinksAll,"HMS_SmokeText.csv",sep=",",row.names=F)
