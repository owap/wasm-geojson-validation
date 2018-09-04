import * as wasm from '../pkg/wasm_geojson_validation';

const data = require('./data.json');
console.log(data);
console.log(`${data.items.length} items loaded into RAM`);

function eventToGeoJson(datum) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: datum.properties.location,
    },
    properties: {
      name: datum.properties.text.title,
      type: datum.properties.tag.topic,
    },
  };
}

console.log('Testing JS conversion');
const jsTimes = [];
const iterations = 50;
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

const wasmTimes = [];
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
