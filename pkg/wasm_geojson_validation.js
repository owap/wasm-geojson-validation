/* tslint:disable */
import * as wasm from './wasm_geojson_validation_bg';

let cachedDecoder = new TextDecoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
    return cachedDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

export function __wbg_alert_4fa967b7385899e3(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    alert(varg0);
}

const __wbg_log_336bf99219f9b50a_target = console.log;

export function __wbg_log_336bf99219f9b50a(arg0, arg1) {
    let varg0 = getStringFromWasm(arg0, arg1);
    __wbg_log_336bf99219f9b50a_target(varg0);
}
/**
* External functions for blerb blarb
* @returns {void}
*/
export function greet() {
    return wasm.greet();
}

const stack = [];

function addBorrowedObject(obj) {
    stack.push(obj);
    return ((stack.length - 1) << 1) | 1;
}

const slab = [{ obj: undefined }, { obj: null }, { obj: true }, { obj: false }];

function getObject(idx) {
    if ((idx & 1) === 1) {
        return stack[idx >> 1];
    } else {
        const val = slab[idx >> 1];
        
        return val.obj;
        
    }
}

let slab_next = slab.length;

function dropRef(idx) {
    
    idx = idx >> 1;
    if (idx < 4) return;
    let obj = slab[idx];
    
    obj.cnt -= 1;
    if (obj.cnt > 0) return;
    
    // If we hit 0 then free up our space in the slab
    slab[idx] = slab_next;
    slab_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropRef(idx);
    return ret;
}
/**
* @param {any} arg0
* @returns {any}
*/
export function transformData(arg0) {
    try {
        return takeObject(wasm.transformData(addBorrowedObject(arg0)));
        
    } finally {
        stack.pop();
        
    }
    
}

/**
* @param {any} arg0
* @returns {void}
*/
export function echo(arg0) {
    try {
        return wasm.echo(addBorrowedObject(arg0));
        
    } finally {
        stack.pop();
        
    }
    
}

function addHeapObject(obj) {
    if (slab_next === slab.length) slab.push(slab.length + 1);
    const idx = slab_next;
    const next = slab[idx];
    
    slab_next = next;
    
    slab[idx] = { obj, cnt: 1 };
    return idx << 1;
}

export function __wbindgen_json_parse(ptr, len) {
    return addHeapObject(JSON.parse(getStringFromWasm(ptr, len)));
}

let cachedEncoder = new TextEncoder('utf-8');

function passStringToWasm(arg) {
    
    const buf = cachedEncoder.encode(arg);
    const ptr = wasm.__wbindgen_malloc(buf.length);
    getUint8Memory().set(buf, ptr);
    return [ptr, buf.length];
}

let cachegetUint32Memory = null;
function getUint32Memory() {
    if (cachegetUint32Memory === null || cachegetUint32Memory.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory;
}

export function __wbindgen_json_serialize(idx, ptrptr) {
    const [ptr, len] = passStringToWasm(JSON.stringify(getObject(idx)));
    getUint32Memory()[ptrptr / 4] = ptr;
    return len;
}

export function __wbindgen_throw(ptr, len) {
    throw new Error(getStringFromWasm(ptr, len));
}

