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

The data that we get back from our server isn't *pure* GeoJSON; it's a custom object containing an
ID and a centroid. Our current clusterer, [supercluster](https://github.com/mapbox/supercluster),
requires that we transform our objects into valid GeoJSON Features.

**It's possible that we could cut this step out if we're implementing a custom clusterer.**

For the sake of proving our hypothesis, however, we're going to see how long this transformation
takes in Javascript, and then we're going to compare it to the time it takes in WebAssembly.
