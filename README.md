# wasm-geojson-validation

**See SETUP.md for getting your enviornment setup to reproduce results.**

This repository contains experimental code that attempts to prove a number of hypotheses related to
manipulating geospatial data in a client-side, web-based computing environment:

1. Performing data transformations on geospatial features is faster in WebAssembly than in pure Javascript
2. Indexing clusters of points is faster in WebAssembly than in pure Javascript
3. Querying clusters across the wasm boundary does not incur a significant performance penalty
   compared with querying a pure-JS index
4. We can speed up our geospatial data rendering using a hybrid wasm-JS approach instead of our current
   JS-only rendering approach. (Also consider filesizes and over-the-wire transfer times)
5. There will be other developers interested in this information, and we can earn "street cred" by
   sharing this information in a blog post

# Hypothesis 1: Data Transformations

The data that we get back from our server isn't GeoJSON; it's a custom object chock full of
Event metadata. Our current clusterer, [supercluster](https://github.com/mapbox/supercluster),
requires that we transform our objects into valid GeoJSON Features.

**It's possible that we could cut this step out if we're implementing a custom clusterer.**

For the sake of proving our hypothesis, however, we're going to see how long this transformation
takes in Javascript, and then we're going to compare it to the time it takes in WebAssembly.

## Sample Data
Using our API, we built a sample set of the data (Events) that we render on the map. Because fetching all
Event metadata is a waste of bandwidth for rendering points on a map, we'll limit our query to include only
the fields relevent to map rendering:

+ ID
+ Title
+ Event Type
+ Location Centroid

Ten thousand (the maximum ElasticSearch pagesize) Events with these fields represented in JSON comes
to a total size of **2.28MB**

### Query
Run the following command to get our sample data, replacing `[YOUR_TOKEN_HERE]` with your JWT token:

```
curl 'https://fe-proxy.sit.blacksky.com/channels-api/channels/9bf787e8ddab40dba6c99e64a19574db/events?limit=10000' -H 'pragma: no-cache' -H 'origin: https://events.sit.blacksky.com' -H 'accept-encoding: gzip, deflate, br' -H 'accept-language: en-US,en;q=0.9' -H 'authorization: Bearer YOUR_TOKEN_HERE' -H 'content-type: application/json;charset=UTF-8' -H 'accept: application/json, text/plain, */*' -H 'cache-control: no-cache' -H 'authority: fe-proxy.sit.blacksky.com' -H 'referer: https://events.sit.blacksky.com/channel/9bf787e8ddab40dba6c99e64a19574db?event=9a1ad807-3a65-56f1-b8f6-49e68ea3d5ed' --data-binary '{"filter":{"numericThreeValue":null,"confidenceThreshold":null,"filterLogic":"and","anomalyThreshold":null,"qualityThreshold":null,"geoPrecision":null,"imageWorthiness":null,"numberOfDataSources":null,"severityThreshold":null,"namedLocation":null,"topic":["conflict"],"numericTwoValue":null,"locationCertainty":null,"eventType":"narrative","regionOfInterest":null,"numberOfCorrelationSources":null,"numberOfImagerySources":null,"numericOneValue":null,"mediaType":null,"numberOfEventSources":null},"includeFields":["id","properties.text.title","properties.tag.topic","properties.location.centroid"]}' --compressed > data.json
```

## Methodology:
We're not going to count the time it takes to load data, because this will vary based on network
speed. We're just looking at the time it takes to transform the data and then print the number of
objects in the resulting data structure.

A simple map function is all we need in Javascript, and we'll use `console.time` to log the results.
