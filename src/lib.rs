extern crate cfg_if;
extern crate wasm_bindgen;
extern crate time;

#[macro_use]
extern crate serde_derive;
#[macro_use]
extern crate serde_json;

mod utils;

use wasm_bindgen::prelude::*;
use std::collections::HashMap;
// use std::time::Instant;
// use time::PreciseTime;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(msg: &str);
}

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ($($t:tt)*) => (log(&format!($($t)*)))
}

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
    pub location: Location,
    pub tag: HashMap<String, Vec<String>>,
    pub text: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Location {
    pub centroid: Vec<f64>
}

/**
 * External functions for blerb blarb
 */
#[wasm_bindgen]
pub fn greet() {
    alert("I'm a fat fart!");
}

fn transformItem(item: &Event) -> serde_json::Value {
    // log!("my item is {:?}", item);
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
    //let start = Instant::now();
    // let start = PreciseTime::now();
    let geo_json: Vec<serde_json::Value> = response.items.into_iter().map(|item| transformItem(&item)).collect();
    // let end = PreciseTime::now();
    // log!("The actual transformation took {} seconds", start.to(end));
    // let duration = start.elapsed();
    // log!("The actual transformation took {} seconds", sec);
    return JsValue::from_serde(&geo_json).unwrap();
}

#[wasm_bindgen]
pub fn echo(data: &JsValue) {
    //log!("Receiving Event...");
    let example: EventsResponse = data.into_serde().unwrap();
    //log!("Received Data: {:?}", example);
}
