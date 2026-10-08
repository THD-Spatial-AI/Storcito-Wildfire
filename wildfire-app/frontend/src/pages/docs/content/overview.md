# Overview

**STORCITO Wildfire** is a web platform for assessing wildfire danger over areas you choose. You outline an area on the map, pick a date or date range, choose which risk signals to include, and start a calculation. The finished result appears as a colour-coded risk map with summary metrics, a daily timeline and optional 3D terrain.

The platform covers **Galicia, Spain**, and was developed within the EU Horizon Europe project **STORCITO** by the BigGeoData & Spatial AI group at Technische Hochschule Deggendorf, together with Universidade de Vigo, which developed the wildfire risk engine.

> **Important:** the wildfire-danger index is experimental. It is not a calibrated ignition probability, and it has not been validated against observed fires. Use the results for exploration and planning support, not as an operational warning.

## What you can do

| Feature | What it is for |
|---|---|
| **Interactive map** | Explore Galicia, see where wildfire data is available and open your latest model |
| **Model wizard** | Create a wildfire model step by step: name, dates, area, risk signals, review |
| **Wildfire Simulations** | Manage all your models in workspaces, share them and start calculations |
| **Results viewer** | Inspect the risk map, metrics, daily timeline and 3D terrain of a finished model |
| **Model comparison** | Put two finished models side by side and see how risk shifted |
| **API access** | Fetch your models and results from scripts, QGIS or other tools with a personal token |

## Risk classes

Every result assigns each map cell to one of five danger classes:

| Class | Value | Colour | Meaning |
|---|---|---|---|
| Very Low | 1 | Blue | Conditions are the least favourable for fire. A fire is unlikely to start, and if it does, it spreads slowly |
| Low | 2 | Green | A fire could start but would spread slowly and be easy to contain. Little concern |
| Moderate | 3 | Yellow | A fire could start and spread when weather and fuel line up. Stay alert during hot, dry spells |
| High | 4 | Orange | Conditions favour both ignition and spread. Priority areas for monitoring and prevention |
| Very High | 5 | Red | The most favourable conditions for fire. Highest priority for prevention and preparedness |

The classes describe **relative danger**. They are not a probability that a fire will occur.

The **mean risk score** in the results weights each class by severity: Very Low 0.2, Low 0.4, Moderate 0.6, High 0.8 and Very High 1.0. A score near 1 means most of the area is in the severe classes.

The class comes from a continuous danger index that combines several factors with weights from an Analytic Hierarchy Process (AHP): fire weather (FWI), terrain and slope, fire history, vegetation (NDVI) and infrastructure.

## Access levels

Your account has an access level that decides which features you see:

| Level | Typical use |
|---|---|
| **Basic / Very Low** | View the map and work with your own models |
| **Intermediate** | Extended access with advanced features |
| **Manager** | Everything above, plus model comparison, managing users in your own group and issuing their API tokens |
| **Expert** | Full access, including the admin dashboard, all models, the simulation engines and feedback management |

The number of models you can create may be limited by your access level. If you reach the limit, the app tells you how many models you have and how many are allowed.

## Where to go next

- New here? Read **Getting started**.
- Ready to run your first assessment? Go to **Creating a model**.
- Want the data in your own tools? See **API access**.
