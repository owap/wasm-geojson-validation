import * as wasm from 'hello-wasm-pack';

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
const iterations = 500;
for (let i = 0; i < iterations; i++) {
  const start = window.performance.now();
  const jsgj = data.items.map(eventToGeoJson);
  const end = window.performance.now();
  jsTimes.push(end - start);
}
console.log(
  `Average time out of ${iterations} iterations`,
  jsTimes.reduce((sum, num) => sum + num) / jsTimes.length,
  'ms'
);
// wasm.greet();
