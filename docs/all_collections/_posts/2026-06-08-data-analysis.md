---
layout: post
title: Customer Churn Analysis
date: 2026-06-03
categories: [Python, EDA, ML]
banner: /assets/images/
---

### Data Analysis

It's been some time but I really wanted to dive into data analysis again. We did plenty of classic examples at college - Titanic, Diabetes, Air Quality, Credit Card Default.... Even though real datasets are almost always more messy than datasets from Kaggle, it is always such an interesting challenge to search for real insights from data. I've been also thinking about whether data analysis is still relevant despite the capabilities of LLMs and AI, and while I think that AI can plot graphs for you and clean your data, they can't make the real decisions, assumptions and they can't tell you the truth. (At least, not yet 😉). For business, you need to make conclusions, present your decisions, have evidence, you need to know what's meaningful and you need to ask the right questions. On top of that, companies are generating more data than ever. 

Exploratory data analysis (EDA) is the key part of data analysis. It includes:
- data descriptions, characteristics, attributes, basic statistical information about the data
- pair analysis, e.g. correlations
- forming hypotheses
- identifying problems with the data - e.g. missing values, duplicate values, improper data structure, outliers, and so on

Based on insights identified in EDA, we move to data pre-processing. It usually involves:
- deduplication
- different strategies for inputting missing data
- dealing with outliers
- data mapping, e.g. encoding categorical values

The last part is the prediction - having a model that is capable of making predictions for new data. (The same pre-processing steps should be applied for the new data). We use metrics such as accuracy, precision, recall, to evaluate the model. And in the end, we discuss the overall results and conclusions AND present them and explain them to business/stakeholders. 

To practice my skills a little bit, I will develop solutions in Python, R and PySpark. 

### Customer Churn Analysis

What is churn? Usually business should define what classifies as churn, but usually it means - people who cancelled their subscription or stopped using the product. Retention is extremely important for businessess and one of the metrics to track is the churn rate. 

For this project, we will be using the [Telecom Churn Dataset](https://www.kaggle.com/datasets/mnassrib/telecom-churn-datasets/data?select=churn-bigml-20.csv), which consists of cleaned customer activity data (features), along with a churn label specifying whether a customer canceled the subscription. 
