library(tidyverse)
library(httr)
library(jsonlite)
# big query REST API:


# NOTE: I have a json file that has lines:
# {
#  "project_id": "<my-project>",
#  "my_token_file": "<my-token-file>",
#  "query" : "<my-query>" 
# }
#       you could hard code it here, but
#       for security reasons, that may be
#       a bad idea because I am checking this
#       into github.
#       Better safe than sorry.

bq2_env = jsonlite::fromJSON("~/bq2_env.json")
bq.token.file <- bq2_env$my_token_file
token <- oauth_service_token(endpoint = oauth_endpoints("google"), 
                             secrets =  jsonlite::fromJSON(bq.token.file),
                             scope = "https://www.googleapis.com/auth/bigquery.readonly" )


projectId <-bq2_env$project_id
url <- paste0("https://bigquery.googleapis.com/bigquery/v2/projects/",projectId,"/queries")

## this is an example using public data....
tb <- POST( url, 
      config = config(token=token),
      body=list('query'="SELECT year,mother_age,mother_race from [bigquery-public-data:samples.natality] limit 10"),
      encode="json"
)
tb

## this uses the my data...
query = bq2_env$query
real_data <- POST( url, 
                   config = config(token=token),
                   body=list('query'=query),
                   encode="json"
)
real_data


## This is the function that converts the raw http response
## to a tibble.
to_tibble <- function (x){
  lst <- jsonlite::fromJSON(content(x,as = "text"))
  nmes <- lst$schema$fields$name
  
  ## this does the work, yes it's ugly I'm looking into
  ## handling this more elogently.  Why do I care?
  ## 1) easy to read, easy to understand
  ## 2) easy to understand, easy to debug when problems arise.
  lst <- lst$rows$f %>% map(t) %>% 
    map(~{v=as.vector(.x);names(v)<-nmes;return(v)}) %>% 
    bind_rows()
  return(lst)
}
df <- to_tibble(real_data)


## This uses the bigrquery ("bigger query") package 
library(bigrquery)
Sys.setenv("BIGQUERY_TEST_PROJECT"=bq2_env$project_id)
bq_auth()
billing <- bq_test_project()
## Note: in the bigrquery API, you dont put your
## table in square brackets, removing them from the query
query <- gsub("\\[|\\]","",bq2_env$query)
if (bq_testable()){
  tb <- bq_project_query(bq_test_project(),
                         #"SELECT unique_key, complaint_type, complaint_description, owning_department, source, status, created_date, close_date, last_update_date, street_number, street_name, incident_zip FROM `bigquery-public-data.austin_311.311_service_requests` LIMIT 100")
                         query )
}
x <- bq_table_download(tb)


