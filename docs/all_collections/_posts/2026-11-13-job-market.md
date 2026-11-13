---
layout: post
title: Job Market Intelligence - end-to-end project
date: 2026-11-13
categories: [Python, Adzuna API, AWS, S3, Snowflake, dbt, Apache Airflow]
banner: /assets/images/dashboard-map.png
---

# Brainstorming
I've been thinking about reviving my recent [Databricks Bootcamp Project](https://luc-rap.github.io/posts/databricks/). There were a few limitations, so I started re-thinking the architecture, and piece by piece, my ideas started coming together. I wanted to build a fully-automated pipeline which would result in a Job Market Dashboard that I can use to gain insights. 

Previously, I had used Databricks for almost everything, which was great for learning but also introduced some limitations. External API requests were blocked in my environment, so I had to retrieve Adzuna data separately using Python before uploading it to Databricks. The final application also ran on Databricks, meaning that once I exhausted my free credits, I couldn't continue working until the credits renewed.

This isn't a criticism of Databricks - I really enjoyed working with it. I was simply curious to try a different technology stack and build something that more closely resembled a real-world data engineering pipeline.

# The Goal
The goal is: an automated data pipeline that collects Adzuna job postings, stores the raw data in Amazon S3, loads it into Snowflake, transforms it with dbt, and presents the results in Tableau, orchestrated with Airflow. 

| Layer | Technology |
| --- | --- |
| Job data source | Adzuna Jobs API |
| Ingestion | Python, `requests`, `boto3` |
| Orchestration and local runtime | Apache Airflow, Docker Compose |
| Raw object storage | Amazon S3 |
| Data warehouse | Snowflake |
| Transformation | dbt, SQL |
| Visualization | Tableau Desktop |
| Version control | Git, GitHub |

![Job Market Intelligence architecture](/assets/images/architecture_flowchart.png)

(As of the day of writing this article) I built this project using a combination of open-source tools, free services, and time-limited cloud credits. Adzuna supports up to 2,500 API calls a month, AWS gets you up to 200 USD credits and 180 days (for new users), Snowflake offers 30 days with 400 USD/credit, Tableau offers free versions as well (Tableau Desktop Free Edition), and Airflow can run locally on Docker (with one limitation - scheduled runs happen only when computer is on and Docker is running).

