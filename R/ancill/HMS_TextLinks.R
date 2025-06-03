# ====================================================
# HMS_TextLinks.R
# ----------------------------------------------------
# combine all links to HMS text descriptions
# into a single table
# ====================================================
# last updated: June 2, 2025
# Tianjia Liu (embrslab@gmail.com)
# ----------------------------------------------------
source("~/Projects/HMS_ISD/HMS/scripts/globalParams.R")
homeDir <- file.path(projDir,"Smoke_Text/")
setwd(homeDir)

xYears <- 2005:2025

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
