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
Using our API, we collect a sample set of data that we'll need to transform. Because fetching all
Event metadata is a waste of bandwidth for rendering points on a map, we'll limit our query to include only
the fields relevent to map rendering:

+ ID
+ Title
+ Event Type
+ Location Centroid

Ten thousand (the maximum ElasticSearch pagesize) Events with these fields represented in JSON comes
to a total size of **2.28MB**

### Fetching Data
Run the following command to get our sample data, replacing `[YOUR_TOKEN_HERE]` with your JWT token:

```
curl 'https://fe-proxy.sit.blacksky.com/channels-api/channels/9bf787e8ddab40dba6c99e64a19574db/events?limit=10000' -H 'pragma: no-cache' -H 'origin: https://events.sit.blacksky.com' -H 'accept-encoding: gzip, deflate, br' -H 'accept-language: en-US,en;q=0.9' -H 'authorization: Bearer YOUR_TOKEN_HERE' -H 'content-type: application/json;charset=UTF-8' -H 'accept: application/json, text/plain, */*' -H 'cache-control: no-cache' -H 'authority: fe-proxy.sit.blacksky.com' -H 'referer: https://events.sit.blacksky.com/channel/9bf787e8ddab40dba6c99e64a19574db?event=9a1ad807-3a65-56f1-b8f6-49e68ea3d5ed' --data-binary '{"filter":{"numericThreeValue":null,"confidenceThreshold":null,"filterLogic":"and","anomalyThreshold":null,"qualityThreshold":null,"geoPrecision":null,"imageWorthiness":null,"numberOfDataSources":null,"severityThreshold":null,"namedLocation":null,"topic":["conflict"],"numericTwoValue":null,"locationCertainty":null,"eventType":"narrative","regionOfInterest":null,"numberOfCorrelationSources":null,"numberOfImagerySources":null,"numericOneValue":null,"mediaType":null,"numberOfEventSources":null},"includeFields":["id","properties.text.title","properties.tag.topic","properties.location.centroid"]}' --compressed > data.json
```

## Methodology:
We're not going to count the time it takes to load data, because this will vary based on network
speed. We're just looking at the time it takes to transform the data and then print the number of
objects in the resulting data structure.

HOWEVER, copying data into WASM's linear memory incurs an overhead. So we're going to count the time
it takes for data to cross that boundary.

### Javascript Implementation
A simple map function is all we need in Javascript.  We'll average 50 runs together.

```javascript
const jsTimes = [];
const iterations = 500;
for (let i = 0; i < iterations; i++) {
  const start = window.performance.now();
  const jsgj = data.items.map(eventToGeoJson);
  const end = window.performance.now();
  jsTimes.push(end - start);
}
console.log(
  `JS Average time out of ${iterations} iterations`,
  jsTimes.reduce((sum, num) => sum + num) / jsTimes.length,
  'ms'
);

// JS Average time out of 50 iterations 5.522000000055414 ms
```

Ok, so it looks like data transformation is not a bottleneck if we're averaging single-digit milisecond times.

### Rust Implementation
Rust is strongly typed, and WASM's linear memory holds only numbers, so the only way to transfer
JS objects across the boundary is to define the structure of the data we expect to receive.
Once we do that, however, it's easy enough to transform using [serde](https://github.com/serde-rs/serde).

```rust
// Describe the data structures

#[derive(Serialize, Deserialize, Debug)]
pub struct EventsResponse {
    pub totalItems: u32,
    pub limit: u32,
    pub items: Vec<Event>,
    pub restrictions: HashMap<String, Vec<String>>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Event {
    pub id: String,
    pub properties: Properties,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Properties {
    pub location: HashMap<String, Vec<f32>>,
    pub tag: HashMap<String, Vec<String>>,
    pub text: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Location {
    pub centroid: Vec<f64>
}

// Transform the data
fn transformItem(item: &Event) -> serde_json::Value {
    return json!({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": item.properties.location.centroid,
        },
        "properties": item.properties,
    });
}

#[wasm_bindgen]
pub fn transformData(data: &JsValue) -> JsValue {
    let response: EventsResponse = data.into_serde().unwrap();
    let geo_json: Vec<serde_json::Value> = response.items.into_iter().map(|item| transformItem(&item)).collect();
    return JsValue::from_serde(&geo_json).unwrap();
}
```

Then, in Javascript, we see how much time it takes to pass all the data into linear memory, transoform it, and pull it back into JS-space:

```javascript
const wasmTimes = [];
const iterations = 50;
for (let i = 0; i < iterations; i++) {
  const start = window.performance.now();
  const transformed = wasm.transformData(data);
  const end = window.performance.now();
  wasmTimes.push(end - start);
}
console.log(
  `WASM Average time out of ${iterations} iterations`,
  wasmTimes.reduce((sum, num) => sum + num) / wasmTimes.length,
  'ms'
);

// WASM Average time out of 50 iterations 323.1339999998454 ms
```

## Results:
Woof. As you can see, the time it takes to pass the data into WASM's linear memory
and get it out again is prohibitively expensive: about two orders of magnitude slower
than a normal transform in Javascript, and we've had to do some heavy typecasting as
well.

+ **JS Transformation:** 5.52ms
+ **WASM Copy, transformation, copy:** 323.13ms

Hang on a second, though; is this fair? We're not comparing apples to apples here with
all this copying in an out of memory. I wonder how much time JUST the transofrmations
take in rust.

Let's find out!

We'll modify out Rust code to print out the time elapsed after the transformation occurs:

```rust
pub fn transformData(data: &JsValue) -> JsValue {
    use std::time::Instant;
    let response: EventsResponse = data.into_serde().unwrap();
    let start = Instant::now();
    let geo_json: Vec<serde_json::Value> = response.items.into_iter().map(|item| transformItem(&item)).collect();
    let elapsed = start.elapsed();
    let sec = (elapsed.as_secs() as f64) + (elapsed.subsec_nanos() as f64 / 1000_000_000.0);
    log!("The actual transformation took {} seconds", sec);
    return JsValue::from_serde(&geo_json).unwrap();
}
```

Now, when we run our code, we get additional messages in the console:

```
```