I started with experimenting - reviewing how to call Adzuna, how the returned results look like, and how to process them. There are many options for the response, but I was focusing specifically on Data Engineering roles in Florida. [ingest_adzuna_jobs.py](https://github.com/luc-rap/job-market-intelligence/blob/main/ingest_adzuna_jobs.py) script performs the data retrieval from Adzuna, and uploads data to S3 bucket, with connection set-up through AWS CLI. It uploads the raw JSON responses, and all the heavy-lifting transformation will be done in Snowflake. 

Now... connecting Snowflake to S3 was the biggest pain point. The instructions are pretty straightforward, however no matter what, AWS was refusing the Snowflake connection. I ended up contacting Snowflake support and they confirmed that everything is set up correctly, and they can see there are requests going out to AWS, but AWS was rejecting them. They offered an alternative work-around, and also suggested contacting AWS (to this day, I haven't been able to solve this issue). The alternative was building the stage and connecting to the S3 bucket by providing explicit credentials, which isn't the preferred aproach, but for this small project, I temporarily accepted this solution. I then ran `COPY INTO` from the stage into our raw data table, and the data is ingested. Sounds simple but I spent forever trying to figure this out! True canon event 🙃

After that, I started to write the transformations with dbt. I used the dbt integration within Snowflake and deployed it as dbt project object. The raw data is in `RAW.RAW_ADZUNA_JOBS`. Each row holds one JSON file (an array of jobs) plus `SOURCE_FILE` and `LOADED_AT`.

Layers:
- Staging (`stg_adzuna_jobs`): `LATERAL FLATTEN` turns each JSON array into one row per job. It extracts fields into typed columns (job ID, title, company, state, city, coordinates, category, POSTED_AT, salary fields, description, URL) and keeps SOURCE_FILE, LOADED_AT and the job’s position in the file
- Intermediate: `int_adzuna_jobs_deduplicated` keeps one row per job across daily loads, since the ingestion window overlaps (about that later). `int_job_skills` joins each description against the skills seed with REGEXP_LIKE and word boundaries (a small disclaimer - the skills analysis uses keyword matching on Adzuna’s 500-character snippets, so it shows ranking and not absolute demand)
- Marts: tables for Tableau, covering skills, company, and location
- Tests: not_null and unique on JOB_ID, plus not_null checks on staging columns, such as the title and ad reference

![dbt graph](/assets/images/dbt_graph.png)

# Let's talk about how it runs

At this point, our data is ready, but so far every execution is manual. This is when I started thinking about the automation. Airflow can run [ingest_adzuna_jobs.py](https://github.com/luc-rap/job-market-intelligence/blob/main/ingest_adzuna_jobs.py) which uploads the raw data to S3 bucket. Then, Snowflake should trigger `COPY INTO`, and then Snowflake task will trigger dbt build (conceptually). But here it goes again - S3 and Snowflake unresolved issues. The intended secure AWS IAM role-based integration has not been configured successfully. The current external stage uses direct AWS credentials as a workaround; this is less secure and should be replaced. Snowpipe with S3 event notifications could automatically ingest new files. It is not currently implemented and would still require working secure AWS/Snowflake integration. As an alternative, we can connect Airflow to Snowflake and schedule `COPY INTO` task instead. So, I created one DAG with two tasks: **ingest_task** and **copy_task**. 
```Python
with DAG(
    dag_id="job_market_pipeline",
    start_date=datetime(2026, 11, 12),
    schedule="0 10,18 * * *",
    catchup=False,
    tags=["job-market-intelligence"],
) as dag:

    ingest_task = PythonOperator(
        task_id="ingest_adzuna_jobs",
        python_callable=run_adzuna_ingestion,
    )

    copy_task = SQLExecuteQueryOperator(
        task_id="copy_s3_into_snowflake",
        conn_id="snowflake_default",
        sql="""
            COPY INTO JOB_MARKET_INTELLIGENCE.RAW.RAW_ADZUNA_JOBS
                (RAW_DATA, SOURCE_FILE, LOADED_AT)
            FROM (
                SELECT
                    $1,
                    METADATA$FILENAME,
                    CURRENT_TIMESTAMP()::TIMESTAMP_NTZ
                FROM @JOB_MARKET_INTELLIGENCE.RAW.ADZUNA_STAGE_TEMP
            )
            FILE_FORMAT = (
                FORMAT_NAME = 'JOB_MARKET_INTELLIGENCE.RAW.ADZUNA_JSON_FORMAT'
            )
            ON_ERROR = 'ABORT_STATEMENT';
        """,
    )

    ingest_task >> copy_task
```

![Airflow run](/assets/images/airflow.png)

For this, you need to provide Snowflake connection to Airflow, I did via generating private and public key -  the private key is mounted into the Airflow containers from the local Snowflake keys directory, and the matching public key is registered for the Snowflake user. I also configured an Airflow Fernet key, used by Airflow to encrypt stored connection and variable values. 

And this works! Now it is also a good time to mention the ingestion window overlap from earlier, and deduplication. Adzuna can be set up to return results from specific time periods, e.g. jobs posted in the last day. If it runs multiple times, it will return the same jobs, but:
- Snowflake normally skips files it has already loaded through `COPY INTO`, while the relevant load metadata is retained.
- Different files can still contain the same job postings. The dbt intermediate model handles those duplicates by retaining the latest observation for each JOB_ID

I chose a rolling two-day ingestion window. This deliberately introduces overlap between runs, but it also gives the pipeline some resilience: if one scheduled run fails, the next run can still retrieve postings from the missed period, provided they remain within the API's retrieval window. This protects against a missed run, but it doesn't guarantee recovery if the outage lasts longer than the retrieval window.

So now one more step in Snowflake - schedule a task to run dbt build automatically. This can be implemented using root and child tasks - the root task consumes/logs the stream, its child task runs dbt build for the Snowflake dbt project, and a finalizer task sends an email with the outcome and load summary. To do this, you have to build a stream that watches your raw table. Then the root task fires when new rows land, and consumes the stream. Child task runs dbt after the root task finishes. Finalizer task runs after all other tasks in the graph complete or fail to complete - this is our email notification. 

![email](/assets/images/email.png)

To summarize: 
```
Airflow triggers Python ingestion task and sends raw data to S3 -> 
Airflow COPY INTO task -> 
loads data from S3 into Snowflake raw table -> 
Snowflake stream/task -> 
Root task (new stream rows) -> 
Child task (dbt build) -> 
Snowflake models -> 
Finalizer task (email result)
```

![Snowflake overview](/assets/images/snowflake_overview.png)

Now, the very last step is to build our dashboard. I decided to use Tableau Desktop - it provides the ability to connect to Snowflake to visualize the modeled job-market data. When connected, you choose the database and you are able to see all tables. Then you can start building. 

My dashboard currently looks like this:

![Tableau](/assets/images/tableau_animated.gif)

Like I mentioned, we are collecting insights on Data Engineering jobs in Florida. The Tableau dashboard filters postings to the last 30 days by default, but you can change this filter. It includes the top 10 hiring companies, total postings and companies hiring, a location map, posting trends over time, estimated average salary, salary by skill, and top skills. Skills are identified by matching job descriptions against the dbt seed ```skills.csv.``` The seed maps skill names to categories (such as language, cloud, data engineering, BI, and databases) and matching patterns. The intermediate skill model uses those patterns to count job postings mentioning each skill (but keep in mind that Adzuna provides 500-character description snippet). 

What interests me the most are basically which cities are a good area to focus my data engineering job search, where I could possibly relocate, and which skills are the most in demand. 

![Jobs and cities](/assets/images/jobs-cities.png)

A few disclaimers about the data:
- Company names are not yet standardized, so casing and naming variations (for example, Deloitte and DELOITTE) may be counted as separate companies
- Cities might be a little strange. There are a lot of job postings in the Miami area, however, every location is broken down into a city, which can result in seemingly feeling like there aren't a lot of jobs in Miami. But this partly comes down to personal preferences, but I am thinking that adding a filtering on County level would be helpful as well
- It currently looks like only 2.4% of jobs mention SQL as a skill and I suspect this is caused by the limited Description snippet. The same goes for Pay by skill
- When salary is not posted, Adzuna uses jobsworth salary predictor; you can filter these by setting ```salary_is_predicted``` field

![Dashboard map](/assets/images/dashboard-map.png)

# Architecture and implementation summary


## Architecture

```text
Adzuna Jobs API
      |
      v
Python ingestion task (Apache Airflow / Docker)
      |
      v
Amazon S3 (raw JSON)
      |
      v
Airflow COPY INTO task ---> Snowflake raw table
                                  |
                                  v
                          Snowflake stream/task
                                  |
                                  v
                         Root task
                    (new stream rows)
                                  |
                                  v
                         Child task
                           (dbt build)
                                  |
                                  v
                          Snowflake models
                         /          \
                        v            v
                Finalizer task   Tableau dashboards
                (email result)
```

Once configured, the pipeline runs automatically when the computer hosting Docker is on and the containers are running.

## Pipeline

1. **Fetch jobs:** The Python ingestion script calls the Adzuna Jobs API for Data Engineer postings in Florida. Airflow schedules the `job_market_pipeline` DAG at 10:00 and 18:00 daily (Airflow's configured timezone; UTC by default). Each run fetches up to 10 pages.
2. **Store raw data:** The ingestion task uploads each page as a JSON file to S3 under a date-partitioned `adzuna/ingestion_date=.../` path.
3. **Load Snowflake:** The following Airflow task runs `COPY INTO` to load files from the Snowflake stage into the raw jobs table.
4. **Transform and notify:** A Snowflake stream detects rows added by `COPY INTO`. The root task consumes/logs the stream, its child task runs `dbt build` for the Snowflake dbt project, and a finalizer task sends an email with the outcome and load summary.
5. **Explore:** Tableau connects to Snowflake to visualize the modeled job-market data.

### Future plans, limitations, enhancements
Some of the limitations were already mentioned throughout the article:
- Airflow runs in Docker on a local computer, so scheduled runs happen only while that computer is on and Docker is running
- S3-to-Snowflake credentials issues, which complicates the ability to connect S3 and Snowflake
- Company name normalization (Deloitte/DELOITTE). But it won't resolve names such as Deloitte, Deloitte Consulting, and Deloitte LLP. A future company-mapping dimension or entity-resolution process could help
- City-level grouping can fragment a metropolitan job market
- The dbt profile currently has only a dev target. That is sufficient for this portfolio project, but there are no separate staging or production targets
- Snowpipe with S3 event notifications could automatically ingest new files instead of relying on the scheduled Airflow `COPY INTO`
- The dashboard is currently viewed in Tableau Desktop's free-trial setup. Publishing/sharing has not been verified and may require an eligible Tableau license
- Adding retries/failure checks 
- Pipeline monitoring

Overall, a really great project! Especially if you want to try out designing an end-to-end pipeline and learn some new technologies and seeing it all work together is a rewarding feeling. 

Thank you for checking out my project and reading my blog! . ۫ ·(˶˃ᆺ˂˶) ♡ ˎˊ˗ You can find the source code on my [Github](https://github.com/luc-rap/job-market-intelligence/tree/main)