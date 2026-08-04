var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/core.js
function $constructor(name, initializer, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: new Set
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a2;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
var _a, NEVER, $brand, $ZodAsyncError, $ZodEncodeError, globalConfig;
var init_core = __esm(() => {
  NEVER = /* @__PURE__ */ Object.freeze({
    status: "aborted"
  });
  $brand = Symbol("zod_brand");
  $ZodAsyncError = class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  $ZodEncodeError = class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
  globalConfig = globalThis.__zod_globalConfig;
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/util.js
var exports_util = {};
__export(exports_util, {
  unwrapMessage: () => unwrapMessage,
  uint8ArrayToHex: () => uint8ArrayToHex,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  stringifyPrimitive: () => stringifyPrimitive,
  slugify: () => slugify,
  shallowClone: () => shallowClone,
  safeExtend: () => safeExtend,
  required: () => required,
  randomString: () => randomString,
  propertyKeyTypes: () => propertyKeyTypes,
  promiseAllObject: () => promiseAllObject,
  primitiveTypes: () => primitiveTypes,
  prefixIssues: () => prefixIssues,
  pick: () => pick,
  partial: () => partial,
  parsedType: () => parsedType,
  optionalKeys: () => optionalKeys,
  omit: () => omit,
  objectClone: () => objectClone,
  numKeys: () => numKeys,
  nullish: () => nullish,
  normalizeParams: () => normalizeParams,
  mergeDefs: () => mergeDefs,
  merge: () => merge,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  joinValues: () => joinValues,
  issue: () => issue,
  isPlainObject: () => isPlainObject,
  isObject: () => isObject,
  hexToUint8Array: () => hexToUint8Array,
  getSizableOrigin: () => getSizableOrigin,
  getParsedType: () => getParsedType,
  getLengthableOrigin: () => getLengthableOrigin,
  getEnumValues: () => getEnumValues,
  getElementAtPath: () => getElementAtPath,
  floatSafeRemainder: () => floatSafeRemainder,
  finalizeIssue: () => finalizeIssue,
  extend: () => extend,
  explicitlyAborted: () => explicitlyAborted,
  escapeRegex: () => escapeRegex,
  esc: () => esc,
  defineLazy: () => defineLazy,
  createTransparentProxy: () => createTransparentProxy,
  cloneDef: () => cloneDef,
  clone: () => clone,
  cleanRegex: () => cleanRegex,
  cleanEnum: () => cleanEnum,
  captureStackTrace: () => captureStackTrace,
  cached: () => cached,
  base64urlToUint8Array: () => base64urlToUint8Array,
  base64ToUint8Array: () => base64ToUint8Array,
  assignProp: () => assignProp,
  assertNotEqual: () => assertNotEqual,
  assertNever: () => assertNever,
  assertIs: () => assertIs,
  assertEqual: () => assertEqual,
  assert: () => assert,
  allowsEval: () => allowsEval,
  aborted: () => aborted,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  Class: () => Class,
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0;i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0;i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0;i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0;i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0;i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Class {
  constructor(..._args) {}
}
var EVALUATING, captureStackTrace, allowsEval, getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
}, propertyKeyTypes, primitiveTypes, NUMBER_FORMAT_RANGES, BIGINT_FORMAT_RANGES;
var init_util = __esm(() => {
  init_core();
  EVALUATING = /* @__PURE__ */ Symbol("evaluating");
  captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
  allowsEval = /* @__PURE__ */ cached(() => {
    if (globalConfig.jitless) {
      return false;
    }
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  primitiveTypes = /* @__PURE__ */ new Set([
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol",
    "undefined"
  ]);
  NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
  };
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/errors.js
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error2, path = []) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
function treeifyError(error, mapper = (issue2) => issue2.message) {
  const result = { errors: [] };
  const processError = (error2, path = []) => {
    var _a2, _b;
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          result.errors.push(mapper(issue2));
          continue;
        }
        let curr = result;
        let i = 0;
        while (i < fullpath.length) {
          const el = fullpath[i];
          const terminal = i === fullpath.length - 1;
          if (typeof el === "string") {
            curr.properties ?? (curr.properties = {});
            (_a2 = curr.properties)[el] ?? (_a2[el] = { errors: [] });
            curr = curr.properties[el];
          } else {
            curr.items ?? (curr.items = []);
            (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
            curr = curr.items[el];
          }
          if (terminal) {
            curr.errors.push(mapper(issue2));
          }
          i++;
        }
      }
    }
  };
  processError(error);
  return result;
}
function toDotPath(_path) {
  const segs = [];
  const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
  for (const seg of path) {
    if (typeof seg === "number")
      segs.push(`[${seg}]`);
    else if (typeof seg === "symbol")
      segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg))
      segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length)
        segs.push(".");
      segs.push(seg);
    }
  }
  return segs.join("");
}
function prettifyError(error) {
  const lines = [];
  const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
  for (const issue2 of issues) {
    lines.push(`✖ ${issue2.message}`);
    if (issue2.path?.length)
      lines.push(`  → at ${toDotPath(issue2.path)}`);
  }
  return lines.join(`
`);
}
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
}, $ZodError, $ZodRealError;
var init_errors = __esm(() => {
  init_core();
  init_util();
  $ZodError = $constructor("$ZodError", initializer);
  $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
}, parse, _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
}, parseAsync, _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
}, safeParse, _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
}, safeParseAsync, _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
}, encode, _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
}, decode, _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
}, encodeAsync, _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
}, decodeAsync, _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
}, safeEncode, _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
}, safeDecode, _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
}, safeEncodeAsync, _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
}, safeDecodeAsync;
var init_parse = __esm(() => {
  init_core();
  init_errors();
  init_util();
  parse = /* @__PURE__ */ _parse($ZodRealError);
  parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
  safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
  safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  encode = /* @__PURE__ */ _encode($ZodRealError);
  decode = /* @__PURE__ */ _decode($ZodRealError);
  encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
  decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
  safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
  safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
  safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
  safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/regexes.js
var exports_regexes = {};
__export(exports_regexes, {
  xid: () => xid,
  uuid7: () => uuid7,
  uuid6: () => uuid6,
  uuid4: () => uuid4,
  uuid: () => uuid,
  uppercase: () => uppercase,
  unicodeEmail: () => unicodeEmail,
  undefined: () => _undefined,
  ulid: () => ulid,
  time: () => time,
  string: () => string,
  sha512_hex: () => sha512_hex,
  sha512_base64url: () => sha512_base64url,
  sha512_base64: () => sha512_base64,
  sha384_hex: () => sha384_hex,
  sha384_base64url: () => sha384_base64url,
  sha384_base64: () => sha384_base64,
  sha256_hex: () => sha256_hex,
  sha256_base64url: () => sha256_base64url,
  sha256_base64: () => sha256_base64,
  sha1_hex: () => sha1_hex,
  sha1_base64url: () => sha1_base64url,
  sha1_base64: () => sha1_base64,
  rfc5322Email: () => rfc5322Email,
  number: () => number,
  null: () => _null,
  nanoid: () => nanoid,
  md5_hex: () => md5_hex,
  md5_base64url: () => md5_base64url,
  md5_base64: () => md5_base64,
  mac: () => mac,
  lowercase: () => lowercase,
  ksuid: () => ksuid,
  ipv6: () => ipv6,
  ipv4: () => ipv4,
  integer: () => integer,
  idnEmail: () => idnEmail,
  httpProtocol: () => httpProtocol,
  html5Email: () => html5Email,
  hostname: () => hostname,
  hex: () => hex,
  guid: () => guid,
  extendedDuration: () => extendedDuration,
  emoji: () => emoji,
  email: () => email,
  e164: () => e164,
  duration: () => duration,
  domain: () => domain,
  datetime: () => datetime,
  date: () => date,
  cuid2: () => cuid2,
  cuid: () => cuid,
  cidrv6: () => cidrv6,
  cidrv4: () => cidrv4,
  browserEmail: () => browserEmail,
  boolean: () => boolean,
  bigint: () => bigint,
  base64url: () => base64url,
  base64: () => base64
});
function emoji() {
  return new RegExp(_emoji, "u");
}
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var cuid, cuid2, ulid, xid, ksuid, nanoid, duration, extendedDuration, guid, uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
}, uuid4, uuid6, uuid7, email, html5Email, rfc5322Email, unicodeEmail, idnEmail, browserEmail, _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`, ipv4, ipv6, mac = (delimiter) => {
  const escapedDelim = escapeRegex(delimiter ?? ":");
  return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
}, cidrv4, cidrv6, base64, base64url, hostname, domain, httpProtocol, e164, dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`, date, string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
}, bigint, integer, number, boolean, _null, _undefined, lowercase, uppercase, hex, md5_hex, md5_base64, md5_base64url, sha1_hex, sha1_base64, sha1_base64url, sha256_hex, sha256_base64, sha256_base64url, sha384_hex, sha384_base64, sha384_base64url, sha512_hex, sha512_base64, sha512_base64url;
var init_regexes = __esm(() => {
  init_util();
  cuid = /^[cC][0-9a-z]{6,}$/;
  cuid2 = /^[0-9a-z]+$/;
  ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  xid = /^[0-9a-vA-V]{20}$/;
  ksuid = /^[A-Za-z0-9]{27}$/;
  nanoid = /^[a-zA-Z0-9_-]{21}$/;
  duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  uuid4 = /* @__PURE__ */ uuid(4);
  uuid6 = /* @__PURE__ */ uuid(6);
  uuid7 = /* @__PURE__ */ uuid(7);
  email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  idnEmail = unicodeEmail;
  browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  base64url = /^[A-Za-z0-9_-]*$/;
  hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  httpProtocol = /^https?$/;
  e164 = /^\+[1-9]\d{6,14}$/;
  date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  bigint = /^-?\d+n?$/;
  integer = /^-?\d+$/;
  number = /^-?\d+(?:\.\d+)?$/;
  boolean = /^(?:true|false)$/i;
  _null = /^null$/i;
  _undefined = /^undefined$/i;
  lowercase = /^[^A-Z]*$/;
  uppercase = /^[^a-z]*$/;
  hex = /^[0-9a-fA-F]*$/;
  md5_hex = /^[0-9a-fA-F]{32}$/;
  md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
  md5_base64url = /* @__PURE__ */ fixedBase64url(22);
  sha1_hex = /^[0-9a-fA-F]{40}$/;
  sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
  sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
  sha256_hex = /^[0-9a-fA-F]{64}$/;
  sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
  sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
  sha384_hex = /^[0-9a-fA-F]{96}$/;
  sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
  sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
  sha512_hex = /^[0-9a-fA-F]{128}$/;
  sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
  sha512_base64url = /* @__PURE__ */ fixedBase64url(86);
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/checks.js
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheck, numericOriginMap, $ZodCheckLessThan, $ZodCheckGreaterThan, $ZodCheckMultipleOf, $ZodCheckNumberFormat, $ZodCheckBigIntFormat, $ZodCheckMaxSize, $ZodCheckMinSize, $ZodCheckSizeEquals, $ZodCheckMaxLength, $ZodCheckMinLength, $ZodCheckLengthEquals, $ZodCheckStringFormat, $ZodCheckRegex, $ZodCheckLowerCase, $ZodCheckUpperCase, $ZodCheckIncludes, $ZodCheckStartsWith, $ZodCheckEndsWith, $ZodCheckProperty, $ZodCheckMimeType, $ZodCheckOverwrite;
var init_checks = __esm(() => {
  init_core();
  init_regexes();
  init_util();
  $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a2;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
  });
  numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a2;
      (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (input < minimum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size <= def.maximum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size >= def.minimum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.size;
      bag.maximum = def.size;
      bag.size = def.size;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size === def.size)
        return;
      const tooBig = size > def.size;
      payload.issues.push({
        origin: getSizableOrigin(input),
        ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== undefined;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a2, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = new Set);
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {});
  });
  $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      const result = def.schema._zod.run({
        value: payload.value[def.property],
        issues: []
      }, {});
      if (result instanceof Promise) {
        return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
      }
      handleCheckPropertyResult(result, payload, def.property);
      return;
    };
  });
  $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
    $ZodCheck.init(inst, def);
    const mimeSet = new Set(def.mime);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.mime = def.mime;
    });
    inst._zod.check = (payload) => {
      if (mimeSet.has(payload.value.type))
        return;
      payload.issues.push({
        code: "invalid_value",
        values: def.mime,
        input: payload.value.type,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/versions.js
var version;
var init_versions = __esm(() => {
  version = {
    major: 4,
    minor: 4,
    patch: 3
  };
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/schemas.js
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: undefined,
        path: [key]
      });
    }
    return;
  }
  if (result.value === undefined) {
    if (isPresent) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
function handleExclusiveUnionResults(results, final, inst, ctx) {
  const successes = results.filter((r) => r.issues.length === 0);
  if (successes.length === 1) {
    final.value = successes[0].value;
    return final;
  }
  if (successes.length === 0) {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
  } else {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: [],
      inclusive: false
    });
  }
  return final;
}
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = new Map;
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
function getTupleOptStart(items, key) {
  for (let i = items.length - 1;i >= 0; i--) {
    if (items[i]._zod[key] !== "optional")
      return i + 1;
  }
  return 0;
}
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handleTupleResults(itemResults, final, items, input, optoutStart) {
  for (let i = 0;i < items.length; i++) {
    const r = itemResults[i];
    const isPresent = i < input.length;
    if (r.issues.length) {
      if (!isPresent && i >= optoutStart) {
        final.value.length = i;
        break;
      }
      final.issues.push(...prefixIssues(i, r.issues));
    }
    final.value[i] = r.value;
  }
  for (let i = final.value.length - 1;i >= input.length; i--) {
    if (items[i]._zod.optout === "optional" && final.value[i] === undefined) {
      final.value.length = i;
    } else {
      break;
    }
  }
  return final;
}
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
function handleOptionalResult(result, input) {
  if (input === undefined && (result.issues.length || result.fallback)) {
    return { issues: [], value: undefined };
  }
  return result;
}
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var $ZodType, $ZodString, $ZodStringFormat, $ZodGUID, $ZodUUID, $ZodEmail, $ZodURL, $ZodEmoji, $ZodNanoID, $ZodCUID, $ZodCUID2, $ZodULID, $ZodXID, $ZodKSUID, $ZodISODateTime, $ZodISODate, $ZodISOTime, $ZodISODuration, $ZodIPv4, $ZodIPv6, $ZodMAC, $ZodCIDRv4, $ZodCIDRv6, $ZodBase64, $ZodBase64URL, $ZodE164, $ZodJWT, $ZodCustomStringFormat, $ZodNumber, $ZodNumberFormat, $ZodBoolean, $ZodBigInt, $ZodBigIntFormat, $ZodSymbol, $ZodUndefined, $ZodNull, $ZodAny, $ZodUnknown, $ZodNever, $ZodVoid, $ZodDate, $ZodArray, $ZodObject, $ZodObjectJIT, $ZodUnion, $ZodXor, $ZodDiscriminatedUnion, $ZodIntersection, $ZodTuple, $ZodRecord, $ZodMap, $ZodSet, $ZodEnum, $ZodLiteral, $ZodFile, $ZodTransform, $ZodOptional, $ZodExactOptional, $ZodNullable, $ZodDefault, $ZodPrefault, $ZodNonOptional, $ZodSuccess, $ZodCatch, $ZodNaN, $ZodPipe, $ZodCodec, $ZodPreprocess, $ZodReadonly, $ZodTemplateLiteral, $ZodFunction, $ZodPromise, $ZodLazy, $ZodCustom;
var init_schemas = __esm(() => {
  init_checks();
  init_core();
  init_parse();
  init_regexes();
  init_util();
  init_versions();
  init_util();
  $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a2;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            if (explicitlyAborted(payload))
              continue;
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError;
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    defineLazy(inst, "~standard", () => ({
      validate: (value) => {
        try {
          const r = safeParse(inst, value);
          return r.success ? { value: r.data } : { issues: r.error?.issues };
        } catch (_) {
          return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
        }
      },
      vendor: "zod",
      version: 1
    }));
  });
  $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {}
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === undefined)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        if (!def.normalize && def.protocol?.source === httpProtocol.source) {
          if (!/^https?:\/\//i.test(trimmed)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid URL format",
              input: payload.value,
              inst,
              continue: !def.abort
            });
            return;
          }
        }
        const url = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: def.hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
  });
  $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv4`;
  });
  $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `ipv6`;
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodMAC = /* @__PURE__ */ $constructor("$ZodMAC", (inst, def) => {
    def.pattern ?? (def.pattern = mac(def.delimiter));
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.format = `mac`;
  });
  $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error;
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error;
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error;
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error;
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64";
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.bag.contentEncoding = "base64url";
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (def.fn(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = bigint;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = BigInt(payload.value);
        } catch (_) {}
      if (typeof payload.value === "bigint")
        return payload;
      payload.issues.push({
        expected: "bigint",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigIntFormat", (inst, def) => {
    $ZodCheckBigIntFormat.init(inst, def);
    $ZodBigInt.init(inst, def);
  });
  $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "symbol")
        return payload;
      payload.issues.push({
        expected: "symbol",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _undefined;
    inst._zod.values = new Set([undefined]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "undefined",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input === null)
        return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "void",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce) {
        try {
          payload.value = new Date(payload.value);
        } catch (_err) {}
      }
      const input = payload.value;
      const isDate = input instanceof Date;
      const isValidDate = isDate && !Number.isNaN(input.getTime());
      if (isValidDate)
        return payload;
      payload.issues.push({
        expected: "date",
        code: "invalid_type",
        input,
        ...isDate ? { received: "Invalid Date" } : {},
        inst
      });
      return payload;
    };
  });
  $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0;i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!desc?.get) {
      const sh = def.shape;
      Object.defineProperty(def, "shape", {
        get: () => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", {
            value: newSh
          });
          return newSh;
        }
      });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = new Set);
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el = shape[key];
        const isOptionalIn = el._zod.optin === "optional";
        const isOptionalOut = el._zod.optout === "optional";
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
        } else {
          handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id = ids[key];
        const k = esc(key);
        const schema = shape[key];
        const isOptionalIn = schema?._zod?.optin === "optional";
        const isOptionalOut = schema?._zod?.optout === "optional";
        doc.write(`const ${id} = ${parseStr(key)};`);
        if (isOptionalIn && isOptionalOut) {
          doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        } else if (!isOptionalIn) {
          doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
        } else {
          doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return;
    });
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  $ZodXor = /* @__PURE__ */ $constructor("$ZodXor", (inst, def) => {
    $ZodUnion.init(inst, def);
    def.inclusive = false;
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          results.push(result);
        }
      }
      if (!async)
        return handleExclusiveUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleExclusiveUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazy(inst._zod, "propValues", () => {
      const propValues = {};
      for (const option of def.options) {
        const pv = option._zod.propValues;
        if (!pv || Object.keys(pv).length === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const [k, v] of Object.entries(pv)) {
          if (!propValues[k])
            propValues[k] = new Set;
          for (const val of v) {
            propValues[k].add(val);
          }
        }
      }
      return propValues;
    });
    const disc = cached(() => {
      const opts = def.options;
      const map = new Map;
      for (const o of opts) {
        const values = o._zod.propValues?.[def.discriminator];
        if (!values || values.size === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
        for (const v of values) {
          if (map.has(v)) {
            throw new Error(`Duplicate discriminator value "${String(v)}"`);
          }
          map.set(v, o);
        }
      }
      return map;
    });
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst
        });
        return payload;
      }
      const opt = disc.value.get(input?.[def.discriminator]);
      if (opt) {
        return opt._zod.run(payload, ctx);
      }
      if (def.unionFallback || ctx.direction === "backward") {
        return _super(payload, ctx);
      }
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        discriminator: def.discriminator,
        options: Array.from(disc.value.keys()),
        input,
        path: [def.discriminator],
        inst
      });
      return payload;
    };
  });
  $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          input,
          inst,
          expected: "tuple",
          code: "invalid_type"
        });
        return payload;
      }
      payload.value = [];
      const proms = [];
      const optinStart = getTupleOptStart(items, "optin");
      const optoutStart = getTupleOptStart(items, "optout");
      if (!def.rest) {
        if (input.length < optinStart) {
          payload.issues.push({
            code: "too_small",
            minimum: optinStart,
            inclusive: true,
            input,
            inst,
            origin: "array"
          });
          return payload;
        }
        if (input.length > items.length) {
          payload.issues.push({
            code: "too_big",
            maximum: items.length,
            inclusive: true,
            input,
            inst,
            origin: "array"
          });
        }
      }
      const itemResults = new Array(items.length);
      for (let i = 0;i < items.length; i++) {
        const r = items[i]._zod.run({ value: input[i], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((rr) => {
            itemResults[i] = rr;
          }));
        } else {
          itemResults[i] = r;
        }
      }
      if (def.rest) {
        let i = items.length - 1;
        const rest = input.slice(items.length);
        for (const el of rest) {
          i++;
          const result = def.rest._zod.run({ value: el, issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((r) => handleTupleResult(r, payload, i)));
          } else {
            handleTupleResult(result, payload, i);
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => handleTupleResults(itemResults, payload, items, input, optoutStart));
      }
      return handleTupleResults(itemResults, payload, items, input, optoutStart);
    };
  });
  $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      const values = def.keyType._zod.values;
      if (values) {
        payload.value = {};
        const recordKeys = new Set;
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            recordKeys.add(typeof key === "number" ? key.toString() : key);
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            if (keyResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (keyResult.issues.length) {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
              continue;
            }
            const outKey = keyResult.value;
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[outKey] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!recordKeys.has(key)) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          if (!Object.prototype.propertyIsEnumerable.call(input, key))
            continue;
          let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
          if (checkNumericKey) {
            const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
            if (retryResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (retryResult.issues.length === 0) {
              keyResult = retryResult;
            }
          }
          if (keyResult.issues.length) {
            if (def.mode === "loose") {
              payload.value[key] = input[key];
            } else {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
            }
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[keyResult.value] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Map)) {
        payload.issues.push({
          expected: "map",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      payload.value = new Map;
      for (const [key, value] of input) {
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
        if (keyResult instanceof Promise || valueResult instanceof Promise) {
          proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
            handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
          }));
        } else {
          handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Set)) {
        payload.issues.push({
          input,
          inst,
          expected: "set",
          code: "invalid_type"
        });
        return payload;
      }
      const proms = [];
      payload.value = new Set;
      for (const item of input) {
        const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleSetResult(result2, payload)));
        } else
          handleSetResult(result, payload);
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
      throw new Error("Cannot create literal schema with no valid values");
    }
    const values = new Set(def.values);
    inst._zod.values = values;
    inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input instanceof File)
        return payload;
      payload.issues.push({
        expected: "file",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          payload.fallback = true;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError;
      }
      payload.value = _out;
      payload.fallback = true;
      return payload;
    };
  });
  $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const input = payload.value;
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise)
          return result.then((r) => handleOptionalResult(r, input));
        return handleOptionalResult(result, input);
      }
      if (payload.value === undefined) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => {
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError("ZodSuccess");
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.issues.length === 0;
          return payload;
        });
      }
      payload.value = result.issues.length === 0;
      return payload;
    };
  });
  $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.value;
          if (result2.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
            payload.fallback = true;
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
        payload.fallback = true;
      }
      return payload;
    };
  });
  $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "nan",
          code: "invalid_type"
        });
        return payload;
      }
      return payload;
    };
  });
  $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      const direction = ctx.direction || "forward";
      if (direction === "forward") {
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
          return left.then((left2) => handleCodecAResult(left2, def, ctx));
        }
        return handleCodecAResult(left, def, ctx);
      } else {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handleCodecAResult(right2, def, ctx));
        }
        return handleCodecAResult(right, def, ctx);
      }
    };
  });
  $ZodPreprocess = /* @__PURE__ */ $constructor("$ZodPreprocess", (inst, def) => {
    $ZodPipe.init(inst, def);
  });
  $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
    defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
      if (typeof part === "object" && part !== null) {
        if (!part._zod.pattern) {
          throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
        }
        const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
        if (!source)
          throw new Error(`Invalid template literal part: ${part._zod.traits}`);
        const start = source.startsWith("^") ? 1 : 0;
        const end = source.endsWith("$") ? source.length - 1 : source.length;
        regexParts.push(source.slice(start, end));
      } else if (part === null || primitiveTypes.has(typeof part)) {
        regexParts.push(escapeRegex(`${part}`));
      } else {
        throw new Error(`Invalid template literal part: ${part}`);
      }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "string") {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "string",
          code: "invalid_type"
        });
        return payload;
      }
      inst._zod.pattern.lastIndex = 0;
      if (!inst._zod.pattern.test(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          code: "invalid_format",
          format: def.format ?? "template_literal",
          pattern: inst._zod.pattern.source
        });
        return payload;
      }
      return payload;
    };
  });
  $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
    $ZodType.init(inst, def);
    inst._def = def;
    inst._zod.def = def;
    inst.implement = (func) => {
      if (typeof func !== "function") {
        throw new Error("implement() must be called with a function");
      }
      return function(...args) {
        const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
        const result = Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return parse(inst._def.output, result);
        }
        return result;
      };
    };
    inst.implementAsync = (func) => {
      if (typeof func !== "function") {
        throw new Error("implementAsync() must be called with a function");
      }
      return async function(...args) {
        const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
        const result = await Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return await parseAsync(inst._def.output, result);
        }
        return result;
      };
    };
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "function") {
        payload.issues.push({
          code: "invalid_type",
          expected: "function",
          input: payload.value,
          inst
        });
        return payload;
      }
      const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
      if (hasPromiseOutput) {
        payload.value = inst.implementAsync(payload.value);
      } else {
        payload.value = inst.implement(payload.value);
      }
      return payload;
    };
    inst.input = (...args) => {
      const F = inst.constructor;
      if (Array.isArray(args[0])) {
        return new F({
          type: "function",
          input: new $ZodTuple({
            type: "tuple",
            items: args[0],
            rest: args[1]
          }),
          output: inst._def.output
        });
      }
      return new F({
        type: "function",
        input: args[0],
        output: inst._def.output
      });
    };
    inst.output = (output) => {
      const F = inst.constructor;
      return new F({
        type: "function",
        input: inst._def.input,
        output
      });
    };
    return inst;
  });
  $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
  });
  $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "innerType", () => {
      const d = def;
      if (!d._cachedInner)
        d._cachedInner = def.getter();
      return d._cachedInner;
    });
    defineLazy(inst._zod, "pattern", () => inst._zod.innerType?._zod?.pattern);
    defineLazy(inst._zod, "propValues", () => inst._zod.innerType?._zod?.propValues);
    defineLazy(inst._zod, "optin", () => inst._zod.innerType?._zod?.optin ?? undefined);
    defineLazy(inst._zod, "optout", () => inst._zod.innerType?._zod?.optout ?? undefined);
    inst._zod.parse = (payload, ctx) => {
      const inner = inst._zod.innerType;
      return inner._zod.run(payload, ctx);
    };
  });
  $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ar.js
function ar_default() {
  return {
    localeError: error()
  };
}
var error = () => {
  const Sizable = {
    string: { unit: "حرف", verb: "أن يحوي" },
    file: { unit: "بايت", verb: "أن يحوي" },
    array: { unit: "عنصر", verb: "أن يحوي" },
    set: { unit: "عنصر", verb: "أن يحوي" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "مدخل",
    email: "بريد إلكتروني",
    url: "رابط",
    emoji: "إيموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاريخ ووقت بمعيار ISO",
    date: "تاريخ بمعيار ISO",
    time: "وقت بمعيار ISO",
    duration: "مدة بمعيار ISO",
    ipv4: "عنوان IPv4",
    ipv6: "عنوان IPv6",
    cidrv4: "مدى عناوين بصيغة IPv4",
    cidrv6: "مدى عناوين بصيغة IPv6",
    base64: "نَص بترميز base64-encoded",
    base64url: "نَص بترميز base64url-encoded",
    json_string: "نَص على هيئة JSON",
    e164: "رقم هاتف بمعيار E.164",
    jwt: "JWT",
    template_literal: "مدخل"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `مدخلات غير مقبولة: يفترض إدخال instanceof ${issue2.expected}، ولكن تم إدخال ${received}`;
        }
        return `مدخلات غير مقبولة: يفترض إدخال ${expected}، ولكن تم إدخال ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `مدخلات غير مقبولة: يفترض إدخال ${stringifyPrimitive(issue2.values[0])}`;
        return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return ` أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"}`;
        return `أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `نَص غير مقبول: يجب أن يبدأ بـ "${issue2.prefix}"`;
        if (_issue.format === "ends_with")
          return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} غير مقبول`;
      }
      case "not_multiple_of":
        return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue2.divisor}`;
      case "unrecognized_keys":
        return `معرف${issue2.keys.length > 1 ? "ات" : ""} غريب${issue2.keys.length > 1 ? "ة" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `معرف غير مقبول في ${issue2.origin}`;
      case "invalid_union":
        return "مدخل غير مقبول";
      case "invalid_element":
        return `مدخل غير مقبول في ${issue2.origin}`;
      default:
        return "مدخل غير مقبول";
    }
  };
};
var init_ar = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/az.js
function az_default() {
  return {
    localeError: error2()
  };
}
var error2 = () => {
  const Sizable = {
    string: { unit: "simvol", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "element", verb: "olmalıdır" },
    set: { unit: "element", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Yanlış dəyər: gözlənilən instanceof ${issue2.expected}, daxil olan ${received}`;
        }
        return `Yanlış dəyər: gözlənilən ${expected}, daxil olan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Yanlış dəyər: gözlənilən ${stringifyPrimitive(issue2.values[0])}`;
        return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Yanlış mətn: "${_issue.prefix}" ilə başlamalıdır`;
        if (_issue.format === "ends_with")
          return `Yanlış mətn: "${_issue.suffix}" ilə bitməlidir`;
        if (_issue.format === "includes")
          return `Yanlış mətn: "${_issue.includes}" daxil olmalıdır`;
        if (_issue.format === "regex")
          return `Yanlış mətn: ${_issue.pattern} şablonuna uyğun olmalıdır`;
        return `Yanlış ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Yanlış ədəd: ${issue2.divisor} ilə bölünə bilən olmalıdır`;
      case "unrecognized_keys":
        return `Tanınmayan açar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} daxilində yanlış açar`;
      case "invalid_union":
        return "Yanlış dəyər";
      case "invalid_element":
        return `${issue2.origin} daxilində yanlış dəyər`;
      default:
        return `Yanlış dəyər`;
    }
  };
};
var init_az = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
function be_default() {
  return {
    localeError: error3()
  };
}
var error3 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "сімвал",
        few: "сімвалы",
        many: "сімвалаў"
      },
      verb: "мець"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    file: {
      unit: {
        one: "байт",
        few: "байты",
        many: "байтаў"
      },
      verb: "мець"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "увод",
    email: "email адрас",
    url: "URL",
    emoji: "эмодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата і час",
    date: "ISO дата",
    time: "ISO час",
    duration: "ISO працягласць",
    ipv4: "IPv4 адрас",
    ipv6: "IPv6 адрас",
    cidrv4: "IPv4 дыяпазон",
    cidrv6: "IPv6 дыяпазон",
    base64: "радок у фармаце base64",
    base64url: "радок у фармаце base64url",
    json_string: "JSON радок",
    e164: "нумар E.164",
    jwt: "JWT",
    template_literal: "увод"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "лік",
    array: "масіў"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Няправільны ўвод: чакаўся instanceof ${issue2.expected}, атрымана ${received}`;
        }
        return `Няправільны ўвод: чакаўся ${expected}, атрымана ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Няправільны ўвод: чакалася ${stringifyPrimitive(issue2.values[0])}`;
        return `Няправільны варыянт: чакаўся адзін з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна быць ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта малы: чакалася, што ${issue2.origin} павінна ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Занадта малы: чакалася, што ${issue2.origin} павінна быць ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Няправільны радок: павінен пачынацца з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Няправільны радок: павінен заканчвацца на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Няправільны радок: павінен змяшчаць "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Няправільны радок: павінен адпавядаць шаблону ${_issue.pattern}`;
        return `Няправільны ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Няправільны лік: павінен быць кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспазнаны ${issue2.keys.length > 1 ? "ключы" : "ключ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Няправільны ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Няправільны ўвод";
      case "invalid_element":
        return `Няправільнае значэнне ў ${issue2.origin}`;
      default:
        return `Няправільны ўвод`;
    }
  };
};
var init_be = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/bg.js
function bg_default() {
  return {
    localeError: error4()
  };
}
var error4 = () => {
  const Sizable = {
    string: { unit: "символа", verb: "да съдържа" },
    file: { unit: "байта", verb: "да съдържа" },
    array: { unit: "елемента", verb: "да съдържа" },
    set: { unit: "елемента", verb: "да съдържа" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "вход",
    email: "имейл адрес",
    url: "URL",
    emoji: "емоджи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO време",
    date: "ISO дата",
    time: "ISO време",
    duration: "ISO продължителност",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "base64-кодиран низ",
    base64url: "base64url-кодиран низ",
    json_string: "JSON низ",
    e164: "E.164 номер",
    jwt: "JWT",
    template_literal: "вход"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "число",
    array: "масив"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Невалиден вход: очакван instanceof ${issue2.expected}, получен ${received}`;
        }
        return `Невалиден вход: очакван ${expected}, получен ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Невалиден вход: очакван ${stringifyPrimitive(issue2.values[0])}`;
        return `Невалидна опция: очаквано едно от ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Твърде голямо: очаква се ${issue2.origin ?? "стойност"} да съдържа ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елемента"}`;
        return `Твърде голямо: очаква се ${issue2.origin ?? "стойност"} да бъде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Твърде малко: очаква се ${issue2.origin} да съдържа ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Твърде малко: очаква се ${issue2.origin} да бъде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Невалиден низ: трябва да започва с "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Невалиден низ: трябва да завършва с "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Невалиден низ: трябва да включва "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Невалиден низ: трябва да съвпада с ${_issue.pattern}`;
        let invalid_adj = "Невалиден";
        if (_issue.format === "emoji")
          invalid_adj = "Невалидно";
        if (_issue.format === "datetime")
          invalid_adj = "Невалидно";
        if (_issue.format === "date")
          invalid_adj = "Невалидна";
        if (_issue.format === "time")
          invalid_adj = "Невалидно";
        if (_issue.format === "duration")
          invalid_adj = "Невалидна";
        return `${invalid_adj} ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Невалидно число: трябва да бъде кратно на ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Неразпознат${issue2.keys.length > 1 ? "и" : ""} ключ${issue2.keys.length > 1 ? "ове" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Невалиден ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Невалиден вход";
      case "invalid_element":
        return `Невалидна стойност в ${issue2.origin}`;
      default:
        return `Невалиден вход`;
    }
  };
};
var init_bg = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ca.js
function ca_default() {
  return {
    localeError: error5()
  };
}
var error5 = () => {
  const Sizable = {
    string: { unit: "caràcters", verb: "contenir" },
    file: { unit: "bytes", verb: "contenir" },
    array: { unit: "elements", verb: "contenir" },
    set: { unit: "elements", verb: "contenir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrada",
    email: "adreça electrònica",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "durada ISO",
    ipv4: "adreça IPv4",
    ipv6: "adreça IPv6",
    cidrv4: "rang IPv4",
    cidrv6: "rang IPv6",
    base64: "cadena codificada en base64",
    base64url: "cadena codificada en base64url",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Tipus invàlid: s'esperava instanceof ${issue2.expected}, s'ha rebut ${received}`;
        }
        return `Tipus invàlid: s'esperava ${expected}, s'ha rebut ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Valor invàlid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
        return `Opció invàlida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "com a màxim" : "menys de";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} contingués ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "com a mínim" : "més de";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Massa petit: s'esperava que ${issue2.origin} contingués ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Format invàlid: ha de començar amb "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Format invàlid: ha d'acabar amb "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Format invàlid: ha d'incloure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Format invàlid: ha de coincidir amb el patró ${_issue.pattern}`;
        return `Format invàlid per a ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número invàlid: ha de ser múltiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clau invàlida a ${issue2.origin}`;
      case "invalid_union":
        return "Entrada invàlida";
      case "invalid_element":
        return `Element invàlid a ${issue2.origin}`;
      default:
        return `Entrada invàlida`;
    }
  };
};
var init_ca = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/cs.js
function cs_default() {
  return {
    localeError: error6()
  };
}
var error6 = () => {
  const Sizable = {
    string: { unit: "znaků", verb: "mít" },
    file: { unit: "bajtů", verb: "mít" },
    array: { unit: "prvků", verb: "mít" },
    set: { unit: "prvků", verb: "mít" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "regulární výraz",
    email: "e-mailová adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "datum a čas ve formátu ISO",
    date: "datum ve formátu ISO",
    time: "čas ve formátu ISO",
    duration: "doba trvání ISO",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "rozsah IPv4",
    cidrv6: "rozsah IPv6",
    base64: "řetězec zakódovaný ve formátu base64",
    base64url: "řetězec zakódovaný ve formátu base64url",
    json_string: "řetězec ve formátu JSON",
    e164: "číslo E.164",
    jwt: "JWT",
    template_literal: "vstup"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "číslo",
    string: "řetězec",
    function: "funkce",
    array: "pole"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neplatný vstup: očekáváno instanceof ${issue2.expected}, obdrženo ${received}`;
        }
        return `Neplatný vstup: očekáváno ${expected}, obdrženo ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neplatný vstup: očekáváno ${stringifyPrimitive(issue2.values[0])}`;
        return `Neplatná možnost: očekávána jedna z hodnot ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neplatný řetězec: musí začínat na "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neplatný řetězec: musí končit na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neplatný řetězec: musí obsahovat "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neplatný řetězec: musí odpovídat vzoru ${_issue.pattern}`;
        return `Neplatný formát ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neplatné číslo: musí být násobkem ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neznámé klíče: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neplatný klíč v ${issue2.origin}`;
      case "invalid_union":
        return "Neplatný vstup";
      case "invalid_element":
        return `Neplatná hodnota v ${issue2.origin}`;
      default:
        return `Neplatný vstup`;
    }
  };
};
var init_cs = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/da.js
function da_default() {
  return {
    localeError: error7()
  };
}
var error7 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "havde" },
    file: { unit: "bytes", verb: "havde" },
    array: { unit: "elementer", verb: "indeholdt" },
    set: { unit: "elementer", verb: "indeholdt" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "e-mailadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslæt",
    date: "ISO-dato",
    time: "ISO-klokkeslæt",
    duration: "ISO-varighed",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodet streng",
    base64url: "base64url-kodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "streng",
    number: "tal",
    boolean: "boolean",
    array: "liste",
    object: "objekt",
    set: "sæt",
    file: "fil"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ugyldigt input: forventede instanceof ${issue2.expected}, fik ${received}`;
        }
        return `Ugyldigt input: forventede ${expected}, fik ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig værdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldigt valg: forventede en af følgende ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing)
          return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing) {
          return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: skal matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldigt tal: skal være deleligt med ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukendte nøgler" : "Ukendt nøgle"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøgle i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldigt input: matcher ingen af de tilladte typer";
      case "invalid_element":
        return `Ugyldig værdi i ${issue2.origin}`;
      default:
        return `Ugyldigt input`;
    }
  };
};
var init_da = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/de.js
function de_default() {
  return {
    localeError: error8()
  };
}
var error8 = () => {
  const Sizable = {
    string: { unit: "Zeichen", verb: "zu haben" },
    file: { unit: "Bytes", verb: "zu haben" },
    array: { unit: "Elemente", verb: "zu haben" },
    set: { unit: "Elemente", verb: "zu haben" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "Eingabe",
    email: "E-Mail-Adresse",
    url: "URL",
    emoji: "Emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-Datum und -Uhrzeit",
    date: "ISO-Datum",
    time: "ISO-Uhrzeit",
    duration: "ISO-Dauer",
    ipv4: "IPv4-Adresse",
    ipv6: "IPv6-Adresse",
    cidrv4: "IPv4-Bereich",
    cidrv6: "IPv6-Bereich",
    base64: "Base64-codierter String",
    base64url: "Base64-URL-codierter String",
    json_string: "JSON-String",
    e164: "E.164-Nummer",
    jwt: "JWT",
    template_literal: "Eingabe"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "Zahl",
    array: "Array"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ungültige Eingabe: erwartet instanceof ${issue2.expected}, erhalten ${received}`;
        }
        return `Ungültige Eingabe: erwartet ${expected}, erhalten ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ungültige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ungültige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
        return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ist`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
        }
        return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ungültiger String: muss mit "${_issue.prefix}" beginnen`;
        if (_issue.format === "ends_with")
          return `Ungültiger String: muss mit "${_issue.suffix}" enden`;
        if (_issue.format === "includes")
          return `Ungültiger String: muss "${_issue.includes}" enthalten`;
        if (_issue.format === "regex")
          return `Ungültiger String: muss dem Muster ${_issue.pattern} entsprechen`;
        return `Ungültig: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ungültige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Unbekannte Schlüssel" : "Unbekannter Schlüssel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ungültiger Schlüssel in ${issue2.origin}`;
      case "invalid_union":
        return "Ungültige Eingabe";
      case "invalid_element":
        return `Ungültiger Wert in ${issue2.origin}`;
      default:
        return `Ungültige Eingabe`;
    }
  };
};
var init_de = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/el.js
function el_default() {
  return {
    localeError: error9()
  };
}
var error9 = () => {
  const Sizable = {
    string: { unit: "χαρακτήρες", verb: "να έχει" },
    file: { unit: "bytes", verb: "να έχει" },
    array: { unit: "στοιχεία", verb: "να έχει" },
    set: { unit: "στοιχεία", verb: "να έχει" },
    map: { unit: "καταχωρήσεις", verb: "να έχει" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "είσοδος",
    email: "διεύθυνση email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO ημερομηνία και ώρα",
    date: "ISO ημερομηνία",
    time: "ISO ώρα",
    duration: "ISO διάρκεια",
    ipv4: "διεύθυνση IPv4",
    ipv6: "διεύθυνση IPv6",
    mac: "διεύθυνση MAC",
    cidrv4: "εύρος IPv4",
    cidrv6: "εύρος IPv6",
    base64: "συμβολοσειρά κωδικοποιημένη σε base64",
    base64url: "συμβολοσειρά κωδικοποιημένη σε base64url",
    json_string: "συμβολοσειρά JSON",
    e164: "αριθμός E.164",
    jwt: "JWT",
    template_literal: "είσοδος"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (typeof issue2.expected === "string" && /^[A-Z]/.test(issue2.expected)) {
          return `Μη έγκυρη είσοδος: αναμενόταν instanceof ${issue2.expected}, λήφθηκε ${received}`;
        }
        return `Μη έγκυρη είσοδος: αναμενόταν ${expected}, λήφθηκε ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Μη έγκυρη είσοδος: αναμενόταν ${stringifyPrimitive(issue2.values[0])}`;
        return `Μη έγκυρη επιλογή: αναμενόταν ένα από ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Πολύ μεγάλο: αναμενόταν ${issue2.origin ?? "τιμή"} να έχει ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "στοιχεία"}`;
        return `Πολύ μεγάλο: αναμενόταν ${issue2.origin ?? "τιμή"} να είναι ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Πολύ μικρό: αναμενόταν ${issue2.origin} να έχει ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Πολύ μικρό: αναμενόταν ${issue2.origin} να είναι ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Μη έγκυρη συμβολοσειρά: πρέπει να ξεκινά με "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Μη έγκυρη συμβολοσειρά: πρέπει να τελειώνει με "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Μη έγκυρη συμβολοσειρά: πρέπει να περιέχει "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Μη έγκυρη συμβολοσειρά: πρέπει να ταιριάζει με το μοτίβο ${_issue.pattern}`;
        return `Μη έγκυρο: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Μη έγκυρος αριθμός: πρέπει να είναι πολλαπλάσιο του ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Άγνωστ${issue2.keys.length > 1 ? "α" : "ο"} κλειδ${issue2.keys.length > 1 ? "ιά" : "ί"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Μη έγκυρο κλειδί στο ${issue2.origin}`;
      case "invalid_union":
        return "Μη έγκυρη είσοδος";
      case "invalid_element":
        return `Μη έγκυρη τιμή στο ${issue2.origin}`;
      default:
        return `Μη έγκυρη είσοδος`;
    }
  };
};
var init_el = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/en.js
function en_default() {
  return {
    localeError: error10()
  };
}
var error10 = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
          const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
          return `Invalid discriminator value. Expected ${opts}`;
        }
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
var init_en = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/eo.js
function eo_default() {
  return {
    localeError: error11()
  };
}
var error11 = () => {
  const Sizable = {
    string: { unit: "karaktrojn", verb: "havi" },
    file: { unit: "bajtojn", verb: "havi" },
    array: { unit: "elementojn", verb: "havi" },
    set: { unit: "elementojn", verb: "havi" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "enigo",
    email: "retadreso",
    url: "URL",
    emoji: "emoĝio",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datotempo",
    date: "ISO-dato",
    time: "ISO-tempo",
    duration: "ISO-daŭro",
    ipv4: "IPv4-adreso",
    ipv6: "IPv6-adreso",
    cidrv4: "IPv4-rango",
    cidrv6: "IPv6-rango",
    base64: "64-ume kodita karaktraro",
    base64url: "URL-64-ume kodita karaktraro",
    json_string: "JSON-karaktraro",
    e164: "E.164-nombro",
    jwt: "JWT",
    template_literal: "enigo"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nombro",
    array: "tabelo",
    null: "senvalora"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Nevalida enigo: atendiĝis instanceof ${issue2.expected}, riceviĝis ${received}`;
        }
        return `Nevalida enigo: atendiĝis ${expected}, riceviĝis ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nevalida enigo: atendiĝis ${stringifyPrimitive(issue2.values[0])}`;
        return `Nevalida opcio: atendiĝis unu el ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
        return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Tro malgranda: atendiĝis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Tro malgranda: atendiĝis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nevalida karaktraro: devas komenciĝi per "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nevalida karaktraro: devas finiĝi per "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
        return `Nevalida ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nekonata${issue2.keys.length > 1 ? "j" : ""} ŝlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nevalida ŝlosilo en ${issue2.origin}`;
      case "invalid_union":
        return "Nevalida enigo";
      case "invalid_element":
        return `Nevalida valoro en ${issue2.origin}`;
      default:
        return `Nevalida enigo`;
    }
  };
};
var init_eo = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/es.js
function es_default() {
  return {
    localeError: error12()
  };
}
var error12 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "tener" },
    file: { unit: "bytes", verb: "tener" },
    array: { unit: "elementos", verb: "tener" },
    set: { unit: "elementos", verb: "tener" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrada",
    email: "dirección de correo electrónico",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "fecha y hora ISO",
    date: "fecha ISO",
    time: "hora ISO",
    duration: "duración ISO",
    ipv4: "dirección IPv4",
    ipv6: "dirección IPv6",
    cidrv4: "rango IPv4",
    cidrv6: "rango IPv6",
    base64: "cadena codificada en base64",
    base64url: "URL codificada en base64",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "texto",
    number: "número",
    boolean: "booleano",
    array: "arreglo",
    object: "objeto",
    set: "conjunto",
    file: "archivo",
    date: "fecha",
    bigint: "número grande",
    symbol: "símbolo",
    undefined: "indefinido",
    null: "nulo",
    function: "función",
    map: "mapa",
    record: "registro",
    tuple: "tupla",
    enum: "enumeración",
    union: "unión",
    literal: "literal",
    promise: "promesa",
    void: "vacío",
    never: "nunca",
    unknown: "desconocido",
    any: "cualquiera"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrada inválida: se esperaba instanceof ${issue2.expected}, recibido ${received}`;
        }
        return `Entrada inválida: se esperaba ${expected}, recibido ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
        return `Opción inválida: se esperaba una de ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing)
          return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing) {
          return `Demasiado pequeño: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Demasiado pequeño: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Cadena inválida: debe comenzar con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Cadena inválida: debe terminar en "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cadena inválida: debe incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cadena inválida: debe coincidir con el patrón ${_issue.pattern}`;
        return `Inválido ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número inválido: debe ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Llave inválida en ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido en ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      default:
        return `Entrada inválida`;
    }
  };
};
var init_es = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fa.js
function fa_default() {
  return {
    localeError: error13()
  };
}
var error13 = () => {
  const Sizable = {
    string: { unit: "کاراکتر", verb: "داشته باشد" },
    file: { unit: "بایت", verb: "داشته باشد" },
    array: { unit: "آیتم", verb: "داشته باشد" },
    set: { unit: "آیتم", verb: "داشته باشد" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ورودی",
    email: "آدرس ایمیل",
    url: "URL",
    emoji: "ایموجی",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاریخ و زمان ایزو",
    date: "تاریخ ایزو",
    time: "زمان ایزو",
    duration: "مدت زمان ایزو",
    ipv4: "IPv4 آدرس",
    ipv6: "IPv6 آدرس",
    cidrv4: "IPv4 دامنه",
    cidrv6: "IPv6 دامنه",
    base64: "base64-encoded رشته",
    base64url: "base64url-encoded رشته",
    json_string: "JSON رشته",
    e164: "E.164 عدد",
    jwt: "JWT",
    template_literal: "ورودی"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "عدد",
    array: "آرایه"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ورودی نامعتبر: می‌بایست instanceof ${issue2.expected} می‌بود، ${received} دریافت شد`;
        }
        return `ورودی نامعتبر: می‌بایست ${expected} می‌بود، ${received} دریافت شد`;
      }
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ورودی نامعتبر: می‌بایست ${stringifyPrimitive(issue2.values[0])} می‌بود`;
        }
        return `گزینه نامعتبر: می‌بایست یکی از ${joinValues(issue2.values, "|")} می‌بود`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"} باشد`;
        }
        return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} باشد`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} باشد`;
        }
        return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} باشد`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `رشته نامعتبر: باید با "${_issue.prefix}" شروع شود`;
        }
        if (_issue.format === "ends_with") {
          return `رشته نامعتبر: باید با "${_issue.suffix}" تمام شود`;
        }
        if (_issue.format === "includes") {
          return `رشته نامعتبر: باید شامل "${_issue.includes}" باشد`;
        }
        if (_issue.format === "regex") {
          return `رشته نامعتبر: باید با الگوی ${_issue.pattern} مطابقت داشته باشد`;
        }
        return `${FormatDictionary[_issue.format] ?? issue2.format} نامعتبر`;
      }
      case "not_multiple_of":
        return `عدد نامعتبر: باید مضرب ${issue2.divisor} باشد`;
      case "unrecognized_keys":
        return `کلید${issue2.keys.length > 1 ? "های" : ""} ناشناس: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `کلید ناشناس در ${issue2.origin}`;
      case "invalid_union":
        return `ورودی نامعتبر`;
      case "invalid_element":
        return `مقدار نامعتبر در ${issue2.origin}`;
      default:
        return `ورودی نامعتبر`;
    }
  };
};
var init_fa = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fi.js
function fi_default() {
  return {
    localeError: error14()
  };
}
var error14 = () => {
  const Sizable = {
    string: { unit: "merkkiä", subject: "merkkijonon" },
    file: { unit: "tavua", subject: "tiedoston" },
    array: { unit: "alkiota", subject: "listan" },
    set: { unit: "alkiota", subject: "joukon" },
    number: { unit: "", subject: "luvun" },
    bigint: { unit: "", subject: "suuren kokonaisluvun" },
    int: { unit: "", subject: "kokonaisluvun" },
    date: { unit: "", subject: "päivämäärän" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "säännöllinen lauseke",
    email: "sähköpostiosoite",
    url: "URL-osoite",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-aikaleima",
    date: "ISO-päivämäärä",
    time: "ISO-aika",
    duration: "ISO-kesto",
    ipv4: "IPv4-osoite",
    ipv6: "IPv6-osoite",
    cidrv4: "IPv4-alue",
    cidrv6: "IPv6-alue",
    base64: "base64-koodattu merkkijono",
    base64url: "base64url-koodattu merkkijono",
    json_string: "JSON-merkkijono",
    e164: "E.164-luku",
    jwt: "JWT",
    template_literal: "templaattimerkkijono"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Virheellinen tyyppi: odotettiin instanceof ${issue2.expected}, oli ${received}`;
        }
        return `Virheellinen tyyppi: odotettiin ${expected}, oli ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Virheellinen syöte: täytyy olla ${stringifyPrimitive(issue2.values[0])}`;
        return `Virheellinen valinta: täytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian suuri: ${sizing.subject} täytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian suuri: arvon täytyy olla ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian pieni: ${sizing.subject} täytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian pieni: arvon täytyy olla ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Virheellinen syöte: täytyy alkaa "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Virheellinen syöte: täytyy loppua "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Virheellinen syöte: täytyy sisältää "${_issue.includes}"`;
        if (_issue.format === "regex") {
          return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${_issue.pattern}`;
        }
        return `Virheellinen ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Virheellinen luku: täytyy olla luvun ${issue2.divisor} monikerta`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Virheellinen avain tietueessa";
      case "invalid_union":
        return "Virheellinen unioni";
      case "invalid_element":
        return "Virheellinen arvo joukossa";
      default:
        return `Virheellinen syöte`;
    }
  };
};
var init_fi = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr.js
function fr_default() {
  return {
    localeError: error15()
  };
}
var error15 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrée",
    email: "adresse e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date et heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  const TypeDictionary = {
    string: "chaîne",
    number: "nombre",
    int: "entier",
    boolean: "booléen",
    bigint: "grand entier",
    symbol: "symbole",
    undefined: "indéfini",
    null: "null",
    never: "jamais",
    void: "vide",
    date: "date",
    array: "tableau",
    object: "objet",
    tuple: "tuple",
    record: "enregistrement",
    map: "carte",
    set: "ensemble",
    file: "fichier",
    nonoptional: "non-optionnel",
    nan: "NaN",
    function: "fonction"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrée invalide : instanceof ${issue2.expected} attendu, ${received} reçu`;
        }
        return `Entrée invalide : ${expected} attendu, ${received} reçu`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : ${TypeDictionary[issue2.origin] ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "élément(s)"}`;
        return `Trop grand : ${TypeDictionary[issue2.origin] ?? "valeur"} doit être ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop petit : ${TypeDictionary[issue2.origin] ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Trop petit : ${TypeDictionary[issue2.origin] ?? "valeur"} doit être ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au modèle ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
var init_fr = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/fr-CA.js
function fr_CA_default() {
  return {
    localeError: error16()
  };
}
var error16 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "entrée",
    email: "adresse courriel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date-heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Entrée invalide : attendu instanceof ${issue2.expected}, reçu ${received}`;
        }
        return `Entrée invalide : attendu ${expected}, reçu ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "≤" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "≥" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au motif ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
var init_fr_CA = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/he.js
function he_default() {
  return {
    localeError: error17()
  };
}
var error17 = () => {
  const TypeNames = {
    string: { label: "מחרוזת", gender: "f" },
    number: { label: "מספר", gender: "m" },
    boolean: { label: "ערך בוליאני", gender: "m" },
    bigint: { label: "BigInt", gender: "m" },
    date: { label: "תאריך", gender: "m" },
    array: { label: "מערך", gender: "m" },
    object: { label: "אובייקט", gender: "m" },
    null: { label: "ערך ריק (null)", gender: "m" },
    undefined: { label: "ערך לא מוגדר (undefined)", gender: "m" },
    symbol: { label: "סימבול (Symbol)", gender: "m" },
    function: { label: "פונקציה", gender: "f" },
    map: { label: "מפה (Map)", gender: "f" },
    set: { label: "קבוצה (Set)", gender: "f" },
    file: { label: "קובץ", gender: "m" },
    promise: { label: "Promise", gender: "m" },
    NaN: { label: "NaN", gender: "m" },
    unknown: { label: "ערך לא ידוע", gender: "m" },
    value: { label: "ערך", gender: "m" }
  };
  const Sizable = {
    string: { unit: "תווים", shortLabel: "קצר", longLabel: "ארוך" },
    file: { unit: "בייטים", shortLabel: "קטן", longLabel: "גדול" },
    array: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
    set: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
    number: { unit: "", shortLabel: "קטן", longLabel: "גדול" }
  };
  const typeEntry = (t) => t ? TypeNames[t] : undefined;
  const typeLabel = (t) => {
    const e = typeEntry(t);
    if (e)
      return e.label;
    return t ?? TypeNames.unknown.label;
  };
  const withDefinite = (t) => `ה${typeLabel(t)}`;
  const verbFor = (t) => {
    const e = typeEntry(t);
    const gender = e?.gender ?? "m";
    return gender === "f" ? "צריכה להיות" : "צריך להיות";
  };
  const getSizing = (origin) => {
    if (!origin)
      return null;
    return Sizable[origin] ?? null;
  };
  const FormatDictionary = {
    regex: { label: "קלט", gender: "m" },
    email: { label: "כתובת אימייל", gender: "f" },
    url: { label: "כתובת רשת", gender: "f" },
    emoji: { label: "אימוג'י", gender: "m" },
    uuid: { label: "UUID", gender: "m" },
    nanoid: { label: "nanoid", gender: "m" },
    guid: { label: "GUID", gender: "m" },
    cuid: { label: "cuid", gender: "m" },
    cuid2: { label: "cuid2", gender: "m" },
    ulid: { label: "ULID", gender: "m" },
    xid: { label: "XID", gender: "m" },
    ksuid: { label: "KSUID", gender: "m" },
    datetime: { label: "תאריך וזמן ISO", gender: "m" },
    date: { label: "תאריך ISO", gender: "m" },
    time: { label: "זמן ISO", gender: "m" },
    duration: { label: "משך זמן ISO", gender: "m" },
    ipv4: { label: "כתובת IPv4", gender: "f" },
    ipv6: { label: "כתובת IPv6", gender: "f" },
    cidrv4: { label: "טווח IPv4", gender: "m" },
    cidrv6: { label: "טווח IPv6", gender: "m" },
    base64: { label: "מחרוזת בבסיס 64", gender: "f" },
    base64url: { label: "מחרוזת בבסיס 64 לכתובות רשת", gender: "f" },
    json_string: { label: "מחרוזת JSON", gender: "f" },
    e164: { label: "מספר E.164", gender: "m" },
    jwt: { label: "JWT", gender: "m" },
    ends_with: { label: "קלט", gender: "m" },
    includes: { label: "קלט", gender: "m" },
    lowercase: { label: "קלט", gender: "m" },
    starts_with: { label: "קלט", gender: "m" },
    uppercase: { label: "קלט", gender: "m" }
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expectedKey = issue2.expected;
        const expected = TypeDictionary[expectedKey ?? ""] ?? typeLabel(expectedKey);
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? TypeNames[receivedType]?.label ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `קלט לא תקין: צריך להיות instanceof ${issue2.expected}, התקבל ${received}`;
        }
        return `קלט לא תקין: צריך להיות ${expected}, התקבל ${received}`;
      }
      case "invalid_value": {
        if (issue2.values.length === 1) {
          return `ערך לא תקין: הערך חייב להיות ${stringifyPrimitive(issue2.values[0])}`;
        }
        const stringified = issue2.values.map((v) => stringifyPrimitive(v));
        if (issue2.values.length === 2) {
          return `ערך לא תקין: האפשרויות המתאימות הן ${stringified[0]} או ${stringified[1]}`;
        }
        const lastValue = stringified[stringified.length - 1];
        const restValues = stringified.slice(0, -1).join(", ");
        return `ערך לא תקין: האפשרויות המתאימות הן ${restValues} או ${lastValue}`;
      }
      case "too_big": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite(issue2.origin ?? "value");
        if (issue2.origin === "string") {
          return `${sizing?.longLabel ?? "ארוך"} מדי: ${subject} צריכה להכיל ${issue2.maximum.toString()} ${sizing?.unit ?? ""} ${issue2.inclusive ? "או פחות" : "לכל היותר"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `קטן או שווה ל-${issue2.maximum}` : `קטן מ-${issue2.maximum}`;
          return `גדול מדי: ${subject} צריך להיות ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "צריכה" : "צריך";
          const comparison = issue2.inclusive ? `${issue2.maximum} ${sizing?.unit ?? ""} או פחות` : `פחות מ-${issue2.maximum} ${sizing?.unit ?? ""}`;
          return `גדול מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? "<=" : "<";
        const be = verbFor(issue2.origin ?? "value");
        if (sizing?.unit) {
          return `${sizing.longLabel} מדי: ${subject} ${be} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        }
        return `${sizing?.longLabel ?? "גדול"} מדי: ${subject} ${be} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite(issue2.origin ?? "value");
        if (issue2.origin === "string") {
          return `${sizing?.shortLabel ?? "קצר"} מדי: ${subject} צריכה להכיל ${issue2.minimum.toString()} ${sizing?.unit ?? ""} ${issue2.inclusive ? "או יותר" : "לפחות"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `גדול או שווה ל-${issue2.minimum}` : `גדול מ-${issue2.minimum}`;
          return `קטן מדי: ${subject} צריך להיות ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "צריכה" : "צריך";
          if (issue2.minimum === 1 && issue2.inclusive) {
            const singularPhrase = issue2.origin === "set" ? "לפחות פריט אחד" : "לפחות פריט אחד";
            return `קטן מדי: ${subject} ${verb} להכיל ${singularPhrase}`;
          }
          const comparison = issue2.inclusive ? `${issue2.minimum} ${sizing?.unit ?? ""} או יותר` : `יותר מ-${issue2.minimum} ${sizing?.unit ?? ""}`;
          return `קטן מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? ">=" : ">";
        const be = verbFor(issue2.origin ?? "value");
        if (sizing?.unit) {
          return `${sizing.shortLabel} מדי: ${subject} ${be} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `${sizing?.shortLabel ?? "קטן"} מדי: ${subject} ${be} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `המחרוזת חייבת להתחיל ב "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `המחרוזת חייבת להסתיים ב "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `המחרוזת חייבת לכלול "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `המחרוזת חייבת להתאים לתבנית ${_issue.pattern}`;
        const nounEntry = FormatDictionary[_issue.format];
        const noun = nounEntry?.label ?? _issue.format;
        const gender = nounEntry?.gender ?? "m";
        const adjective = gender === "f" ? "תקינה" : "תקין";
        return `${noun} לא ${adjective}`;
      }
      case "not_multiple_of":
        return `מספר לא תקין: חייב להיות מכפלה של ${issue2.divisor}`;
      case "unrecognized_keys":
        return `מפתח${issue2.keys.length > 1 ? "ות" : ""} לא מזוה${issue2.keys.length > 1 ? "ים" : "ה"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key": {
        return `שדה לא תקין באובייקט`;
      }
      case "invalid_union":
        return "קלט לא תקין";
      case "invalid_element": {
        const place = withDefinite(issue2.origin ?? "array");
        return `ערך לא תקין ב${place}`;
      }
      default:
        return `קלט לא תקין`;
    }
  };
};
var init_he = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hr.js
function hr_default() {
  return {
    localeError: error18()
  };
}
var error18 = () => {
  const Sizable = {
    string: { unit: "znakova", verb: "imati" },
    file: { unit: "bajtova", verb: "imati" },
    array: { unit: "stavki", verb: "imati" },
    set: { unit: "stavki", verb: "imati" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "unos",
    email: "email adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum i vrijeme",
    date: "ISO datum",
    time: "ISO vrijeme",
    duration: "ISO trajanje",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "IPv4 raspon",
    cidrv6: "IPv6 raspon",
    base64: "base64 kodirani tekst",
    base64url: "base64url kodirani tekst",
    json_string: "JSON tekst",
    e164: "E.164 broj",
    jwt: "JWT",
    template_literal: "unos"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "tekst",
    number: "broj",
    boolean: "boolean",
    array: "niz",
    object: "objekt",
    set: "skup",
    file: "datoteka",
    date: "datum",
    bigint: "bigint",
    symbol: "simbol",
    undefined: "undefined",
    null: "null",
    function: "funkcija",
    map: "mapa"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neispravan unos: očekuje se instanceof ${issue2.expected}, a primljeno je ${received}`;
        }
        return `Neispravan unos: očekuje se ${expected}, a primljeno je ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neispravna vrijednost: očekivano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neispravna opcija: očekivano jedno od ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing)
          return `Preveliko: očekivano da ${origin ?? "vrijednost"} ima ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemenata"}`;
        return `Preveliko: očekivano da ${origin ?? "vrijednost"} bude ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        if (sizing) {
          return `Premalo: očekivano da ${origin} ima ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premalo: očekivano da ${origin} bude ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neispravan tekst: mora započinjati s "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neispravan tekst: mora završavati s "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neispravan tekst: mora sadržavati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neispravan tekst: mora odgovarati uzorku ${_issue.pattern}`;
        return `Neispravna ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neispravan broj: mora biti višekratnik od ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznat${issue2.keys.length > 1 ? "i ključevi" : " ključ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neispravan ključ u ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      case "invalid_union":
        return "Neispravan unos";
      case "invalid_element":
        return `Neispravna vrijednost u ${TypeDictionary[issue2.origin] ?? issue2.origin}`;
      default:
        return `Neispravan unos`;
    }
  };
};
var init_hr = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hu.js
function hu_default() {
  return {
    localeError: error19()
  };
}
var error19 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "legyen" },
    file: { unit: "byte", verb: "legyen" },
    array: { unit: "elem", verb: "legyen" },
    set: { unit: "elem", verb: "legyen" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "bemenet",
    email: "email cím",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO időbélyeg",
    date: "ISO dátum",
    time: "ISO idő",
    duration: "ISO időintervallum",
    ipv4: "IPv4 cím",
    ipv6: "IPv6 cím",
    cidrv4: "IPv4 tartomány",
    cidrv6: "IPv6 tartomány",
    base64: "base64-kódolt string",
    base64url: "base64url-kódolt string",
    json_string: "JSON string",
    e164: "E.164 szám",
    jwt: "JWT",
    template_literal: "bemenet"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "szám",
    array: "tömb"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Érvénytelen bemenet: a várt érték instanceof ${issue2.expected}, a kapott érték ${received}`;
        }
        return `Érvénytelen bemenet: a várt érték ${expected}, a kapott érték ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Érvénytelen bemenet: a várt érték ${stringifyPrimitive(issue2.values[0])}`;
        return `Érvénytelen opció: valamelyik érték várt ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Túl nagy: ${issue2.origin ?? "érték"} mérete túl nagy ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elem"}`;
        return `Túl nagy: a bemeneti érték ${issue2.origin ?? "érték"} túl nagy: ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Túl kicsi: a bemeneti érték ${issue2.origin} mérete túl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Túl kicsi: a bemeneti érték ${issue2.origin} túl kicsi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Érvénytelen string: "${_issue.prefix}" értékkel kell kezdődnie`;
        if (_issue.format === "ends_with")
          return `Érvénytelen string: "${_issue.suffix}" értékkel kell végződnie`;
        if (_issue.format === "includes")
          return `Érvénytelen string: "${_issue.includes}" értéket kell tartalmaznia`;
        if (_issue.format === "regex")
          return `Érvénytelen string: ${_issue.pattern} mintának kell megfelelnie`;
        return `Érvénytelen ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Érvénytelen szám: ${issue2.divisor} többszörösének kell lennie`;
      case "unrecognized_keys":
        return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Érvénytelen kulcs ${issue2.origin}`;
      case "invalid_union":
        return "Érvénytelen bemenet";
      case "invalid_element":
        return `Érvénytelen érték: ${issue2.origin}`;
      default:
        return `Érvénytelen bemenet`;
    }
  };
};
var init_hu = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/hy.js
function getArmenianPlural(count, one, many) {
  return Math.abs(count) === 1 ? one : many;
}
function withDefiniteArticle(word) {
  if (!word)
    return "";
  const vowels = ["ա", "ե", "ը", "ի", "ո", "ու", "օ"];
  const lastChar = word[word.length - 1];
  return word + (vowels.includes(lastChar) ? "ն" : "ը");
}
function hy_default() {
  return {
    localeError: error20()
  };
}
var error20 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "նշան",
        many: "նշաններ"
      },
      verb: "ունենալ"
    },
    file: {
      unit: {
        one: "բայթ",
        many: "բայթեր"
      },
      verb: "ունենալ"
    },
    array: {
      unit: {
        one: "տարր",
        many: "տարրեր"
      },
      verb: "ունենալ"
    },
    set: {
      unit: {
        one: "տարր",
        many: "տարրեր"
      },
      verb: "ունենալ"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "մուտք",
    email: "էլ. հասցե",
    url: "URL",
    emoji: "էմոջի",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO ամսաթիվ և ժամ",
    date: "ISO ամսաթիվ",
    time: "ISO ժամ",
    duration: "ISO տևողություն",
    ipv4: "IPv4 հասցե",
    ipv6: "IPv6 հասցե",
    cidrv4: "IPv4 միջակայք",
    cidrv6: "IPv6 միջակայք",
    base64: "base64 ձևաչափով տող",
    base64url: "base64url ձևաչափով տող",
    json_string: "JSON տող",
    e164: "E.164 համար",
    jwt: "JWT",
    template_literal: "մուտք"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "թիվ",
    array: "զանգված"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Սխալ մուտքագրում․ սպասվում էր instanceof ${issue2.expected}, ստացվել է ${received}`;
        }
        return `Սխալ մուտքագրում․ սպասվում էր ${expected}, ստացվել է ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Սխալ մուտքագրում․ սպասվում էր ${stringifyPrimitive(issue2.values[1])}`;
        return `Սխալ տարբերակ․ սպասվում էր հետևյալներից մեկը՝ ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getArmenianPlural(maxValue, sizing.unit.one, sizing.unit.many);
          return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin ?? "արժեք")} կունենա ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin ?? "արժեք")} լինի ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getArmenianPlural(minValue, sizing.unit.one, sizing.unit.many);
          return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin)} կունենա ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(issue2.origin)} լինի ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Սխալ տող․ պետք է սկսվի "${_issue.prefix}"-ով`;
        if (_issue.format === "ends_with")
          return `Սխալ տող․ պետք է ավարտվի "${_issue.suffix}"-ով`;
        if (_issue.format === "includes")
          return `Սխալ տող․ պետք է պարունակի "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Սխալ տող․ պետք է համապատասխանի ${_issue.pattern} ձևաչափին`;
        return `Սխալ ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Սխալ թիվ․ պետք է բազմապատիկ լինի ${issue2.divisor}-ի`;
      case "unrecognized_keys":
        return `Չճանաչված բանալի${issue2.keys.length > 1 ? "ներ" : ""}. ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Սխալ բանալի ${withDefiniteArticle(issue2.origin)}-ում`;
      case "invalid_union":
        return "Սխալ մուտքագրում";
      case "invalid_element":
        return `Սխալ արժեք ${withDefiniteArticle(issue2.origin)}-ում`;
      default:
        return `Սխալ մուտքագրում`;
    }
  };
};
var init_hy = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/id.js
function id_default() {
  return {
    localeError: error21()
  };
}
var error21 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "memiliki" },
    file: { unit: "byte", verb: "memiliki" },
    array: { unit: "item", verb: "memiliki" },
    set: { unit: "item", verb: "memiliki" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "alamat email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tanggal dan waktu format ISO",
    date: "tanggal format ISO",
    time: "jam format ISO",
    duration: "durasi format ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "rentang alamat IPv4",
    cidrv6: "rentang alamat IPv6",
    base64: "string dengan enkode base64",
    base64url: "string dengan enkode base64url",
    json_string: "string JSON",
    e164: "angka E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input tidak valid: diharapkan instanceof ${issue2.expected}, diterima ${received}`;
        }
        return `Input tidak valid: diharapkan ${expected}, diterima ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} memiliki ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} menjadi ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak valid: harus menyertakan "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} tidak valid`;
      }
      case "not_multiple_of":
        return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak valid di ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak valid";
      case "invalid_element":
        return `Nilai tidak valid di ${issue2.origin}`;
      default:
        return `Input tidak valid`;
    }
  };
};
var init_id = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/is.js
function is_default() {
  return {
    localeError: error22()
  };
}
var error22 = () => {
  const Sizable = {
    string: { unit: "stafi", verb: "að hafa" },
    file: { unit: "bæti", verb: "að hafa" },
    array: { unit: "hluti", verb: "að hafa" },
    set: { unit: "hluti", verb: "að hafa" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "gildi",
    email: "netfang",
    url: "vefslóð",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dagsetning og tími",
    date: "ISO dagsetning",
    time: "ISO tími",
    duration: "ISO tímalengd",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded strengur",
    base64url: "base64url-encoded strengur",
    json_string: "JSON strengur",
    e164: "E.164 tölugildi",
    jwt: "JWT",
    template_literal: "gildi"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "númer",
    array: "fylki"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Rangt gildi: Þú slóst inn ${received} þar sem á að vera instanceof ${issue2.expected}`;
        }
        return `Rangt gildi: Þú slóst inn ${received} þar sem á að vera ${expected}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Rangt gildi: gert ráð fyrir ${stringifyPrimitive(issue2.values[0])}`;
        return `Ógilt val: má vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} hafi ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "hluti"}`;
        return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} sé ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Of lítið: gert er ráð fyrir að ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Of lítið: gert er ráð fyrir að ${issue2.origin} sé ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ógildur strengur: verður að byrja á "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ógildur strengur: verður að enda á "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ógildur strengur: verður að innihalda "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ógildur strengur: verður að fylgja mynstri ${_issue.pattern}`;
        return `Rangt ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Röng tala: verður að vera margfeldi af ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Óþekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Rangur lykill í ${issue2.origin}`;
      case "invalid_union":
        return "Rangt gildi";
      case "invalid_element":
        return `Rangt gildi í ${issue2.origin}`;
      default:
        return `Rangt gildi`;
    }
  };
};
var init_is = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/it.js
function it_default() {
  return {
    localeError: error23()
  };
}
var error23 = () => {
  const Sizable = {
    string: { unit: "caratteri", verb: "avere" },
    file: { unit: "byte", verb: "avere" },
    array: { unit: "elementi", verb: "avere" },
    set: { unit: "elementi", verb: "avere" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "indirizzo email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e ora ISO",
    date: "data ISO",
    time: "ora ISO",
    duration: "durata ISO",
    ipv4: "indirizzo IPv4",
    ipv6: "indirizzo IPv6",
    cidrv4: "intervallo IPv4",
    cidrv6: "intervallo IPv6",
    base64: "stringa codificata in base64",
    base64url: "URL codificata in base64",
    json_string: "stringa JSON",
    e164: "numero E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "numero",
    array: "vettore"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input non valido: atteso instanceof ${issue2.expected}, ricevuto ${received}`;
        }
        return `Input non valido: atteso ${expected}, ricevuto ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
        return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Troppo grande: ${issue2.origin ?? "valore"} deve avere ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementi"}`;
        return `Troppo grande: ${issue2.origin ?? "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Stringa non valida: deve includere "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
        return `Input non valido: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chiave non valida in ${issue2.origin}`;
      case "invalid_union":
        return "Input non valido";
      case "invalid_element":
        return `Valore non valido in ${issue2.origin}`;
      default:
        return `Input non valido`;
    }
  };
};
var init_it = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ja.js
function ja_default() {
  return {
    localeError: error24()
  };
}
var error24 = () => {
  const Sizable = {
    string: { unit: "文字", verb: "である" },
    file: { unit: "バイト", verb: "である" },
    array: { unit: "要素", verb: "である" },
    set: { unit: "要素", verb: "である" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "入力値",
    email: "メールアドレス",
    url: "URL",
    emoji: "絵文字",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日時",
    date: "ISO日付",
    time: "ISO時刻",
    duration: "ISO期間",
    ipv4: "IPv4アドレス",
    ipv6: "IPv6アドレス",
    cidrv4: "IPv4範囲",
    cidrv6: "IPv6範囲",
    base64: "base64エンコード文字列",
    base64url: "base64urlエンコード文字列",
    json_string: "JSON文字列",
    e164: "E.164番号",
    jwt: "JWT",
    template_literal: "入力値"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "数値",
    array: "配列"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `無効な入力: instanceof ${issue2.expected}が期待されましたが、${received}が入力されました`;
        }
        return `無効な入力: ${expected}が期待されましたが、${received}が入力されました`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無効な入力: ${stringifyPrimitive(issue2.values[0])}が期待されました`;
        return `無効な選択: ${joinValues(issue2.values, "、")}のいずれかである必要があります`;
      case "too_big": {
        const adj = issue2.inclusive ? "以下である" : "より小さい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${sizing.unit ?? "要素"}${adj}必要があります`;
        return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${adj}必要があります`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "以上である" : "より大きい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${sizing.unit}${adj}必要があります`;
        return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${adj}必要があります`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `無効な文字列: "${_issue.prefix}"で始まる必要があります`;
        if (_issue.format === "ends_with")
          return `無効な文字列: "${_issue.suffix}"で終わる必要があります`;
        if (_issue.format === "includes")
          return `無効な文字列: "${_issue.includes}"を含む必要があります`;
        if (_issue.format === "regex")
          return `無効な文字列: パターン${_issue.pattern}に一致する必要があります`;
        return `無効な${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無効な数値: ${issue2.divisor}の倍数である必要があります`;
      case "unrecognized_keys":
        return `認識されていないキー${issue2.keys.length > 1 ? "群" : ""}: ${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin}内の無効なキー`;
      case "invalid_union":
        return "無効な入力";
      case "invalid_element":
        return `${issue2.origin}内の無効な値`;
      default:
        return `無効な入力`;
    }
  };
};
var init_ja = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ka.js
function ka_default() {
  return {
    localeError: error25()
  };
}
var error25 = () => {
  const Sizable = {
    string: { unit: "სიმბოლო", verb: "უნდა შეიცავდეს" },
    file: { unit: "ბაიტი", verb: "უნდა შეიცავდეს" },
    array: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" },
    set: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "შეყვანა",
    email: "ელ-ფოსტის მისამართი",
    url: "URL",
    emoji: "ემოჯი",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "თარიღი-დრო",
    date: "თარიღი",
    time: "დრო",
    duration: "ხანგრძლივობა",
    ipv4: "IPv4 მისამართი",
    ipv6: "IPv6 მისამართი",
    cidrv4: "IPv4 დიაპაზონი",
    cidrv6: "IPv6 დიაპაზონი",
    base64: "base64-კოდირებული ველი",
    base64url: "base64url-კოდირებული ველი",
    json_string: "JSON ველი",
    e164: "E.164 ნომერი",
    jwt: "JWT",
    template_literal: "შეყვანა"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "რიცხვი",
    string: "ველი",
    boolean: "ბულეანი",
    function: "ფუნქცია",
    array: "მასივი"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `არასწორი შეყვანა: მოსალოდნელი instanceof ${issue2.expected}, მიღებული ${received}`;
        }
        return `არასწორი შეყვანა: მოსალოდნელი ${expected}, მიღებული ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `არასწორი შეყვანა: მოსალოდნელი ${stringifyPrimitive(issue2.values[0])}`;
        return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${joinValues(issue2.values, "|")}-დან`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} იყოს ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} იყოს ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `არასწორი ველი: უნდა იწყებოდეს "${_issue.prefix}"-ით`;
        }
        if (_issue.format === "ends_with")
          return `არასწორი ველი: უნდა მთავრდებოდეს "${_issue.suffix}"-ით`;
        if (_issue.format === "includes")
          return `არასწორი ველი: უნდა შეიცავდეს "${_issue.includes}"-ს`;
        if (_issue.format === "regex")
          return `არასწორი ველი: უნდა შეესაბამებოდეს შაბლონს ${_issue.pattern}`;
        return `არასწორი ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `არასწორი რიცხვი: უნდა იყოს ${issue2.divisor}-ის ჯერადი`;
      case "unrecognized_keys":
        return `უცნობი გასაღებ${issue2.keys.length > 1 ? "ები" : "ი"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `არასწორი გასაღები ${issue2.origin}-ში`;
      case "invalid_union":
        return "არასწორი შეყვანა";
      case "invalid_element":
        return `არასწორი მნიშვნელობა ${issue2.origin}-ში`;
      default:
        return `არასწორი შეყვანა`;
    }
  };
};
var init_ka = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/km.js
function km_default() {
  return {
    localeError: error26()
  };
}
var error26 = () => {
  const Sizable = {
    string: { unit: "តួអក្សរ", verb: "គួរមាន" },
    file: { unit: "បៃ", verb: "គួរមាន" },
    array: { unit: "ធាតុ", verb: "គួរមាន" },
    set: { unit: "ធាតុ", verb: "គួរមាន" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ទិន្នន័យបញ្ចូល",
    email: "អាសយដ្ឋានអ៊ីមែល",
    url: "URL",
    emoji: "សញ្ញាអារម្មណ៍",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "កាលបរិច្ឆេទ និងម៉ោង ISO",
    date: "កាលបរិច្ឆេទ ISO",
    time: "ម៉ោង ISO",
    duration: "រយៈពេល ISO",
    ipv4: "អាសយដ្ឋាន IPv4",
    ipv6: "អាសយដ្ឋាន IPv6",
    cidrv4: "ដែនអាសយដ្ឋាន IPv4",
    cidrv6: "ដែនអាសយដ្ឋាន IPv6",
    base64: "ខ្សែអក្សរអ៊ិកូដ base64",
    base64url: "ខ្សែអក្សរអ៊ិកូដ base64url",
    json_string: "ខ្សែអក្សរ JSON",
    e164: "លេខ E.164",
    jwt: "JWT",
    template_literal: "ទិន្នន័យបញ្ចូល"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "លេខ",
    array: "អារេ (Array)",
    null: "គ្មានតម្លៃ (null)"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ instanceof ${issue2.expected} ប៉ុន្តែទទួលបាន ${received}`;
        }
        return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${expected} ប៉ុន្តែទទួលបាន ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${stringifyPrimitive(issue2.values[0])}`;
        return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "ធាតុ"}`;
        return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${_issue.pattern}`;
        return `មិនត្រឹមត្រូវ៖ ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${issue2.divisor}`;
      case "unrecognized_keys":
        return `រកឃើញសោមិនស្គាល់៖ ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `សោមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      case "invalid_union":
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
      case "invalid_element":
        return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      default:
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
    }
  };
};
var init_km = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/kh.js
function kh_default() {
  return km_default();
}
var init_kh = __esm(() => {
  init_km();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ko.js
function ko_default() {
  return {
    localeError: error27()
  };
}
var error27 = () => {
  const Sizable = {
    string: { unit: "문자", verb: "to have" },
    file: { unit: "바이트", verb: "to have" },
    array: { unit: "개", verb: "to have" },
    set: { unit: "개", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "입력",
    email: "이메일 주소",
    url: "URL",
    emoji: "이모지",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 날짜시간",
    date: "ISO 날짜",
    time: "ISO 시간",
    duration: "ISO 기간",
    ipv4: "IPv4 주소",
    ipv6: "IPv6 주소",
    cidrv4: "IPv4 범위",
    cidrv6: "IPv6 범위",
    base64: "base64 인코딩 문자열",
    base64url: "base64url 인코딩 문자열",
    json_string: "JSON 문자열",
    e164: "E.164 번호",
    jwt: "JWT",
    template_literal: "입력"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `잘못된 입력: 예상 타입은 instanceof ${issue2.expected}, 받은 타입은 ${received}입니다`;
        }
        return `잘못된 입력: 예상 타입은 ${expected}, 받은 타입은 ${received}입니다`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `잘못된 입력: 값은 ${stringifyPrimitive(issue2.values[0])} 이어야 합니다`;
        return `잘못된 옵션: ${joinValues(issue2.values, "또는 ")} 중 하나여야 합니다`;
      case "too_big": {
        const adj = issue2.inclusive ? "이하" : "미만";
        const suffix = adj === "미만" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing)
          return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
        return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()} ${adj}${suffix}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "이상" : "초과";
        const suffix = adj === "이상" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing) {
          return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
        }
        return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()} ${adj}${suffix}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `잘못된 문자열: "${_issue.prefix}"(으)로 시작해야 합니다`;
        }
        if (_issue.format === "ends_with")
          return `잘못된 문자열: "${_issue.suffix}"(으)로 끝나야 합니다`;
        if (_issue.format === "includes")
          return `잘못된 문자열: "${_issue.includes}"을(를) 포함해야 합니다`;
        if (_issue.format === "regex")
          return `잘못된 문자열: 정규식 ${_issue.pattern} 패턴과 일치해야 합니다`;
        return `잘못된 ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `잘못된 숫자: ${issue2.divisor}의 배수여야 합니다`;
      case "unrecognized_keys":
        return `인식할 수 없는 키: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `잘못된 키: ${issue2.origin}`;
      case "invalid_union":
        return `잘못된 입력`;
      case "invalid_element":
        return `잘못된 값: ${issue2.origin}`;
      default:
        return `잘못된 입력`;
    }
  };
};
var init_ko = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/lt.js
function getUnitTypeFromNumber(number2) {
  const abs = Math.abs(number2);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last2 >= 11 && last2 <= 19 || last === 0)
    return "many";
  if (last === 1)
    return "one";
  return "few";
}
function lt_default() {
  return {
    localeError: error28()
  };
}
var capitalizeFirstCharacter = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
}, error28 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "simbolis",
        few: "simboliai",
        many: "simbolių"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne ilgesnė kaip",
          notInclusive: "turi būti trumpesnė kaip"
        },
        bigger: {
          inclusive: "turi būti ne trumpesnė kaip",
          notInclusive: "turi būti ilgesnė kaip"
        }
      }
    },
    file: {
      unit: {
        one: "baitas",
        few: "baitai",
        many: "baitų"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne didesnis kaip",
          notInclusive: "turi būti mažesnis kaip"
        },
        bigger: {
          inclusive: "turi būti ne mažesnis kaip",
          notInclusive: "turi būti didesnis kaip"
        }
      }
    },
    array: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    },
    set: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    }
  };
  function getSizing(origin, unitType, inclusive, targetShouldBe) {
    const result = Sizable[origin] ?? null;
    if (result === null)
      return result;
    return {
      unit: result.unit[unitType],
      verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
    };
  }
  const FormatDictionary = {
    regex: "įvestis",
    email: "el. pašto adresas",
    url: "URL",
    emoji: "jaustukas",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO data ir laikas",
    date: "ISO data",
    time: "ISO laikas",
    duration: "ISO trukmė",
    ipv4: "IPv4 adresas",
    ipv6: "IPv6 adresas",
    cidrv4: "IPv4 tinklo prefiksas (CIDR)",
    cidrv6: "IPv6 tinklo prefiksas (CIDR)",
    base64: "base64 užkoduota eilutė",
    base64url: "base64url užkoduota eilutė",
    json_string: "JSON eilutė",
    e164: "E.164 numeris",
    jwt: "JWT",
    template_literal: "įvestis"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "skaičius",
    bigint: "sveikasis skaičius",
    string: "eilutė",
    boolean: "loginė reikšmė",
    undefined: "neapibrėžta reikšmė",
    function: "funkcija",
    symbol: "simbolis",
    array: "masyvas",
    object: "objektas",
    null: "nulinė reikšmė"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Gautas tipas ${received}, o tikėtasi - instanceof ${issue2.expected}`;
        }
        return `Gautas tipas ${received}, o tikėtasi - ${expected}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Privalo būti ${stringifyPrimitive(issue2.values[0])}`;
        return `Privalo būti vienas iš ${joinValues(issue2.values, "|")} pasirinkimų`;
      case "too_big": {
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), issue2.inclusive ?? false, "smaller");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.maximum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne didesnis kaip" : "mažesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.maximum.toString()} ${sizing?.unit}`;
      }
      case "too_small": {
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), issue2.inclusive ?? false, "bigger");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.minimum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne mažesnis kaip" : "didesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.minimum.toString()} ${sizing?.unit}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Eilutė privalo prasidėti "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Eilutė privalo pasibaigti "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Eilutė privalo įtraukti "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Eilutė privalo atitikti ${_issue.pattern}`;
        return `Neteisingas ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Skaičius privalo būti ${issue2.divisor} kartotinis.`;
      case "unrecognized_keys":
        return `Neatpažint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Rastas klaidingas raktas";
      case "invalid_union":
        return "Klaidinga įvestis";
      case "invalid_element": {
        const origin = TypeDictionary[issue2.origin] ?? issue2.origin;
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi klaidingą įvestį`;
      }
      default:
        return "Klaidinga įvestis";
    }
  };
};
var init_lt = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/mk.js
function mk_default() {
  return {
    localeError: error29()
  };
}
var error29 = () => {
  const Sizable = {
    string: { unit: "знаци", verb: "да имаат" },
    file: { unit: "бајти", verb: "да имаат" },
    array: { unit: "ставки", verb: "да имаат" },
    set: { unit: "ставки", verb: "да имаат" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "внес",
    email: "адреса на е-пошта",
    url: "URL",
    emoji: "емоџи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO датум и време",
    date: "ISO датум",
    time: "ISO време",
    duration: "ISO времетраење",
    ipv4: "IPv4 адреса",
    ipv6: "IPv6 адреса",
    cidrv4: "IPv4 опсег",
    cidrv6: "IPv6 опсег",
    base64: "base64-енкодирана низа",
    base64url: "base64url-енкодирана низа",
    json_string: "JSON низа",
    e164: "E.164 број",
    jwt: "JWT",
    template_literal: "внес"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "број",
    array: "низа"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Грешен внес: се очекува instanceof ${issue2.expected}, примено ${received}`;
        }
        return `Грешен внес: се очекува ${expected}, примено ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Грешана опција: се очекува една ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да има ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементи"}`;
        return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да биде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Премногу мал: се очекува ${issue2.origin} да има ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Премногу мал: се очекува ${issue2.origin} да биде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Неважечка низа: мора да започнува со "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Неважечка низа: мора да завршува со "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неважечка низа: мора да вклучува "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неважечка низа: мора да одгоара на патернот ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Грешен број: мора да биде делив со ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Непрепознаени клучеви" : "Непрепознаен клуч"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Грешен клуч во ${issue2.origin}`;
      case "invalid_union":
        return "Грешен внес";
      case "invalid_element":
        return `Грешна вредност во ${issue2.origin}`;
      default:
        return `Грешен внес`;
    }
  };
};
var init_mk = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ms.js
function ms_default() {
  return {
    localeError: error30()
  };
}
var error30 = () => {
  const Sizable = {
    string: { unit: "aksara", verb: "mempunyai" },
    file: { unit: "bait", verb: "mempunyai" },
    array: { unit: "elemen", verb: "mempunyai" },
    set: { unit: "elemen", verb: "mempunyai" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "alamat e-mel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tarikh masa ISO",
    date: "tarikh ISO",
    time: "masa ISO",
    duration: "tempoh ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "julat IPv4",
    cidrv6: "julat IPv6",
    base64: "string dikodkan base64",
    base64url: "string dikodkan base64url",
    json_string: "string JSON",
    e164: "nombor E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nombor"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Input tidak sah: dijangka instanceof ${issue2.expected}, diterima ${received}`;
        }
        return `Input tidak sah: dijangka ${expected}, diterima ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} tidak sah`;
      }
      case "not_multiple_of":
        return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak sah dalam ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak sah";
      case "invalid_element":
        return `Nilai tidak sah dalam ${issue2.origin}`;
      default:
        return `Input tidak sah`;
    }
  };
};
var init_ms = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/nl.js
function nl_default() {
  return {
    localeError: error31()
  };
}
var error31 = () => {
  const Sizable = {
    string: { unit: "tekens", verb: "heeft" },
    file: { unit: "bytes", verb: "heeft" },
    array: { unit: "elementen", verb: "heeft" },
    set: { unit: "elementen", verb: "heeft" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "invoer",
    email: "emailadres",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum en tijd",
    date: "ISO datum",
    time: "ISO tijd",
    duration: "ISO duur",
    ipv4: "IPv4-adres",
    ipv6: "IPv6-adres",
    cidrv4: "IPv4-bereik",
    cidrv6: "IPv6-bereik",
    base64: "base64-gecodeerde tekst",
    base64url: "base64 URL-gecodeerde tekst",
    json_string: "JSON string",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "invoer"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "getal"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ongeldige invoer: verwacht instanceof ${issue2.expected}, ontving ${received}`;
        }
        return `Ongeldige invoer: verwacht ${expected}, ontving ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
        return `Ongeldige optie: verwacht één van ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const longName = issue2.origin === "date" ? "laat" : issue2.origin === "string" ? "lang" : "groot";
        if (sizing)
          return `Te ${longName}: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementen"} ${sizing.verb}`;
        return `Te ${longName}: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} is`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const shortName = issue2.origin === "date" ? "vroeg" : issue2.origin === "string" ? "kort" : "klein";
        if (sizing) {
          return `Te ${shortName}: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
        }
        return `Te ${shortName}: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
        }
        if (_issue.format === "ends_with")
          return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
        if (_issue.format === "includes")
          return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
        if (_issue.format === "regex")
          return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
        return `Ongeldig: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
      case "unrecognized_keys":
        return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ongeldige key in ${issue2.origin}`;
      case "invalid_union":
        return "Ongeldige invoer";
      case "invalid_element":
        return `Ongeldige waarde in ${issue2.origin}`;
      default:
        return `Ongeldige invoer`;
    }
  };
};
var init_nl = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/no.js
function no_default() {
  return {
    localeError: error32()
  };
}
var error32 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "å ha" },
    file: { unit: "bytes", verb: "å ha" },
    array: { unit: "elementer", verb: "å inneholde" },
    set: { unit: "elementer", verb: "å inneholde" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "e-postadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslett",
    date: "ISO-dato",
    time: "ISO-klokkeslett",
    duration: "ISO-varighet",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spekter",
    cidrv6: "IPv6-spekter",
    base64: "base64-enkodet streng",
    base64url: "base64url-enkodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "tall",
    array: "liste"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ugyldig input: forventet instanceof ${issue2.expected}, fikk ${received}`;
        }
        return `Ugyldig input: forventet ${expected}, fikk ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: må starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: må ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: må inneholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: må matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldig tall: må være et multiplum av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukjente nøkler" : "Ukjent nøkkel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøkkel i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldig input";
      case "invalid_element":
        return `Ugyldig verdi i ${issue2.origin}`;
      default:
        return `Ugyldig input`;
    }
  };
};
var init_no = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ota.js
function ota_default() {
  return {
    localeError: error33()
  };
}
var error33 = () => {
  const Sizable = {
    string: { unit: "harf", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "unsur", verb: "olmalıdır" },
    set: { unit: "unsur", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "giren",
    email: "epostagâh",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO hengâmı",
    date: "ISO tarihi",
    time: "ISO zamanı",
    duration: "ISO müddeti",
    ipv4: "IPv4 nişânı",
    ipv6: "IPv6 nişânı",
    cidrv4: "IPv4 menzili",
    cidrv6: "IPv6 menzili",
    base64: "base64-şifreli metin",
    base64url: "base64url-şifreli metin",
    json_string: "JSON metin",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "giren"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "numara",
    array: "saf",
    null: "gayb"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Fâsit giren: umulan instanceof ${issue2.expected}, alınan ${received}`;
        }
        return `Fâsit giren: umulan ${expected}, alınan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Fâsit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
        return `Fâsit tercih: mûteberler ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmalıydı.`;
        return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} olmalıydı.`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmalıydı.`;
        }
        return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmalıydı.`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Fâsit metin: "${_issue.prefix}" ile başlamalı.`;
        if (_issue.format === "ends_with")
          return `Fâsit metin: "${_issue.suffix}" ile bitmeli.`;
        if (_issue.format === "includes")
          return `Fâsit metin: "${_issue.includes}" ihtivâ etmeli.`;
        if (_issue.format === "regex")
          return `Fâsit metin: ${_issue.pattern} nakşına uymalı.`;
        return `Fâsit ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Fâsit sayı: ${issue2.divisor} katı olmalıydı.`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} için tanınmayan anahtar var.`;
      case "invalid_union":
        return "Giren tanınamadı.";
      case "invalid_element":
        return `${issue2.origin} için tanınmayan kıymet var.`;
      default:
        return `Kıymet tanınamadı.`;
    }
  };
};
var init_ota = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ps.js
function ps_default() {
  return {
    localeError: error34()
  };
}
var error34 = () => {
  const Sizable = {
    string: { unit: "توکي", verb: "ولري" },
    file: { unit: "بایټس", verb: "ولري" },
    array: { unit: "توکي", verb: "ولري" },
    set: { unit: "توکي", verb: "ولري" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ورودي",
    email: "بریښنالیک",
    url: "یو آر ال",
    emoji: "ایموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "نیټه او وخت",
    date: "نېټه",
    time: "وخت",
    duration: "موده",
    ipv4: "د IPv4 پته",
    ipv6: "د IPv6 پته",
    cidrv4: "د IPv4 ساحه",
    cidrv6: "د IPv6 ساحه",
    base64: "base64-encoded متن",
    base64url: "base64url-encoded متن",
    json_string: "JSON متن",
    e164: "د E.164 شمېره",
    jwt: "JWT",
    template_literal: "ورودي"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "عدد",
    array: "ارې"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ناسم ورودي: باید instanceof ${issue2.expected} وای, مګر ${received} ترلاسه شو`;
        }
        return `ناسم ورودي: باید ${expected} وای, مګر ${received} ترلاسه شو`;
      }
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ناسم ورودي: باید ${stringifyPrimitive(issue2.values[0])} وای`;
        }
        return `ناسم انتخاب: باید یو له ${joinValues(issue2.values, "|")} څخه وای`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصرونه"} ولري`;
        }
        return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} وي`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} ولري`;
        }
        return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} وي`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ناسم متن: باید د "${_issue.prefix}" سره پیل شي`;
        }
        if (_issue.format === "ends_with") {
          return `ناسم متن: باید د "${_issue.suffix}" سره پای ته ورسيږي`;
        }
        if (_issue.format === "includes") {
          return `ناسم متن: باید "${_issue.includes}" ولري`;
        }
        if (_issue.format === "regex") {
          return `ناسم متن: باید د ${_issue.pattern} سره مطابقت ولري`;
        }
        return `${FormatDictionary[_issue.format] ?? issue2.format} ناسم دی`;
      }
      case "not_multiple_of":
        return `ناسم عدد: باید د ${issue2.divisor} مضرب وي`;
      case "unrecognized_keys":
        return `ناسم ${issue2.keys.length > 1 ? "کلیډونه" : "کلیډ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `ناسم کلیډ په ${issue2.origin} کې`;
      case "invalid_union":
        return `ناسمه ورودي`;
      case "invalid_element":
        return `ناسم عنصر په ${issue2.origin} کې`;
      default:
        return `ناسمه ورودي`;
    }
  };
};
var init_ps = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pl.js
function pl_default() {
  return {
    localeError: error35()
  };
}
var error35 = () => {
  const Sizable = {
    string: { unit: "znaków", verb: "mieć" },
    file: { unit: "bajtów", verb: "mieć" },
    array: { unit: "elementów", verb: "mieć" },
    set: { unit: "elementów", verb: "mieć" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "wyrażenie",
    email: "adres email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i godzina w formacie ISO",
    date: "data w formacie ISO",
    time: "godzina w formacie ISO",
    duration: "czas trwania ISO",
    ipv4: "adres IPv4",
    ipv6: "adres IPv6",
    cidrv4: "zakres IPv4",
    cidrv6: "zakres IPv6",
    base64: "ciąg znaków zakodowany w formacie base64",
    base64url: "ciąg znaków zakodowany w formacie base64url",
    json_string: "ciąg znaków w formacie JSON",
    e164: "liczba E.164",
    jwt: "JWT",
    template_literal: "wejście"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "liczba",
    array: "tablica"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Nieprawidłowe dane wejściowe: oczekiwano instanceof ${issue2.expected}, otrzymano ${received}`;
        }
        return `Nieprawidłowe dane wejściowe: oczekiwano ${expected}, otrzymano ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nieprawidłowe dane wejściowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
        return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za duża wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt duż(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za mała wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt mał(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${_issue.pattern}`;
        return `Nieprawidłow(y/a/e) ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nieprawidłowa liczba: musi być wielokrotnością ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nieprawidłowy klucz w ${issue2.origin}`;
      case "invalid_union":
        return "Nieprawidłowe dane wejściowe";
      case "invalid_element":
        return `Nieprawidłowa wartość w ${issue2.origin}`;
      default:
        return `Nieprawidłowe dane wejściowe`;
    }
  };
};
var init_pl = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/pt.js
function pt_default() {
  return {
    localeError: error36()
  };
}
var error36 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "ter" },
    file: { unit: "bytes", verb: "ter" },
    array: { unit: "itens", verb: "ter" },
    set: { unit: "itens", verb: "ter" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "padrão",
    email: "endereço de e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "duração ISO",
    ipv4: "endereço IPv4",
    ipv6: "endereço IPv6",
    cidrv4: "faixa de IPv4",
    cidrv6: "faixa de IPv6",
    base64: "texto codificado em base64",
    base64url: "URL codificada em base64",
    json_string: "texto JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "número",
    null: "nulo"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Tipo inválido: esperado instanceof ${issue2.expected}, recebido ${received}`;
        }
        return `Tipo inválido: esperado ${expected}, recebido ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: esperado ${stringifyPrimitive(issue2.values[0])}`;
        return `Opção inválida: esperada uma das ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Muito grande: esperado que ${issue2.origin ?? "valor"} tivesse ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Muito grande: esperado que ${issue2.origin ?? "valor"} fosse ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Texto inválido: deve começar com "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Texto inválido: deve terminar com "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Texto inválido: deve incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Texto inválido: deve corresponder ao padrão ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} inválido`;
      }
      case "not_multiple_of":
        return `Número inválido: deve ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chave inválida em ${issue2.origin}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido em ${issue2.origin}`;
      default:
        return `Campo inválido`;
    }
  };
};
var init_pt = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ro.js
function ro_default() {
  return {
    localeError: error37()
  };
}
var error37 = () => {
  const Sizable = {
    string: { unit: "caractere", verb: "să aibă" },
    file: { unit: "octeți", verb: "să aibă" },
    array: { unit: "elemente", verb: "să aibă" },
    set: { unit: "elemente", verb: "să aibă" },
    map: { unit: "intrări", verb: "să aibă" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "intrare",
    email: "adresă de email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "dată și oră ISO",
    date: "dată ISO",
    time: "oră ISO",
    duration: "durată ISO",
    ipv4: "adresă IPv4",
    ipv6: "adresă IPv6",
    mac: "adresă MAC",
    cidrv4: "interval IPv4",
    cidrv6: "interval IPv6",
    base64: "șir codat base64",
    base64url: "șir codat base64url",
    json_string: "șir JSON",
    e164: "număr E.164",
    jwt: "JWT",
    template_literal: "intrare"
  };
  const TypeDictionary = {
    nan: "NaN",
    string: "șir",
    number: "număr",
    boolean: "boolean",
    function: "funcție",
    array: "matrice",
    object: "obiect",
    undefined: "nedefinit",
    symbol: "simbol",
    bigint: "număr mare",
    void: "void",
    never: "never",
    map: "hartă",
    set: "set"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        return `Intrare invalidă: așteptat ${expected}, primit ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Intrare invalidă: așteptat ${stringifyPrimitive(issue2.values[0])}`;
        return `Opțiune invalidă: așteptat una dintre ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Prea mare: așteptat ca ${issue2.origin ?? "valoarea"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemente"}`;
        return `Prea mare: așteptat ca ${issue2.origin ?? "valoarea"} să fie ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Prea mic: așteptat ca ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Prea mic: așteptat ca ${issue2.origin} să fie ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Șir invalid: trebuie să înceapă cu "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Șir invalid: trebuie să se termine cu "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Șir invalid: trebuie să includă "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Șir invalid: trebuie să se potrivească cu modelul ${_issue.pattern}`;
        return `Format invalid: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Număr invalid: trebuie să fie multiplu de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chei nerecunoscute: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Cheie invalidă în ${issue2.origin}`;
      case "invalid_union":
        return "Intrare invalidă";
      case "invalid_element":
        return `Valoare invalidă în ${issue2.origin}`;
      default:
        return `Intrare invalidă`;
    }
  };
};
var init_ro = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
function ru_default() {
  return {
    localeError: error38()
  };
}
var error38 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "символ",
        few: "символа",
        many: "символов"
      },
      verb: "иметь"
    },
    file: {
      unit: {
        one: "байт",
        few: "байта",
        many: "байт"
      },
      verb: "иметь"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ввод",
    email: "email адрес",
    url: "URL",
    emoji: "эмодзи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата и время",
    date: "ISO дата",
    time: "ISO время",
    duration: "ISO длительность",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "строка в формате base64",
    base64url: "строка в формате base64url",
    json_string: "JSON строка",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "ввод"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "число",
    array: "массив"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Неверный ввод: ожидалось instanceof ${issue2.expected}, получено ${received}`;
        }
        return `Неверный ввод: ожидалось ${expected}, получено ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неверный ввод: ожидалось ${stringifyPrimitive(issue2.values[0])}`;
        return `Неверный вариант: ожидалось одно из ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет иметь ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет иметь ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неверная строка: должна начинаться с "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неверная строка: должна заканчиваться на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неверная строка: должна содержать "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неверная строка: должна соответствовать шаблону ${_issue.pattern}`;
        return `Неверный ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неверное число: должно быть кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспознанн${issue2.keys.length > 1 ? "ые" : "ый"} ключ${issue2.keys.length > 1 ? "и" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неверный ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Неверные входные данные";
      case "invalid_element":
        return `Неверное значение в ${issue2.origin}`;
      default:
        return `Неверные входные данные`;
    }
  };
};
var init_ru = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sl.js
function sl_default() {
  return {
    localeError: error39()
  };
}
var error39 = () => {
  const Sizable = {
    string: { unit: "znakov", verb: "imeti" },
    file: { unit: "bajtov", verb: "imeti" },
    array: { unit: "elementov", verb: "imeti" },
    set: { unit: "elementov", verb: "imeti" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "vnos",
    email: "e-poštni naslov",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum in čas",
    date: "ISO datum",
    time: "ISO čas",
    duration: "ISO trajanje",
    ipv4: "IPv4 naslov",
    ipv6: "IPv6 naslov",
    cidrv4: "obseg IPv4",
    cidrv6: "obseg IPv6",
    base64: "base64 kodiran niz",
    base64url: "base64url kodiran niz",
    json_string: "JSON niz",
    e164: "E.164 številka",
    jwt: "JWT",
    template_literal: "vnos"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "število",
    array: "tabela"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Neveljaven vnos: pričakovano instanceof ${issue2.expected}, prejeto ${received}`;
        }
        return `Neveljaven vnos: pričakovano ${expected}, prejeto ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neveljaven vnos: pričakovano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neveljavna možnost: pričakovano eno izmed ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementov"}`;
        return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Premajhno: pričakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premajhno: pričakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Neveljaven niz: mora se začeti z "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Neveljaven niz: mora se končati z "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
        return `Neveljaven ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neveljavno število: mora biti večkratnik ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznan${issue2.keys.length > 1 ? "i ključi" : " ključ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neveljaven ključ v ${issue2.origin}`;
      case "invalid_union":
        return "Neveljaven vnos";
      case "invalid_element":
        return `Neveljavna vrednost v ${issue2.origin}`;
      default:
        return "Neveljaven vnos";
    }
  };
};
var init_sl = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/sv.js
function sv_default() {
  return {
    localeError: error40()
  };
}
var error40 = () => {
  const Sizable = {
    string: { unit: "tecken", verb: "att ha" },
    file: { unit: "bytes", verb: "att ha" },
    array: { unit: "objekt", verb: "att innehålla" },
    set: { unit: "objekt", verb: "att innehålla" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "reguljärt uttryck",
    email: "e-postadress",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datum och tid",
    date: "ISO-datum",
    time: "ISO-tid",
    duration: "ISO-varaktighet",
    ipv4: "IPv4-intervall",
    ipv6: "IPv6-intervall",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodad sträng",
    base64url: "base64url-kodad sträng",
    json_string: "JSON-sträng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "mall-literal"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "antal",
    array: "lista"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ogiltig inmatning: förväntat instanceof ${issue2.expected}, fick ${received}`;
        }
        return `Ogiltig inmatning: förväntat ${expected}, fick ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ogiltig inmatning: förväntat ${stringifyPrimitive(issue2.values[0])}`;
        return `Ogiltigt val: förväntade en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För stor(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        }
        return `För stor(t): förväntat ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ogiltig sträng: måste börja med "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ogiltig sträng: måste sluta med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ogiltig sträng: måste innehålla "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ogiltig sträng: måste matcha mönstret "${_issue.pattern}"`;
        return `Ogiltig(t) ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ogiltigt tal: måste vara en multipel av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Okända nycklar" : "Okänd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ogiltig nyckel i ${issue2.origin ?? "värdet"}`;
      case "invalid_union":
        return "Ogiltig input";
      case "invalid_element":
        return `Ogiltigt värde i ${issue2.origin ?? "värdet"}`;
      default:
        return `Ogiltig input`;
    }
  };
};
var init_sv = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ta.js
function ta_default() {
  return {
    localeError: error41()
  };
}
var error41 = () => {
  const Sizable = {
    string: { unit: "எழுத்துக்கள்", verb: "கொண்டிருக்க வேண்டும்" },
    file: { unit: "பைட்டுகள்", verb: "கொண்டிருக்க வேண்டும்" },
    array: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" },
    set: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "உள்ளீடு",
    email: "மின்னஞ்சல் முகவரி",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO தேதி நேரம்",
    date: "ISO தேதி",
    time: "ISO நேரம்",
    duration: "ISO கால அளவு",
    ipv4: "IPv4 முகவரி",
    ipv6: "IPv6 முகவரி",
    cidrv4: "IPv4 வரம்பு",
    cidrv6: "IPv6 வரம்பு",
    base64: "base64-encoded சரம்",
    base64url: "base64url-encoded சரம்",
    json_string: "JSON சரம்",
    e164: "E.164 எண்",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "எண்",
    array: "அணி",
    null: "வெறுமை"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது instanceof ${issue2.expected}, பெறப்பட்டது ${received}`;
        }
        return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${expected}, பெறப்பட்டது ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${stringifyPrimitive(issue2.values[0])}`;
        return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${joinValues(issue2.values, "|")} இல் ஒன்று`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "உறுப்புகள்"} ஆக இருக்க வேண்டும்`;
        }
        return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ஆக இருக்க வேண்டும்`;
        }
        return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `தவறான சரம்: "${_issue.prefix}" இல் தொடங்க வேண்டும்`;
        if (_issue.format === "ends_with")
          return `தவறான சரம்: "${_issue.suffix}" இல் முடிவடைய வேண்டும்`;
        if (_issue.format === "includes")
          return `தவறான சரம்: "${_issue.includes}" ஐ உள்ளடக்க வேண்டும்`;
        if (_issue.format === "regex")
          return `தவறான சரம்: ${_issue.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
        return `தவறான ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `தவறான எண்: ${issue2.divisor} இன் பலமாக இருக்க வேண்டும்`;
      case "unrecognized_keys":
        return `அடையாளம் தெரியாத விசை${issue2.keys.length > 1 ? "கள்" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} இல் தவறான விசை`;
      case "invalid_union":
        return "தவறான உள்ளீடு";
      case "invalid_element":
        return `${issue2.origin} இல் தவறான மதிப்பு`;
      default:
        return `தவறான உள்ளீடு`;
    }
  };
};
var init_ta = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/th.js
function th_default() {
  return {
    localeError: error42()
  };
}
var error42 = () => {
  const Sizable = {
    string: { unit: "ตัวอักษร", verb: "ควรมี" },
    file: { unit: "ไบต์", verb: "ควรมี" },
    array: { unit: "รายการ", verb: "ควรมี" },
    set: { unit: "รายการ", verb: "ควรมี" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ข้อมูลที่ป้อน",
    email: "ที่อยู่อีเมล",
    url: "URL",
    emoji: "อิโมจิ",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "วันที่เวลาแบบ ISO",
    date: "วันที่แบบ ISO",
    time: "เวลาแบบ ISO",
    duration: "ช่วงเวลาแบบ ISO",
    ipv4: "ที่อยู่ IPv4",
    ipv6: "ที่อยู่ IPv6",
    cidrv4: "ช่วง IP แบบ IPv4",
    cidrv6: "ช่วง IP แบบ IPv6",
    base64: "ข้อความแบบ Base64",
    base64url: "ข้อความแบบ Base64 สำหรับ URL",
    json_string: "ข้อความแบบ JSON",
    e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
    jwt: "โทเคน JWT",
    template_literal: "ข้อมูลที่ป้อน"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "ตัวเลข",
    array: "อาร์เรย์ (Array)",
    null: "ไม่มีค่า (null)"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น instanceof ${issue2.expected} แต่ได้รับ ${received}`;
        }
        return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${expected} แต่ได้รับ ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ค่าไม่ถูกต้อง: ควรเป็น ${stringifyPrimitive(issue2.values[0])}`;
        return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "ไม่เกิน" : "น้อยกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
        return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "อย่างน้อย" : "มากกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อความ`;
        if (_issue.format === "regex")
          return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${_issue.pattern}`;
        return `รูปแบบไม่ถูกต้อง: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${issue2.divisor} ได้ลงตัว`;
      case "unrecognized_keys":
        return `พบคีย์ที่ไม่รู้จัก: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `คีย์ไม่ถูกต้องใน ${issue2.origin}`;
      case "invalid_union":
        return "ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";
      case "invalid_element":
        return `ข้อมูลไม่ถูกต้องใน ${issue2.origin}`;
      default:
        return `ข้อมูลไม่ถูกต้อง`;
    }
  };
};
var init_th = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/tr.js
function tr_default() {
  return {
    localeError: error43()
  };
}
var error43 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "olmalı" },
    file: { unit: "bayt", verb: "olmalı" },
    array: { unit: "öğe", verb: "olmalı" },
    set: { unit: "öğe", verb: "olmalı" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "girdi",
    email: "e-posta adresi",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO tarih ve saat",
    date: "ISO tarih",
    time: "ISO saat",
    duration: "ISO süre",
    ipv4: "IPv4 adresi",
    ipv6: "IPv6 adresi",
    cidrv4: "IPv4 aralığı",
    cidrv6: "IPv6 aralığı",
    base64: "base64 ile şifrelenmiş metin",
    base64url: "base64url ile şifrelenmiş metin",
    json_string: "JSON dizesi",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "Şablon dizesi"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Geçersiz değer: beklenen instanceof ${issue2.expected}, alınan ${received}`;
        }
        return `Geçersiz değer: beklenen ${expected}, alınan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Geçersiz değer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
        return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "öğe"}`;
        return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Geçersiz metin: "${_issue.prefix}" ile başlamalı`;
        if (_issue.format === "ends_with")
          return `Geçersiz metin: "${_issue.suffix}" ile bitmeli`;
        if (_issue.format === "includes")
          return `Geçersiz metin: "${_issue.includes}" içermeli`;
        if (_issue.format === "regex")
          return `Geçersiz metin: ${_issue.pattern} desenine uymalı`;
        return `Geçersiz ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Geçersiz sayı: ${issue2.divisor} ile tam bölünebilmeli`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} içinde geçersiz anahtar`;
      case "invalid_union":
        return "Geçersiz değer";
      case "invalid_element":
        return `${issue2.origin} içinde geçersiz değer`;
      default:
        return `Geçersiz değer`;
    }
  };
};
var init_tr = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uk.js
function uk_default() {
  return {
    localeError: error44()
  };
}
var error44 = () => {
  const Sizable = {
    string: { unit: "символів", verb: "матиме" },
    file: { unit: "байтів", verb: "матиме" },
    array: { unit: "елементів", verb: "матиме" },
    set: { unit: "елементів", verb: "матиме" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "вхідні дані",
    email: "адреса електронної пошти",
    url: "URL",
    emoji: "емодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "дата та час ISO",
    date: "дата ISO",
    time: "час ISO",
    duration: "тривалість ISO",
    ipv4: "адреса IPv4",
    ipv6: "адреса IPv6",
    cidrv4: "діапазон IPv4",
    cidrv6: "діапазон IPv6",
    base64: "рядок у кодуванні base64",
    base64url: "рядок у кодуванні base64url",
    json_string: "рядок JSON",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "вхідні дані"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "число",
    array: "масив"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Неправильні вхідні дані: очікується instanceof ${issue2.expected}, отримано ${received}`;
        }
        return `Неправильні вхідні дані: очікується ${expected}, отримано ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неправильні вхідні дані: очікується ${stringifyPrimitive(issue2.values[0])}`;
        return `Неправильна опція: очікується одне з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементів"}`;
        return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} буде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Занадто мале: очікується, що ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Занадто мале: очікується, що ${issue2.origin} буде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неправильний рядок: повинен починатися з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неправильний рядок: повинен закінчуватися на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неправильний рядок: повинен містити "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неправильний рядок: повинен відповідати шаблону ${_issue.pattern}`;
        return `Неправильний ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неправильне число: повинно бути кратним ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нерозпізнаний ключ${issue2.keys.length > 1 ? "і" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неправильний ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Неправильні вхідні дані";
      case "invalid_element":
        return `Неправильне значення у ${issue2.origin}`;
      default:
        return `Неправильні вхідні дані`;
    }
  };
};
var init_uk = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ua.js
function ua_default() {
  return uk_default();
}
var init_ua = __esm(() => {
  init_uk();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/ur.js
function ur_default() {
  return {
    localeError: error45()
  };
}
var error45 = () => {
  const Sizable = {
    string: { unit: "حروف", verb: "ہونا" },
    file: { unit: "بائٹس", verb: "ہونا" },
    array: { unit: "آئٹمز", verb: "ہونا" },
    set: { unit: "آئٹمز", verb: "ہونا" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ان پٹ",
    email: "ای میل ایڈریس",
    url: "یو آر ایل",
    emoji: "ایموجی",
    uuid: "یو یو آئی ڈی",
    uuidv4: "یو یو آئی ڈی وی 4",
    uuidv6: "یو یو آئی ڈی وی 6",
    nanoid: "نینو آئی ڈی",
    guid: "جی یو آئی ڈی",
    cuid: "سی یو آئی ڈی",
    cuid2: "سی یو آئی ڈی 2",
    ulid: "یو ایل آئی ڈی",
    xid: "ایکس آئی ڈی",
    ksuid: "کے ایس یو آئی ڈی",
    datetime: "آئی ایس او ڈیٹ ٹائم",
    date: "آئی ایس او تاریخ",
    time: "آئی ایس او وقت",
    duration: "آئی ایس او مدت",
    ipv4: "آئی پی وی 4 ایڈریس",
    ipv6: "آئی پی وی 6 ایڈریس",
    cidrv4: "آئی پی وی 4 رینج",
    cidrv6: "آئی پی وی 6 رینج",
    base64: "بیس 64 ان کوڈڈ سٹرنگ",
    base64url: "بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",
    json_string: "جے ایس او این سٹرنگ",
    e164: "ای 164 نمبر",
    jwt: "جے ڈبلیو ٹی",
    template_literal: "ان پٹ"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "نمبر",
    array: "آرے",
    null: "نل"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `غلط ان پٹ: instanceof ${issue2.expected} متوقع تھا، ${received} موصول ہوا`;
        }
        return `غلط ان پٹ: ${expected} متوقع تھا، ${received} موصول ہوا`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `غلط ان پٹ: ${stringifyPrimitive(issue2.values[0])} متوقع تھا`;
        return `غلط آپشن: ${joinValues(issue2.values, "|")} میں سے ایک متوقع تھا`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کے ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عناصر"} ہونے متوقع تھے`;
        return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کا ${adj}${issue2.maximum.toString()} ہونا متوقع تھا`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `بہت چھوٹا: ${issue2.origin} کے ${adj}${issue2.minimum.toString()} ${sizing.unit} ہونے متوقع تھے`;
        }
        return `بہت چھوٹا: ${issue2.origin} کا ${adj}${issue2.minimum.toString()} ہونا متوقع تھا`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `غلط سٹرنگ: "${_issue.prefix}" سے شروع ہونا چاہیے`;
        }
        if (_issue.format === "ends_with")
          return `غلط سٹرنگ: "${_issue.suffix}" پر ختم ہونا چاہیے`;
        if (_issue.format === "includes")
          return `غلط سٹرنگ: "${_issue.includes}" شامل ہونا چاہیے`;
        if (_issue.format === "regex")
          return `غلط سٹرنگ: پیٹرن ${_issue.pattern} سے میچ ہونا چاہیے`;
        return `غلط ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `غلط نمبر: ${issue2.divisor} کا مضاعف ہونا چاہیے`;
      case "unrecognized_keys":
        return `غیر تسلیم شدہ کی${issue2.keys.length > 1 ? "ز" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `${issue2.origin} میں غلط کی`;
      case "invalid_union":
        return "غلط ان پٹ";
      case "invalid_element":
        return `${issue2.origin} میں غلط ویلیو`;
      default:
        return `غلط ان پٹ`;
    }
  };
};
var init_ur = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/uz.js
function uz_default() {
  return {
    localeError: error46()
  };
}
var error46 = () => {
  const Sizable = {
    string: { unit: "belgi", verb: "bo‘lishi kerak" },
    file: { unit: "bayt", verb: "bo‘lishi kerak" },
    array: { unit: "element", verb: "bo‘lishi kerak" },
    set: { unit: "element", verb: "bo‘lishi kerak" },
    map: { unit: "yozuv", verb: "bo‘lishi kerak" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "kirish",
    email: "elektron pochta manzili",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO sana va vaqti",
    date: "ISO sana",
    time: "ISO vaqt",
    duration: "ISO davomiylik",
    ipv4: "IPv4 manzil",
    ipv6: "IPv6 manzil",
    mac: "MAC manzil",
    cidrv4: "IPv4 diapazon",
    cidrv6: "IPv6 diapazon",
    base64: "base64 kodlangan satr",
    base64url: "base64url kodlangan satr",
    json_string: "JSON satr",
    e164: "E.164 raqam",
    jwt: "JWT",
    template_literal: "kirish"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "raqam",
    array: "massiv"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Noto‘g‘ri kirish: kutilgan instanceof ${issue2.expected}, qabul qilingan ${received}`;
        }
        return `Noto‘g‘ri kirish: kutilgan ${expected}, qabul qilingan ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Noto‘g‘ri kirish: kutilgan ${stringifyPrimitive(issue2.values[0])}`;
        return `Noto‘g‘ri variant: quyidagilardan biri kutilgan ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Juda katta: kutilgan ${issue2.origin ?? "qiymat"} ${adj}${issue2.maximum.toString()} ${sizing.unit} ${sizing.verb}`;
        return `Juda katta: kutilgan ${issue2.origin ?? "qiymat"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Juda kichik: kutilgan ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ${sizing.verb}`;
        }
        return `Juda kichik: kutilgan ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Noto‘g‘ri satr: "${_issue.prefix}" bilan boshlanishi kerak`;
        if (_issue.format === "ends_with")
          return `Noto‘g‘ri satr: "${_issue.suffix}" bilan tugashi kerak`;
        if (_issue.format === "includes")
          return `Noto‘g‘ri satr: "${_issue.includes}" ni o‘z ichiga olishi kerak`;
        if (_issue.format === "regex")
          return `Noto‘g‘ri satr: ${_issue.pattern} shabloniga mos kelishi kerak`;
        return `Noto‘g‘ri ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Noto‘g‘ri raqam: ${issue2.divisor} ning karralisi bo‘lishi kerak`;
      case "unrecognized_keys":
        return `Noma’lum kalit${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} dagi kalit noto‘g‘ri`;
      case "invalid_union":
        return "Noto‘g‘ri kirish";
      case "invalid_element":
        return `${issue2.origin} da noto‘g‘ri qiymat`;
      default:
        return `Noto‘g‘ri kirish`;
    }
  };
};
var init_uz = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/vi.js
function vi_default() {
  return {
    localeError: error47()
  };
}
var error47 = () => {
  const Sizable = {
    string: { unit: "ký tự", verb: "có" },
    file: { unit: "byte", verb: "có" },
    array: { unit: "phần tử", verb: "có" },
    set: { unit: "phần tử", verb: "có" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "đầu vào",
    email: "địa chỉ email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ngày giờ ISO",
    date: "ngày ISO",
    time: "giờ ISO",
    duration: "khoảng thời gian ISO",
    ipv4: "địa chỉ IPv4",
    ipv6: "địa chỉ IPv6",
    cidrv4: "dải IPv4",
    cidrv6: "dải IPv6",
    base64: "chuỗi mã hóa base64",
    base64url: "chuỗi mã hóa base64url",
    json_string: "chuỗi JSON",
    e164: "số E.164",
    jwt: "JWT",
    template_literal: "đầu vào"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "số",
    array: "mảng"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Đầu vào không hợp lệ: mong đợi instanceof ${issue2.expected}, nhận được ${received}`;
        }
        return `Đầu vào không hợp lệ: mong đợi ${expected}, nhận được ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Đầu vào không hợp lệ: mong đợi ${stringifyPrimitive(issue2.values[0])}`;
        return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "phần tử"}`;
        return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Quá nhỏ: mong đợi ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Quá nhỏ: mong đợi ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chuỗi không hợp lệ: phải bắt đầu bằng "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chuỗi không hợp lệ: phải kết thúc bằng "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chuỗi không hợp lệ: phải bao gồm "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chuỗi không hợp lệ: phải khớp với mẫu ${_issue.pattern}`;
        return `${FormatDictionary[_issue.format] ?? issue2.format} không hợp lệ`;
      }
      case "not_multiple_of":
        return `Số không hợp lệ: phải là bội số của ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Khóa không được nhận dạng: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Khóa không hợp lệ trong ${issue2.origin}`;
      case "invalid_union":
        return "Đầu vào không hợp lệ";
      case "invalid_element":
        return `Giá trị không hợp lệ trong ${issue2.origin}`;
      default:
        return `Đầu vào không hợp lệ`;
    }
  };
};
var init_vi = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-CN.js
function zh_CN_default() {
  return {
    localeError: error48()
  };
}
var error48 = () => {
  const Sizable = {
    string: { unit: "字符", verb: "包含" },
    file: { unit: "字节", verb: "包含" },
    array: { unit: "项", verb: "包含" },
    set: { unit: "项", verb: "包含" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "输入",
    email: "电子邮件",
    url: "URL",
    emoji: "表情符号",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日期时间",
    date: "ISO日期",
    time: "ISO时间",
    duration: "ISO时长",
    ipv4: "IPv4地址",
    ipv6: "IPv6地址",
    cidrv4: "IPv4网段",
    cidrv6: "IPv6网段",
    base64: "base64编码字符串",
    base64url: "base64url编码字符串",
    json_string: "JSON字符串",
    e164: "E.164号码",
    jwt: "JWT",
    template_literal: "输入"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "数字",
    array: "数组",
    null: "空值(null)"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `无效输入：期望 instanceof ${issue2.expected}，实际接收 ${received}`;
        }
        return `无效输入：期望 ${expected}，实际接收 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `无效输入：期望 ${stringifyPrimitive(issue2.values[0])}`;
        return `无效选项：期望以下之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "个元素"}`;
        return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `无效字符串：必须以 "${_issue.prefix}" 开头`;
        if (_issue.format === "ends_with")
          return `无效字符串：必须以 "${_issue.suffix}" 结尾`;
        if (_issue.format === "includes")
          return `无效字符串：必须包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `无效字符串：必须满足正则表达式 ${_issue.pattern}`;
        return `无效${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `无效数字：必须是 ${issue2.divisor} 的倍数`;
      case "unrecognized_keys":
        return `出现未知的键(key): ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} 中的键(key)无效`;
      case "invalid_union":
        return "无效输入";
      case "invalid_element":
        return `${issue2.origin} 中包含无效值(value)`;
      default:
        return `无效输入`;
    }
  };
};
var init_zh_CN = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/zh-TW.js
function zh_TW_default() {
  return {
    localeError: error49()
  };
}
var error49 = () => {
  const Sizable = {
    string: { unit: "字元", verb: "擁有" },
    file: { unit: "位元組", verb: "擁有" },
    array: { unit: "項目", verb: "擁有" },
    set: { unit: "項目", verb: "擁有" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "輸入",
    email: "郵件地址",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 日期時間",
    date: "ISO 日期",
    time: "ISO 時間",
    duration: "ISO 期間",
    ipv4: "IPv4 位址",
    ipv6: "IPv6 位址",
    cidrv4: "IPv4 範圍",
    cidrv6: "IPv6 範圍",
    base64: "base64 編碼字串",
    base64url: "base64url 編碼字串",
    json_string: "JSON 字串",
    e164: "E.164 數值",
    jwt: "JWT",
    template_literal: "輸入"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `無效的輸入值：預期為 instanceof ${issue2.expected}，但收到 ${received}`;
        }
        return `無效的輸入值：預期為 ${expected}，但收到 ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無效的輸入值：預期為 ${stringifyPrimitive(issue2.values[0])}`;
        return `無效的選項：預期為以下其中之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "個元素"}`;
        return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `無效的字串：必須以 "${_issue.prefix}" 開頭`;
        }
        if (_issue.format === "ends_with")
          return `無效的字串：必須以 "${_issue.suffix}" 結尾`;
        if (_issue.format === "includes")
          return `無效的字串：必須包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `無效的字串：必須符合格式 ${_issue.pattern}`;
        return `無效的 ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無效的數字：必須為 ${issue2.divisor} 的倍數`;
      case "unrecognized_keys":
        return `無法識別的鍵值${issue2.keys.length > 1 ? "們" : ""}：${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin} 中有無效的鍵值`;
      case "invalid_union":
        return "無效的輸入值";
      case "invalid_element":
        return `${issue2.origin} 中有無效的值`;
      default:
        return `無效的輸入值`;
    }
  };
};
var init_zh_TW = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/yo.js
function yo_default() {
  return {
    localeError: error50()
  };
}
var error50 = () => {
  const Sizable = {
    string: { unit: "àmi", verb: "ní" },
    file: { unit: "bytes", verb: "ní" },
    array: { unit: "nkan", verb: "ní" },
    set: { unit: "nkan", verb: "ní" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "ẹ̀rọ ìbáwọlé",
    email: "àdírẹ́sì ìmẹ́lì",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "àkókò ISO",
    date: "ọjọ́ ISO",
    time: "àkókò ISO",
    duration: "àkókò tó pé ISO",
    ipv4: "àdírẹ́sì IPv4",
    ipv6: "àdírẹ́sì IPv6",
    cidrv4: "àgbègbè IPv4",
    cidrv6: "àgbègbè IPv6",
    base64: "ọ̀rọ̀ tí a kọ́ ní base64",
    base64url: "ọ̀rọ̀ base64url",
    json_string: "ọ̀rọ̀ JSON",
    e164: "nọ́mbà E.164",
    jwt: "JWT",
    template_literal: "ẹ̀rọ ìbáwọlé"
  };
  const TypeDictionary = {
    nan: "NaN",
    number: "nọ́mbà",
    array: "akopọ"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        if (/^[A-Z]/.test(issue2.expected)) {
          return `Ìbáwọlé aṣìṣe: a ní láti fi instanceof ${issue2.expected}, àmọ̀ a rí ${received}`;
        }
        return `Ìbáwọlé aṣìṣe: a ní láti fi ${expected}, àmọ̀ a rí ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${stringifyPrimitive(issue2.values[0])}`;
        return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tó pọ̀ jù: a ní láti jẹ́ pé ${issue2.origin ?? "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
        return `Tó pọ̀ jù: a ní láti jẹ́ ${adj}${issue2.maximum}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Kéré ju: a ní láti jẹ́ pé ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
        return `Kéré ju: a ní láti jẹ́ ${adj}${issue2.minimum}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${_issue.pattern}`;
        return `Aṣìṣe: ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Bọtìnì àìmọ̀: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Bọtìnì aṣìṣe nínú ${issue2.origin}`;
      case "invalid_union":
        return "Ìbáwọlé aṣìṣe";
      case "invalid_element":
        return `Iye aṣìṣe nínú ${issue2.origin}`;
      default:
        return "Ìbáwọlé aṣìṣe";
    }
  };
};
var init_yo = __esm(() => {
  init_util();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/locales/index.js
var exports_locales = {};
__export(exports_locales, {
  zhTW: () => zh_TW_default,
  zhCN: () => zh_CN_default,
  yo: () => yo_default,
  vi: () => vi_default,
  uz: () => uz_default,
  ur: () => ur_default,
  uk: () => uk_default,
  ua: () => ua_default,
  tr: () => tr_default,
  th: () => th_default,
  ta: () => ta_default,
  sv: () => sv_default,
  sl: () => sl_default,
  ru: () => ru_default,
  ro: () => ro_default,
  pt: () => pt_default,
  ps: () => ps_default,
  pl: () => pl_default,
  ota: () => ota_default,
  no: () => no_default,
  nl: () => nl_default,
  ms: () => ms_default,
  mk: () => mk_default,
  lt: () => lt_default,
  ko: () => ko_default,
  km: () => km_default,
  kh: () => kh_default,
  ka: () => ka_default,
  ja: () => ja_default,
  it: () => it_default,
  is: () => is_default,
  id: () => id_default,
  hy: () => hy_default,
  hu: () => hu_default,
  hr: () => hr_default,
  he: () => he_default,
  frCA: () => fr_CA_default,
  fr: () => fr_default,
  fi: () => fi_default,
  fa: () => fa_default,
  es: () => es_default,
  eo: () => eo_default,
  en: () => en_default,
  el: () => el_default,
  de: () => de_default,
  da: () => da_default,
  cs: () => cs_default,
  ca: () => ca_default,
  bg: () => bg_default,
  be: () => be_default,
  az: () => az_default,
  ar: () => ar_default
});
var init_locales = __esm(() => {
  init_ar();
  init_az();
  init_be();
  init_bg();
  init_ca();
  init_cs();
  init_da();
  init_de();
  init_el();
  init_en();
  init_eo();
  init_es();
  init_fa();
  init_fi();
  init_fr();
  init_fr_CA();
  init_he();
  init_hr();
  init_hu();
  init_hy();
  init_id();
  init_is();
  init_it();
  init_ja();
  init_ka();
  init_kh();
  init_km();
  init_ko();
  init_lt();
  init_mk();
  init_ms();
  init_nl();
  init_no();
  init_ota();
  init_ps();
  init_pl();
  init_pt();
  init_ro();
  init_ru();
  init_sl();
  init_sv();
  init_ta();
  init_th();
  init_tr();
  init_ua();
  init_uk();
  init_ur();
  init_uz();
  init_vi();
  init_zh_CN();
  init_zh_TW();
  init_yo();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/registries.js
class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
var _a2, $output, $input, globalRegistry;
var init_registries = __esm(() => {
  $output = Symbol("ZodOutput");
  $input = Symbol("ZodInput");
  (_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
  globalRegistry = globalThis.__zod_globalRegistry;
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/api.js
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _mac(Class2, params) {
  return new Class2({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _positive(params) {
  return _gt(0, params);
}
function _negative(params) {
  return _lt(0, params);
}
function _nonpositive(params) {
  return _lte(0, params);
}
function _nonnegative(params) {
  return _gte(0, params);
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _slugify() {
  return _overwrite((input) => slugify(input));
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _union(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function _xor(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    inclusive: false,
    ...normalizeParams(params)
  });
}
function _discriminatedUnion(Class2, discriminator, options, params) {
  return new Class2({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
function _intersection(Class2, left, right) {
  return new Class2({
    type: "intersection",
    left,
    right
  });
}
function _tuple(Class2, items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new Class2({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
function _record(Class2, keyType, valueType, params) {
  return new Class2({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _map(Class2, keyType, valueType, params) {
  return new Class2({
    type: "map",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _set(Class2, valueType, params) {
  return new Class2({
    type: "set",
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(Class2, values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _nativeEnum(Class2, entries, params) {
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _literal(Class2, value, params) {
  return new Class2({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
function _transform(Class2, fn) {
  return new Class2({
    type: "transform",
    transform: fn
  });
}
function _optional(Class2, innerType) {
  return new Class2({
    type: "optional",
    innerType
  });
}
function _nullable(Class2, innerType) {
  return new Class2({
    type: "nullable",
    innerType
  });
}
function _default(Class2, innerType, defaultValue) {
  return new Class2({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function _nonoptional(Class2, innerType, params) {
  return new Class2({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _success(Class2, innerType) {
  return new Class2({
    type: "success",
    innerType
  });
}
function _catch(Class2, innerType, catchValue) {
  return new Class2({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function _pipe(Class2, in_, out) {
  return new Class2({
    type: "pipe",
    in: in_,
    out
  });
}
function _readonly(Class2, innerType) {
  return new Class2({
    type: "readonly",
    innerType
  });
}
function _templateLiteral(Class2, parts, params) {
  return new Class2({
    type: "template_literal",
    parts,
    ...normalizeParams(params)
  });
}
function _lazy(Class2, getter) {
  return new Class2({
    type: "lazy",
    getter
  });
}
function _promise(Class2, innerType) {
  return new Class2({
    type: "promise",
    innerType
  });
}
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn, params) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function describe(description) {
  const ch = new $ZodCheck({ check: "describe" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, description });
    }
  ];
  ch._zod.check = () => {};
  return ch;
}
function meta(metadata) {
  const ch = new $ZodCheck({ check: "meta" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, ...metadata });
    }
  ];
  ch._zod.check = () => {};
  return ch;
}
function _stringbool(Classes, _params) {
  const params = normalizeParams(_params);
  let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = Classes.Codec ?? $ZodCodec;
  const _Boolean = Classes.Boolean ?? $ZodBoolean;
  const _String = Classes.String ?? $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: (input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec,
          continue: false
        });
        return {};
      }
    },
    reverseTransform: (input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    },
    error: params.error
  });
  return codec;
}
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}
var TimePrecision;
var init_api = __esm(() => {
  init_checks();
  init_registries();
  init_schemas();
  init_util();
  TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6
  };
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {}),
    io: params?.io ?? "output",
    counter: 0,
    seen: new Map,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? undefined
  };
}
function process2(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a3;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process2(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta2 = ctx.metadataRegistry.get(schema);
  if (meta2)
    Object.assign(result.schema, meta2);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a3 = result.schema).default ?? (_a3.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = new Map;
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {}
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== undefined && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) {} else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
}, createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var init_to_json_schema = __esm(() => {
  init_registries();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
function toJSONSchema(input, params) {
  if ("_idmap" in input) {
    const registry2 = input;
    const ctx2 = initializeContext({ ...params, processors: allProcessors });
    const defs = {};
    for (const entry of registry2._idmap.entries()) {
      const [_, schema] = entry;
      process2(schema, ctx2);
    }
    const schemas = {};
    const external = {
      registry: registry2,
      uri: params?.uri,
      defs
    };
    ctx2.external = external;
    for (const entry of registry2._idmap.entries()) {
      const [key, schema] = entry;
      extractDefs(ctx2, schema);
      schemas[key] = finalize(ctx2, schema);
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = ctx2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const ctx = initializeContext({ ...params, processors: allProcessors });
  process2(input, ctx);
  extractDefs(ctx, input);
  return finalize(ctx, input);
}
var formatMap, stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time") {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
}, numberProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json.type = "integer";
  else
    json.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json.multipleOf = multipleOf;
}, booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
}, bigintProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("BigInt cannot be represented in JSON Schema");
  }
}, symbolProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Symbols cannot be represented in JSON Schema");
  }
}, nullProcessor = (_schema, ctx, json, _params) => {
  if (ctx.target === "openapi-3.0") {
    json.type = "string";
    json.nullable = true;
    json.enum = [null];
  } else {
    json.type = "null";
  }
}, undefinedProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Undefined cannot be represented in JSON Schema");
  }
}, voidProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Void cannot be represented in JSON Schema");
  }
}, neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
}, anyProcessor = (_schema, _ctx, _json, _params) => {}, unknownProcessor = (_schema, _ctx, _json, _params) => {}, dateProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Date cannot be represented in JSON Schema");
  }
}, enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
}, literalProcessor = (schema, ctx, json, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === undefined) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) {} else if (vals.length === 1) {
    const val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json.type = "boolean";
    if (vals.every((v) => v === null))
      json.type = "null";
    json.enum = vals;
  }
}, nanProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("NaN cannot be represented in JSON Schema");
  }
}, templateLiteralProcessor = (schema, _ctx, json, _params) => {
  const _json = json;
  const pattern = schema._zod.pattern;
  if (!pattern)
    throw new Error("Pattern not found in template literal");
  _json.type = "string";
  _json.pattern = pattern.source;
}, fileProcessor = (schema, _ctx, json, _params) => {
  const _json = json;
  const file = {
    type: "string",
    format: "binary",
    contentEncoding: "binary"
  };
  const { minimum, maximum, mime } = schema._zod.bag;
  if (minimum !== undefined)
    file.minLength = minimum;
  if (maximum !== undefined)
    file.maxLength = maximum;
  if (mime) {
    if (mime.length === 1) {
      file.contentMediaType = mime[0];
      Object.assign(_json, file);
    } else {
      Object.assign(_json, file);
      _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
    }
  } else {
    Object.assign(_json, file);
  }
}, successProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
}, customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
}, functionProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Function types cannot be represented in JSON Schema");
  }
}, transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
}, mapProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Map cannot be represented in JSON Schema");
  }
}, setProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Set cannot be represented in JSON Schema");
  }
}, arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process2(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
}, objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  json.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json.properties[key] = process2(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === undefined;
    } else {
      return v.optout === undefined;
    }
  }));
  if (requiredKeys.size > 0) {
    json.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = process2(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
}, unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
}, intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = process2(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process2(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
}, tupleProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "array";
  const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
  const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
  const prefixItems = def.items.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, prefixPath, i]
  }));
  const rest = def.rest ? process2(def.rest, ctx, {
    ...params,
    path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
  }) : null;
  if (ctx.target === "draft-2020-12") {
    json.prefixItems = prefixItems;
    if (rest) {
      json.items = rest;
    }
  } else if (ctx.target === "openapi-3.0") {
    json.items = {
      anyOf: prefixItems
    };
    if (rest) {
      json.items.anyOf.push(rest);
    }
    json.minItems = prefixItems.length;
    if (!rest) {
      json.maxItems = prefixItems.length;
    }
  } else {
    json.items = prefixItems;
    if (rest) {
      json.additionalItems = rest;
    }
  }
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
}, recordProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag?.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process2(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json.patternProperties = {};
    for (const pattern of patterns) {
      json.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json.propertyNames = process2(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json.additionalProperties = process2(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json.required = validKeyValues;
    }
  }
}, nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
}, nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = JSON.parse(JSON.stringify(def.defaultValue));
}, prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
}, catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(undefined);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
}, pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
}, readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
}, promiseProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, lazyProcessor = (schema, ctx, _json, params) => {
  const innerType = schema._zod.innerType;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
}, allProcessors;
var init_json_schema_processors = __esm(() => {
  init_to_json_schema();
  init_util();
  formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: ""
  };
  allProcessors = {
    string: stringProcessor,
    number: numberProcessor,
    boolean: booleanProcessor,
    bigint: bigintProcessor,
    symbol: symbolProcessor,
    null: nullProcessor,
    undefined: undefinedProcessor,
    void: voidProcessor,
    never: neverProcessor,
    any: anyProcessor,
    unknown: unknownProcessor,
    date: dateProcessor,
    enum: enumProcessor,
    literal: literalProcessor,
    nan: nanProcessor,
    template_literal: templateLiteralProcessor,
    file: fileProcessor,
    success: successProcessor,
    custom: customProcessor,
    function: functionProcessor,
    transform: transformProcessor,
    map: mapProcessor,
    set: setProcessor,
    array: arrayProcessor,
    object: objectProcessor,
    union: unionProcessor,
    intersection: intersectionProcessor,
    tuple: tupleProcessor,
    record: recordProcessor,
    nullable: nullableProcessor,
    nonoptional: nonoptionalProcessor,
    default: defaultProcessor,
    prefault: prefaultProcessor,
    catch: catchProcessor,
    pipe: pipeProcessor,
    readonly: readonlyProcessor,
    promise: promiseProcessor,
    optional: optionalProcessor,
    lazy: lazyProcessor
  };
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema-generator.js
class JSONSchemaGenerator {
  get metadataRegistry() {
    return this.ctx.metadataRegistry;
  }
  get target() {
    return this.ctx.target;
  }
  get unrepresentable() {
    return this.ctx.unrepresentable;
  }
  get override() {
    return this.ctx.override;
  }
  get io() {
    return this.ctx.io;
  }
  get counter() {
    return this.ctx.counter;
  }
  set counter(value) {
    this.ctx.counter = value;
  }
  get seen() {
    return this.ctx.seen;
  }
  constructor(params) {
    let normalizedTarget = params?.target ?? "draft-2020-12";
    if (normalizedTarget === "draft-4")
      normalizedTarget = "draft-04";
    if (normalizedTarget === "draft-7")
      normalizedTarget = "draft-07";
    this.ctx = initializeContext({
      processors: allProcessors,
      target: normalizedTarget,
      ...params?.metadata && { metadata: params.metadata },
      ...params?.unrepresentable && { unrepresentable: params.unrepresentable },
      ...params?.override && { override: params.override },
      ...params?.io && { io: params.io }
    });
  }
  process(schema, _params = { path: [], schemaPath: [] }) {
    return process2(schema, this.ctx, _params);
  }
  emit(schema, _params) {
    if (_params) {
      if (_params.cycles)
        this.ctx.cycles = _params.cycles;
      if (_params.reused)
        this.ctx.reused = _params.reused;
      if (_params.external)
        this.ctx.external = _params.external;
    }
    extractDefs(this.ctx, schema);
    const result = finalize(this.ctx, schema);
    const { "~standard": _, ...plainResult } = result;
    return plainResult;
  }
}
var init_json_schema_generator = __esm(() => {
  init_json_schema_processors();
  init_to_json_schema();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/json-schema.js
var exports_json_schema = {};
var init_json_schema = () => {};

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/core/index.js
var exports_core2 = {};
__export(exports_core2, {
  version: () => version,
  util: () => exports_util,
  treeifyError: () => treeifyError,
  toJSONSchema: () => toJSONSchema,
  toDotPath: () => toDotPath,
  safeParseAsync: () => safeParseAsync,
  safeParse: () => safeParse,
  safeEncodeAsync: () => safeEncodeAsync,
  safeEncode: () => safeEncode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeDecode: () => safeDecode,
  registry: () => registry,
  regexes: () => exports_regexes,
  process: () => process2,
  prettifyError: () => prettifyError,
  parseAsync: () => parseAsync,
  parse: () => parse,
  meta: () => meta,
  locales: () => exports_locales,
  isValidJWT: () => isValidJWT,
  isValidBase64URL: () => isValidBase64URL,
  isValidBase64: () => isValidBase64,
  initializeContext: () => initializeContext,
  globalRegistry: () => globalRegistry,
  globalConfig: () => globalConfig,
  formatError: () => formatError,
  flattenError: () => flattenError,
  finalize: () => finalize,
  extractDefs: () => extractDefs,
  encodeAsync: () => encodeAsync,
  encode: () => encode,
  describe: () => describe,
  decodeAsync: () => decodeAsync,
  decode: () => decode,
  createToJSONSchemaMethod: () => createToJSONSchemaMethod,
  createStandardJSONSchemaMethod: () => createStandardJSONSchemaMethod,
  config: () => config,
  clone: () => clone,
  _xor: () => _xor,
  _xid: () => _xid,
  _void: () => _void,
  _uuidv7: () => _uuidv7,
  _uuidv6: () => _uuidv6,
  _uuidv4: () => _uuidv4,
  _uuid: () => _uuid,
  _url: () => _url,
  _uppercase: () => _uppercase,
  _unknown: () => _unknown,
  _union: () => _union,
  _undefined: () => _undefined2,
  _ulid: () => _ulid,
  _uint64: () => _uint64,
  _uint32: () => _uint32,
  _tuple: () => _tuple,
  _trim: () => _trim,
  _transform: () => _transform,
  _toUpperCase: () => _toUpperCase,
  _toLowerCase: () => _toLowerCase,
  _templateLiteral: () => _templateLiteral,
  _symbol: () => _symbol,
  _superRefine: () => _superRefine,
  _success: () => _success,
  _stringbool: () => _stringbool,
  _stringFormat: () => _stringFormat,
  _string: () => _string,
  _startsWith: () => _startsWith,
  _slugify: () => _slugify,
  _size: () => _size,
  _set: () => _set,
  _safeParseAsync: () => _safeParseAsync,
  _safeParse: () => _safeParse,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeEncode: () => _safeEncode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeDecode: () => _safeDecode,
  _regex: () => _regex,
  _refine: () => _refine,
  _record: () => _record,
  _readonly: () => _readonly,
  _property: () => _property,
  _promise: () => _promise,
  _positive: () => _positive,
  _pipe: () => _pipe,
  _parseAsync: () => _parseAsync,
  _parse: () => _parse,
  _overwrite: () => _overwrite,
  _optional: () => _optional,
  _number: () => _number,
  _nullable: () => _nullable,
  _null: () => _null2,
  _normalize: () => _normalize,
  _nonpositive: () => _nonpositive,
  _nonoptional: () => _nonoptional,
  _nonnegative: () => _nonnegative,
  _never: () => _never,
  _negative: () => _negative,
  _nativeEnum: () => _nativeEnum,
  _nanoid: () => _nanoid,
  _nan: () => _nan,
  _multipleOf: () => _multipleOf,
  _minSize: () => _minSize,
  _minLength: () => _minLength,
  _min: () => _gte,
  _mime: () => _mime,
  _maxSize: () => _maxSize,
  _maxLength: () => _maxLength,
  _max: () => _lte,
  _map: () => _map,
  _mac: () => _mac,
  _lte: () => _lte,
  _lt: () => _lt,
  _lowercase: () => _lowercase,
  _literal: () => _literal,
  _length: () => _length,
  _lazy: () => _lazy,
  _ksuid: () => _ksuid,
  _jwt: () => _jwt,
  _isoTime: () => _isoTime,
  _isoDuration: () => _isoDuration,
  _isoDateTime: () => _isoDateTime,
  _isoDate: () => _isoDate,
  _ipv6: () => _ipv6,
  _ipv4: () => _ipv4,
  _intersection: () => _intersection,
  _int64: () => _int64,
  _int32: () => _int32,
  _int: () => _int,
  _includes: () => _includes,
  _guid: () => _guid,
  _gte: () => _gte,
  _gt: () => _gt,
  _float64: () => _float64,
  _float32: () => _float32,
  _file: () => _file,
  _enum: () => _enum,
  _endsWith: () => _endsWith,
  _encodeAsync: () => _encodeAsync,
  _encode: () => _encode,
  _emoji: () => _emoji2,
  _email: () => _email,
  _e164: () => _e164,
  _discriminatedUnion: () => _discriminatedUnion,
  _default: () => _default,
  _decodeAsync: () => _decodeAsync,
  _decode: () => _decode,
  _date: () => _date,
  _custom: () => _custom,
  _cuid2: () => _cuid2,
  _cuid: () => _cuid,
  _coercedString: () => _coercedString,
  _coercedNumber: () => _coercedNumber,
  _coercedDate: () => _coercedDate,
  _coercedBoolean: () => _coercedBoolean,
  _coercedBigint: () => _coercedBigint,
  _cidrv6: () => _cidrv6,
  _cidrv4: () => _cidrv4,
  _check: () => _check,
  _catch: () => _catch,
  _boolean: () => _boolean,
  _bigint: () => _bigint,
  _base64url: () => _base64url,
  _base64: () => _base64,
  _array: () => _array,
  _any: () => _any,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  JSONSchema: () => exports_json_schema,
  Doc: () => Doc,
  $output: () => $output,
  $input: () => $input,
  $constructor: () => $constructor,
  $brand: () => $brand,
  $ZodXor: () => $ZodXor,
  $ZodXID: () => $ZodXID,
  $ZodVoid: () => $ZodVoid,
  $ZodUnknown: () => $ZodUnknown,
  $ZodUnion: () => $ZodUnion,
  $ZodUndefined: () => $ZodUndefined,
  $ZodUUID: () => $ZodUUID,
  $ZodURL: () => $ZodURL,
  $ZodULID: () => $ZodULID,
  $ZodType: () => $ZodType,
  $ZodTuple: () => $ZodTuple,
  $ZodTransform: () => $ZodTransform,
  $ZodTemplateLiteral: () => $ZodTemplateLiteral,
  $ZodSymbol: () => $ZodSymbol,
  $ZodSuccess: () => $ZodSuccess,
  $ZodStringFormat: () => $ZodStringFormat,
  $ZodString: () => $ZodString,
  $ZodSet: () => $ZodSet,
  $ZodRegistry: () => $ZodRegistry,
  $ZodRecord: () => $ZodRecord,
  $ZodRealError: () => $ZodRealError,
  $ZodReadonly: () => $ZodReadonly,
  $ZodPromise: () => $ZodPromise,
  $ZodPreprocess: () => $ZodPreprocess,
  $ZodPrefault: () => $ZodPrefault,
  $ZodPipe: () => $ZodPipe,
  $ZodOptional: () => $ZodOptional,
  $ZodObjectJIT: () => $ZodObjectJIT,
  $ZodObject: () => $ZodObject,
  $ZodNumberFormat: () => $ZodNumberFormat,
  $ZodNumber: () => $ZodNumber,
  $ZodNullable: () => $ZodNullable,
  $ZodNull: () => $ZodNull,
  $ZodNonOptional: () => $ZodNonOptional,
  $ZodNever: () => $ZodNever,
  $ZodNanoID: () => $ZodNanoID,
  $ZodNaN: () => $ZodNaN,
  $ZodMap: () => $ZodMap,
  $ZodMAC: () => $ZodMAC,
  $ZodLiteral: () => $ZodLiteral,
  $ZodLazy: () => $ZodLazy,
  $ZodKSUID: () => $ZodKSUID,
  $ZodJWT: () => $ZodJWT,
  $ZodIntersection: () => $ZodIntersection,
  $ZodISOTime: () => $ZodISOTime,
  $ZodISODuration: () => $ZodISODuration,
  $ZodISODateTime: () => $ZodISODateTime,
  $ZodISODate: () => $ZodISODate,
  $ZodIPv6: () => $ZodIPv6,
  $ZodIPv4: () => $ZodIPv4,
  $ZodGUID: () => $ZodGUID,
  $ZodFunction: () => $ZodFunction,
  $ZodFile: () => $ZodFile,
  $ZodExactOptional: () => $ZodExactOptional,
  $ZodError: () => $ZodError,
  $ZodEnum: () => $ZodEnum,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEmoji: () => $ZodEmoji,
  $ZodEmail: () => $ZodEmail,
  $ZodE164: () => $ZodE164,
  $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
  $ZodDefault: () => $ZodDefault,
  $ZodDate: () => $ZodDate,
  $ZodCustomStringFormat: () => $ZodCustomStringFormat,
  $ZodCustom: () => $ZodCustom,
  $ZodCodec: () => $ZodCodec,
  $ZodCheckUpperCase: () => $ZodCheckUpperCase,
  $ZodCheckStringFormat: () => $ZodCheckStringFormat,
  $ZodCheckStartsWith: () => $ZodCheckStartsWith,
  $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
  $ZodCheckRegex: () => $ZodCheckRegex,
  $ZodCheckProperty: () => $ZodCheckProperty,
  $ZodCheckOverwrite: () => $ZodCheckOverwrite,
  $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
  $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
  $ZodCheckMinSize: () => $ZodCheckMinSize,
  $ZodCheckMinLength: () => $ZodCheckMinLength,
  $ZodCheckMimeType: () => $ZodCheckMimeType,
  $ZodCheckMaxSize: () => $ZodCheckMaxSize,
  $ZodCheckMaxLength: () => $ZodCheckMaxLength,
  $ZodCheckLowerCase: () => $ZodCheckLowerCase,
  $ZodCheckLessThan: () => $ZodCheckLessThan,
  $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
  $ZodCheckIncludes: () => $ZodCheckIncludes,
  $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
  $ZodCheckEndsWith: () => $ZodCheckEndsWith,
  $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
  $ZodCheck: () => $ZodCheck,
  $ZodCatch: () => $ZodCatch,
  $ZodCUID2: () => $ZodCUID2,
  $ZodCUID: () => $ZodCUID,
  $ZodCIDRv6: () => $ZodCIDRv6,
  $ZodCIDRv4: () => $ZodCIDRv4,
  $ZodBoolean: () => $ZodBoolean,
  $ZodBigIntFormat: () => $ZodBigIntFormat,
  $ZodBigInt: () => $ZodBigInt,
  $ZodBase64URL: () => $ZodBase64URL,
  $ZodBase64: () => $ZodBase64,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodArray: () => $ZodArray,
  $ZodAny: () => $ZodAny
});
var init_core2 = __esm(() => {
  init_util();
  init_regexes();
  init_locales();
  init_json_schema_processors();
  init_json_schema_generator();
  init_json_schema();
  init_core();
  init_parse();
  init_errors();
  init_schemas();
  init_checks();
  init_versions();
  init_registries();
  init_api();
  init_to_json_schema();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/checks.js
var exports_checks2 = {};
__export(exports_checks2, {
  uppercase: () => _uppercase,
  trim: () => _trim,
  toUpperCase: () => _toUpperCase,
  toLowerCase: () => _toLowerCase,
  startsWith: () => _startsWith,
  slugify: () => _slugify,
  size: () => _size,
  regex: () => _regex,
  property: () => _property,
  positive: () => _positive,
  overwrite: () => _overwrite,
  normalize: () => _normalize,
  nonpositive: () => _nonpositive,
  nonnegative: () => _nonnegative,
  negative: () => _negative,
  multipleOf: () => _multipleOf,
  minSize: () => _minSize,
  minLength: () => _minLength,
  mime: () => _mime,
  maxSize: () => _maxSize,
  maxLength: () => _maxLength,
  lte: () => _lte,
  lt: () => _lt,
  lowercase: () => _lowercase,
  length: () => _length,
  includes: () => _includes,
  gte: () => _gte,
  gt: () => _gt,
  endsWith: () => _endsWith
});
var init_checks2 = __esm(() => {
  init_core2();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/iso.js
var exports_iso = {};
__export(exports_iso, {
  time: () => time2,
  duration: () => duration2,
  datetime: () => datetime2,
  date: () => date2,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
function date2(params) {
  return _isoDate(ZodISODate, params);
}
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}
var ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration;
var init_iso = __esm(() => {
  init_core2();
  init_schemas2();
  ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
}, ZodError, ZodRealError;
var init_errors2 = __esm(() => {
  init_core2();
  init_core2();
  init_util();
  ZodError = /* @__PURE__ */ $constructor("ZodError", initializer2);
  ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, {
    Parent: Error
  });
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/parse.js
var parse3, parseAsync2, safeParse2, safeParseAsync2, encode2, decode2, encodeAsync2, decodeAsync2, safeEncode2, safeDecode2, safeEncodeAsync2, safeDecodeAsync2;
var init_parse2 = __esm(() => {
  init_core2();
  init_errors2();
  parse3 = /* @__PURE__ */ _parse(ZodRealError);
  parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
  safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
  safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  encode2 = /* @__PURE__ */ _encode(ZodRealError);
  decode2 = /* @__PURE__ */ _decode(ZodRealError);
  encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
  decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
  safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
  safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
  safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
var exports_schemas2 = {};
__export(exports_schemas2, {
  xor: () => xor,
  xid: () => xid2,
  void: () => _void2,
  uuidv7: () => uuidv7,
  uuidv6: () => uuidv6,
  uuidv4: () => uuidv4,
  uuid: () => uuid2,
  url: () => url,
  unknown: () => unknown,
  union: () => union,
  undefined: () => _undefined3,
  ulid: () => ulid2,
  uint64: () => uint64,
  uint32: () => uint32,
  tuple: () => tuple,
  transform: () => transform,
  templateLiteral: () => templateLiteral,
  symbol: () => symbol,
  superRefine: () => superRefine,
  success: () => success,
  stringbool: () => stringbool,
  stringFormat: () => stringFormat,
  string: () => string2,
  strictObject: () => strictObject,
  set: () => set,
  refine: () => refine,
  record: () => record,
  readonly: () => readonly,
  promise: () => promise,
  preprocess: () => preprocess,
  prefault: () => prefault,
  pipe: () => pipe,
  partialRecord: () => partialRecord,
  optional: () => optional,
  object: () => object,
  number: () => number2,
  nullish: () => nullish2,
  nullable: () => nullable,
  null: () => _null3,
  nonoptional: () => nonoptional,
  never: () => never,
  nativeEnum: () => nativeEnum,
  nanoid: () => nanoid2,
  nan: () => nan,
  meta: () => meta2,
  map: () => map,
  mac: () => mac2,
  looseRecord: () => looseRecord,
  looseObject: () => looseObject,
  literal: () => literal,
  lazy: () => lazy,
  ksuid: () => ksuid2,
  keyof: () => keyof,
  jwt: () => jwt,
  json: () => json,
  ipv6: () => ipv62,
  ipv4: () => ipv42,
  invertCodec: () => invertCodec,
  intersection: () => intersection,
  int64: () => int64,
  int32: () => int32,
  int: () => int,
  instanceof: () => _instanceof,
  httpUrl: () => httpUrl,
  hostname: () => hostname2,
  hex: () => hex2,
  hash: () => hash,
  guid: () => guid2,
  function: () => _function,
  float64: () => float64,
  float32: () => float32,
  file: () => file,
  exactOptional: () => exactOptional,
  enum: () => _enum2,
  emoji: () => emoji2,
  email: () => email2,
  e164: () => e1642,
  discriminatedUnion: () => discriminatedUnion,
  describe: () => describe2,
  date: () => date3,
  custom: () => custom,
  cuid2: () => cuid22,
  cuid: () => cuid3,
  codec: () => codec,
  cidrv6: () => cidrv62,
  cidrv4: () => cidrv42,
  check: () => check,
  catch: () => _catch2,
  boolean: () => boolean2,
  bigint: () => bigint2,
  base64url: () => base64url2,
  base64: () => base642,
  array: () => array,
  any: () => any,
  _function: () => _function,
  _default: () => _default2,
  _ZodString: () => _ZodString,
  ZodXor: () => ZodXor,
  ZodXID: () => ZodXID,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodUUID: () => ZodUUID,
  ZodURL: () => ZodURL,
  ZodULID: () => ZodULID,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransform: () => ZodTransform,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodSymbol: () => ZodSymbol,
  ZodSuccess: () => ZodSuccess,
  ZodStringFormat: () => ZodStringFormat,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPreprocess: () => ZodPreprocess,
  ZodPrefault: () => ZodPrefault,
  ZodPipe: () => ZodPipe,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNonOptional: () => ZodNonOptional,
  ZodNever: () => ZodNever,
  ZodNanoID: () => ZodNanoID,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodMAC: () => ZodMAC,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodKSUID: () => ZodKSUID,
  ZodJWT: () => ZodJWT,
  ZodIntersection: () => ZodIntersection,
  ZodIPv6: () => ZodIPv6,
  ZodIPv4: () => ZodIPv4,
  ZodGUID: () => ZodGUID,
  ZodFunction: () => ZodFunction,
  ZodFile: () => ZodFile,
  ZodExactOptional: () => ZodExactOptional,
  ZodEnum: () => ZodEnum,
  ZodEmoji: () => ZodEmoji,
  ZodEmail: () => ZodEmail,
  ZodE164: () => ZodE164,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodCustom: () => ZodCustom,
  ZodCodec: () => ZodCodec,
  ZodCatch: () => ZodCatch,
  ZodCUID2: () => ZodCUID2,
  ZodCUID: () => ZodCUID,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodBoolean: () => ZodBoolean,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBigInt: () => ZodBigInt,
  ZodBase64URL: () => ZodBase64URL,
  ZodBase64: () => ZodBase64,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny
});
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = new Set;
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
function string2(params) {
  return _string(ZodString, params);
}
function email2(params) {
  return _email(ZodEmail, params);
}
function guid2(params) {
  return _guid(ZodGUID, params);
}
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: exports_regexes.httpProtocol,
    hostname: exports_regexes.domain,
    ...exports_util.normalizeParams(params)
  });
}
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
function ulid2(params) {
  return _ulid(ZodULID, params);
}
function xid2(params) {
  return _xid(ZodXID, params);
}
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
function mac2(params) {
  return _mac(ZodMAC, params);
}
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
function base642(params) {
  return _base64(ZodBase64, params);
}
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
function e1642(params) {
  return _e164(ZodE164, params);
}
function jwt(params) {
  return _jwt(ZodJWT, params);
}
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", exports_regexes.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", exports_regexes.hex, _params);
}
function hash(alg, params) {
  const enc = params?.enc ?? "hex";
  const format = `${alg}_${enc}`;
  const regex = exports_regexes[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
function number2(params) {
  return _number(ZodNumber, params);
}
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
function _null3(params) {
  return _null2(ZodNull, params);
}
function any() {
  return _any(ZodAny);
}
function unknown() {
  return _unknown(ZodUnknown);
}
function never(params) {
  return _never(ZodNever, params);
}
function _void2(params) {
  return _void(ZodVoid, params);
}
function date3(params) {
  return _date(ZodDate, params);
}
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum2(Object.keys(shape));
}
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...exports_util.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: never(),
    ...exports_util.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...exports_util.normalizeParams(params)
  });
}
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...exports_util.normalizeParams(params)
  });
}
function xor(options, params) {
  return new ZodXor({
    type: "union",
    options,
    inclusive: false,
    ...exports_util.normalizeParams(params)
  });
}
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...exports_util.normalizeParams(params)
  });
}
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...exports_util.normalizeParams(params)
  });
}
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string2(),
      valueType: keyType,
      ...exports_util.normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = undefined;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function looseRecord(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    mode: "loose",
    ...exports_util.normalizeParams(params)
  });
}
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function _enum2(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...exports_util.normalizeParams(params)
  });
}
function file(params) {
  return _file(ZodFile, params);
}
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
function _default2(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...exports_util.normalizeParams(params)
  });
}
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
function _catch2(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function nan(params) {
  return _nan(ZodNaN, params);
}
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
function invertCodec(codec2) {
  const def = codec2._zod.def;
  return new ZodCodec({
    type: "pipe",
    in: def.out,
    out: def.in,
    transform: def.reverseTransform,
    reverseTransform: def.transform
  });
}
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...exports_util.normalizeParams(params)
  });
}
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
function _function(params) {
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
    output: params?.output ?? unknown()
  });
}
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}
function _instanceof(cls, params = {}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...exports_util.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  inst._zod.check = (payload) => {
    if (!(payload.value instanceof cls)) {
      payload.issues.push({
        code: "invalid_type",
        expected: cls.name,
        input: payload.value,
        inst,
        path: [...inst._zod.def.path ?? []]
      });
    }
  };
  return inst;
}
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return new ZodPreprocess({
    type: "pipe",
    in: transform(fn),
    out: schema
  });
}
var _installedGroups, ZodType, _ZodString, ZodString, ZodStringFormat, ZodEmail, ZodGUID, ZodUUID, ZodURL, ZodEmoji, ZodNanoID, ZodCUID, ZodCUID2, ZodULID, ZodXID, ZodKSUID, ZodIPv4, ZodMAC, ZodIPv6, ZodCIDRv4, ZodCIDRv6, ZodBase64, ZodBase64URL, ZodE164, ZodJWT, ZodCustomStringFormat, ZodNumber, ZodNumberFormat, ZodBoolean, ZodBigInt, ZodBigIntFormat, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodDate, ZodArray, ZodObject, ZodUnion, ZodXor, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodEnum, ZodLiteral, ZodFile, ZodTransform, ZodOptional, ZodExactOptional, ZodNullable, ZodDefault, ZodPrefault, ZodNonOptional, ZodSuccess, ZodCatch, ZodNaN, ZodPipe, ZodCodec, ZodPreprocess, ZodReadonly, ZodTemplateLiteral, ZodLazy, ZodPromise, ZodFunction, ZodCustom, describe2, meta2, stringbool = (...args) => _stringbool({
  Codec: ZodCodec,
  Boolean: ZodBoolean,
  String: ZodString
}, ...args);
var init_schemas2 = __esm(() => {
  init_core2();
  init_core2();
  init_json_schema_processors();
  init_to_json_schema();
  init_checks2();
  init_iso();
  init_parse2();
  _installedGroups = /* @__PURE__ */ new WeakMap;
  ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    Object.assign(inst["~standard"], {
      jsonSchema: {
        input: createStandardJSONSchemaMethod(inst, "input"),
        output: createStandardJSONSchemaMethod(inst, "output")
      }
    });
    inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse2(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode2(inst, data, params);
    inst.decode = (data, params) => decode2(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
    _installLazyMethods(inst, "ZodType", {
      check(...chks) {
        const def2 = this.def;
        return this.clone(exports_util.mergeDefs(def2, {
          checks: [
            ...def2.checks ?? [],
            ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }), { parent: true });
      },
      with(...chks) {
        return this.check(...chks);
      },
      clone(def2, params) {
        return clone(this, def2, params);
      },
      brand() {
        return this;
      },
      register(reg, meta2) {
        reg.add(this, meta2);
        return this;
      },
      refine(check, params) {
        return this.check(refine(check, params));
      },
      superRefine(refinement, params) {
        return this.check(superRefine(refinement, params));
      },
      overwrite(fn) {
        return this.check(_overwrite(fn));
      },
      optional() {
        return optional(this);
      },
      exactOptional() {
        return exactOptional(this);
      },
      nullable() {
        return nullable(this);
      },
      nullish() {
        return optional(nullable(this));
      },
      nonoptional(params) {
        return nonoptional(this, params);
      },
      array() {
        return array(this);
      },
      or(arg) {
        return union([this, arg]);
      },
      and(arg) {
        return intersection(this, arg);
      },
      transform(tx) {
        return pipe(this, transform(tx));
      },
      default(d) {
        return _default2(this, d);
      },
      prefault(d) {
        return prefault(this, d);
      },
      catch(params) {
        return _catch2(this, params);
      },
      pipe(target) {
        return pipe(this, target);
      },
      readonly() {
        return readonly(this);
      },
      describe(description) {
        const cl = this.clone();
        globalRegistry.add(cl, { description });
        return cl;
      },
      meta(...args) {
        if (args.length === 0)
          return globalRegistry.get(this);
        const cl = this.clone();
        globalRegistry.add(cl, args[0]);
        return cl;
      },
      isOptional() {
        return this.safeParse(undefined).success;
      },
      isNullable() {
        return this.safeParse(null).success;
      },
      apply(fn) {
        return fn(this);
      }
    });
    Object.defineProperty(inst, "description", {
      get() {
        return globalRegistry.get(inst)?.description;
      },
      configurable: true
    });
    return inst;
  });
  _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    _installLazyMethods(inst, "_ZodString", {
      regex(...args) {
        return this.check(_regex(...args));
      },
      includes(...args) {
        return this.check(_includes(...args));
      },
      startsWith(...args) {
        return this.check(_startsWith(...args));
      },
      endsWith(...args) {
        return this.check(_endsWith(...args));
      },
      min(...args) {
        return this.check(_minLength(...args));
      },
      max(...args) {
        return this.check(_maxLength(...args));
      },
      length(...args) {
        return this.check(_length(...args));
      },
      nonempty(...args) {
        return this.check(_minLength(1, ...args));
      },
      lowercase(params) {
        return this.check(_lowercase(params));
      },
      uppercase(params) {
        return this.check(_uppercase(params));
      },
      trim() {
        return this.check(_trim());
      },
      normalize(...args) {
        return this.check(_normalize(...args));
      },
      toLowerCase() {
        return this.check(_toLowerCase());
      },
      toUpperCase() {
        return this.check(_toUpperCase());
      },
      slugify() {
        return this.check(_slugify());
      }
    });
  });
  ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime2(params));
    inst.date = (params) => inst.check(date2(params));
    inst.time = (params) => inst.check(time2(params));
    inst.duration = (params) => inst.check(duration2(params));
  });
  ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodMAC = /* @__PURE__ */ $constructor("ZodMAC", (inst, def) => {
    $ZodMAC.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
    $ZodCustomStringFormat.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
    _installLazyMethods(inst, "ZodNumber", {
      gt(value, params) {
        return this.check(_gt(value, params));
      },
      gte(value, params) {
        return this.check(_gte(value, params));
      },
      min(value, params) {
        return this.check(_gte(value, params));
      },
      lt(value, params) {
        return this.check(_lt(value, params));
      },
      lte(value, params) {
        return this.check(_lte(value, params));
      },
      max(value, params) {
        return this.check(_lte(value, params));
      },
      int(params) {
        return this.check(int(params));
      },
      safe(params) {
        return this.check(int(params));
      },
      positive(params) {
        return this.check(_gt(0, params));
      },
      nonnegative(params) {
        return this.check(_gte(0, params));
      },
      negative(params) {
        return this.check(_lt(0, params));
      },
      nonpositive(params) {
        return this.check(_lte(0, params));
      },
      multipleOf(value, params) {
        return this.check(_multipleOf(value, params));
      },
      step(value, params) {
        return this.check(_multipleOf(value, params));
      },
      finite() {
        return this;
      }
    });
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
  });
  ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
    $ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => bigintProcessor(inst, ctx, json, params);
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.positive = (params) => inst.check(_gt(BigInt(0), params));
    inst.negative = (params) => inst.check(_lt(BigInt(0), params));
    inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
    inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    const bag = inst._zod.bag;
    inst.minValue = bag.minimum ?? null;
    inst.maxValue = bag.maximum ?? null;
    inst.format = bag.format ?? null;
  });
  ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
    $ZodBigIntFormat.init(inst, def);
    ZodBigInt.init(inst, def);
  });
  ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
    $ZodSymbol.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => symbolProcessor(inst, ctx, json, params);
  });
  ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
    $ZodUndefined.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
  });
  ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
  });
  ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => anyProcessor(inst, ctx, json, params);
  });
  ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
  });
  ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
  });
  ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
    $ZodVoid.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => voidProcessor(inst, ctx, json, params);
  });
  ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
    $ZodDate.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => dateProcessor(inst, ctx, json, params);
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    const c = inst._zod.bag;
    inst.minDate = c.minimum ? new Date(c.minimum) : null;
    inst.maxDate = c.maximum ? new Date(c.maximum) : null;
  });
  ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
    _installLazyMethods(inst, "ZodArray", {
      min(n, params) {
        return this.check(_minLength(n, params));
      },
      nonempty(params) {
        return this.check(_minLength(1, params));
      },
      max(n, params) {
        return this.check(_maxLength(n, params));
      },
      length(n, params) {
        return this.check(_length(n, params));
      },
      unwrap() {
        return this.element;
      }
    });
  });
  ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    exports_util.defineLazy(inst, "shape", () => {
      return def.shape;
    });
    _installLazyMethods(inst, "ZodObject", {
      keyof() {
        return _enum2(Object.keys(this._zod.def.shape));
      },
      catchall(catchall) {
        return this.clone({ ...this._zod.def, catchall });
      },
      passthrough() {
        return this.clone({ ...this._zod.def, catchall: unknown() });
      },
      loose() {
        return this.clone({ ...this._zod.def, catchall: unknown() });
      },
      strict() {
        return this.clone({ ...this._zod.def, catchall: never() });
      },
      strip() {
        return this.clone({ ...this._zod.def, catchall: undefined });
      },
      extend(incoming) {
        return exports_util.extend(this, incoming);
      },
      safeExtend(incoming) {
        return exports_util.safeExtend(this, incoming);
      },
      merge(other) {
        return exports_util.merge(this, other);
      },
      pick(mask) {
        return exports_util.pick(this, mask);
      },
      omit(mask) {
        return exports_util.omit(this, mask);
      },
      partial(...args) {
        return exports_util.partial(ZodOptional, this, args[0]);
      },
      required(...args) {
        return exports_util.required(ZodNonOptional, this, args[0]);
      }
    });
  });
  ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  ZodXor = /* @__PURE__ */ $constructor("ZodXor", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodXor.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
  });
  ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
  });
  ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => tupleProcessor(inst, ctx, json, params);
    inst.rest = (rest) => inst.clone({
      ...inst._zod.def,
      rest
    });
  });
  ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
    $ZodMap.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => mapProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
  });
  ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
    $ZodSet.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => setProcessor(inst, ctx, json, params);
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
  });
  ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...exports_util.normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...exports_util.normalizeParams(params),
        entries: newEntries
      });
    };
  });
  ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
    $ZodFile.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => fileProcessor(inst, ctx, json, params);
    inst.min = (size, params) => inst.check(_minSize(size, params));
    inst.max = (size, params) => inst.check(_maxSize(size, params));
    inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
  });
  ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(exports_util.issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(exports_util.issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          payload.fallback = true;
          return payload;
        });
      }
      payload.value = output;
      payload.fallback = true;
      return payload;
    };
  });
  ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
    $ZodSuccess.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => successProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
    $ZodNaN.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nanProcessor(inst, ctx, json, params);
  });
  ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodCodec.init(inst, def);
  });
  ZodPreprocess = /* @__PURE__ */ $constructor("ZodPreprocess", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodPreprocess.init(inst, def);
  });
  ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
    $ZodTemplateLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => templateLiteralProcessor(inst, ctx, json, params);
  });
  ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
    $ZodLazy.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.getter();
  });
  ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
    $ZodPromise.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => promiseProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
    $ZodFunction.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => functionProcessor(inst, ctx, json, params);
  });
  ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
  });
  describe2 = describe;
  meta2 = meta;
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/compat.js
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodIssueCode, ZodFirstPartyTypeKind;
var init_compat = __esm(() => {
  init_core2();
  ZodIssueCode = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom"
  };
  (function(ZodFirstPartyTypeKind2) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js
function detectVersion(schema, defaultTarget) {
  const $schema = schema.$schema;
  if ($schema === "https://json-schema.org/draft/2020-12/schema") {
    return "draft-2020-12";
  }
  if ($schema === "http://json-schema.org/draft-07/schema#") {
    return "draft-7";
  }
  if ($schema === "http://json-schema.org/draft-04/schema#") {
    return "draft-4";
  }
  return defaultTarget ?? "draft-2020-12";
}
function resolveRef(ref, ctx) {
  if (!ref.startsWith("#")) {
    throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
  }
  const path = ref.slice(1).split("/").filter(Boolean);
  if (path.length === 0) {
    return ctx.rootSchema;
  }
  const defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
  if (path[0] === defsKey) {
    const key = path[1];
    if (!key || !ctx.defs[key]) {
      throw new Error(`Reference not found: ${ref}`);
    }
    return ctx.defs[key];
  }
  throw new Error(`Reference not found: ${ref}`);
}
function convertBaseSchema(schema, ctx) {
  if (schema.not !== undefined) {
    if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) {
      return z.never();
    }
    throw new Error("not is not supported in Zod (except { not: {} } for never)");
  }
  if (schema.unevaluatedItems !== undefined) {
    throw new Error("unevaluatedItems is not supported");
  }
  if (schema.unevaluatedProperties !== undefined) {
    throw new Error("unevaluatedProperties is not supported");
  }
  if (schema.if !== undefined || schema.then !== undefined || schema.else !== undefined) {
    throw new Error("Conditional schemas (if/then/else) are not supported");
  }
  if (schema.dependentSchemas !== undefined || schema.dependentRequired !== undefined) {
    throw new Error("dependentSchemas and dependentRequired are not supported");
  }
  if (schema.$ref) {
    const refPath = schema.$ref;
    if (ctx.refs.has(refPath)) {
      return ctx.refs.get(refPath);
    }
    if (ctx.processing.has(refPath)) {
      return z.lazy(() => {
        if (!ctx.refs.has(refPath)) {
          throw new Error(`Circular reference not resolved: ${refPath}`);
        }
        return ctx.refs.get(refPath);
      });
    }
    ctx.processing.add(refPath);
    const resolved = resolveRef(refPath, ctx);
    const zodSchema2 = convertSchema(resolved, ctx);
    ctx.refs.set(refPath, zodSchema2);
    ctx.processing.delete(refPath);
    return zodSchema2;
  }
  if (schema.enum !== undefined) {
    const enumValues = schema.enum;
    if (ctx.version === "openapi-3.0" && schema.nullable === true && enumValues.length === 1 && enumValues[0] === null) {
      return z.null();
    }
    if (enumValues.length === 0) {
      return z.never();
    }
    if (enumValues.length === 1) {
      return z.literal(enumValues[0]);
    }
    if (enumValues.every((v) => typeof v === "string")) {
      return z.enum(enumValues);
    }
    const literalSchemas = enumValues.map((v) => z.literal(v));
    if (literalSchemas.length < 2) {
      return literalSchemas[0];
    }
    return z.union([literalSchemas[0], literalSchemas[1], ...literalSchemas.slice(2)]);
  }
  if (schema.const !== undefined) {
    return z.literal(schema.const);
  }
  const type = schema.type;
  if (Array.isArray(type)) {
    const typeSchemas = type.map((t) => {
      const typeSchema = { ...schema, type: t };
      return convertBaseSchema(typeSchema, ctx);
    });
    if (typeSchemas.length === 0) {
      return z.never();
    }
    if (typeSchemas.length === 1) {
      return typeSchemas[0];
    }
    return z.union(typeSchemas);
  }
  if (!type) {
    return z.any();
  }
  let zodSchema;
  switch (type) {
    case "string": {
      let stringSchema = z.string();
      if (schema.format) {
        const format = schema.format;
        if (format === "email") {
          stringSchema = stringSchema.check(z.email());
        } else if (format === "uri" || format === "uri-reference") {
          stringSchema = stringSchema.check(z.url());
        } else if (format === "uuid" || format === "guid") {
          stringSchema = stringSchema.check(z.uuid());
        } else if (format === "date-time") {
          stringSchema = stringSchema.check(z.iso.datetime());
        } else if (format === "date") {
          stringSchema = stringSchema.check(z.iso.date());
        } else if (format === "time") {
          stringSchema = stringSchema.check(z.iso.time());
        } else if (format === "duration") {
          stringSchema = stringSchema.check(z.iso.duration());
        } else if (format === "ipv4") {
          stringSchema = stringSchema.check(z.ipv4());
        } else if (format === "ipv6") {
          stringSchema = stringSchema.check(z.ipv6());
        } else if (format === "mac") {
          stringSchema = stringSchema.check(z.mac());
        } else if (format === "cidr") {
          stringSchema = stringSchema.check(z.cidrv4());
        } else if (format === "cidr-v6") {
          stringSchema = stringSchema.check(z.cidrv6());
        } else if (format === "base64") {
          stringSchema = stringSchema.check(z.base64());
        } else if (format === "base64url") {
          stringSchema = stringSchema.check(z.base64url());
        } else if (format === "e164") {
          stringSchema = stringSchema.check(z.e164());
        } else if (format === "jwt") {
          stringSchema = stringSchema.check(z.jwt());
        } else if (format === "emoji") {
          stringSchema = stringSchema.check(z.emoji());
        } else if (format === "nanoid") {
          stringSchema = stringSchema.check(z.nanoid());
        } else if (format === "cuid") {
          stringSchema = stringSchema.check(z.cuid());
        } else if (format === "cuid2") {
          stringSchema = stringSchema.check(z.cuid2());
        } else if (format === "ulid") {
          stringSchema = stringSchema.check(z.ulid());
        } else if (format === "xid") {
          stringSchema = stringSchema.check(z.xid());
        } else if (format === "ksuid") {
          stringSchema = stringSchema.check(z.ksuid());
        }
      }
      if (typeof schema.minLength === "number") {
        stringSchema = stringSchema.min(schema.minLength);
      }
      if (typeof schema.maxLength === "number") {
        stringSchema = stringSchema.max(schema.maxLength);
      }
      if (schema.pattern) {
        stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      }
      zodSchema = stringSchema;
      break;
    }
    case "number":
    case "integer": {
      let numberSchema = type === "integer" ? z.number().int() : z.number();
      if (typeof schema.minimum === "number") {
        numberSchema = numberSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === "number") {
        numberSchema = numberSchema.max(schema.maximum);
      }
      if (typeof schema.exclusiveMinimum === "number") {
        numberSchema = numberSchema.gt(schema.exclusiveMinimum);
      } else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") {
        numberSchema = numberSchema.gt(schema.minimum);
      }
      if (typeof schema.exclusiveMaximum === "number") {
        numberSchema = numberSchema.lt(schema.exclusiveMaximum);
      } else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") {
        numberSchema = numberSchema.lt(schema.maximum);
      }
      if (typeof schema.multipleOf === "number") {
        numberSchema = numberSchema.multipleOf(schema.multipleOf);
      }
      zodSchema = numberSchema;
      break;
    }
    case "boolean": {
      zodSchema = z.boolean();
      break;
    }
    case "null": {
      zodSchema = z.null();
      break;
    }
    case "object": {
      const shape = {};
      const properties = schema.properties || {};
      const requiredSet = new Set(schema.required || []);
      for (const [key, propSchema] of Object.entries(properties)) {
        const propZodSchema = convertSchema(propSchema, ctx);
        shape[key] = requiredSet.has(key) ? propZodSchema : propZodSchema.optional();
      }
      if (schema.propertyNames) {
        const keySchema = convertSchema(schema.propertyNames, ctx);
        const valueSchema = schema.additionalProperties && typeof schema.additionalProperties === "object" ? convertSchema(schema.additionalProperties, ctx) : z.any();
        if (Object.keys(shape).length === 0) {
          zodSchema = z.record(keySchema, valueSchema);
          break;
        }
        const objectSchema2 = z.object(shape).passthrough();
        const recordSchema = z.looseRecord(keySchema, valueSchema);
        zodSchema = z.intersection(objectSchema2, recordSchema);
        break;
      }
      if (schema.patternProperties) {
        const patternProps = schema.patternProperties;
        const patternKeys = Object.keys(patternProps);
        const looseRecords = [];
        for (const pattern of patternKeys) {
          const patternValue = convertSchema(patternProps[pattern], ctx);
          const keySchema = z.string().regex(new RegExp(pattern));
          looseRecords.push(z.looseRecord(keySchema, patternValue));
        }
        const schemasToIntersect = [];
        if (Object.keys(shape).length > 0) {
          schemasToIntersect.push(z.object(shape).passthrough());
        }
        schemasToIntersect.push(...looseRecords);
        if (schemasToIntersect.length === 0) {
          zodSchema = z.object({}).passthrough();
        } else if (schemasToIntersect.length === 1) {
          zodSchema = schemasToIntersect[0];
        } else {
          let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
          for (let i = 2;i < schemasToIntersect.length; i++) {
            result = z.intersection(result, schemasToIntersect[i]);
          }
          zodSchema = result;
        }
        break;
      }
      const objectSchema = z.object(shape);
      if (schema.additionalProperties === false) {
        zodSchema = objectSchema.strict();
      } else if (typeof schema.additionalProperties === "object") {
        zodSchema = objectSchema.catchall(convertSchema(schema.additionalProperties, ctx));
      } else {
        zodSchema = objectSchema.passthrough();
      }
      break;
    }
    case "array": {
      const prefixItems = schema.prefixItems;
      const items = schema.items;
      if (prefixItems && Array.isArray(prefixItems)) {
        const tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
        const rest = items && typeof items === "object" && !Array.isArray(items) ? convertSchema(items, ctx) : undefined;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (Array.isArray(items)) {
        const tupleItems = items.map((item) => convertSchema(item, ctx));
        const rest = schema.additionalItems && typeof schema.additionalItems === "object" ? convertSchema(schema.additionalItems, ctx) : undefined;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (items !== undefined) {
        const element = convertSchema(items, ctx);
        let arraySchema = z.array(element);
        if (typeof schema.minItems === "number") {
          arraySchema = arraySchema.min(schema.minItems);
        }
        if (typeof schema.maxItems === "number") {
          arraySchema = arraySchema.max(schema.maxItems);
        }
        zodSchema = arraySchema;
      } else {
        zodSchema = z.array(z.any());
      }
      break;
    }
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
  return zodSchema;
}
function convertSchema(schema, ctx) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let baseSchema = convertBaseSchema(schema, ctx);
  const hasExplicitType = schema.type || schema.enum !== undefined || schema.const !== undefined;
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const options = schema.anyOf.map((s) => convertSchema(s, ctx));
    const anyOfUnion = z.union(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
  }
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const options = schema.oneOf.map((s) => convertSchema(s, ctx));
    const oneOfUnion = z.xor(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
  }
  if (schema.allOf && Array.isArray(schema.allOf)) {
    if (schema.allOf.length === 0) {
      baseSchema = hasExplicitType ? baseSchema : z.any();
    } else {
      let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
      const startIdx = hasExplicitType ? 0 : 1;
      for (let i = startIdx;i < schema.allOf.length; i++) {
        result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
      }
      baseSchema = result;
    }
  }
  if (schema.nullable === true && ctx.version === "openapi-3.0") {
    baseSchema = z.nullable(baseSchema);
  }
  if (schema.readOnly === true) {
    baseSchema = z.readonly(baseSchema);
  }
  if (schema.default !== undefined) {
    baseSchema = baseSchema.default(schema.default);
  }
  const extraMeta = {};
  const coreMetadataKeys = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
  for (const key of coreMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  const contentMetadataKeys = ["contentEncoding", "contentMediaType", "contentSchema"];
  for (const key of contentMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  for (const key of Object.keys(schema)) {
    if (!RECOGNIZED_KEYS.has(key)) {
      extraMeta[key] = schema[key];
    }
  }
  if (Object.keys(extraMeta).length > 0) {
    ctx.registry.add(baseSchema, extraMeta);
  }
  if (schema.description) {
    baseSchema = baseSchema.describe(schema.description);
  }
  return baseSchema;
}
function fromJSONSchema(schema, params) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let normalized;
  try {
    normalized = JSON.parse(JSON.stringify(schema));
  } catch {
    throw new Error("fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas");
  }
  const version2 = detectVersion(normalized, params?.defaultTarget);
  const defs = normalized.$defs || normalized.definitions || {};
  const ctx = {
    version: version2,
    defs,
    refs: new Map,
    processing: new Set,
    rootSchema: normalized,
    registry: params?.registry ?? globalRegistry
  };
  return convertSchema(normalized, ctx);
}
var z, RECOGNIZED_KEYS;
var init_from_json_schema = __esm(() => {
  init_registries();
  init_checks2();
  init_iso();
  init_schemas2();
  z = {
    ...exports_schemas2,
    ...exports_checks2,
    iso: exports_iso
  };
  RECOGNIZED_KEYS = /* @__PURE__ */ new Set([
    "$schema",
    "$ref",
    "$defs",
    "definitions",
    "$id",
    "id",
    "$comment",
    "$anchor",
    "$vocabulary",
    "$dynamicRef",
    "$dynamicAnchor",
    "type",
    "enum",
    "const",
    "anyOf",
    "oneOf",
    "allOf",
    "not",
    "properties",
    "required",
    "additionalProperties",
    "patternProperties",
    "propertyNames",
    "minProperties",
    "maxProperties",
    "items",
    "prefixItems",
    "additionalItems",
    "minItems",
    "maxItems",
    "uniqueItems",
    "contains",
    "minContains",
    "maxContains",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "description",
    "default",
    "contentEncoding",
    "contentMediaType",
    "contentSchema",
    "unevaluatedItems",
    "unevaluatedProperties",
    "if",
    "then",
    "else",
    "dependentSchemas",
    "dependentRequired",
    "nullable",
    "readOnly"
  ]);
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/coerce.js
var exports_coerce = {};
__export(exports_coerce, {
  string: () => string3,
  number: () => number3,
  date: () => date4,
  boolean: () => boolean3,
  bigint: () => bigint3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}
var init_coerce = __esm(() => {
  init_core2();
  init_schemas2();
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/v4/classic/external.js
var exports_external = {};
__export(exports_external, {
  xor: () => xor,
  xid: () => xid2,
  void: () => _void2,
  uuidv7: () => uuidv7,
  uuidv6: () => uuidv6,
  uuidv4: () => uuidv4,
  uuid: () => uuid2,
  util: () => exports_util,
  url: () => url,
  uppercase: () => _uppercase,
  unknown: () => unknown,
  union: () => union,
  undefined: () => _undefined3,
  ulid: () => ulid2,
  uint64: () => uint64,
  uint32: () => uint32,
  tuple: () => tuple,
  trim: () => _trim,
  treeifyError: () => treeifyError,
  transform: () => transform,
  toUpperCase: () => _toUpperCase,
  toLowerCase: () => _toLowerCase,
  toJSONSchema: () => toJSONSchema,
  templateLiteral: () => templateLiteral,
  symbol: () => symbol,
  superRefine: () => superRefine,
  success: () => success,
  stringbool: () => stringbool,
  stringFormat: () => stringFormat,
  string: () => string2,
  strictObject: () => strictObject,
  startsWith: () => _startsWith,
  slugify: () => _slugify,
  size: () => _size,
  setErrorMap: () => setErrorMap,
  set: () => set,
  safeParseAsync: () => safeParseAsync2,
  safeParse: () => safeParse2,
  safeEncodeAsync: () => safeEncodeAsync2,
  safeEncode: () => safeEncode2,
  safeDecodeAsync: () => safeDecodeAsync2,
  safeDecode: () => safeDecode2,
  registry: () => registry,
  regexes: () => exports_regexes,
  regex: () => _regex,
  refine: () => refine,
  record: () => record,
  readonly: () => readonly,
  property: () => _property,
  promise: () => promise,
  prettifyError: () => prettifyError,
  preprocess: () => preprocess,
  prefault: () => prefault,
  positive: () => _positive,
  pipe: () => pipe,
  partialRecord: () => partialRecord,
  parseAsync: () => parseAsync2,
  parse: () => parse3,
  overwrite: () => _overwrite,
  optional: () => optional,
  object: () => object,
  number: () => number2,
  nullish: () => nullish2,
  nullable: () => nullable,
  null: () => _null3,
  normalize: () => _normalize,
  nonpositive: () => _nonpositive,
  nonoptional: () => nonoptional,
  nonnegative: () => _nonnegative,
  never: () => never,
  negative: () => _negative,
  nativeEnum: () => nativeEnum,
  nanoid: () => nanoid2,
  nan: () => nan,
  multipleOf: () => _multipleOf,
  minSize: () => _minSize,
  minLength: () => _minLength,
  mime: () => _mime,
  meta: () => meta2,
  maxSize: () => _maxSize,
  maxLength: () => _maxLength,
  map: () => map,
  mac: () => mac2,
  lte: () => _lte,
  lt: () => _lt,
  lowercase: () => _lowercase,
  looseRecord: () => looseRecord,
  looseObject: () => looseObject,
  locales: () => exports_locales,
  literal: () => literal,
  length: () => _length,
  lazy: () => lazy,
  ksuid: () => ksuid2,
  keyof: () => keyof,
  jwt: () => jwt,
  json: () => json,
  iso: () => exports_iso,
  ipv6: () => ipv62,
  ipv4: () => ipv42,
  invertCodec: () => invertCodec,
  intersection: () => intersection,
  int64: () => int64,
  int32: () => int32,
  int: () => int,
  instanceof: () => _instanceof,
  includes: () => _includes,
  httpUrl: () => httpUrl,
  hostname: () => hostname2,
  hex: () => hex2,
  hash: () => hash,
  guid: () => guid2,
  gte: () => _gte,
  gt: () => _gt,
  globalRegistry: () => globalRegistry,
  getErrorMap: () => getErrorMap,
  function: () => _function,
  fromJSONSchema: () => fromJSONSchema,
  formatError: () => formatError,
  float64: () => float64,
  float32: () => float32,
  flattenError: () => flattenError,
  file: () => file,
  exactOptional: () => exactOptional,
  enum: () => _enum2,
  endsWith: () => _endsWith,
  encodeAsync: () => encodeAsync2,
  encode: () => encode2,
  emoji: () => emoji2,
  email: () => email2,
  e164: () => e1642,
  discriminatedUnion: () => discriminatedUnion,
  describe: () => describe2,
  decodeAsync: () => decodeAsync2,
  decode: () => decode2,
  date: () => date3,
  custom: () => custom,
  cuid2: () => cuid22,
  cuid: () => cuid3,
  core: () => exports_core2,
  config: () => config,
  coerce: () => exports_coerce,
  codec: () => codec,
  clone: () => clone,
  cidrv6: () => cidrv62,
  cidrv4: () => cidrv42,
  check: () => check,
  catch: () => _catch2,
  boolean: () => boolean2,
  bigint: () => bigint2,
  base64url: () => base64url2,
  base64: () => base642,
  array: () => array,
  any: () => any,
  _function: () => _function,
  _default: () => _default2,
  _ZodString: () => _ZodString,
  ZodXor: () => ZodXor,
  ZodXID: () => ZodXID,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodUUID: () => ZodUUID,
  ZodURL: () => ZodURL,
  ZodULID: () => ZodULID,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransform: () => ZodTransform,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodSymbol: () => ZodSymbol,
  ZodSuccess: () => ZodSuccess,
  ZodStringFormat: () => ZodStringFormat,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodRecord: () => ZodRecord,
  ZodRealError: () => ZodRealError,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPreprocess: () => ZodPreprocess,
  ZodPrefault: () => ZodPrefault,
  ZodPipe: () => ZodPipe,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNonOptional: () => ZodNonOptional,
  ZodNever: () => ZodNever,
  ZodNanoID: () => ZodNanoID,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodMAC: () => ZodMAC,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodKSUID: () => ZodKSUID,
  ZodJWT: () => ZodJWT,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate,
  ZodIPv6: () => ZodIPv6,
  ZodIPv4: () => ZodIPv4,
  ZodGUID: () => ZodGUID,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFile: () => ZodFile,
  ZodExactOptional: () => ZodExactOptional,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEmoji: () => ZodEmoji,
  ZodEmail: () => ZodEmail,
  ZodE164: () => ZodE164,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodCustom: () => ZodCustom,
  ZodCodec: () => ZodCodec,
  ZodCatch: () => ZodCatch,
  ZodCUID2: () => ZodCUID2,
  ZodCUID: () => ZodCUID,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodBoolean: () => ZodBoolean,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBigInt: () => ZodBigInt,
  ZodBase64URL: () => ZodBase64URL,
  ZodBase64: () => ZodBase64,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  $output: () => $output,
  $input: () => $input,
  $brand: () => $brand
});
var init_external = __esm(() => {
  init_core2();
  init_core2();
  init_en();
  init_core2();
  init_json_schema_processors();
  init_from_json_schema();
  init_locales();
  init_iso();
  init_iso();
  init_coerce();
  init_schemas2();
  init_checks2();
  init_errors2();
  init_parse2();
  init_compat();
  config(en_default());
});

// node_modules/.bun/zod@4.4.3/node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

// packages/table-plan/index.ts
function cellAt(row, col, fallback = null) {
  return Object.hasOwn(row, col) ? row[col] : fallback;
}
function setCell(row, col, value) {
  if (col === "__proto__") {
    Object.defineProperty(row, col, { value, writable: true, enumerable: true, configurable: true });
  } else {
    row[col] = value;
  }
}
function normalizeDbCell(v) {
  if (typeof v === "bigint") {
    return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString();
  }
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null)
      return String(v);
  }
  return v;
}
var ColumnsField, ExprSchema, JsonLikeFileExtRe, QueryMeta, TransformationUnionSchema, ColumnSchema, TablePlanSchema;
var init_table_plan = __esm(() => {
  init_zod();
  exports_external.config(exports_external.locales.en());
  ColumnsField = exports_external.union([exports_external.string(), exports_external.array(exports_external.string())]);
  ExprSchema = exports_external.union([
    exports_external.object({ js: exports_external.string() }).strict(),
    exports_external.object({ llm: exports_external.string(), model: exports_external.string().optional() }).strict(),
    exports_external.object({ sql: exports_external.string() }).strict()
  ]);
  JsonLikeFileExtRe = /\.(csv|jsonl)$/i;
  QueryMeta = { query: exports_external.string().optional(), name: exports_external.string().optional() };
  TransformationUnionSchema = exports_external.discriminatedUnion("kind", [
    exports_external.object({ kind: exports_external.literal("filter"), pred: ExprSchema, ...QueryMeta }).strict(),
    exports_external.object({ kind: exports_external.literal("mutate"), columns: ColumnsField, value: ExprSchema, ...QueryMeta }).strict(),
    exports_external.object({ kind: exports_external.literal("select"), columns: exports_external.array(exports_external.string()), ...QueryMeta }).strict(),
    exports_external.object({
      kind: exports_external.literal("sort"),
      by: exports_external.array(exports_external.object({ key: exports_external.union([exports_external.string(), ExprSchema]), dir: exports_external.enum(["asc", "desc"]) })).min(1, "sort.by must be non-empty"),
      limit: exports_external.number().int().positive().optional(),
      ...QueryMeta
    }).strict(),
    exports_external.object({
      kind: exports_external.literal("group"),
      by: exports_external.array(exports_external.union([exports_external.string(), ExprSchema])),
      agg: exports_external.record(exports_external.string(), ExprSchema),
      ...QueryMeta
    }).strict(),
    exports_external.object({
      kind: exports_external.literal("join"),
      with: exports_external.string().refine((s) => JsonLikeFileExtRe.test(s), {
        message: "join.with: unknown file type (must be .csv or .jsonl)"
      }).nullable(),
      on: ExprSchema,
      how: exports_external.enum(["inner", "left"]).optional(),
      ...QueryMeta
    }).strict(),
    exports_external.object({
      kind: exports_external.literal("split"),
      from: exports_external.string(),
      into: exports_external.array(exports_external.string()).min(1, "split.into must be non-empty"),
      on: exports_external.union([exports_external.string(), exports_external.instanceof(RegExp), ExprSchema]),
      drop: exports_external.boolean().optional(),
      ...QueryMeta
    }).strict(),
    exports_external.object({
      kind: exports_external.literal("validate"),
      pred: ExprSchema,
      message: ExprSchema.optional(),
      threshold: exports_external.number().min(0).max(1).optional(),
      into: exports_external.string().min(1, "validate.into must be non-empty").optional(),
      ...QueryMeta
    }).strict(),
    exports_external.object({
      kind: exports_external.literal("pivot"),
      index: exports_external.array(exports_external.string()).min(1, "pivot.index must be non-empty"),
      on: exports_external.string(),
      values: exports_external.string(),
      agg: exports_external.enum(["sum", "count", "avg", "min", "max", "first"]).optional(),
      ...QueryMeta
    }).strict().refine((p) => !p.index.includes(p.on), { message: "pivot.on cannot be in pivot.index" }),
    exports_external.object({
      kind: exports_external.literal("unpivot"),
      id: exports_external.array(exports_external.string()),
      measures: exports_external.array(exports_external.string()).min(1, "unpivot.measures must be non-empty"),
      names_to: exports_external.string().optional(),
      values_to: exports_external.string().optional(),
      ...QueryMeta
    }).strict()
  ]);
  ColumnSchema = exports_external.object({
    id: exports_external.string(),
    label: exports_external.string().optional(),
    format: exports_external.string().optional()
  });
  TablePlanSchema = exports_external.object({
    table: exports_external.string().optional(),
    columns: exports_external.array(ColumnSchema),
    transformations: exports_external.array(TransformationUnionSchema)
  }).strict();
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/api/CsvError.js
var CsvError;
var init_CsvError = __esm(() => {
  CsvError = class CsvError extends Error {
    constructor(code, message, options, ...contexts) {
      if (Array.isArray(message))
        message = message.join(" ").trim();
      super(message);
      if (Error.captureStackTrace !== undefined) {
        Error.captureStackTrace(this, CsvError);
      }
      this.code = code;
      for (const context of contexts) {
        for (const key in context) {
          const value = context[key];
          this[key] = Buffer.isBuffer(value) ? value.toString(options.encoding) : value == null ? value : JSON.parse(JSON.stringify(value));
        }
      }
    }
  };
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/utils/is_object.js
var is_object = function(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
};
var init_is_object = () => {};

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/api/normalize_columns_array.js
var normalize_columns_array = function(columns) {
  const normalizedColumns = [];
  for (let i = 0, l = columns.length;i < l; i++) {
    const column = columns[i];
    if (column === undefined || column === null || column === false) {
      normalizedColumns[i] = { disabled: true };
    } else if (typeof column === "string" || typeof column === "number") {
      normalizedColumns[i] = { name: `${column}` };
    } else if (is_object(column)) {
      if (typeof column.name !== "string") {
        throw new CsvError("CSV_OPTION_COLUMNS_MISSING_NAME", [
          "Option columns missing name:",
          `property "name" is required at position ${i}`,
          "when column is an object literal"
        ]);
      }
      normalizedColumns[i] = column;
    } else {
      throw new CsvError("CSV_INVALID_COLUMN_DEFINITION", [
        "Invalid column definition:",
        "expect a string or a literal object,",
        `got ${JSON.stringify(column)} at position ${i}`
      ]);
    }
  }
  return normalizedColumns;
};
var init_normalize_columns_array = __esm(() => {
  init_CsvError();
  init_is_object();
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/utils/ResizeableBuffer.js
class ResizeableBuffer {
  constructor(size = 100) {
    this.size = size;
    this.length = 0;
    this.buf = Buffer.allocUnsafe(size);
  }
  prepend(val) {
    if (Buffer.isBuffer(val)) {
      const length = this.length + val.length;
      if (length >= this.size) {
        this.resize();
        if (length >= this.size) {
          throw Error("INVALID_BUFFER_STATE");
        }
      }
      const buf = this.buf;
      this.buf = Buffer.allocUnsafe(this.size);
      val.copy(this.buf, 0);
      buf.copy(this.buf, val.length);
      this.length += val.length;
    } else {
      const length = this.length++;
      if (length === this.size) {
        this.resize();
      }
      const buf = this.clone();
      this.buf[0] = val;
      buf.copy(this.buf, 1, 0, length);
    }
  }
  append(val) {
    const length = this.length++;
    if (length === this.size) {
      this.resize();
    }
    this.buf[length] = val;
  }
  clone() {
    return Buffer.from(this.buf.slice(0, this.length));
  }
  resize() {
    const length = this.length;
    this.size = this.size * 2;
    const buf = Buffer.allocUnsafe(this.size);
    this.buf.copy(buf, 0, 0, length);
    this.buf = buf;
  }
  toString(encoding) {
    if (encoding) {
      return this.buf.slice(0, this.length).toString(encoding);
    } else {
      return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
    }
  }
  toJSON() {
    return this.toString("utf8");
  }
  reset() {
    this.length = 0;
  }
}
var ResizeableBuffer_default;
var init_ResizeableBuffer = __esm(() => {
  ResizeableBuffer_default = ResizeableBuffer;
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/api/init_state.js
var np = 12, cr = 13, nl = 10, space = 32, tab = 9, init_state = function(options) {
  return {
    bomSkipped: false,
    bufBytesStart: 0,
    castField: options.cast_function,
    commenting: false,
    error: undefined,
    enabled: options.from_line === 1,
    escaping: false,
    escapeIsQuote: Buffer.isBuffer(options.escape) && Buffer.isBuffer(options.quote) && Buffer.compare(options.escape, options.quote) === 0,
    expectedRecordLength: Array.isArray(options.columns) ? options.columns.length : undefined,
    field: new ResizeableBuffer_default(20),
    firstLineToHeaders: options.cast_first_line_to_header,
    needMoreDataSize: Math.max(options.comment !== null ? options.comment.length : 0, ...options.delimiter.map((delimiter) => delimiter.length), options.quote !== null ? options.quote.length : 0),
    previousBuf: undefined,
    quoting: false,
    stop: false,
    rawBuffer: new ResizeableBuffer_default(100),
    record: [],
    recordHasError: false,
    record_length: 0,
    recordDelimiterMaxLength: options.record_delimiter.length === 0 ? 0 : Math.max(...options.record_delimiter.map((v) => v.length)),
    trimChars: [
      Buffer.from(" ", options.encoding)[0],
      Buffer.from("\t", options.encoding)[0]
    ],
    wasQuoting: false,
    wasRowDelimiter: false,
    timchars: [
      Buffer.from(Buffer.from([cr], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([nl], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([np], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([space], "utf8").toString(), options.encoding),
      Buffer.from(Buffer.from([tab], "utf8").toString(), options.encoding)
    ]
  };
};
var init_init_state = __esm(() => {
  init_ResizeableBuffer();
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/utils/underscore.js
var underscore = function(str) {
  return str.replace(/([A-Z])/g, function(_, match) {
    return "_" + match.toLowerCase();
  });
};
var init_underscore = () => {};

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/api/normalize_options.js
var normalize_options = function(opts) {
  const options = {};
  for (const opt in opts) {
    options[underscore(opt)] = opts[opt];
  }
  if (options.encoding === undefined || options.encoding === true) {
    options.encoding = "utf8";
  } else if (options.encoding === null || options.encoding === false) {
    options.encoding = null;
  } else if (typeof options.encoding !== "string" && options.encoding !== null) {
    throw new CsvError("CSV_INVALID_OPTION_ENCODING", [
      "Invalid option encoding:",
      "encoding must be a string or null to return a buffer,",
      `got ${JSON.stringify(options.encoding)}`
    ], options);
  }
  if (options.bom === undefined || options.bom === null || options.bom === false) {
    options.bom = false;
  } else if (options.bom !== true) {
    throw new CsvError("CSV_INVALID_OPTION_BOM", [
      "Invalid option bom:",
      "bom must be true,",
      `got ${JSON.stringify(options.bom)}`
    ], options);
  }
  options.cast_function = null;
  if (options.cast === undefined || options.cast === null || options.cast === false || options.cast === "") {
    options.cast = undefined;
  } else if (typeof options.cast === "function") {
    options.cast_function = options.cast;
    options.cast = true;
  } else if (options.cast !== true) {
    throw new CsvError("CSV_INVALID_OPTION_CAST", [
      "Invalid option cast:",
      "cast must be true or a function,",
      `got ${JSON.stringify(options.cast)}`
    ], options);
  }
  if (options.cast_date === undefined || options.cast_date === null || options.cast_date === false || options.cast_date === "") {
    options.cast_date = false;
  } else if (options.cast_date === true) {
    options.cast_date = function(value) {
      const date5 = Date.parse(value);
      return !isNaN(date5) ? new Date(date5) : value;
    };
  } else if (typeof options.cast_date !== "function") {
    throw new CsvError("CSV_INVALID_OPTION_CAST_DATE", [
      "Invalid option cast_date:",
      "cast_date must be true or a function,",
      `got ${JSON.stringify(options.cast_date)}`
    ], options);
  }
  options.cast_first_line_to_header = undefined;
  if (options.columns === true) {
    options.cast_first_line_to_header = undefined;
  } else if (typeof options.columns === "function") {
    options.cast_first_line_to_header = options.columns;
    options.columns = true;
  } else if (Array.isArray(options.columns)) {
    options.columns = normalize_columns_array(options.columns);
  } else if (options.columns === undefined || options.columns === null || options.columns === false) {
    options.columns = false;
  } else {
    throw new CsvError("CSV_INVALID_OPTION_COLUMNS", [
      "Invalid option columns:",
      "expect an array, a function or true,",
      `got ${JSON.stringify(options.columns)}`
    ], options);
  }
  if (options.group_columns_by_name === undefined || options.group_columns_by_name === null || options.group_columns_by_name === false) {
    options.group_columns_by_name = false;
  } else if (options.group_columns_by_name !== true) {
    throw new CsvError("CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME", [
      "Invalid option group_columns_by_name:",
      "expect an boolean,",
      `got ${JSON.stringify(options.group_columns_by_name)}`
    ], options);
  } else if (options.columns === false) {
    throw new CsvError("CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME", [
      "Invalid option group_columns_by_name:",
      "the `columns` mode must be activated."
    ], options);
  }
  if (options.comment === undefined || options.comment === null || options.comment === false || options.comment === "") {
    options.comment = null;
  } else {
    if (typeof options.comment === "string") {
      options.comment = Buffer.from(options.comment, options.encoding);
    }
    if (!Buffer.isBuffer(options.comment)) {
      throw new CsvError("CSV_INVALID_OPTION_COMMENT", [
        "Invalid option comment:",
        "comment must be a buffer or a string,",
        `got ${JSON.stringify(options.comment)}`
      ], options);
    }
  }
  if (options.comment_no_infix === undefined || options.comment_no_infix === null || options.comment_no_infix === false) {
    options.comment_no_infix = false;
  } else if (options.comment_no_infix !== true) {
    throw new CsvError("CSV_INVALID_OPTION_COMMENT", [
      "Invalid option comment_no_infix:",
      "value must be a boolean,",
      `got ${JSON.stringify(options.comment_no_infix)}`
    ], options);
  }
  const delimiter_json = JSON.stringify(options.delimiter);
  if (!Array.isArray(options.delimiter))
    options.delimiter = [options.delimiter];
  if (options.delimiter.length === 0) {
    throw new CsvError("CSV_INVALID_OPTION_DELIMITER", [
      "Invalid option delimiter:",
      "delimiter must be a non empty string or buffer or array of string|buffer,",
      `got ${delimiter_json}`
    ], options);
  }
  options.delimiter = options.delimiter.map(function(delimiter) {
    if (delimiter === undefined || delimiter === null || delimiter === false) {
      return Buffer.from(",", options.encoding);
    }
    if (typeof delimiter === "string") {
      delimiter = Buffer.from(delimiter, options.encoding);
    }
    if (!Buffer.isBuffer(delimiter) || delimiter.length === 0) {
      throw new CsvError("CSV_INVALID_OPTION_DELIMITER", [
        "Invalid option delimiter:",
        "delimiter must be a non empty string or buffer or array of string|buffer,",
        `got ${delimiter_json}`
      ], options);
    }
    return delimiter;
  });
  if (options.escape === undefined || options.escape === true) {
    options.escape = Buffer.from('"', options.encoding);
  } else if (typeof options.escape === "string") {
    options.escape = Buffer.from(options.escape, options.encoding);
  } else if (options.escape === null || options.escape === false) {
    options.escape = null;
  }
  if (options.escape !== null) {
    if (!Buffer.isBuffer(options.escape)) {
      throw new Error(`Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`);
    }
  }
  if (options.from === undefined || options.from === null) {
    options.from = 1;
  } else {
    if (typeof options.from === "string" && /\d+/.test(options.from)) {
      options.from = parseInt(options.from);
    }
    if (Number.isInteger(options.from)) {
      if (options.from < 0) {
        throw new Error(`Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`);
      }
    } else {
      throw new Error(`Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`);
    }
  }
  if (options.from_line === undefined || options.from_line === null) {
    options.from_line = 1;
  } else {
    if (typeof options.from_line === "string" && /\d+/.test(options.from_line)) {
      options.from_line = parseInt(options.from_line);
    }
    if (Number.isInteger(options.from_line)) {
      if (options.from_line <= 0) {
        throw new Error(`Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`);
      }
    } else {
      throw new Error(`Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`);
    }
  }
  if (options.ignore_last_delimiters === undefined || options.ignore_last_delimiters === null) {
    options.ignore_last_delimiters = false;
  } else if (typeof options.ignore_last_delimiters === "number") {
    options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
    if (options.ignore_last_delimiters === 0) {
      options.ignore_last_delimiters = false;
    }
  } else if (typeof options.ignore_last_delimiters !== "boolean") {
    throw new CsvError("CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS", [
      "Invalid option `ignore_last_delimiters`:",
      "the value must be a boolean value or an integer,",
      `got ${JSON.stringify(options.ignore_last_delimiters)}`
    ], options);
  }
  if (options.ignore_last_delimiters === true && options.columns === false) {
    throw new CsvError("CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS", [
      "The option `ignore_last_delimiters`",
      "requires the activation of the `columns` option"
    ], options);
  }
  if (options.info === undefined || options.info === null || options.info === false) {
    options.info = false;
  } else if (options.info !== true) {
    throw new Error(`Invalid Option: info must be true, got ${JSON.stringify(options.info)}`);
  }
  if (options.max_record_size === undefined || options.max_record_size === null || options.max_record_size === false) {
    options.max_record_size = 0;
  } else if (Number.isInteger(options.max_record_size) && options.max_record_size >= 0) {} else if (typeof options.max_record_size === "string" && /\d+/.test(options.max_record_size)) {
    options.max_record_size = parseInt(options.max_record_size);
  } else {
    throw new Error(`Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`);
  }
  if (options.objname === undefined || options.objname === null || options.objname === false) {
    options.objname = undefined;
  } else if (Buffer.isBuffer(options.objname)) {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty buffer`);
    }
    if (options.encoding === null) {} else {
      options.objname = options.objname.toString(options.encoding);
    }
  } else if (typeof options.objname === "string") {
    if (options.objname.length === 0) {
      throw new Error(`Invalid Option: objname must be a non empty string`);
    }
  } else if (typeof options.objname === "number") {} else {
    throw new Error(`Invalid Option: objname must be a string or a buffer, got ${options.objname}`);
  }
  if (options.objname !== undefined) {
    if (typeof options.objname === "number") {
      if (options.columns !== false) {
        throw Error("Invalid Option: objname index cannot be combined with columns or be defined as a field");
      }
    } else {
      if (options.columns === false) {
        throw Error("Invalid Option: objname field must be combined with columns or be defined as an index");
      }
    }
  }
  if (options.on_record === undefined || options.on_record === null) {
    options.on_record = undefined;
  } else if (typeof options.on_record !== "function") {
    throw new CsvError("CSV_INVALID_OPTION_ON_RECORD", [
      "Invalid option `on_record`:",
      "expect a function,",
      `got ${JSON.stringify(options.on_record)}`
    ], options);
  }
  if (options.on_skip !== undefined && options.on_skip !== null && typeof options.on_skip !== "function") {
    throw new Error(`Invalid Option: on_skip must be a function, got ${JSON.stringify(options.on_skip)}`);
  }
  if (options.quote === null || options.quote === false || options.quote === "") {
    options.quote = null;
  } else {
    if (options.quote === undefined || options.quote === true) {
      options.quote = Buffer.from('"', options.encoding);
    } else if (typeof options.quote === "string") {
      options.quote = Buffer.from(options.quote, options.encoding);
    }
    if (!Buffer.isBuffer(options.quote)) {
      throw new Error(`Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`);
    }
  }
  if (options.raw === undefined || options.raw === null || options.raw === false) {
    options.raw = false;
  } else if (options.raw !== true) {
    throw new Error(`Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`);
  }
  if (options.record_delimiter === undefined) {
    options.record_delimiter = [];
  } else if (typeof options.record_delimiter === "string" || Buffer.isBuffer(options.record_delimiter)) {
    if (options.record_delimiter.length === 0) {
      throw new CsvError("CSV_INVALID_OPTION_RECORD_DELIMITER", [
        "Invalid option `record_delimiter`:",
        "value must be a non empty string or buffer,",
        `got ${JSON.stringify(options.record_delimiter)}`
      ], options);
    }
    options.record_delimiter = [options.record_delimiter];
  } else if (!Array.isArray(options.record_delimiter)) {
    throw new CsvError("CSV_INVALID_OPTION_RECORD_DELIMITER", [
      "Invalid option `record_delimiter`:",
      "value must be a string, a buffer or array of string|buffer,",
      `got ${JSON.stringify(options.record_delimiter)}`
    ], options);
  }
  options.record_delimiter = options.record_delimiter.map(function(rd, i) {
    if (typeof rd !== "string" && !Buffer.isBuffer(rd)) {
      throw new CsvError("CSV_INVALID_OPTION_RECORD_DELIMITER", [
        "Invalid option `record_delimiter`:",
        "value must be a string, a buffer or array of string|buffer",
        `at index ${i},`,
        `got ${JSON.stringify(rd)}`
      ], options);
    } else if (rd.length === 0) {
      throw new CsvError("CSV_INVALID_OPTION_RECORD_DELIMITER", [
        "Invalid option `record_delimiter`:",
        "value must be a non empty string or buffer",
        `at index ${i},`,
        `got ${JSON.stringify(rd)}`
      ], options);
    }
    if (typeof rd === "string") {
      rd = Buffer.from(rd, options.encoding);
    }
    return rd;
  });
  if (typeof options.relax_column_count === "boolean") {} else if (options.relax_column_count === undefined || options.relax_column_count === null) {
    options.relax_column_count = false;
  } else {
    throw new Error(`Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`);
  }
  if (typeof options.relax_column_count_less === "boolean") {} else if (options.relax_column_count_less === undefined || options.relax_column_count_less === null) {
    options.relax_column_count_less = false;
  } else {
    throw new Error(`Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`);
  }
  if (typeof options.relax_column_count_more === "boolean") {} else if (options.relax_column_count_more === undefined || options.relax_column_count_more === null) {
    options.relax_column_count_more = false;
  } else {
    throw new Error(`Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`);
  }
  if (typeof options.relax_quotes === "boolean") {} else if (options.relax_quotes === undefined || options.relax_quotes === null) {
    options.relax_quotes = false;
  } else {
    throw new Error(`Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`);
  }
  if (typeof options.skip_empty_lines === "boolean") {} else if (options.skip_empty_lines === undefined || options.skip_empty_lines === null) {
    options.skip_empty_lines = false;
  } else {
    throw new Error(`Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`);
  }
  if (typeof options.skip_records_with_empty_values === "boolean") {} else if (options.skip_records_with_empty_values === undefined || options.skip_records_with_empty_values === null) {
    options.skip_records_with_empty_values = false;
  } else {
    throw new Error(`Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`);
  }
  if (typeof options.skip_records_with_error === "boolean") {} else if (options.skip_records_with_error === undefined || options.skip_records_with_error === null) {
    options.skip_records_with_error = false;
  } else {
    throw new Error(`Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`);
  }
  if (options.rtrim === undefined || options.rtrim === null || options.rtrim === false) {
    options.rtrim = false;
  } else if (options.rtrim !== true) {
    throw new Error(`Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`);
  }
  if (options.ltrim === undefined || options.ltrim === null || options.ltrim === false) {
    options.ltrim = false;
  } else if (options.ltrim !== true) {
    throw new Error(`Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`);
  }
  if (options.trim === undefined || options.trim === null || options.trim === false) {
    options.trim = false;
  } else if (options.trim !== true) {
    throw new Error(`Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`);
  }
  if (options.trim === true && opts.ltrim !== false) {
    options.ltrim = true;
  } else if (options.ltrim !== true) {
    options.ltrim = false;
  }
  if (options.trim === true && opts.rtrim !== false) {
    options.rtrim = true;
  } else if (options.rtrim !== true) {
    options.rtrim = false;
  }
  if (options.to === undefined || options.to === null) {
    options.to = -1;
  } else if (options.to !== -1) {
    if (typeof options.to === "string" && /\d+/.test(options.to)) {
      options.to = parseInt(options.to);
    }
    if (Number.isInteger(options.to)) {
      if (options.to <= 0) {
        throw new Error(`Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`);
      }
    } else {
      throw new Error(`Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`);
    }
  }
  if (options.to_line === undefined || options.to_line === null) {
    options.to_line = -1;
  } else if (options.to_line !== -1) {
    if (typeof options.to_line === "string" && /\d+/.test(options.to_line)) {
      options.to_line = parseInt(options.to_line);
    }
    if (Number.isInteger(options.to_line)) {
      if (options.to_line <= 0) {
        throw new Error(`Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`);
      }
    } else {
      throw new Error(`Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`);
    }
  }
  return options;
};
var init_normalize_options = __esm(() => {
  init_normalize_columns_array();
  init_CsvError();
  init_underscore();
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/api/index.js
var isRecordEmpty = function(record2) {
  return record2.every((field) => field == null || field.toString && field.toString().trim() === "");
}, cr2 = 13, nl2 = 10, boms, transform2 = function(original_options = {}) {
  const info = {
    bytes: 0,
    bytes_records: 0,
    comment_lines: 0,
    empty_lines: 0,
    invalid_field_length: 0,
    lines: 1,
    records: 0
  };
  const options = normalize_options(original_options);
  return {
    info,
    original_options,
    options,
    state: init_state(options),
    __needMoreData: function(i, bufLen, end) {
      if (end)
        return false;
      const { encoding, escape, quote } = this.options;
      const { quoting, needMoreDataSize, recordDelimiterMaxLength } = this.state;
      const numOfCharLeft = bufLen - i - 1;
      const requiredLength = Math.max(needMoreDataSize, recordDelimiterMaxLength === 0 ? Buffer.from(`\r
`, encoding).length : recordDelimiterMaxLength, quoting ? (escape === null ? 0 : escape.length) + quote.length : 0, quoting ? quote.length + recordDelimiterMaxLength : 0);
      return numOfCharLeft < requiredLength;
    },
    parse: function(nextBuf, end, push, close) {
      const {
        bom,
        comment_no_infix,
        encoding,
        from_line,
        ltrim,
        max_record_size,
        raw,
        relax_quotes,
        rtrim,
        skip_empty_lines,
        to,
        to_line
      } = this.options;
      let { comment, escape, quote, record_delimiter } = this.options;
      const { bomSkipped, previousBuf, rawBuffer, escapeIsQuote } = this.state;
      let buf;
      if (previousBuf === undefined) {
        if (nextBuf === undefined) {
          close();
          return;
        } else {
          buf = nextBuf;
        }
      } else if (previousBuf !== undefined && nextBuf === undefined) {
        buf = previousBuf;
      } else {
        buf = Buffer.concat([previousBuf, nextBuf]);
      }
      if (bomSkipped === false) {
        if (bom === false) {
          this.state.bomSkipped = true;
        } else if (buf.length < 3) {
          if (end === false) {
            this.state.previousBuf = buf;
            return;
          }
        } else {
          for (const encoding2 in boms) {
            if (boms[encoding2].compare(buf, 0, boms[encoding2].length) === 0) {
              const bomLength = boms[encoding2].length;
              this.state.bufBytesStart += bomLength;
              buf = buf.slice(bomLength);
              const options2 = normalize_options({
                ...this.original_options,
                encoding: encoding2
              });
              for (const key in options2) {
                this.options[key] = options2[key];
              }
              ({ comment, escape, quote } = this.options);
              break;
            }
          }
          this.state.bomSkipped = true;
        }
      }
      const bufLen = buf.length;
      let pos;
      for (pos = 0;pos < bufLen; pos++) {
        if (this.__needMoreData(pos, bufLen, end)) {
          break;
        }
        if (this.state.wasRowDelimiter === true) {
          this.info.lines++;
          this.state.wasRowDelimiter = false;
        }
        if (to_line !== -1 && this.info.lines > to_line) {
          this.state.stop = true;
          close();
          return;
        }
        if (this.state.quoting === false && record_delimiter.length === 0) {
          const record_delimiterCount = this.__autoDiscoverRecordDelimiter(buf, pos);
          if (record_delimiterCount) {
            record_delimiter = this.options.record_delimiter;
          }
        }
        const chr = buf[pos];
        if (raw === true) {
          rawBuffer.append(chr);
        }
        if ((chr === cr2 || chr === nl2) && this.state.wasRowDelimiter === false) {
          this.state.wasRowDelimiter = true;
        }
        if (this.state.escaping === true) {
          this.state.escaping = false;
        } else {
          if (escape !== null && this.state.quoting === true && this.__isEscape(buf, pos, chr) && pos + escape.length < bufLen) {
            if (escapeIsQuote) {
              if (this.__isQuote(buf, pos + escape.length)) {
                this.state.escaping = true;
                pos += escape.length - 1;
                continue;
              }
            } else {
              this.state.escaping = true;
              pos += escape.length - 1;
              continue;
            }
          }
          if (this.state.commenting === false && this.__isQuote(buf, pos)) {
            if (this.state.quoting === true) {
              const nextChr = buf[pos + quote.length];
              const isNextChrTrimable = rtrim && this.__isCharTrimable(buf, pos + quote.length);
              const isNextChrComment = comment !== null && this.__compareBytes(comment, buf, pos + quote.length, nextChr);
              const isNextChrDelimiter = this.__isDelimiter(buf, pos + quote.length, nextChr);
              const isNextChrRecordDelimiter = record_delimiter.length === 0 ? this.__autoDiscoverRecordDelimiter(buf, pos + quote.length) : this.__isRecordDelimiter(nextChr, buf, pos + quote.length);
              if (escape !== null && this.__isEscape(buf, pos, chr) && this.__isQuote(buf, pos + escape.length)) {
                pos += escape.length - 1;
              } else if (!nextChr || isNextChrDelimiter || isNextChrRecordDelimiter || isNextChrComment || isNextChrTrimable) {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                pos += quote.length - 1;
                continue;
              } else if (relax_quotes === false) {
                const err = this.__error(new CsvError("CSV_INVALID_CLOSING_QUOTE", [
                  "Invalid Closing Quote:",
                  `got "${String.fromCharCode(nextChr)}"`,
                  `at line ${this.info.lines}`,
                  "instead of delimiter, record delimiter, trimable character",
                  "(if activated) or comment"
                ], this.options, this.__infoField()));
                if (err !== undefined)
                  return err;
              } else {
                this.state.quoting = false;
                this.state.wasQuoting = true;
                this.state.field.prepend(quote);
                pos += quote.length - 1;
              }
            } else {
              if (this.state.field.length !== 0) {
                if (relax_quotes === false) {
                  const info2 = this.__infoField();
                  const bom2 = Object.keys(boms).map((b) => boms[b].equals(this.state.field.toString()) ? b : false).filter(Boolean)[0];
                  const err = this.__error(new CsvError("INVALID_OPENING_QUOTE", [
                    "Invalid Opening Quote:",
                    `a quote is found on field ${JSON.stringify(info2.column)} at line ${info2.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                    bom2 ? `(${bom2} bom)` : undefined
                  ], this.options, info2, {
                    field: this.state.field
                  }));
                  if (err !== undefined)
                    return err;
                }
              } else {
                this.state.quoting = true;
                pos += quote.length - 1;
                continue;
              }
            }
          }
          if (this.state.quoting === false) {
            const recordDelimiterLength = this.__isRecordDelimiter(chr, buf, pos);
            if (recordDelimiterLength !== 0) {
              const skipCommentLine = this.state.commenting && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0;
              if (skipCommentLine) {
                this.info.comment_lines++;
              } else {
                if (this.state.enabled === false && this.info.lines + (this.state.wasRowDelimiter === true ? 1 : 0) >= from_line) {
                  this.state.enabled = true;
                  this.__resetField();
                  this.__resetRecord();
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                if (skip_empty_lines === true && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0) {
                  this.info.empty_lines++;
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                this.info.bytes = this.state.bufBytesStart + pos;
                const errField = this.__onField();
                if (errField !== undefined)
                  return errField;
                this.info.bytes = this.state.bufBytesStart + pos + recordDelimiterLength;
                const errRecord = this.__onRecord(push);
                if (errRecord !== undefined)
                  return errRecord;
                if (to !== -1 && this.info.records >= to) {
                  this.state.stop = true;
                  close();
                  return;
                }
              }
              this.state.commenting = false;
              pos += recordDelimiterLength - 1;
              continue;
            }
            if (this.state.commenting) {
              continue;
            }
            if (comment !== null && (comment_no_infix === false || this.state.record.length === 0 && this.state.field.length === 0)) {
              const commentCount = this.__compareBytes(comment, buf, pos, chr);
              if (commentCount !== 0) {
                this.state.commenting = true;
                continue;
              }
            }
            const delimiterLength = this.__isDelimiter(buf, pos, chr);
            if (delimiterLength !== 0) {
              this.info.bytes = this.state.bufBytesStart + pos;
              const errField = this.__onField();
              if (errField !== undefined)
                return errField;
              pos += delimiterLength - 1;
              continue;
            }
          }
        }
        if (this.state.commenting === false) {
          if (max_record_size !== 0 && this.state.record_length + this.state.field.length > max_record_size) {
            return this.__error(new CsvError("CSV_MAX_RECORD_SIZE", [
              "Max Record Size:",
              "record exceed the maximum number of tolerated bytes",
              `of ${max_record_size}`,
              `at line ${this.info.lines}`
            ], this.options, this.__infoField()));
          }
        }
        const lappend = ltrim === false || this.state.quoting === true || this.state.field.length !== 0 || !this.__isCharTrimable(buf, pos);
        const rappend = rtrim === false || this.state.wasQuoting === false;
        if (lappend === true && rappend === true) {
          this.state.field.append(chr);
        } else if (rtrim === true && !this.__isCharTrimable(buf, pos)) {
          return this.__error(new CsvError("CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE", [
            "Invalid Closing Quote:",
            "found non trimable byte after quote",
            `at line ${this.info.lines}`
          ], this.options, this.__infoField()));
        } else {
          if (lappend === false) {
            pos += this.__isCharTrimable(buf, pos) - 1;
          }
          continue;
        }
      }
      if (end === true) {
        if (this.state.quoting === true) {
          const err = this.__error(new CsvError("CSV_QUOTE_NOT_CLOSED", [
            "Quote Not Closed:",
            `the parsing is finished with an opening quote at line ${this.info.lines}`
          ], this.options, this.__infoField()));
          if (err !== undefined)
            return err;
        } else {
          if (this.state.wasQuoting === true || this.state.record.length !== 0 || this.state.field.length !== 0) {
            this.info.bytes = this.state.bufBytesStart + pos;
            const errField = this.__onField();
            if (errField !== undefined)
              return errField;
            const errRecord = this.__onRecord(push);
            if (errRecord !== undefined)
              return errRecord;
          } else if (this.state.wasRowDelimiter === true) {
            this.info.empty_lines++;
          } else if (this.state.commenting === true) {
            this.info.comment_lines++;
          }
        }
      } else {
        this.state.bufBytesStart += pos;
        this.state.previousBuf = buf.slice(pos);
      }
      if (this.state.wasRowDelimiter === true) {
        this.info.lines++;
        this.state.wasRowDelimiter = false;
      }
    },
    __onRecord: function(push) {
      const {
        columns,
        group_columns_by_name,
        encoding,
        info: info2,
        from,
        relax_column_count,
        relax_column_count_less,
        relax_column_count_more,
        raw,
        skip_records_with_empty_values
      } = this.options;
      const { enabled, record: record2 } = this.state;
      if (enabled === false) {
        return this.__resetRecord();
      }
      const recordLength = record2.length;
      if (columns === true) {
        if (skip_records_with_empty_values === true && isRecordEmpty(record2)) {
          this.__resetRecord();
          return;
        }
        return this.__firstLineToColumns(record2);
      }
      if (columns === false && this.info.records === 0) {
        this.state.expectedRecordLength = recordLength;
      }
      if (recordLength !== this.state.expectedRecordLength) {
        const err = columns === false ? new CsvError("CSV_RECORD_INCONSISTENT_FIELDS_LENGTH", [
          "Invalid Record Length:",
          `expect ${this.state.expectedRecordLength},`,
          `got ${recordLength} on line ${this.info.lines}`
        ], this.options, this.__infoField(), {
          record: record2
        }) : new CsvError("CSV_RECORD_INCONSISTENT_COLUMNS", [
          "Invalid Record Length:",
          `columns length is ${columns.length},`,
          `got ${recordLength} on line ${this.info.lines}`
        ], this.options, this.__infoField(), {
          record: record2
        });
        if (relax_column_count === true || relax_column_count_less === true && recordLength < this.state.expectedRecordLength || relax_column_count_more === true && recordLength > this.state.expectedRecordLength) {
          this.info.invalid_field_length++;
          this.state.error = err;
        } else {
          const finalErr = this.__error(err);
          if (finalErr)
            return finalErr;
        }
      }
      if (skip_records_with_empty_values === true && isRecordEmpty(record2)) {
        this.__resetRecord();
        return;
      }
      if (this.state.recordHasError === true) {
        this.__resetRecord();
        this.state.recordHasError = false;
        return;
      }
      this.info.records++;
      if (from === 1 || this.info.records >= from) {
        const { objname } = this.options;
        if (columns !== false) {
          const obj = {};
          for (let i = 0, l = record2.length;i < l; i++) {
            if (columns[i] === undefined || columns[i].disabled)
              continue;
            if (group_columns_by_name === true && obj[columns[i].name] !== undefined) {
              if (Array.isArray(obj[columns[i].name])) {
                obj[columns[i].name] = obj[columns[i].name].concat(record2[i]);
              } else {
                obj[columns[i].name] = [obj[columns[i].name], record2[i]];
              }
            } else {
              obj[columns[i].name] = record2[i];
            }
          }
          if (raw === true || info2 === true) {
            const extRecord = Object.assign({ record: obj }, raw === true ? { raw: this.state.rawBuffer.toString(encoding) } : {}, info2 === true ? { info: this.__infoRecord() } : {});
            const err = this.__push(objname === undefined ? extRecord : [obj[objname], extRecord], push);
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(objname === undefined ? obj : [obj[objname], obj], push);
            if (err) {
              return err;
            }
          }
        } else {
          if (raw === true || info2 === true) {
            const extRecord = Object.assign({ record: record2 }, raw === true ? { raw: this.state.rawBuffer.toString(encoding) } : {}, info2 === true ? { info: this.__infoRecord() } : {});
            const err = this.__push(objname === undefined ? extRecord : [record2[objname], extRecord], push);
            if (err) {
              return err;
            }
          } else {
            const err = this.__push(objname === undefined ? record2 : [record2[objname], record2], push);
            if (err) {
              return err;
            }
          }
        }
      }
      this.__resetRecord();
    },
    __firstLineToColumns: function(record2) {
      const { firstLineToHeaders } = this.state;
      try {
        const headers = firstLineToHeaders === undefined ? record2 : firstLineToHeaders.call(null, record2);
        if (!Array.isArray(headers)) {
          return this.__error(new CsvError("CSV_INVALID_COLUMN_MAPPING", [
            "Invalid Column Mapping:",
            "expect an array from column function,",
            `got ${JSON.stringify(headers)}`
          ], this.options, this.__infoField(), {
            headers
          }));
        }
        const normalizedHeaders = normalize_columns_array(headers);
        this.state.expectedRecordLength = normalizedHeaders.length;
        this.options.columns = normalizedHeaders;
        this.__resetRecord();
        return;
      } catch (err) {
        return err;
      }
    },
    __resetRecord: function() {
      if (this.options.raw === true) {
        this.state.rawBuffer.reset();
      }
      this.state.error = undefined;
      this.state.record = [];
      this.state.record_length = 0;
    },
    __onField: function() {
      const { cast, encoding, rtrim, max_record_size } = this.options;
      const { enabled, wasQuoting } = this.state;
      if (enabled === false) {
        return this.__resetField();
      }
      let field = this.state.field.toString(encoding);
      if (rtrim === true && wasQuoting === false) {
        field = field.trimRight();
      }
      if (cast === true) {
        const [err, f] = this.__cast(field);
        if (err !== undefined)
          return err;
        field = f;
      }
      this.state.record.push(field);
      if (max_record_size !== 0 && typeof field === "string") {
        this.state.record_length += field.length;
      }
      this.__resetField();
    },
    __resetField: function() {
      this.state.field.reset();
      this.state.wasQuoting = false;
    },
    __push: function(record2, push) {
      const { on_record } = this.options;
      if (on_record !== undefined) {
        const info2 = this.__infoRecord();
        try {
          record2 = on_record.call(null, record2, info2);
        } catch (err) {
          return err;
        }
        if (record2 === undefined || record2 === null) {
          return;
        }
      }
      this.info.bytes_records += this.info.bytes;
      push(record2);
    },
    __cast: function(field) {
      const { columns, relax_column_count } = this.options;
      const isColumns = Array.isArray(columns);
      if (isColumns === true && relax_column_count && this.options.columns.length <= this.state.record.length) {
        return [undefined, undefined];
      }
      if (this.state.castField !== null) {
        try {
          const info2 = this.__infoField();
          return [undefined, this.state.castField.call(null, field, info2)];
        } catch (err) {
          return [err];
        }
      }
      if (this.__isFloat(field)) {
        return [undefined, parseFloat(field)];
      } else if (this.options.cast_date !== false) {
        const info2 = this.__infoField();
        return [undefined, this.options.cast_date.call(null, field, info2)];
      }
      return [undefined, field];
    },
    __isCharTrimable: function(buf, pos) {
      const isTrim = (buf2, pos2) => {
        const { timchars } = this.state;
        loop1:
          for (let i = 0;i < timchars.length; i++) {
            const timchar = timchars[i];
            for (let j = 0;j < timchar.length; j++) {
              if (timchar[j] !== buf2[pos2 + j])
                continue loop1;
            }
            return timchar.length;
          }
        return 0;
      };
      return isTrim(buf, pos);
    },
    __isFloat: function(value) {
      return value - parseFloat(value) + 1 >= 0;
    },
    __compareBytes: function(sourceBuf, targetBuf, targetPos, firstByte) {
      if (sourceBuf[0] !== firstByte)
        return 0;
      const sourceLength = sourceBuf.length;
      for (let i = 1;i < sourceLength; i++) {
        if (sourceBuf[i] !== targetBuf[targetPos + i])
          return 0;
      }
      return sourceLength;
    },
    __isDelimiter: function(buf, pos, chr) {
      const { delimiter, ignore_last_delimiters } = this.options;
      if (ignore_last_delimiters === true && this.state.record.length === this.options.columns.length - 1) {
        return 0;
      } else if (ignore_last_delimiters !== false && typeof ignore_last_delimiters === "number" && this.state.record.length === ignore_last_delimiters - 1) {
        return 0;
      }
      loop1:
        for (let i = 0;i < delimiter.length; i++) {
          const del = delimiter[i];
          if (del[0] === chr) {
            for (let j = 1;j < del.length; j++) {
              if (del[j] !== buf[pos + j])
                continue loop1;
            }
            return del.length;
          }
        }
      return 0;
    },
    __isRecordDelimiter: function(chr, buf, pos) {
      const { record_delimiter } = this.options;
      const recordDelimiterLength = record_delimiter.length;
      loop1:
        for (let i = 0;i < recordDelimiterLength; i++) {
          const rd = record_delimiter[i];
          const rdLength = rd.length;
          if (rd[0] !== chr) {
            continue;
          }
          for (let j = 1;j < rdLength; j++) {
            if (rd[j] !== buf[pos + j]) {
              continue loop1;
            }
          }
          return rd.length;
        }
      return 0;
    },
    __isEscape: function(buf, pos, chr) {
      const { escape } = this.options;
      if (escape === null)
        return false;
      const l = escape.length;
      if (escape[0] === chr) {
        for (let i = 0;i < l; i++) {
          if (escape[i] !== buf[pos + i]) {
            return false;
          }
        }
        return true;
      }
      return false;
    },
    __isQuote: function(buf, pos) {
      const { quote } = this.options;
      if (quote === null)
        return false;
      const l = quote.length;
      for (let i = 0;i < l; i++) {
        if (quote[i] !== buf[pos + i]) {
          return false;
        }
      }
      return true;
    },
    __autoDiscoverRecordDelimiter: function(buf, pos) {
      const { encoding } = this.options;
      const rds = [
        Buffer.from(`\r
`, encoding),
        Buffer.from(`
`, encoding),
        Buffer.from("\r", encoding)
      ];
      loop:
        for (let i = 0;i < rds.length; i++) {
          const l = rds[i].length;
          for (let j = 0;j < l; j++) {
            if (rds[i][j] !== buf[pos + j]) {
              continue loop;
            }
          }
          this.options.record_delimiter.push(rds[i]);
          this.state.recordDelimiterMaxLength = rds[i].length;
          return rds[i].length;
        }
      return 0;
    },
    __error: function(msg) {
      const { encoding, raw, skip_records_with_error } = this.options;
      const err = typeof msg === "string" ? new Error(msg) : msg;
      if (skip_records_with_error) {
        this.state.recordHasError = true;
        if (this.options.on_skip !== undefined) {
          try {
            this.options.on_skip(err, raw ? this.state.rawBuffer.toString(encoding) : undefined);
          } catch (err2) {
            return err2;
          }
        }
        return;
      } else {
        return err;
      }
    },
    __infoDataSet: function() {
      return {
        ...this.info,
        columns: this.options.columns
      };
    },
    __infoRecord: function() {
      const { columns, raw, encoding } = this.options;
      return {
        ...this.__infoDataSet(),
        bytes_records: this.info.bytes,
        error: this.state.error,
        header: columns === true,
        index: this.state.record.length,
        raw: raw ? this.state.rawBuffer.toString(encoding) : undefined
      };
    },
    __infoField: function() {
      const { columns } = this.options;
      const isColumns = Array.isArray(columns);
      const bytes_records = this.info.bytes_records;
      return {
        ...this.__infoRecord(),
        bytes_records,
        column: isColumns === true ? columns.length > this.state.record.length ? columns[this.state.record.length].name : null : this.state.record.length,
        quoting: this.state.wasQuoting
      };
    }
  };
};
var init_api2 = __esm(() => {
  init_normalize_columns_array();
  init_init_state();
  init_normalize_options();
  init_CsvError();
  boms = {
    utf8: Buffer.from([239, 187, 191]),
    utf16le: Buffer.from([255, 254])
  };
});

// node_modules/.bun/csv-parse@6.2.1/node_modules/csv-parse/lib/sync.js
var parse5 = function(data, opts = {}) {
  if (typeof data === "string") {
    data = Buffer.from(data);
  }
  const records = opts && opts.objname ? {} : [];
  const parser = transform2(opts);
  const push = (record2) => {
    if (parser.options.objname === undefined)
      records.push(record2);
    else {
      records[record2[0]] = record2[1];
    }
  };
  const close = () => {};
  const error51 = parser.parse(data, true, push, close);
  if (error51 !== undefined)
    throw error51;
  return records;
};
var init_sync = __esm(() => {
  init_api2();
});

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/utils/get.js
var charCodeOfDot = 46, reEscapeChar, rePropName, reIsDeepProp, reIsPlainProp, getTag = function(value) {
  return Object.prototype.toString.call(value);
}, isSymbol = function(value) {
  const type = typeof value;
  return type === "symbol" || type === "object" && value && getTag(value) === "[object Symbol]";
}, isKey = function(value, object2) {
  if (Array.isArray(value)) {
    return false;
  }
  const type = typeof value;
  if (type === "number" || type === "symbol" || type === "boolean" || !value || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object2 != null && value in Object(object2);
}, stringToPath = function(string4) {
  const result = [];
  if (string4.charCodeAt(0) === charCodeOfDot) {
    result.push("");
  }
  string4.replace(rePropName, function(match, expression, quote, subString) {
    let key = match;
    if (quote) {
      key = subString.replace(reEscapeChar, "$1");
    } else if (expression) {
      key = expression.trim();
    }
    result.push(key);
  });
  return result;
}, castPath = function(value, object2) {
  if (Array.isArray(value)) {
    return value;
  } else {
    return isKey(value, object2) ? [value] : stringToPath(value);
  }
}, toKey = function(value) {
  if (typeof value === "string" || isSymbol(value))
    return value;
  const result = `${value}`;
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}, get = function(object2, path) {
  path = castPath(path, object2);
  let index = 0;
  const length = path.length;
  while (object2 != null && index < length) {
    object2 = object2[toKey(path[index++])];
  }
  return index && index === length ? object2 : undefined;
};
var init_get = __esm(() => {
  reEscapeChar = /\\(\\)?/g;
  rePropName = RegExp("[^.[\\]]+" + "|" + "\\[(?:" + `([^"'][^[]*)` + "|" + `(["'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2` + ")\\]" + "|" + "(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))", "g");
  reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
  reIsPlainProp = /^\w*$/;
});

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/utils/is_object.js
var is_object2 = function(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
};
var init_is_object2 = () => {};

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/api/normalize_columns.js
var normalize_columns = function(columns) {
  if (columns === undefined || columns === null) {
    return [undefined, undefined];
  }
  if (typeof columns !== "object") {
    return [Error('Invalid option "columns": expect an array or an object')];
  }
  if (!Array.isArray(columns)) {
    const newcolumns = [];
    for (const k in columns) {
      newcolumns.push({
        key: k,
        header: columns[k]
      });
    }
    columns = newcolumns;
  } else {
    const newcolumns = [];
    for (const column of columns) {
      if (typeof column === "string") {
        newcolumns.push({
          key: column,
          header: column
        });
      } else if (typeof column === "object" && column !== null && !Array.isArray(column)) {
        if (!column.key) {
          return [
            Error('Invalid column definition: property "key" is required')
          ];
        }
        if (column.header === undefined) {
          column.header = column.key;
        }
        newcolumns.push(column);
      } else {
        return [
          Error("Invalid column definition: expect a string or an object")
        ];
      }
    }
    columns = newcolumns;
  }
  return [undefined, columns];
};
var init_normalize_columns = () => {};

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/api/CsvError.js
var CsvError2;
var init_CsvError2 = __esm(() => {
  CsvError2 = class CsvError2 extends Error {
    constructor(code, message, ...contexts) {
      if (Array.isArray(message))
        message = message.join(" ");
      super(message);
      if (Error.captureStackTrace !== undefined) {
        Error.captureStackTrace(this, CsvError2);
      }
      this.code = code;
      for (const context of contexts) {
        for (const key in context) {
          const value = context[key];
          this[key] = Buffer.isBuffer(value) ? value.toString() : value == null ? value : JSON.parse(JSON.stringify(value));
        }
      }
    }
  };
});

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/utils/underscore.js
var underscore2 = function(str) {
  return str.replace(/([A-Z])/g, function(_, match) {
    return "_" + match.toLowerCase();
  });
};
var init_underscore2 = () => {};

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/api/normalize_options.js
var normalize_options2 = function(opts) {
  const options = {};
  for (const opt in opts) {
    options[underscore2(opt)] = opts[opt];
  }
  if (options.bom === undefined || options.bom === null || options.bom === false) {
    options.bom = false;
  } else if (options.bom !== true) {
    return [
      new CsvError2("CSV_OPTION_BOOLEAN_INVALID_TYPE", [
        "option `bom` is optional and must be a boolean value,",
        `got ${JSON.stringify(options.bom)}`
      ])
    ];
  }
  if (options.delimiter === undefined || options.delimiter === null) {
    options.delimiter = ",";
  } else if (Buffer.isBuffer(options.delimiter)) {
    options.delimiter = options.delimiter.toString();
  } else if (typeof options.delimiter !== "string") {
    return [
      new CsvError2("CSV_OPTION_DELIMITER_INVALID_TYPE", [
        "option `delimiter` must be a buffer or a string,",
        `got ${JSON.stringify(options.delimiter)}`
      ])
    ];
  }
  if (options.quote === undefined || options.quote === null) {
    options.quote = '"';
  } else if (options.quote === true) {
    options.quote = '"';
  } else if (options.quote === false) {
    options.quote = "";
  } else if (Buffer.isBuffer(options.quote)) {
    options.quote = options.quote.toString();
  } else if (typeof options.quote !== "string") {
    return [
      new CsvError2("CSV_OPTION_QUOTE_INVALID_TYPE", [
        "option `quote` must be a boolean, a buffer or a string,",
        `got ${JSON.stringify(options.quote)}`
      ])
    ];
  }
  if (options.quoted === undefined || options.quoted === null) {
    options.quoted = false;
  }
  if (options.escape_formulas === undefined || options.escape_formulas === null) {
    options.escape_formulas = false;
  } else if (typeof options.escape_formulas !== "boolean") {
    return [
      new CsvError2("CSV_OPTION_ESCAPE_FORMULAS_INVALID_TYPE", [
        "option `escape_formulas` must be a boolean,",
        `got ${JSON.stringify(options.escape_formulas)}`
      ])
    ];
  }
  if (options.quoted_empty === undefined || options.quoted_empty === null) {
    options.quoted_empty = undefined;
  }
  if (options.quoted_match === undefined || options.quoted_match === null || options.quoted_match === false) {
    options.quoted_match = null;
  } else if (!Array.isArray(options.quoted_match)) {
    options.quoted_match = [options.quoted_match];
  }
  if (options.quoted_match) {
    for (const quoted_match of options.quoted_match) {
      const isString = typeof quoted_match === "string";
      const isRegExp = quoted_match instanceof RegExp;
      if (!isString && !isRegExp) {
        return [
          new CsvError2("CSV_OPTION_QUOTED_MATCH", [
            "option `quoted_match` must be a string or a regex,",
            `got ${JSON.stringify(options.quoted_match)}`
          ])
        ];
      }
    }
  }
  if (options.quoted_string === undefined || options.quoted_string === null) {
    options.quoted_string = false;
  }
  if (options.eof === undefined || options.eof === null) {
    options.eof = true;
  }
  if (options.escape === undefined || options.escape === null) {
    options.escape = '"';
  } else if (Buffer.isBuffer(options.escape)) {
    options.escape = options.escape.toString();
  } else if (typeof options.escape !== "string") {
    return [
      Error(`Invalid Option: escape must be a buffer or a string, got ${JSON.stringify(options.escape)}`)
    ];
  }
  if (options.escape.length > 1) {
    return [
      Error(`Invalid Option: escape must be one character, got ${options.escape.length} characters`)
    ];
  }
  if (options.header === undefined || options.header === null || options.header === false) {
    options.header = false;
  } else if (options.header !== true) {
    throw new CsvError2("CSV_INVALID_OPTION_HEADER", [
      "option `header` is expected to be a boolean,",
      `got ${JSON.stringify(options.header)}`
    ], options);
  }
  if (options.header_as_comment === undefined || options.header_as_comment === null || options.header_as_comment === false) {
    options.header_as_comment = false;
  } else if (options.header_as_comment === true) {
    options.header_as_comment = "#";
  } else if (Buffer.isBuffer(options.header_as_comment)) {
    options.header_as_comment = options.header_as_comment.toString();
  } else if (typeof options.header_as_comment !== "string") {
    throw new CsvError2("CSV_INVALID_OPTION_HEADER_AS_COMMENT", [
      "option `header_as_comment` must be a boolean, a string or a buffer,",
      `got ${JSON.stringify(options.header_as_comment)}`
    ], options);
  }
  const [errColumns, columns] = normalize_columns(options.columns);
  if (errColumns !== undefined)
    return [errColumns];
  options.columns = columns;
  if (options.quoted === undefined || options.quoted === null) {
    options.quoted = false;
  }
  if (options.cast === undefined || options.cast === null) {
    options.cast = {};
  }
  if (options.cast.bigint === undefined || options.cast.bigint === null) {
    options.cast.bigint = (value) => "" + value;
  }
  if (options.cast.boolean === undefined || options.cast.boolean === null) {
    options.cast.boolean = (value) => value ? "1" : "";
  }
  if (options.cast.date === undefined || options.cast.date === null) {
    options.cast.date = (value) => "" + value.getTime();
  }
  if (options.cast.number === undefined || options.cast.number === null) {
    options.cast.number = (value) => "" + value;
  }
  if (options.cast.object === undefined || options.cast.object === null) {
    options.cast.object = (value) => JSON.stringify(value);
  }
  if (options.cast.string === undefined || options.cast.string === null) {
    options.cast.string = function(value) {
      return value;
    };
  }
  if (options.on_record !== undefined && typeof options.on_record !== "function") {
    return [Error(`Invalid Option: "on_record" must be a function.`)];
  }
  if (options.record_delimiter === undefined || options.record_delimiter === null) {
    options.record_delimiter = `
`;
  } else if (Buffer.isBuffer(options.record_delimiter)) {
    options.record_delimiter = options.record_delimiter.toString();
  } else if (typeof options.record_delimiter !== "string") {
    return [
      Error(`Invalid Option: record_delimiter must be a buffer or a string, got ${JSON.stringify(options.record_delimiter)}`)
    ];
  }
  switch (options.record_delimiter) {
    case "unix":
      options.record_delimiter = `
`;
      break;
    case "mac":
      options.record_delimiter = "\r";
      break;
    case "windows":
      options.record_delimiter = `\r
`;
      break;
    case "ascii":
      options.record_delimiter = "\x1E";
      break;
    case "unicode":
      options.record_delimiter = "\u2028";
      break;
  }
  return [undefined, options];
};
var init_normalize_options2 = __esm(() => {
  init_CsvError2();
  init_normalize_columns();
  init_underscore2();
});

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/api/index.js
var bom_utf8, stringifier = function(options, state, info) {
  return {
    options,
    state,
    info,
    __transform: function(chunk, push) {
      if (!Array.isArray(chunk) && typeof chunk !== "object") {
        return Error(`Invalid Record: expect an array or an object, got ${JSON.stringify(chunk)}`);
      }
      if (this.info.records === 0) {
        if (Array.isArray(chunk)) {
          if (this.options.header === true && this.options.columns === undefined) {
            return Error("Undiscoverable Columns: header option requires column option or object records");
          }
        } else if (this.options.columns === undefined) {
          const [err2, columns] = normalize_columns(Object.keys(chunk));
          if (err2)
            return;
          this.options.columns = columns;
        }
      }
      if (this.info.records === 0) {
        this.bom(push);
        const err2 = this.headers(push);
        if (err2)
          return err2;
      }
      try {
        if (this.options.on_record) {
          this.options.on_record(chunk, this.info.records);
        }
      } catch (err2) {
        return err2;
      }
      let err, chunk_string;
      if (this.options.eof) {
        [err, chunk_string] = this.stringify(chunk);
        if (err)
          return err;
        if (chunk_string === undefined) {
          return;
        } else {
          chunk_string = chunk_string + this.options.record_delimiter;
        }
      } else {
        [err, chunk_string] = this.stringify(chunk);
        if (err)
          return err;
        if (chunk_string === undefined) {
          return;
        } else {
          if (this.options.header || this.info.records) {
            chunk_string = this.options.record_delimiter + chunk_string;
          }
        }
      }
      this.info.records++;
      push(chunk_string);
    },
    stringify: function(chunk, chunkIsHeader = false) {
      if (typeof chunk !== "object") {
        return [undefined, chunk];
      }
      const { columns } = this.options;
      const record2 = [];
      if (Array.isArray(chunk)) {
        if (columns) {
          chunk.splice(columns.length);
        }
        for (let i = 0;i < chunk.length; i++) {
          const field = chunk[i];
          const [err, value] = this.__cast(field, {
            index: i,
            column: i,
            records: this.info.records,
            header: chunkIsHeader
          });
          if (err)
            return [err];
          record2[i] = [value, field];
        }
      } else {
        for (let i = 0;i < columns.length; i++) {
          const field = get(chunk, columns[i].key);
          const [err, value] = this.__cast(field, {
            index: i,
            column: columns[i].key,
            records: this.info.records,
            header: chunkIsHeader
          });
          if (err)
            return [err];
          record2[i] = [value, field];
        }
      }
      let csvrecord = "";
      for (let i = 0;i < record2.length; i++) {
        let options2, err;
        let [value, field] = record2[i];
        if (typeof value === "string") {
          options2 = this.options;
        } else if (is_object2(value)) {
          options2 = value;
          value = options2.value;
          delete options2.value;
          if (typeof value !== "string" && value !== undefined && value !== null) {
            if (err)
              return [
                Error(`Invalid Casting Value: returned value must return a string, null or undefined, got ${JSON.stringify(value)}`)
              ];
          }
          options2 = { ...this.options, ...options2 };
          [err, options2] = normalize_options2(options2);
          if (err !== undefined) {
            return [err];
          }
        } else if (value === undefined || value === null) {
          options2 = this.options;
        } else {
          return [
            Error(`Invalid Casting Value: returned value must return a string, an object, null or undefined, got ${JSON.stringify(value)}`)
          ];
        }
        const {
          delimiter,
          escape,
          quote,
          quoted,
          quoted_empty,
          quoted_string,
          quoted_match,
          record_delimiter,
          escape_formulas
        } = options2;
        if (value === "" && field === "") {
          let quotedMatch = quoted_match && quoted_match.filter((quoted_match2) => {
            if (typeof quoted_match2 === "string") {
              return value.indexOf(quoted_match2) !== -1;
            } else {
              return quoted_match2.test(value);
            }
          });
          quotedMatch = quotedMatch && quotedMatch.length > 0;
          const shouldQuote = quotedMatch || quoted_empty === true || quoted_string === true && quoted_empty !== false;
          if (shouldQuote === true) {
            value = quote + value + quote;
          }
          csvrecord += value;
        } else if (value) {
          if (typeof value !== "string") {
            return [
              Error(`Formatter must return a string, null or undefined, got ${JSON.stringify(value)}`)
            ];
          }
          const containsdelimiter = delimiter.length && value.indexOf(delimiter) >= 0;
          const containsQuote = quote !== "" && value.indexOf(quote) >= 0;
          const containsEscape = value.indexOf(escape) >= 0 && escape !== quote;
          const containsRecordDelimiter = value.indexOf(record_delimiter) >= 0;
          const quotedString = quoted_string && typeof field === "string";
          let quotedMatch = quoted_match && quoted_match.filter((quoted_match2) => {
            if (typeof quoted_match2 === "string") {
              return value.indexOf(quoted_match2) !== -1;
            } else {
              return quoted_match2.test(value);
            }
          });
          quotedMatch = quotedMatch && quotedMatch.length > 0;
          if (escape_formulas) {
            switch (value[0]) {
              case "=":
              case "+":
              case "-":
              case "@":
              case "\t":
              case "\r":
              case "＝":
              case "＋":
              case "－":
              case "＠":
                value = `'${value}`;
                break;
            }
          }
          const shouldQuote = containsQuote === true || containsdelimiter || containsRecordDelimiter || quoted || quotedString || quotedMatch;
          if (shouldQuote === true && containsEscape === true) {
            const regexp = escape === "\\" ? new RegExp(escape + escape, "g") : new RegExp(escape, "g");
            value = value.replace(regexp, escape + escape);
          }
          if (containsQuote === true) {
            const regexp = new RegExp(quote, "g");
            value = value.replace(regexp, escape + quote);
          }
          if (shouldQuote === true) {
            value = quote + value + quote;
          }
          csvrecord += value;
        } else if (quoted_empty === true || field === "" && quoted_string === true && quoted_empty !== false) {
          csvrecord += quote + quote;
        }
        if (i !== record2.length - 1) {
          csvrecord += delimiter;
        }
      }
      return [undefined, csvrecord];
    },
    bom: function(push) {
      if (this.options.bom !== true) {
        return;
      }
      push(bom_utf8);
    },
    headers: function(push) {
      if (this.options.header === false) {
        return;
      }
      if (this.options.columns === undefined) {
        return;
      }
      let err;
      let headers = this.options.columns.map((column) => column.header);
      if (this.options.eof) {
        [err, headers] = this.stringify(headers, true);
        headers += this.options.record_delimiter;
      } else {
        [err, headers] = this.stringify(headers);
      }
      if (err)
        return err;
      if (this.options.header_as_comment) {
        headers = this.options.header_as_comment + " " + headers;
      }
      push(headers);
    },
    __cast: function(value, context) {
      const type = typeof value;
      try {
        if (type === "string") {
          return [undefined, this.options.cast.string(value, context)];
        } else if (type === "bigint") {
          return [undefined, this.options.cast.bigint(value, context)];
        } else if (type === "number") {
          return [undefined, this.options.cast.number(value, context)];
        } else if (type === "boolean") {
          return [undefined, this.options.cast.boolean(value, context)];
        } else if (value instanceof Date) {
          return [undefined, this.options.cast.date(value, context)];
        } else if (type === "object" && value !== null) {
          return [undefined, this.options.cast.object(value, context)];
        } else {
          return [undefined, value, value];
        }
      } catch (err) {
        return [err];
      }
    }
  };
};
var init_api3 = __esm(() => {
  init_get();
  init_is_object2();
  init_normalize_columns();
  init_normalize_options2();
  bom_utf8 = Buffer.from([239, 187, 191]);
});

// node_modules/.bun/csv-stringify@6.7.0/node_modules/csv-stringify/lib/sync.js
var stringify = function(records, opts = {}) {
  const data = [];
  const [err, options] = normalize_options2(opts);
  if (err !== undefined)
    throw err;
  const state = {
    stop: false
  };
  const info = {
    records: 0
  };
  const api2 = stringifier(options, state, info);
  for (const record2 of records) {
    const err2 = api2.__transform(record2, function(record3) {
      data.push(record3);
    });
    if (err2 !== undefined)
      throw err2;
  }
  if (data.length === 0) {
    api2.bom((d) => {
      data.push(d);
    });
    const err2 = api2.headers((headers) => {
      data.push(headers);
    });
    if (err2 !== undefined)
      throw err2;
  }
  return data.join("");
};
var init_sync2 = __esm(() => {
  init_api3();
  init_normalize_options2();
});

// packages/file-io/codecs/csv.ts
var exports_csv = {};
__export(exports_csv, {
  csvCodec: () => csvCodec
});
function csvCellString(value) {
  if (value === null || value === undefined)
    return "";
  if (typeof value === "object")
    return JSON.stringify(value);
  return String(value);
}
var csvCodec;
var init_csv = __esm(() => {
  init_sync();
  init_sync2();
  init_table_plan();
  csvCodec = {
    id: "csv",
    extensions: [".csv"],
    contentTypes: ["csv"],
    parse(bytes) {
      const text = new TextDecoder().decode(bytes);
      const records = parse5(text, { skip_empty_lines: true, trim: true, bom: true });
      if (records.length === 0)
        return { rows: [], columns: [] };
      const header = records[0];
      const rows = records.slice(1).map((rec) => {
        const row = {};
        header.forEach((col, i) => setCell(row, col, rec[i] ?? null));
        return row;
      });
      return { rows, columns: header };
    },
    serialize(rows, columns, headers) {
      const records = rows.map((row) => columns.map((col) => csvCellString(cellAt(row, col))));
      return new TextEncoder().encode(stringify(records, { header: true, columns: headers ?? columns, quoted_match: /\r/ }));
    }
  };
});

// packages/file-io/codecs/jsonl.ts
var exports_jsonl = {};
__export(exports_jsonl, {
  jsonlCodec: () => jsonlCodec
});
var jsonlCodec;
var init_jsonl = __esm(() => {
  init_table_plan();
  jsonlCodec = {
    id: "jsonl",
    extensions: [".jsonl", ".ndjson"],
    contentTypes: ["jsonl", "ndjson"],
    parse(bytes, name) {
      const text = new TextDecoder().decode(bytes);
      const rows = [];
      text.split(`
`).forEach((raw, i) => {
        const line = raw.trim();
        if (line === "")
          return;
        let value;
        try {
          value = JSON.parse(line);
        } catch (e) {
          throw new Error(`${name}:${i + 1} malformed JSON: ${e.message}`);
        }
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
          throw new Error(`${name}:${i + 1} not a JSON object: ${line}`);
        }
        rows.push(value);
      });
      const columns = [];
      const seen = new Set;
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          if (!seen.has(key)) {
            seen.add(key);
            columns.push(key);
          }
        }
      }
      return { rows, columns };
    },
    serialize(rows, columns) {
      const lines = rows.map((row) => {
        if (!columns)
          return JSON.stringify(row);
        const ordered = {};
        for (const col of columns)
          setCell(ordered, col, cellAt(row, col) ?? null);
        for (const k of Object.keys(row))
          if (!Object.hasOwn(ordered, k))
            setCell(ordered, k, row[k] ?? null);
        return JSON.stringify(ordered);
      }).join(`
`);
      return new TextEncoder().encode(lines + (lines.length ? `
` : ""));
    }
  };
});

// node:os
var tmpdir = function() {
  return "/tmp";
};
var init_os = () => {};

// node:path
function assertPath(path) {
  if (typeof path !== "string")
    throw TypeError("Path must be a string. Received " + JSON.stringify(path));
}
function normalizeStringPosix(path, allowAboveRoot) {
  var res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, code;
  for (var i = 0;i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47)
      break;
    else
      code = 47;
    if (code === 47) {
      if (lastSlash === i - 1 || dots === 1)
        ;
      else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1)
                res = "", lastSegmentLength = 0;
              else
                res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              lastSlash = i, dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = "", lastSegmentLength = 0, lastSlash = i, dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += "/..";
          else
            res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += "/" + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i, dots = 0;
    } else if (code === 46 && dots !== -1)
      ++dots;
    else
      dots = -1;
  }
  return res;
}
function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root, base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
  if (!dir)
    return base;
  if (dir === pathObject.root)
    return dir + base;
  return dir + sep + base;
}
function resolve() {
  var resolvedPath = "", resolvedAbsolute = false, cwd;
  for (var i = arguments.length - 1;i >= -1 && !resolvedAbsolute; i--) {
    var path;
    if (i >= 0)
      path = arguments[i];
    else {
      if (cwd === undefined)
        cwd = process.cwd();
      path = cwd;
    }
    if (assertPath(path), path.length === 0)
      continue;
    resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = path.charCodeAt(0) === 47;
  }
  if (resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute), resolvedAbsolute)
    if (resolvedPath.length > 0)
      return "/" + resolvedPath;
    else
      return "/";
  else if (resolvedPath.length > 0)
    return resolvedPath;
  else
    return ".";
}
function normalize(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var isAbsolute = path.charCodeAt(0) === 47, trailingSeparator = path.charCodeAt(path.length - 1) === 47;
  if (path = normalizeStringPosix(path, !isAbsolute), path.length === 0 && !isAbsolute)
    path = ".";
  if (path.length > 0 && trailingSeparator)
    path += "/";
  if (isAbsolute)
    return "/" + path;
  return path;
}
function isAbsolute(path) {
  return assertPath(path), path.length > 0 && path.charCodeAt(0) === 47;
}
function join() {
  if (arguments.length === 0)
    return ".";
  var joined;
  for (var i = 0;i < arguments.length; ++i) {
    var arg = arguments[i];
    if (assertPath(arg), arg.length > 0)
      if (joined === undefined)
        joined = arg;
      else
        joined += "/" + arg;
  }
  if (joined === undefined)
    return ".";
  return normalize(joined);
}
function relative(from, to) {
  if (assertPath(from), assertPath(to), from === to)
    return "";
  if (from = resolve(from), to = resolve(to), from === to)
    return "";
  var fromStart = 1;
  for (;fromStart < from.length; ++fromStart)
    if (from.charCodeAt(fromStart) !== 47)
      break;
  var fromEnd = from.length, fromLen = fromEnd - fromStart, toStart = 1;
  for (;toStart < to.length; ++toStart)
    if (to.charCodeAt(toStart) !== 47)
      break;
  var toEnd = to.length, toLen = toEnd - toStart, length = fromLen < toLen ? fromLen : toLen, lastCommonSep = -1, i = 0;
  for (;i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === 47)
          return to.slice(toStart + i + 1);
        else if (i === 0)
          return to.slice(toStart + i);
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === 47)
          lastCommonSep = i;
        else if (i === 0)
          lastCommonSep = 0;
      }
      break;
    }
    var fromCode = from.charCodeAt(fromStart + i), toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode)
      break;
    else if (fromCode === 47)
      lastCommonSep = i;
  }
  var out = "";
  for (i = fromStart + lastCommonSep + 1;i <= fromEnd; ++i)
    if (i === fromEnd || from.charCodeAt(i) === 47)
      if (out.length === 0)
        out += "..";
      else
        out += "/..";
  if (out.length > 0)
    return out + to.slice(toStart + lastCommonSep);
  else {
    if (toStart += lastCommonSep, to.charCodeAt(toStart) === 47)
      ++toStart;
    return to.slice(toStart);
  }
}
function _makeLong(path) {
  return path;
}
function dirname(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var code = path.charCodeAt(0), hasRoot = code === 47, end = -1, matchedSlash = true;
  for (var i = path.length - 1;i >= 1; --i)
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else
      matchedSlash = false;
  if (end === -1)
    return hasRoot ? "/" : ".";
  if (hasRoot && end === 1)
    return "//";
  return path.slice(0, end);
}
function basename(path, ext) {
  if (ext !== undefined && typeof ext !== "string")
    throw TypeError('"ext" argument must be a string');
  assertPath(path);
  var start = 0, end = -1, matchedSlash = true, i;
  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path)
      return "";
    var extIdx = ext.length - 1, firstNonSlashEnd = -1;
    for (i = path.length - 1;i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1)
          matchedSlash = false, firstNonSlashEnd = i + 1;
        if (extIdx >= 0)
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1)
              end = i;
          } else
            extIdx = -1, end = firstNonSlashEnd;
      }
    }
    if (start === end)
      end = firstNonSlashEnd;
    else if (end === -1)
      end = path.length;
    return path.slice(start, end);
  } else {
    for (i = path.length - 1;i >= 0; --i)
      if (path.charCodeAt(i) === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1)
        matchedSlash = false, end = i + 1;
    if (end === -1)
      return "";
    return path.slice(start, end);
  }
}
function extname(path) {
  assertPath(path);
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, preDotState = 0;
  for (var i = path.length - 1;i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    return "";
  return path.slice(startDot, end);
}
function format(pathObject) {
  if (pathObject === null || typeof pathObject !== "object")
    throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
  return _format("/", pathObject);
}
function parse6(path) {
  assertPath(path);
  var ret = { root: "", dir: "", base: "", ext: "", name: "" };
  if (path.length === 0)
    return ret;
  var code = path.charCodeAt(0), isAbsolute2 = code === 47, start;
  if (isAbsolute2)
    ret.root = "/", start = 1;
  else
    start = 0;
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, i = path.length - 1, preDotState = 0;
  for (;i >= start; --i) {
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    if (end !== -1)
      if (startPart === 0 && isAbsolute2)
        ret.base = ret.name = path.slice(1, end);
      else
        ret.base = ret.name = path.slice(startPart, end);
  } else {
    if (startPart === 0 && isAbsolute2)
      ret.name = path.slice(1, startDot), ret.base = path.slice(1, end);
    else
      ret.name = path.slice(startPart, startDot), ret.base = path.slice(startPart, end);
    ret.ext = path.slice(startDot, end);
  }
  if (startPart > 0)
    ret.dir = path.slice(0, startPart - 1);
  else if (isAbsolute2)
    ret.dir = "/";
  return ret;
}
var sep = "/", delimiter = ":", posix;
var init_path = __esm(() => {
  posix = ((p) => (p.posix = p, p))({ resolve, normalize, isAbsolute, join, relative, _makeLong, dirname, basename, extname, format, parse: parse6, sep, delimiter, win32: null, posix: null });
});

// packages/file-io/codecs/parquet-engine.ts
var {readFile, unlink, writeFile} = (() => ({}));
function nodeApi() {
  return apiPromise ??= import(NODE_API_SPECIFIER);
}
function conn() {
  return connPromise ??= (async () => {
    const { DuckDBInstance } = await nodeApi();
    const instance = await DuckDBInstance.create(":memory:");
    return instance.connect();
  })();
}
function tmpFile(ext) {
  return join(tmpdir(), `tamedtable-${process.pid}-${Date.now()}-${tmpSeq++}.${ext}`);
}
function sqlValue(v) {
  if (v === null || v === undefined)
    return "NULL";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return sqlString(s);
}
async function readParquetBytes(bytes) {
  const c = await conn();
  const path = tmpFile("parquet");
  await writeFile(path, bytes);
  try {
    const reader = await c.runAndReadAll(`SELECT * FROM read_parquet(${sqlString(path)})`);
    return { rows: reader.getRowObjects(), columns: reader.columnNames() };
  } finally {
    await unlink(path).catch(() => {});
  }
}
async function writeParquetBytes(rows, columns) {
  if (columns.length === 0) {
    throw new Error("Cannot save a table with no columns as Parquet — add a column or choose another format.");
  }
  const c = await conn();
  const path = tmpFile("parquet");
  await c.run("DROP TABLE IF EXISTS _tt_save");
  const colDefs = columns.map((col) => `${sqlIdent(col)} VARCHAR`).join(", ");
  await c.run(`CREATE TABLE _tt_save (${colDefs})`);
  if (rows.length > 0) {
    const BATCH = 100;
    for (let i = 0;i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const valuesSql = slice.map((row) => "(" + columns.map((col) => sqlValue(cellAt(row, col))).join(", ") + ")").join(", ");
      await c.run(`INSERT INTO _tt_save VALUES ${valuesSql}`);
    }
  }
  try {
    await c.run(`COPY _tt_save TO ${sqlString(path)} (FORMAT PARQUET)`);
    return new Uint8Array(await readFile(path));
  } finally {
    await unlink(path).catch(() => {});
    await c.run("DROP TABLE IF EXISTS _tt_save").catch(() => {});
  }
}
var NODE_API_SPECIFIER = "@duckdb/node-api", apiPromise, connPromise, tmpSeq = 0, sqlString = (s) => `'${s.replace(/'/g, "''")}'`, sqlIdent = (s) => `"${s.replace(/"/g, '""')}"`;
var init_parquet_engine = __esm(() => {
  init_os();
  init_path();
  init_table_plan();
});

// packages/file-io/codecs/values.ts
function normalizeCell(v) {
  return normalizeDbCell(v);
}
function normalizeRows(raw) {
  return raw.map((r) => {
    const out = {};
    for (const k of Object.keys(r))
      out[k] = normalizeCell(r[k]);
    return out;
  });
}
function warnIfHuge(bytes, name) {
  if (bytes.length > LARGE_FILE_BYTES) {
    const gb = (bytes.length / 1024 / 1024 / 1024).toFixed(1);
    console.warn(`file-io: ${name} is ${gb} GB — very large files may exhaust memory or run slowly.`);
  }
}
var LARGE_FILE_BYTES;
var init_values = __esm(() => {
  init_table_plan();
  LARGE_FILE_BYTES = 2 * 1024 * 1024 * 1024;
});

// packages/file-io/codecs/parquet.ts
var exports_parquet = {};
__export(exports_parquet, {
  parquetCodec: () => parquetCodec
});
var parquetCodec;
var init_parquet = __esm(() => {
  init_parquet_engine();
  init_values();
  parquetCodec = {
    id: "parquet",
    extensions: [".parquet", ".pq"],
    contentTypes: ["parquet"],
    async parse(bytes, name) {
      warnIfHuge(bytes, name);
      const { rows, columns } = await readParquetBytes(bytes);
      return { rows: normalizeRows(rows), columns };
    },
    serialize(rows, columns) {
      return writeParquetBytes(rows, columns);
    }
  };
});

// node_modules/.bun/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs
function __rest(s, e) {
  var t = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s);i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve2) {
      resolve2(value);
    });
  }
  return new (P || (P = Promise))(function(resolve2, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m)
    return m.call(o);
  if (o && typeof o.length === "number")
    return {
      next: function() {
        if (o && i >= o.length)
          o = undefined;
        return { value: o && o[i++], done: !o };
      }
    };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function awaitReturn(f) {
    return function(v) {
      return Promise.resolve(v).then(f, reject);
    };
  }
  function verb(n, f) {
    if (g[n]) {
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
      if (f)
        i[n] = f(i[n]);
    }
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length)
      resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function(e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function(v) {
      return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve2, reject) {
        v = o[n](v), settle(resolve2, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve2, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve2({ value: v2, done: d });
    }, reject);
  }
}
var init_tslib_es6 = () => {};

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/utf8.mjs
var decoder, decodeUtf8 = (buffer) => decoder.decode(buffer), encoder, encodeUtf8 = (value) => encoder.encode(value);
var init_utf8 = __esm(() => {
  decoder = new TextDecoder("utf-8");
  encoder = new TextEncoder;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/compat.mjs
var isNumber = (x) => typeof x === "number", isBoolean = (x) => typeof x === "boolean", isFunction = (x) => typeof x === "function", isObject2 = (x) => x != null && Object(x) === x, isPromise = (x) => {
  return isObject2(x) && isFunction(x.then);
}, isIterable = (x) => {
  return isObject2(x) && isFunction(x[Symbol.iterator]);
}, isAsyncIterable = (x) => {
  return isObject2(x) && isFunction(x[Symbol.asyncIterator]);
}, isArrowJSON = (x) => {
  return isObject2(x) && isObject2(x["schema"]);
}, isIteratorResult = (x) => {
  return isObject2(x) && "done" in x && "value" in x;
}, isFileHandle = (x) => {
  return isObject2(x) && isFunction(x["stat"]) && isNumber(x["fd"]);
}, isFetchResponse = (x) => {
  return isObject2(x) && isReadableDOMStream(x["body"]);
}, isReadableInterop = (x) => ("_getDOMStream" in x) && ("_getNodeStream" in x), isWritableDOMStream = (x) => {
  return isObject2(x) && isFunction(x["abort"]) && isFunction(x["getWriter"]) && !isReadableInterop(x);
}, isReadableDOMStream = (x) => {
  return isObject2(x) && isFunction(x["cancel"]) && isFunction(x["getReader"]) && !isReadableInterop(x);
}, isWritableNodeStream = (x) => {
  return isObject2(x) && isFunction(x["end"]) && isFunction(x["write"]) && isBoolean(x["writable"]) && !isReadableInterop(x);
}, isReadableNodeStream = (x) => {
  return isObject2(x) && isFunction(x["read"]) && isFunction(x["pipe"]) && isBoolean(x["readable"]) && !isReadableInterop(x);
}, isFlatbuffersByteBuffer = (x) => {
  return isObject2(x) && isFunction(x["clear"]) && isFunction(x["bytes"]) && isFunction(x["position"]) && isFunction(x["setPosition"]) && isFunction(x["capacity"]) && isFunction(x["getBufferIdentifier"]) && isFunction(x["createLong"]);
};

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/buffer.mjs
var exports_buffer = {};
__export(exports_buffer, {
  toUint8ClampedArrayIterator: () => toUint8ClampedArrayIterator,
  toUint8ClampedArrayAsyncIterator: () => toUint8ClampedArrayAsyncIterator,
  toUint8ClampedArray: () => toUint8ClampedArray,
  toUint8ArrayIterator: () => toUint8ArrayIterator,
  toUint8ArrayAsyncIterator: () => toUint8ArrayAsyncIterator,
  toUint8Array: () => toUint8Array,
  toUint32ArrayIterator: () => toUint32ArrayIterator,
  toUint32ArrayAsyncIterator: () => toUint32ArrayAsyncIterator,
  toUint32Array: () => toUint32Array,
  toUint16ArrayIterator: () => toUint16ArrayIterator,
  toUint16ArrayAsyncIterator: () => toUint16ArrayAsyncIterator,
  toUint16Array: () => toUint16Array,
  toInt8ArrayIterator: () => toInt8ArrayIterator,
  toInt8ArrayAsyncIterator: () => toInt8ArrayAsyncIterator,
  toInt8Array: () => toInt8Array,
  toInt32ArrayIterator: () => toInt32ArrayIterator,
  toInt32ArrayAsyncIterator: () => toInt32ArrayAsyncIterator,
  toInt32Array: () => toInt32Array,
  toInt16ArrayIterator: () => toInt16ArrayIterator,
  toInt16ArrayAsyncIterator: () => toInt16ArrayAsyncIterator,
  toInt16Array: () => toInt16Array,
  toFloat64ArrayIterator: () => toFloat64ArrayIterator,
  toFloat64ArrayAsyncIterator: () => toFloat64ArrayAsyncIterator,
  toFloat64Array: () => toFloat64Array,
  toFloat32ArrayIterator: () => toFloat32ArrayIterator,
  toFloat32ArrayAsyncIterator: () => toFloat32ArrayAsyncIterator,
  toFloat32Array: () => toFloat32Array,
  toBigUint64Array: () => toBigUint64Array,
  toBigInt64Array: () => toBigInt64Array,
  toArrayBufferViewIterator: () => toArrayBufferViewIterator,
  toArrayBufferViewAsyncIterator: () => toArrayBufferViewAsyncIterator,
  toArrayBufferView: () => toArrayBufferView,
  rebaseValueOffsets: () => rebaseValueOffsets,
  memcpy: () => memcpy,
  joinUint8Arrays: () => joinUint8Arrays,
  compareArrayLike: () => compareArrayLike
});
function collapseContiguousByteRanges(chunks) {
  const result = chunks[0] ? [chunks[0]] : [];
  let xOffset, yOffset, xLen, yLen;
  for (let x, y, i = 0, j = 0, n = chunks.length;++i < n; ) {
    x = result[j];
    y = chunks[i];
    if (!x || !y || x.buffer !== y.buffer || y.byteOffset < x.byteOffset) {
      y && (result[++j] = y);
      continue;
    }
    ({ byteOffset: xOffset, byteLength: xLen } = x);
    ({ byteOffset: yOffset, byteLength: yLen } = y);
    if (xOffset + xLen < yOffset || yOffset + yLen < xOffset) {
      y && (result[++j] = y);
      continue;
    }
    result[j] = new Uint8Array(x.buffer, xOffset, yOffset - xOffset + yLen);
  }
  return result;
}
function memcpy(target, source, targetByteOffset = 0, sourceByteLength = source.byteLength) {
  const targetByteLength = target.byteLength;
  const dst = new Uint8Array(target.buffer, target.byteOffset, targetByteLength);
  const src = new Uint8Array(source.buffer, source.byteOffset, Math.min(sourceByteLength, targetByteLength));
  dst.set(src, targetByteOffset);
  return target;
}
function joinUint8Arrays(chunks, size) {
  const result = collapseContiguousByteRanges(chunks);
  const byteLength = result.reduce((x, b) => x + b.byteLength, 0);
  let source, sliced, buffer;
  let offset = 0, index = -1;
  const length = Math.min(size || Number.POSITIVE_INFINITY, byteLength);
  for (const n = result.length;++index < n; ) {
    source = result[index];
    sliced = source.subarray(0, Math.min(source.length, length - offset));
    if (length <= offset + sliced.length) {
      if (sliced.length < source.length) {
        result[index] = source.subarray(sliced.length);
      } else if (sliced.length === source.length) {
        index++;
      }
      buffer ? memcpy(buffer, sliced, offset) : buffer = sliced;
      break;
    }
    memcpy(buffer || (buffer = new Uint8Array(length)), sliced, offset);
    offset += sliced.length;
  }
  return [buffer || new Uint8Array(0), result.slice(index), byteLength - (buffer ? buffer.byteLength : 0)];
}
function toArrayBufferView(ArrayBufferViewCtor, input) {
  let value = isIteratorResult(input) ? input.value : input;
  if (value instanceof ArrayBufferViewCtor) {
    if (ArrayBufferViewCtor === Uint8Array) {
      return new ArrayBufferViewCtor(value.buffer, value.byteOffset, value.byteLength);
    }
    return value;
  }
  if (!value) {
    return new ArrayBufferViewCtor(0);
  }
  if (typeof value === "string") {
    value = encodeUtf8(value);
  }
  if (value instanceof ArrayBuffer) {
    return new ArrayBufferViewCtor(value);
  }
  if (value instanceof SharedArrayBuf) {
    return new ArrayBufferViewCtor(value);
  }
  if (isFlatbuffersByteBuffer(value)) {
    return toArrayBufferView(ArrayBufferViewCtor, value.bytes());
  }
  return !ArrayBuffer.isView(value) ? ArrayBufferViewCtor.from(value) : value.byteLength <= 0 ? new ArrayBufferViewCtor(0) : new ArrayBufferViewCtor(value.buffer, value.byteOffset, value.byteLength / ArrayBufferViewCtor.BYTES_PER_ELEMENT);
}
function* toArrayBufferViewIterator(ArrayCtor, source) {
  const wrap = function* (x) {
    yield x;
  };
  const buffers = typeof source === "string" ? wrap(source) : ArrayBuffer.isView(source) ? wrap(source) : source instanceof ArrayBuffer ? wrap(source) : source instanceof SharedArrayBuf ? wrap(source) : !isIterable(source) ? wrap(source) : source;
  yield* pump(function* (it) {
    let r = null;
    do {
      r = it.next(yield toArrayBufferView(ArrayCtor, r));
    } while (!r.done);
  }(buffers[Symbol.iterator]()));
  return new ArrayCtor;
}
function toArrayBufferViewAsyncIterator(ArrayCtor, source) {
  return __asyncGenerator(this, arguments, function* toArrayBufferViewAsyncIterator_1() {
    if (isPromise(source)) {
      return yield __await(yield __await(yield* __asyncDelegator(__asyncValues(toArrayBufferViewAsyncIterator(ArrayCtor, yield __await(source))))));
    }
    const wrap = function(x) {
      return __asyncGenerator(this, arguments, function* () {
        yield yield __await(yield __await(x));
      });
    };
    const emit = function(source2) {
      return __asyncGenerator(this, arguments, function* () {
        yield __await(yield* __asyncDelegator(__asyncValues(pump(function* (it) {
          let r = null;
          do {
            r = it.next(yield r === null || r === undefined ? undefined : r.value);
          } while (!r.done);
        }(source2[Symbol.iterator]())))));
      });
    };
    const buffers = typeof source === "string" ? wrap(source) : ArrayBuffer.isView(source) ? wrap(source) : source instanceof ArrayBuffer ? wrap(source) : source instanceof SharedArrayBuf ? wrap(source) : isIterable(source) ? emit(source) : !isAsyncIterable(source) ? wrap(source) : source;
    yield __await(yield* __asyncDelegator(__asyncValues(pump(function(it) {
      return __asyncGenerator(this, arguments, function* () {
        let r = null;
        do {
          r = yield __await(it.next(yield yield __await(toArrayBufferView(ArrayCtor, r))));
        } while (!r.done);
      });
    }(buffers[Symbol.asyncIterator]())))));
    return yield __await(new ArrayCtor);
  });
}
function rebaseValueOffsets(offset, length, valueOffsets) {
  if (offset !== 0) {
    valueOffsets = valueOffsets.slice(0, length);
    for (let i = -1, n = valueOffsets.length;++i < n; ) {
      valueOffsets[i] += offset;
    }
  }
  return valueOffsets.subarray(0, length);
}
function compareArrayLike(a, b) {
  let i = 0;
  const n = a.length;
  if (n !== b.length) {
    return false;
  }
  if (n > 0) {
    do {
      if (a[i] !== b[i]) {
        return false;
      }
    } while (++i < n);
  }
  return true;
}
var SharedArrayBuf, toInt8Array = (input) => toArrayBufferView(Int8Array, input), toInt16Array = (input) => toArrayBufferView(Int16Array, input), toInt32Array = (input) => toArrayBufferView(Int32Array, input), toBigInt64Array = (input) => toArrayBufferView(BigInt64Array, input), toUint8Array = (input) => toArrayBufferView(Uint8Array, input), toUint16Array = (input) => toArrayBufferView(Uint16Array, input), toUint32Array = (input) => toArrayBufferView(Uint32Array, input), toBigUint64Array = (input) => toArrayBufferView(BigUint64Array, input), toFloat32Array = (input) => toArrayBufferView(Float32Array, input), toFloat64Array = (input) => toArrayBufferView(Float64Array, input), toUint8ClampedArray = (input) => toArrayBufferView(Uint8ClampedArray, input), pump = (iterator) => {
  iterator.next();
  return iterator;
}, toInt8ArrayIterator = (input) => toArrayBufferViewIterator(Int8Array, input), toInt16ArrayIterator = (input) => toArrayBufferViewIterator(Int16Array, input), toInt32ArrayIterator = (input) => toArrayBufferViewIterator(Int32Array, input), toUint8ArrayIterator = (input) => toArrayBufferViewIterator(Uint8Array, input), toUint16ArrayIterator = (input) => toArrayBufferViewIterator(Uint16Array, input), toUint32ArrayIterator = (input) => toArrayBufferViewIterator(Uint32Array, input), toFloat32ArrayIterator = (input) => toArrayBufferViewIterator(Float32Array, input), toFloat64ArrayIterator = (input) => toArrayBufferViewIterator(Float64Array, input), toUint8ClampedArrayIterator = (input) => toArrayBufferViewIterator(Uint8ClampedArray, input), toInt8ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Int8Array, input), toInt16ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Int16Array, input), toInt32ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Int32Array, input), toUint8ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint8Array, input), toUint16ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint16Array, input), toUint32ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint32Array, input), toFloat32ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Float32Array, input), toFloat64ArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Float64Array, input), toUint8ClampedArrayAsyncIterator = (input) => toArrayBufferViewAsyncIterator(Uint8ClampedArray, input);
var init_buffer = __esm(() => {
  init_tslib_es6();
  init_utf8();
  SharedArrayBuf = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/adapters.mjs
function* fromIterable(source) {
  let done, threw = false;
  let buffers = [], buffer;
  let cmd, size, bufferLength = 0;
  function byteRange() {
    if (cmd === "peek") {
      return joinUint8Arrays(buffers, size)[0];
    }
    [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
    return buffer;
  }
  ({ cmd, size } = (yield (() => null)()) || { cmd: "read", size: 0 });
  const it = toUint8ArrayIterator(source)[Symbol.iterator]();
  try {
    do {
      ({ done, value: buffer } = Number.isNaN(size - bufferLength) ? it.next() : it.next(size - bufferLength));
      if (!done && buffer.byteLength > 0) {
        buffers.push(buffer);
        bufferLength += buffer.byteLength;
      }
      if (done || size <= bufferLength) {
        do {
          ({ cmd, size } = yield byteRange());
        } while (size < bufferLength);
      }
    } while (!done);
  } catch (e) {
    (threw = true) && typeof it.throw === "function" && it.throw(e);
  } finally {
    threw === false && typeof it.return === "function" && it.return(null);
  }
  return null;
}
function fromAsyncIterable(source) {
  return __asyncGenerator(this, arguments, function* fromAsyncIterable_1() {
    let done, threw = false;
    let buffers = [], buffer;
    let cmd, size, bufferLength = 0;
    function byteRange() {
      if (cmd === "peek") {
        return joinUint8Arrays(buffers, size)[0];
      }
      [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
      return buffer;
    }
    ({ cmd, size } = (yield yield __await((() => null)())) || { cmd: "read", size: 0 });
    const it = toUint8ArrayAsyncIterator(source)[Symbol.asyncIterator]();
    try {
      do {
        ({ done, value: buffer } = Number.isNaN(size - bufferLength) ? yield __await(it.next()) : yield __await(it.next(size - bufferLength)));
        if (!done && buffer.byteLength > 0) {
          buffers.push(buffer);
          bufferLength += buffer.byteLength;
        }
        if (done || size <= bufferLength) {
          do {
            ({ cmd, size } = yield yield __await(byteRange()));
          } while (size < bufferLength);
        }
      } while (!done);
    } catch (e) {
      (threw = true) && typeof it.throw === "function" && (yield __await(it.throw(e)));
    } finally {
      threw === false && typeof it.return === "function" && (yield __await(it.return(new Uint8Array(0))));
    }
    return yield __await(null);
  });
}
function fromDOMStream(source) {
  return __asyncGenerator(this, arguments, function* fromDOMStream_1() {
    let done = false, threw = false;
    let buffers = [], buffer;
    let cmd, size, bufferLength = 0;
    function byteRange() {
      if (cmd === "peek") {
        return joinUint8Arrays(buffers, size)[0];
      }
      [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
      return buffer;
    }
    ({ cmd, size } = (yield yield __await((() => null)())) || { cmd: "read", size: 0 });
    const it = new AdaptiveByteReader(source);
    try {
      do {
        ({ done, value: buffer } = Number.isNaN(size - bufferLength) ? yield __await(it["read"]()) : yield __await(it["read"](size - bufferLength)));
        if (!done && buffer.byteLength > 0) {
          buffers.push(toUint8Array(buffer));
          bufferLength += buffer.byteLength;
        }
        if (done || size <= bufferLength) {
          do {
            ({ cmd, size } = yield yield __await(byteRange()));
          } while (size < bufferLength);
        }
      } while (!done);
    } catch (e) {
      (threw = true) && (yield __await(it["cancel"](e)));
    } finally {
      threw === false ? yield __await(it["cancel"]()) : source["locked"] && it.releaseLock();
    }
    return yield __await(null);
  });
}

class AdaptiveByteReader {
  constructor(source) {
    this.source = source;
    this.reader = null;
    this.reader = this.source["getReader"]();
    this.reader["closed"].catch(() => {});
  }
  get closed() {
    return this.reader ? this.reader["closed"].catch(() => {}) : Promise.resolve();
  }
  releaseLock() {
    if (this.reader) {
      this.reader.releaseLock();
    }
    this.reader = null;
  }
  cancel(reason) {
    return __awaiter(this, undefined, undefined, function* () {
      const { reader, source } = this;
      reader && (yield reader["cancel"](reason).catch(() => {}));
      source && (source["locked"] && this.releaseLock());
    });
  }
  read(size) {
    return __awaiter(this, undefined, undefined, function* () {
      if (size === 0) {
        return { done: this.reader == null, value: new Uint8Array(0) };
      }
      const result = yield this.reader.read();
      !result.done && (result.value = toUint8Array(result));
      return result;
    });
  }
}
function fromNodeStream(stream) {
  return __asyncGenerator(this, arguments, function* fromNodeStream_1() {
    const events = [];
    let event = "error";
    let done = false, err = null;
    let cmd, size, bufferLength = 0;
    let buffers = [], buffer;
    function byteRange() {
      if (cmd === "peek") {
        return joinUint8Arrays(buffers, size)[0];
      }
      [buffer, buffers, bufferLength] = joinUint8Arrays(buffers, size);
      return buffer;
    }
    ({ cmd, size } = (yield yield __await((() => null)())) || { cmd: "read", size: 0 });
    if (stream["isTTY"]) {
      yield yield __await(new Uint8Array(0));
      return yield __await(null);
    }
    try {
      events[0] = onEvent(stream, "end");
      events[1] = onEvent(stream, "error");
      do {
        events[2] = onEvent(stream, "readable");
        [event, err] = yield __await(Promise.race(events.map((x) => x[2])));
        if (event === "error") {
          break;
        }
        if (!(done = event === "end")) {
          if (!Number.isFinite(size - bufferLength)) {
            buffer = toUint8Array(stream["read"]());
          } else {
            buffer = toUint8Array(stream["read"](size - bufferLength));
            if (buffer.byteLength < size - bufferLength) {
              buffer = toUint8Array(stream["read"]());
            }
          }
          if (buffer.byteLength > 0) {
            buffers.push(buffer);
            bufferLength += buffer.byteLength;
          }
        }
        if (done || size <= bufferLength) {
          do {
            ({ cmd, size } = yield yield __await(byteRange()));
          } while (size < bufferLength);
        }
      } while (!done);
    } finally {
      yield __await(cleanup(events, event === "error" ? err : null));
    }
    return yield __await(null);
    function cleanup(events2, err2) {
      buffer = buffers = null;
      return new Promise((resolve2, reject) => {
        for (const [evt, fn] of events2) {
          stream["off"](evt, fn);
        }
        try {
          const destroy = stream["destroy"];
          destroy && destroy.call(stream, err2);
          err2 = undefined;
        } catch (e) {
          err2 = e || err2;
        } finally {
          err2 != null ? reject(err2) : resolve2();
        }
      });
    }
  });
}
var adapters_default, pump2 = (iterator) => {
  iterator.next();
  return iterator;
}, onEvent = (stream, event) => {
  const handler = (_) => resolve2([event, _]);
  let resolve2;
  return [event, handler, new Promise((r) => (resolve2 = r) && stream["once"](event, handler))];
};
var init_adapters = __esm(() => {
  init_tslib_es6();
  init_buffer();
  adapters_default = {
    fromIterable(source) {
      return pump2(fromIterable(source));
    },
    fromAsyncIterable(source) {
      return pump2(fromAsyncIterable(source));
    },
    fromDOMStream(source) {
      return pump2(fromDOMStream(source));
    },
    fromNodeStream(stream) {
      return pump2(fromNodeStream(stream));
    },
    toDOMStream(source, options) {
      throw new Error(`"toDOMStream" not available in this environment`);
    },
    toNodeStream(source, options) {
      throw new Error(`"toNodeStream" not available in this environment`);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/metadata-version.mjs
var MetadataVersion;
var init_metadata_version = __esm(() => {
  (function(MetadataVersion2) {
    MetadataVersion2[MetadataVersion2["V1"] = 0] = "V1";
    MetadataVersion2[MetadataVersion2["V2"] = 1] = "V2";
    MetadataVersion2[MetadataVersion2["V3"] = 2] = "V3";
    MetadataVersion2[MetadataVersion2["V4"] = 3] = "V4";
    MetadataVersion2[MetadataVersion2["V5"] = 4] = "V5";
  })(MetadataVersion || (MetadataVersion = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/union-mode.mjs
var UnionMode;
var init_union_mode = __esm(() => {
  (function(UnionMode2) {
    UnionMode2[UnionMode2["Sparse"] = 0] = "Sparse";
    UnionMode2[UnionMode2["Dense"] = 1] = "Dense";
  })(UnionMode || (UnionMode = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/precision.mjs
var Precision;
var init_precision = __esm(() => {
  (function(Precision2) {
    Precision2[Precision2["HALF"] = 0] = "HALF";
    Precision2[Precision2["SINGLE"] = 1] = "SINGLE";
    Precision2[Precision2["DOUBLE"] = 2] = "DOUBLE";
  })(Precision || (Precision = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/date-unit.mjs
var DateUnit;
var init_date_unit = __esm(() => {
  (function(DateUnit2) {
    DateUnit2[DateUnit2["DAY"] = 0] = "DAY";
    DateUnit2[DateUnit2["MILLISECOND"] = 1] = "MILLISECOND";
  })(DateUnit || (DateUnit = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/time-unit.mjs
var TimeUnit;
var init_time_unit = __esm(() => {
  (function(TimeUnit2) {
    TimeUnit2[TimeUnit2["SECOND"] = 0] = "SECOND";
    TimeUnit2[TimeUnit2["MILLISECOND"] = 1] = "MILLISECOND";
    TimeUnit2[TimeUnit2["MICROSECOND"] = 2] = "MICROSECOND";
    TimeUnit2[TimeUnit2["NANOSECOND"] = 3] = "NANOSECOND";
  })(TimeUnit || (TimeUnit = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/interval-unit.mjs
var IntervalUnit;
var init_interval_unit = __esm(() => {
  (function(IntervalUnit2) {
    IntervalUnit2[IntervalUnit2["YEAR_MONTH"] = 0] = "YEAR_MONTH";
    IntervalUnit2[IntervalUnit2["DAY_TIME"] = 1] = "DAY_TIME";
    IntervalUnit2[IntervalUnit2["MONTH_DAY_NANO"] = 2] = "MONTH_DAY_NANO";
  })(IntervalUnit || (IntervalUnit = {}));
});

// node_modules/.bun/flatbuffers@24.12.23/node_modules/flatbuffers/mjs/constants.js
var SIZEOF_SHORT = 2, SIZEOF_INT = 4, FILE_IDENTIFIER_LENGTH = 4, SIZE_PREFIX_LENGTH = 4;

// node_modules/.bun/flatbuffers@24.12.23/node_modules/flatbuffers/mjs/utils.js
var int322, float322, float642, isLittleEndian;
var init_utils = __esm(() => {
  int322 = new Int32Array(2);
  float322 = new Float32Array(int322.buffer);
  float642 = new Float64Array(int322.buffer);
  isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;
});

// node_modules/.bun/flatbuffers@24.12.23/node_modules/flatbuffers/mjs/encoding.js
var Encoding;
var init_encoding = __esm(() => {
  (function(Encoding2) {
    Encoding2[Encoding2["UTF8_BYTES"] = 1] = "UTF8_BYTES";
    Encoding2[Encoding2["UTF16_STRING"] = 2] = "UTF16_STRING";
  })(Encoding || (Encoding = {}));
});

// node_modules/.bun/flatbuffers@24.12.23/node_modules/flatbuffers/mjs/byte-buffer.js
class ByteBuffer {
  constructor(bytes_) {
    this.bytes_ = bytes_;
    this.position_ = 0;
    this.text_decoder_ = new TextDecoder;
  }
  static allocate(byte_size) {
    return new ByteBuffer(new Uint8Array(byte_size));
  }
  clear() {
    this.position_ = 0;
  }
  bytes() {
    return this.bytes_;
  }
  position() {
    return this.position_;
  }
  setPosition(position) {
    this.position_ = position;
  }
  capacity() {
    return this.bytes_.length;
  }
  readInt8(offset) {
    return this.readUint8(offset) << 24 >> 24;
  }
  readUint8(offset) {
    return this.bytes_[offset];
  }
  readInt16(offset) {
    return this.readUint16(offset) << 16 >> 16;
  }
  readUint16(offset) {
    return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
  }
  readInt32(offset) {
    return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
  }
  readUint32(offset) {
    return this.readInt32(offset) >>> 0;
  }
  readInt64(offset) {
    return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
  }
  readUint64(offset) {
    return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
  }
  readFloat32(offset) {
    int322[0] = this.readInt32(offset);
    return float322[0];
  }
  readFloat64(offset) {
    int322[isLittleEndian ? 0 : 1] = this.readInt32(offset);
    int322[isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
    return float642[0];
  }
  writeInt8(offset, value) {
    this.bytes_[offset] = value;
  }
  writeUint8(offset, value) {
    this.bytes_[offset] = value;
  }
  writeInt16(offset, value) {
    this.bytes_[offset] = value;
    this.bytes_[offset + 1] = value >> 8;
  }
  writeUint16(offset, value) {
    this.bytes_[offset] = value;
    this.bytes_[offset + 1] = value >> 8;
  }
  writeInt32(offset, value) {
    this.bytes_[offset] = value;
    this.bytes_[offset + 1] = value >> 8;
    this.bytes_[offset + 2] = value >> 16;
    this.bytes_[offset + 3] = value >> 24;
  }
  writeUint32(offset, value) {
    this.bytes_[offset] = value;
    this.bytes_[offset + 1] = value >> 8;
    this.bytes_[offset + 2] = value >> 16;
    this.bytes_[offset + 3] = value >> 24;
  }
  writeInt64(offset, value) {
    this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
    this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
  }
  writeUint64(offset, value) {
    this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
    this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
  }
  writeFloat32(offset, value) {
    float322[0] = value;
    this.writeInt32(offset, int322[0]);
  }
  writeFloat64(offset, value) {
    float642[0] = value;
    this.writeInt32(offset, int322[isLittleEndian ? 0 : 1]);
    this.writeInt32(offset + 4, int322[isLittleEndian ? 1 : 0]);
  }
  getBufferIdentifier() {
    if (this.bytes_.length < this.position_ + SIZEOF_INT + FILE_IDENTIFIER_LENGTH) {
      throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");
    }
    let result = "";
    for (let i = 0;i < FILE_IDENTIFIER_LENGTH; i++) {
      result += String.fromCharCode(this.readInt8(this.position_ + SIZEOF_INT + i));
    }
    return result;
  }
  __offset(bb_pos, vtable_offset) {
    const vtable = bb_pos - this.readInt32(bb_pos);
    return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
  }
  __union(t, offset) {
    t.bb_pos = offset + this.readInt32(offset);
    t.bb = this;
    return t;
  }
  __string(offset, opt_encoding) {
    offset += this.readInt32(offset);
    const length = this.readInt32(offset);
    offset += SIZEOF_INT;
    const utf8bytes = this.bytes_.subarray(offset, offset + length);
    if (opt_encoding === Encoding.UTF8_BYTES)
      return utf8bytes;
    else
      return this.text_decoder_.decode(utf8bytes);
  }
  __union_with_string(o, offset) {
    if (typeof o === "string") {
      return this.__string(offset);
    }
    return this.__union(o, offset);
  }
  __indirect(offset) {
    return offset + this.readInt32(offset);
  }
  __vector(offset) {
    return offset + this.readInt32(offset) + SIZEOF_INT;
  }
  __vector_len(offset) {
    return this.readInt32(offset + this.readInt32(offset));
  }
  __has_identifier(ident) {
    if (ident.length != FILE_IDENTIFIER_LENGTH) {
      throw new Error("FlatBuffers: file identifier must be length " + FILE_IDENTIFIER_LENGTH);
    }
    for (let i = 0;i < FILE_IDENTIFIER_LENGTH; i++) {
      if (ident.charCodeAt(i) != this.readInt8(this.position() + SIZEOF_INT + i)) {
        return false;
      }
    }
    return true;
  }
  createScalarList(listAccessor, listLength) {
    const ret = [];
    for (let i = 0;i < listLength; ++i) {
      const val = listAccessor(i);
      if (val !== null) {
        ret.push(val);
      }
    }
    return ret;
  }
  createObjList(listAccessor, listLength) {
    const ret = [];
    for (let i = 0;i < listLength; ++i) {
      const val = listAccessor(i);
      if (val !== null) {
        ret.push(val.unpack());
      }
    }
    return ret;
  }
}
var init_byte_buffer = __esm(() => {
  init_utils();
  init_encoding();
});

// node_modules/.bun/flatbuffers@24.12.23/node_modules/flatbuffers/mjs/builder.js
class Builder {
  constructor(opt_initial_size) {
    this.minalign = 1;
    this.vtable = null;
    this.vtable_in_use = 0;
    this.isNested = false;
    this.object_start = 0;
    this.vtables = [];
    this.vector_num_elems = 0;
    this.force_defaults = false;
    this.string_maps = null;
    this.text_encoder = new TextEncoder;
    let initial_size;
    if (!opt_initial_size) {
      initial_size = 1024;
    } else {
      initial_size = opt_initial_size;
    }
    this.bb = ByteBuffer.allocate(initial_size);
    this.space = initial_size;
  }
  clear() {
    this.bb.clear();
    this.space = this.bb.capacity();
    this.minalign = 1;
    this.vtable = null;
    this.vtable_in_use = 0;
    this.isNested = false;
    this.object_start = 0;
    this.vtables = [];
    this.vector_num_elems = 0;
    this.force_defaults = false;
    this.string_maps = null;
  }
  forceDefaults(forceDefaults) {
    this.force_defaults = forceDefaults;
  }
  dataBuffer() {
    return this.bb;
  }
  asUint8Array() {
    return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
  }
  prep(size, additional_bytes) {
    if (size > this.minalign) {
      this.minalign = size;
    }
    const align_size = ~(this.bb.capacity() - this.space + additional_bytes) + 1 & size - 1;
    while (this.space < align_size + size + additional_bytes) {
      const old_buf_size = this.bb.capacity();
      this.bb = Builder.growByteBuffer(this.bb);
      this.space += this.bb.capacity() - old_buf_size;
    }
    this.pad(align_size);
  }
  pad(byte_size) {
    for (let i = 0;i < byte_size; i++) {
      this.bb.writeInt8(--this.space, 0);
    }
  }
  writeInt8(value) {
    this.bb.writeInt8(this.space -= 1, value);
  }
  writeInt16(value) {
    this.bb.writeInt16(this.space -= 2, value);
  }
  writeInt32(value) {
    this.bb.writeInt32(this.space -= 4, value);
  }
  writeInt64(value) {
    this.bb.writeInt64(this.space -= 8, value);
  }
  writeFloat32(value) {
    this.bb.writeFloat32(this.space -= 4, value);
  }
  writeFloat64(value) {
    this.bb.writeFloat64(this.space -= 8, value);
  }
  addInt8(value) {
    this.prep(1, 0);
    this.writeInt8(value);
  }
  addInt16(value) {
    this.prep(2, 0);
    this.writeInt16(value);
  }
  addInt32(value) {
    this.prep(4, 0);
    this.writeInt32(value);
  }
  addInt64(value) {
    this.prep(8, 0);
    this.writeInt64(value);
  }
  addFloat32(value) {
    this.prep(4, 0);
    this.writeFloat32(value);
  }
  addFloat64(value) {
    this.prep(8, 0);
    this.writeFloat64(value);
  }
  addFieldInt8(voffset, value, defaultValue) {
    if (this.force_defaults || value != defaultValue) {
      this.addInt8(value);
      this.slot(voffset);
    }
  }
  addFieldInt16(voffset, value, defaultValue) {
    if (this.force_defaults || value != defaultValue) {
      this.addInt16(value);
      this.slot(voffset);
    }
  }
  addFieldInt32(voffset, value, defaultValue) {
    if (this.force_defaults || value != defaultValue) {
      this.addInt32(value);
      this.slot(voffset);
    }
  }
  addFieldInt64(voffset, value, defaultValue) {
    if (this.force_defaults || value !== defaultValue) {
      this.addInt64(value);
      this.slot(voffset);
    }
  }
  addFieldFloat32(voffset, value, defaultValue) {
    if (this.force_defaults || value != defaultValue) {
      this.addFloat32(value);
      this.slot(voffset);
    }
  }
  addFieldFloat64(voffset, value, defaultValue) {
    if (this.force_defaults || value != defaultValue) {
      this.addFloat64(value);
      this.slot(voffset);
    }
  }
  addFieldOffset(voffset, value, defaultValue) {
    if (this.force_defaults || value != defaultValue) {
      this.addOffset(value);
      this.slot(voffset);
    }
  }
  addFieldStruct(voffset, value, defaultValue) {
    if (value != defaultValue) {
      this.nested(value);
      this.slot(voffset);
    }
  }
  nested(obj) {
    if (obj != this.offset()) {
      throw new TypeError("FlatBuffers: struct must be serialized inline.");
    }
  }
  notNested() {
    if (this.isNested) {
      throw new TypeError("FlatBuffers: object serialization must not be nested.");
    }
  }
  slot(voffset) {
    if (this.vtable !== null)
      this.vtable[voffset] = this.offset();
  }
  offset() {
    return this.bb.capacity() - this.space;
  }
  static growByteBuffer(bb) {
    const old_buf_size = bb.capacity();
    if (old_buf_size & 3221225472) {
      throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");
    }
    const new_buf_size = old_buf_size << 1;
    const nbb = ByteBuffer.allocate(new_buf_size);
    nbb.setPosition(new_buf_size - old_buf_size);
    nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
    return nbb;
  }
  addOffset(offset) {
    this.prep(SIZEOF_INT, 0);
    this.writeInt32(this.offset() - offset + SIZEOF_INT);
  }
  startObject(numfields) {
    this.notNested();
    if (this.vtable == null) {
      this.vtable = [];
    }
    this.vtable_in_use = numfields;
    for (let i = 0;i < numfields; i++) {
      this.vtable[i] = 0;
    }
    this.isNested = true;
    this.object_start = this.offset();
  }
  endObject() {
    if (this.vtable == null || !this.isNested) {
      throw new Error("FlatBuffers: endObject called without startObject");
    }
    this.addInt32(0);
    const vtableloc = this.offset();
    let i = this.vtable_in_use - 1;
    for (;i >= 0 && this.vtable[i] == 0; i--) {}
    const trimmed_size = i + 1;
    for (;i >= 0; i--) {
      this.addInt16(this.vtable[i] != 0 ? vtableloc - this.vtable[i] : 0);
    }
    const standard_fields = 2;
    this.addInt16(vtableloc - this.object_start);
    const len = (trimmed_size + standard_fields) * SIZEOF_SHORT;
    this.addInt16(len);
    let existing_vtable = 0;
    const vt1 = this.space;
    outer_loop:
      for (i = 0;i < this.vtables.length; i++) {
        const vt2 = this.bb.capacity() - this.vtables[i];
        if (len == this.bb.readInt16(vt2)) {
          for (let j = SIZEOF_SHORT;j < len; j += SIZEOF_SHORT) {
            if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
              continue outer_loop;
            }
          }
          existing_vtable = this.vtables[i];
          break;
        }
      }
    if (existing_vtable) {
      this.space = this.bb.capacity() - vtableloc;
      this.bb.writeInt32(this.space, existing_vtable - vtableloc);
    } else {
      this.vtables.push(this.offset());
      this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
    }
    this.isNested = false;
    return vtableloc;
  }
  finish(root_table, opt_file_identifier, opt_size_prefix) {
    const size_prefix = opt_size_prefix ? SIZE_PREFIX_LENGTH : 0;
    if (opt_file_identifier) {
      const file_identifier = opt_file_identifier;
      this.prep(this.minalign, SIZEOF_INT + FILE_IDENTIFIER_LENGTH + size_prefix);
      if (file_identifier.length != FILE_IDENTIFIER_LENGTH) {
        throw new TypeError("FlatBuffers: file identifier must be length " + FILE_IDENTIFIER_LENGTH);
      }
      for (let i = FILE_IDENTIFIER_LENGTH - 1;i >= 0; i--) {
        this.writeInt8(file_identifier.charCodeAt(i));
      }
    }
    this.prep(this.minalign, SIZEOF_INT + size_prefix);
    this.addOffset(root_table);
    if (size_prefix) {
      this.addInt32(this.bb.capacity() - this.space);
    }
    this.bb.setPosition(this.space);
  }
  finishSizePrefixed(root_table, opt_file_identifier) {
    this.finish(root_table, opt_file_identifier, true);
  }
  requiredField(table, field) {
    const table_start = this.bb.capacity() - table;
    const vtable_start = table_start - this.bb.readInt32(table_start);
    const ok = field < this.bb.readInt16(vtable_start) && this.bb.readInt16(vtable_start + field) != 0;
    if (!ok) {
      throw new TypeError("FlatBuffers: field " + field + " must be set");
    }
  }
  startVector(elem_size, num_elems, alignment) {
    this.notNested();
    this.vector_num_elems = num_elems;
    this.prep(SIZEOF_INT, elem_size * num_elems);
    this.prep(alignment, elem_size * num_elems);
  }
  endVector() {
    this.writeInt32(this.vector_num_elems);
    return this.offset();
  }
  createSharedString(s) {
    if (!s) {
      return 0;
    }
    if (!this.string_maps) {
      this.string_maps = new Map;
    }
    if (this.string_maps.has(s)) {
      return this.string_maps.get(s);
    }
    const offset = this.createString(s);
    this.string_maps.set(s, offset);
    return offset;
  }
  createString(s) {
    if (s === null || s === undefined) {
      return 0;
    }
    let utf8;
    if (s instanceof Uint8Array) {
      utf8 = s;
    } else {
      utf8 = this.text_encoder.encode(s);
    }
    this.addInt8(0);
    this.startVector(1, utf8.length, 1);
    this.bb.setPosition(this.space -= utf8.length);
    this.bb.bytes().set(utf8, this.space);
    return this.endVector();
  }
  createByteVector(v) {
    if (v === null || v === undefined) {
      return 0;
    }
    this.startVector(1, v.length, 1);
    this.bb.setPosition(this.space -= v.length);
    this.bb.bytes().set(v, this.space);
    return this.endVector();
  }
  createObjectOffset(obj) {
    if (obj === null) {
      return 0;
    }
    if (typeof obj === "string") {
      return this.createString(obj);
    } else {
      return obj.pack(this);
    }
  }
  createObjectOffsetList(list) {
    const ret = [];
    for (let i = 0;i < list.length; ++i) {
      const val = list[i];
      if (val !== null) {
        ret.push(this.createObjectOffset(val));
      } else {
        throw new TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.");
      }
    }
    return ret;
  }
  createStructOffsetList(list, startFunc) {
    startFunc(this, list.length);
    this.createObjectOffsetList(list.slice().reverse());
    return this.endVector();
  }
}
var init_builder = __esm(() => {
  init_byte_buffer();
});

// node_modules/.bun/flatbuffers@24.12.23/node_modules/flatbuffers/mjs/flatbuffers.js
var init_flatbuffers = __esm(() => {
  init_utils();
  init_encoding();
  init_builder();
  init_byte_buffer();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/body-compression-method.mjs
var BodyCompressionMethod;
var init_body_compression_method = __esm(() => {
  (function(BodyCompressionMethod2) {
    BodyCompressionMethod2[BodyCompressionMethod2["BUFFER"] = 0] = "BUFFER";
  })(BodyCompressionMethod || (BodyCompressionMethod = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/compression-type.mjs
var CompressionType;
var init_compression_type = __esm(() => {
  (function(CompressionType2) {
    CompressionType2[CompressionType2["LZ4_FRAME"] = 0] = "LZ4_FRAME";
    CompressionType2[CompressionType2["ZSTD"] = 1] = "ZSTD";
  })(CompressionType || (CompressionType = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/body-compression.mjs
class BodyCompression {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsBodyCompression(bb, obj) {
    return (obj || new BodyCompression).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsBodyCompression(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new BodyCompression).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  codec() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : CompressionType.LZ4_FRAME;
  }
  method() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : BodyCompressionMethod.BUFFER;
  }
  static startBodyCompression(builder) {
    builder.startObject(2);
  }
  static addCodec(builder, codec2) {
    builder.addFieldInt8(0, codec2, CompressionType.LZ4_FRAME);
  }
  static addMethod(builder, method) {
    builder.addFieldInt8(1, method, BodyCompressionMethod.BUFFER);
  }
  static endBodyCompression(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createBodyCompression(builder, codec2, method) {
    BodyCompression.startBodyCompression(builder);
    BodyCompression.addCodec(builder, codec2);
    BodyCompression.addMethod(builder, method);
    return BodyCompression.endBodyCompression(builder);
  }
}
var init_body_compression = __esm(() => {
  init_flatbuffers();
  init_body_compression_method();
  init_compression_type();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/buffer.mjs
class Buffer2 {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  offset() {
    return this.bb.readInt64(this.bb_pos);
  }
  length() {
    return this.bb.readInt64(this.bb_pos + 8);
  }
  static sizeOf() {
    return 16;
  }
  static createBuffer(builder, offset, length) {
    builder.prep(8, 16);
    builder.writeInt64(BigInt(length !== null && length !== undefined ? length : 0));
    builder.writeInt64(BigInt(offset !== null && offset !== undefined ? offset : 0));
    return builder.offset();
  }
}

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/field-node.mjs
class FieldNode {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  length() {
    return this.bb.readInt64(this.bb_pos);
  }
  nullCount() {
    return this.bb.readInt64(this.bb_pos + 8);
  }
  static sizeOf() {
    return 16;
  }
  static createFieldNode(builder, length, null_count) {
    builder.prep(8, 16);
    builder.writeInt64(BigInt(null_count !== null && null_count !== undefined ? null_count : 0));
    builder.writeInt64(BigInt(length !== null && length !== undefined ? length : 0));
    return builder.offset();
  }
}

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/record-batch.mjs
class RecordBatch {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsRecordBatch(bb, obj) {
    return (obj || new RecordBatch).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsRecordBatch(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new RecordBatch).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  length() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
  }
  nodes(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new FieldNode).__init(this.bb.__vector(this.bb_pos + offset) + index * 16, this.bb) : null;
  }
  nodesLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  buffers(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new Buffer2).__init(this.bb.__vector(this.bb_pos + offset) + index * 16, this.bb) : null;
  }
  buffersLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  compression(obj) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? (obj || new BodyCompression).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
  }
  static startRecordBatch(builder) {
    builder.startObject(4);
  }
  static addLength(builder, length) {
    builder.addFieldInt64(0, length, BigInt("0"));
  }
  static addNodes(builder, nodesOffset) {
    builder.addFieldOffset(1, nodesOffset, 0);
  }
  static startNodesVector(builder, numElems) {
    builder.startVector(16, numElems, 8);
  }
  static addBuffers(builder, buffersOffset) {
    builder.addFieldOffset(2, buffersOffset, 0);
  }
  static startBuffersVector(builder, numElems) {
    builder.startVector(16, numElems, 8);
  }
  static addCompression(builder, compressionOffset) {
    builder.addFieldOffset(3, compressionOffset, 0);
  }
  static endRecordBatch(builder) {
    const offset = builder.endObject();
    return offset;
  }
}
var init_record_batch = __esm(() => {
  init_flatbuffers();
  init_body_compression();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/dictionary-batch.mjs
class DictionaryBatch {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDictionaryBatch(bb, obj) {
    return (obj || new DictionaryBatch).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsDictionaryBatch(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new DictionaryBatch).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  id() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
  }
  data(obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new RecordBatch).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
  }
  isDelta() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
  }
  static startDictionaryBatch(builder) {
    builder.startObject(3);
  }
  static addId(builder, id) {
    builder.addFieldInt64(0, id, BigInt("0"));
  }
  static addData(builder, dataOffset) {
    builder.addFieldOffset(1, dataOffset, 0);
  }
  static addIsDelta(builder, isDelta) {
    builder.addFieldInt8(2, +isDelta, 0);
  }
  static endDictionaryBatch(builder) {
    const offset = builder.endObject();
    return offset;
  }
}
var init_dictionary_batch = __esm(() => {
  init_flatbuffers();
  init_record_batch();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/endianness.mjs
var Endianness;
var init_endianness = __esm(() => {
  (function(Endianness2) {
    Endianness2[Endianness2["Little"] = 0] = "Little";
    Endianness2[Endianness2["Big"] = 1] = "Big";
  })(Endianness || (Endianness = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/dictionary-kind.mjs
var DictionaryKind;
var init_dictionary_kind = __esm(() => {
  (function(DictionaryKind2) {
    DictionaryKind2[DictionaryKind2["DenseArray"] = 0] = "DenseArray";
  })(DictionaryKind || (DictionaryKind = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/int.mjs
class Int {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsInt(bb, obj) {
    return (obj || new Int).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsInt(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Int).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  bitWidth() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
  }
  isSigned() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
  }
  static startInt(builder) {
    builder.startObject(2);
  }
  static addBitWidth(builder, bitWidth) {
    builder.addFieldInt32(0, bitWidth, 0);
  }
  static addIsSigned(builder, isSigned) {
    builder.addFieldInt8(1, +isSigned, 0);
  }
  static endInt(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createInt(builder, bitWidth, isSigned) {
    Int.startInt(builder);
    Int.addBitWidth(builder, bitWidth);
    Int.addIsSigned(builder, isSigned);
    return Int.endInt(builder);
  }
}
var init_int = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/dictionary-encoding.mjs
class DictionaryEncoding {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDictionaryEncoding(bb, obj) {
    return (obj || new DictionaryEncoding).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsDictionaryEncoding(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new DictionaryEncoding).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  id() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
  }
  indexType(obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new Int).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
  }
  isOrdered() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
  }
  dictionaryKind() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : DictionaryKind.DenseArray;
  }
  static startDictionaryEncoding(builder) {
    builder.startObject(4);
  }
  static addId(builder, id) {
    builder.addFieldInt64(0, id, BigInt("0"));
  }
  static addIndexType(builder, indexTypeOffset) {
    builder.addFieldOffset(1, indexTypeOffset, 0);
  }
  static addIsOrdered(builder, isOrdered) {
    builder.addFieldInt8(2, +isOrdered, 0);
  }
  static addDictionaryKind(builder, dictionaryKind) {
    builder.addFieldInt16(3, dictionaryKind, DictionaryKind.DenseArray);
  }
  static endDictionaryEncoding(builder) {
    const offset = builder.endObject();
    return offset;
  }
}
var init_dictionary_encoding = __esm(() => {
  init_flatbuffers();
  init_dictionary_kind();
  init_int();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/key-value.mjs
class KeyValue {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsKeyValue(bb, obj) {
    return (obj || new KeyValue).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsKeyValue(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new KeyValue).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  key(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  value(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  static startKeyValue(builder) {
    builder.startObject(2);
  }
  static addKey(builder, keyOffset) {
    builder.addFieldOffset(0, keyOffset, 0);
  }
  static addValue(builder, valueOffset) {
    builder.addFieldOffset(1, valueOffset, 0);
  }
  static endKeyValue(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createKeyValue(builder, keyOffset, valueOffset) {
    KeyValue.startKeyValue(builder);
    KeyValue.addKey(builder, keyOffset);
    KeyValue.addValue(builder, valueOffset);
    return KeyValue.endKeyValue(builder);
  }
}
var init_key_value = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/binary.mjs
class Binary {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsBinary(bb, obj) {
    return (obj || new Binary).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsBinary(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Binary).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startBinary(builder) {
    builder.startObject(0);
  }
  static endBinary(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createBinary(builder) {
    Binary.startBinary(builder);
    return Binary.endBinary(builder);
  }
}
var init_binary = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/bool.mjs
class Bool {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsBool(bb, obj) {
    return (obj || new Bool).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsBool(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Bool).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startBool(builder) {
    builder.startObject(0);
  }
  static endBool(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createBool(builder) {
    Bool.startBool(builder);
    return Bool.endBool(builder);
  }
}
var init_bool = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/date.mjs
class Date2 {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDate(bb, obj) {
    return (obj || new Date2).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsDate(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Date2).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  unit() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : DateUnit.MILLISECOND;
  }
  static startDate(builder) {
    builder.startObject(1);
  }
  static addUnit(builder, unit) {
    builder.addFieldInt16(0, unit, DateUnit.MILLISECOND);
  }
  static endDate(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createDate(builder, unit) {
    Date2.startDate(builder);
    Date2.addUnit(builder, unit);
    return Date2.endDate(builder);
  }
}
var init_date = __esm(() => {
  init_flatbuffers();
  init_date_unit();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/decimal.mjs
class Decimal {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDecimal(bb, obj) {
    return (obj || new Decimal).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsDecimal(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Decimal).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  precision() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
  }
  scale() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
  }
  bitWidth() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 128;
  }
  static startDecimal(builder) {
    builder.startObject(3);
  }
  static addPrecision(builder, precision) {
    builder.addFieldInt32(0, precision, 0);
  }
  static addScale(builder, scale) {
    builder.addFieldInt32(1, scale, 0);
  }
  static addBitWidth(builder, bitWidth) {
    builder.addFieldInt32(2, bitWidth, 128);
  }
  static endDecimal(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createDecimal(builder, precision, scale, bitWidth) {
    Decimal.startDecimal(builder);
    Decimal.addPrecision(builder, precision);
    Decimal.addScale(builder, scale);
    Decimal.addBitWidth(builder, bitWidth);
    return Decimal.endDecimal(builder);
  }
}
var init_decimal = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/duration.mjs
class Duration {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDuration(bb, obj) {
    return (obj || new Duration).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsDuration(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Duration).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  unit() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : TimeUnit.MILLISECOND;
  }
  static startDuration(builder) {
    builder.startObject(1);
  }
  static addUnit(builder, unit) {
    builder.addFieldInt16(0, unit, TimeUnit.MILLISECOND);
  }
  static endDuration(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createDuration(builder, unit) {
    Duration.startDuration(builder);
    Duration.addUnit(builder, unit);
    return Duration.endDuration(builder);
  }
}
var init_duration = __esm(() => {
  init_flatbuffers();
  init_time_unit();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/fixed-size-binary.mjs
class FixedSizeBinary {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsFixedSizeBinary(bb, obj) {
    return (obj || new FixedSizeBinary).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsFixedSizeBinary(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new FixedSizeBinary).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  byteWidth() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
  }
  static startFixedSizeBinary(builder) {
    builder.startObject(1);
  }
  static addByteWidth(builder, byteWidth) {
    builder.addFieldInt32(0, byteWidth, 0);
  }
  static endFixedSizeBinary(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createFixedSizeBinary(builder, byteWidth) {
    FixedSizeBinary.startFixedSizeBinary(builder);
    FixedSizeBinary.addByteWidth(builder, byteWidth);
    return FixedSizeBinary.endFixedSizeBinary(builder);
  }
}
var init_fixed_size_binary = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/fixed-size-list.mjs
class FixedSizeList {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsFixedSizeList(bb, obj) {
    return (obj || new FixedSizeList).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsFixedSizeList(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new FixedSizeList).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  listSize() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
  }
  static startFixedSizeList(builder) {
    builder.startObject(1);
  }
  static addListSize(builder, listSize) {
    builder.addFieldInt32(0, listSize, 0);
  }
  static endFixedSizeList(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createFixedSizeList(builder, listSize) {
    FixedSizeList.startFixedSizeList(builder);
    FixedSizeList.addListSize(builder, listSize);
    return FixedSizeList.endFixedSizeList(builder);
  }
}
var init_fixed_size_list = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/floating-point.mjs
class FloatingPoint {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsFloatingPoint(bb, obj) {
    return (obj || new FloatingPoint).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsFloatingPoint(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new FloatingPoint).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  precision() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : Precision.HALF;
  }
  static startFloatingPoint(builder) {
    builder.startObject(1);
  }
  static addPrecision(builder, precision) {
    builder.addFieldInt16(0, precision, Precision.HALF);
  }
  static endFloatingPoint(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createFloatingPoint(builder, precision) {
    FloatingPoint.startFloatingPoint(builder);
    FloatingPoint.addPrecision(builder, precision);
    return FloatingPoint.endFloatingPoint(builder);
  }
}
var init_floating_point = __esm(() => {
  init_flatbuffers();
  init_precision();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/interval.mjs
class Interval {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsInterval(bb, obj) {
    return (obj || new Interval).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsInterval(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Interval).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  unit() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : IntervalUnit.YEAR_MONTH;
  }
  static startInterval(builder) {
    builder.startObject(1);
  }
  static addUnit(builder, unit) {
    builder.addFieldInt16(0, unit, IntervalUnit.YEAR_MONTH);
  }
  static endInterval(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createInterval(builder, unit) {
    Interval.startInterval(builder);
    Interval.addUnit(builder, unit);
    return Interval.endInterval(builder);
  }
}
var init_interval = __esm(() => {
  init_flatbuffers();
  init_interval_unit();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/large-binary.mjs
class LargeBinary {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsLargeBinary(bb, obj) {
    return (obj || new LargeBinary).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsLargeBinary(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new LargeBinary).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startLargeBinary(builder) {
    builder.startObject(0);
  }
  static endLargeBinary(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createLargeBinary(builder) {
    LargeBinary.startLargeBinary(builder);
    return LargeBinary.endLargeBinary(builder);
  }
}
var init_large_binary = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/large-utf8.mjs
class LargeUtf8 {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsLargeUtf8(bb, obj) {
    return (obj || new LargeUtf8).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsLargeUtf8(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new LargeUtf8).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startLargeUtf8(builder) {
    builder.startObject(0);
  }
  static endLargeUtf8(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createLargeUtf8(builder) {
    LargeUtf8.startLargeUtf8(builder);
    return LargeUtf8.endLargeUtf8(builder);
  }
}
var init_large_utf8 = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/list.mjs
class List {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsList(bb, obj) {
    return (obj || new List).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsList(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new List).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startList(builder) {
    builder.startObject(0);
  }
  static endList(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createList(builder) {
    List.startList(builder);
    return List.endList(builder);
  }
}
var init_list = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/map.mjs
class Map2 {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsMap(bb, obj) {
    return (obj || new Map2).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsMap(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Map2).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  keysSorted() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
  }
  static startMap(builder) {
    builder.startObject(1);
  }
  static addKeysSorted(builder, keysSorted) {
    builder.addFieldInt8(0, +keysSorted, 0);
  }
  static endMap(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createMap(builder, keysSorted) {
    Map2.startMap(builder);
    Map2.addKeysSorted(builder, keysSorted);
    return Map2.endMap(builder);
  }
}
var init_map = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/null.mjs
class Null {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsNull(bb, obj) {
    return (obj || new Null).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsNull(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Null).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startNull(builder) {
    builder.startObject(0);
  }
  static endNull(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createNull(builder) {
    Null.startNull(builder);
    return Null.endNull(builder);
  }
}
var init_null = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/struct-.mjs
class Struct_ {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsStruct_(bb, obj) {
    return (obj || new Struct_).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsStruct_(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Struct_).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startStruct_(builder) {
    builder.startObject(0);
  }
  static endStruct_(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createStruct_(builder) {
    Struct_.startStruct_(builder);
    return Struct_.endStruct_(builder);
  }
}
var init_struct_ = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/time.mjs
class Time {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsTime(bb, obj) {
    return (obj || new Time).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsTime(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Time).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  unit() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : TimeUnit.MILLISECOND;
  }
  bitWidth() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 32;
  }
  static startTime(builder) {
    builder.startObject(2);
  }
  static addUnit(builder, unit) {
    builder.addFieldInt16(0, unit, TimeUnit.MILLISECOND);
  }
  static addBitWidth(builder, bitWidth) {
    builder.addFieldInt32(1, bitWidth, 32);
  }
  static endTime(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createTime(builder, unit, bitWidth) {
    Time.startTime(builder);
    Time.addUnit(builder, unit);
    Time.addBitWidth(builder, bitWidth);
    return Time.endTime(builder);
  }
}
var init_time = __esm(() => {
  init_flatbuffers();
  init_time_unit();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/timestamp.mjs
class Timestamp {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsTimestamp(bb, obj) {
    return (obj || new Timestamp).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsTimestamp(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Timestamp).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  unit() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : TimeUnit.SECOND;
  }
  timezone(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  static startTimestamp(builder) {
    builder.startObject(2);
  }
  static addUnit(builder, unit) {
    builder.addFieldInt16(0, unit, TimeUnit.SECOND);
  }
  static addTimezone(builder, timezoneOffset) {
    builder.addFieldOffset(1, timezoneOffset, 0);
  }
  static endTimestamp(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createTimestamp(builder, unit, timezoneOffset) {
    Timestamp.startTimestamp(builder);
    Timestamp.addUnit(builder, unit);
    Timestamp.addTimezone(builder, timezoneOffset);
    return Timestamp.endTimestamp(builder);
  }
}
var init_timestamp = __esm(() => {
  init_flatbuffers();
  init_time_unit();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/union.mjs
class Union {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsUnion(bb, obj) {
    return (obj || new Union).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsUnion(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Union).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  mode() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : UnionMode.Sparse;
  }
  typeIds(index) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readInt32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
  }
  typeIdsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  typeIdsArray() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? new Int32Array(this.bb.bytes().buffer, this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset), this.bb.__vector_len(this.bb_pos + offset)) : null;
  }
  static startUnion(builder) {
    builder.startObject(2);
  }
  static addMode(builder, mode) {
    builder.addFieldInt16(0, mode, UnionMode.Sparse);
  }
  static addTypeIds(builder, typeIdsOffset) {
    builder.addFieldOffset(1, typeIdsOffset, 0);
  }
  static createTypeIdsVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addInt32(data[i]);
    }
    return builder.endVector();
  }
  static startTypeIdsVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static endUnion(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createUnion(builder, mode, typeIdsOffset) {
    Union.startUnion(builder);
    Union.addMode(builder, mode);
    Union.addTypeIds(builder, typeIdsOffset);
    return Union.endUnion(builder);
  }
}
var init_union = __esm(() => {
  init_flatbuffers();
  init_union_mode();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/utf8.mjs
class Utf8 {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsUtf8(bb, obj) {
    return (obj || new Utf8).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsUtf8(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Utf8).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static startUtf8(builder) {
    builder.startObject(0);
  }
  static endUtf8(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createUtf8(builder) {
    Utf8.startUtf8(builder);
    return Utf8.endUtf8(builder);
  }
}
var init_utf82 = __esm(() => {
  init_flatbuffers();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/type.mjs
var Type;
var init_type = __esm(() => {
  (function(Type2) {
    Type2[Type2["NONE"] = 0] = "NONE";
    Type2[Type2["Null"] = 1] = "Null";
    Type2[Type2["Int"] = 2] = "Int";
    Type2[Type2["FloatingPoint"] = 3] = "FloatingPoint";
    Type2[Type2["Binary"] = 4] = "Binary";
    Type2[Type2["Utf8"] = 5] = "Utf8";
    Type2[Type2["Bool"] = 6] = "Bool";
    Type2[Type2["Decimal"] = 7] = "Decimal";
    Type2[Type2["Date"] = 8] = "Date";
    Type2[Type2["Time"] = 9] = "Time";
    Type2[Type2["Timestamp"] = 10] = "Timestamp";
    Type2[Type2["Interval"] = 11] = "Interval";
    Type2[Type2["List"] = 12] = "List";
    Type2[Type2["Struct_"] = 13] = "Struct_";
    Type2[Type2["Union"] = 14] = "Union";
    Type2[Type2["FixedSizeBinary"] = 15] = "FixedSizeBinary";
    Type2[Type2["FixedSizeList"] = 16] = "FixedSizeList";
    Type2[Type2["Map"] = 17] = "Map";
    Type2[Type2["Duration"] = 18] = "Duration";
    Type2[Type2["LargeBinary"] = 19] = "LargeBinary";
    Type2[Type2["LargeUtf8"] = 20] = "LargeUtf8";
    Type2[Type2["LargeList"] = 21] = "LargeList";
    Type2[Type2["RunEndEncoded"] = 22] = "RunEndEncoded";
  })(Type || (Type = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/field.mjs
class Field {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsField(bb, obj) {
    return (obj || new Field).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsField(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Field).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  name(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  nullable() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false;
  }
  typeType() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : Type.NONE;
  }
  type(obj) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
  }
  dictionary(obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new DictionaryEncoding).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
  }
  children(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? (obj || new Field).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  childrenLength() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  customMetadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? (obj || new KeyValue).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  customMetadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  static startField(builder) {
    builder.startObject(7);
  }
  static addName(builder, nameOffset) {
    builder.addFieldOffset(0, nameOffset, 0);
  }
  static addNullable(builder, nullable2) {
    builder.addFieldInt8(1, +nullable2, 0);
  }
  static addTypeType(builder, typeType) {
    builder.addFieldInt8(2, typeType, Type.NONE);
  }
  static addType(builder, typeOffset) {
    builder.addFieldOffset(3, typeOffset, 0);
  }
  static addDictionary(builder, dictionaryOffset) {
    builder.addFieldOffset(4, dictionaryOffset, 0);
  }
  static addChildren(builder, childrenOffset) {
    builder.addFieldOffset(5, childrenOffset, 0);
  }
  static createChildrenVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startChildrenVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addCustomMetadata(builder, customMetadataOffset) {
    builder.addFieldOffset(6, customMetadataOffset, 0);
  }
  static createCustomMetadataVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startCustomMetadataVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static endField(builder) {
    const offset = builder.endObject();
    return offset;
  }
}
var init_field = __esm(() => {
  init_flatbuffers();
  init_dictionary_encoding();
  init_key_value();
  init_type();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/schema.mjs
class Schema {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsSchema(bb, obj) {
    return (obj || new Schema).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsSchema(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Schema).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  endianness() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : Endianness.Little;
  }
  fields(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new Field).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  fieldsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  customMetadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new KeyValue).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  customMetadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  features(index) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readInt64(this.bb.__vector(this.bb_pos + offset) + index * 8) : BigInt(0);
  }
  featuresLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  static startSchema(builder) {
    builder.startObject(4);
  }
  static addEndianness(builder, endianness) {
    builder.addFieldInt16(0, endianness, Endianness.Little);
  }
  static addFields(builder, fieldsOffset) {
    builder.addFieldOffset(1, fieldsOffset, 0);
  }
  static createFieldsVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startFieldsVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addCustomMetadata(builder, customMetadataOffset) {
    builder.addFieldOffset(2, customMetadataOffset, 0);
  }
  static createCustomMetadataVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startCustomMetadataVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addFeatures(builder, featuresOffset) {
    builder.addFieldOffset(3, featuresOffset, 0);
  }
  static createFeaturesVector(builder, data) {
    builder.startVector(8, data.length, 8);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addInt64(data[i]);
    }
    return builder.endVector();
  }
  static startFeaturesVector(builder, numElems) {
    builder.startVector(8, numElems, 8);
  }
  static endSchema(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static finishSchemaBuffer(builder, offset) {
    builder.finish(offset);
  }
  static finishSizePrefixedSchemaBuffer(builder, offset) {
    builder.finish(offset, undefined, true);
  }
  static createSchema(builder, endianness, fieldsOffset, customMetadataOffset, featuresOffset) {
    Schema.startSchema(builder);
    Schema.addEndianness(builder, endianness);
    Schema.addFields(builder, fieldsOffset);
    Schema.addCustomMetadata(builder, customMetadataOffset);
    Schema.addFeatures(builder, featuresOffset);
    return Schema.endSchema(builder);
  }
}
var init_schema = __esm(() => {
  init_flatbuffers();
  init_endianness();
  init_field();
  init_key_value();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/message-header.mjs
var MessageHeader;
var init_message_header = __esm(() => {
  (function(MessageHeader2) {
    MessageHeader2[MessageHeader2["NONE"] = 0] = "NONE";
    MessageHeader2[MessageHeader2["Schema"] = 1] = "Schema";
    MessageHeader2[MessageHeader2["DictionaryBatch"] = 2] = "DictionaryBatch";
    MessageHeader2[MessageHeader2["RecordBatch"] = 3] = "RecordBatch";
    MessageHeader2[MessageHeader2["Tensor"] = 4] = "Tensor";
    MessageHeader2[MessageHeader2["SparseTensor"] = 5] = "SparseTensor";
  })(MessageHeader || (MessageHeader = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/enum.mjs
var Type2, BufferType;
var init_enum = __esm(() => {
  init_metadata_version();
  init_union_mode();
  init_precision();
  init_date_unit();
  init_time_unit();
  init_interval_unit();
  init_message_header();
  (function(Type3) {
    Type3[Type3["NONE"] = 0] = "NONE";
    Type3[Type3["Null"] = 1] = "Null";
    Type3[Type3["Int"] = 2] = "Int";
    Type3[Type3["Float"] = 3] = "Float";
    Type3[Type3["Binary"] = 4] = "Binary";
    Type3[Type3["Utf8"] = 5] = "Utf8";
    Type3[Type3["Bool"] = 6] = "Bool";
    Type3[Type3["Decimal"] = 7] = "Decimal";
    Type3[Type3["Date"] = 8] = "Date";
    Type3[Type3["Time"] = 9] = "Time";
    Type3[Type3["Timestamp"] = 10] = "Timestamp";
    Type3[Type3["Interval"] = 11] = "Interval";
    Type3[Type3["List"] = 12] = "List";
    Type3[Type3["Struct"] = 13] = "Struct";
    Type3[Type3["Union"] = 14] = "Union";
    Type3[Type3["FixedSizeBinary"] = 15] = "FixedSizeBinary";
    Type3[Type3["FixedSizeList"] = 16] = "FixedSizeList";
    Type3[Type3["Map"] = 17] = "Map";
    Type3[Type3["Duration"] = 18] = "Duration";
    Type3[Type3["LargeBinary"] = 19] = "LargeBinary";
    Type3[Type3["LargeUtf8"] = 20] = "LargeUtf8";
    Type3[Type3["Dictionary"] = -1] = "Dictionary";
    Type3[Type3["Int8"] = -2] = "Int8";
    Type3[Type3["Int16"] = -3] = "Int16";
    Type3[Type3["Int32"] = -4] = "Int32";
    Type3[Type3["Int64"] = -5] = "Int64";
    Type3[Type3["Uint8"] = -6] = "Uint8";
    Type3[Type3["Uint16"] = -7] = "Uint16";
    Type3[Type3["Uint32"] = -8] = "Uint32";
    Type3[Type3["Uint64"] = -9] = "Uint64";
    Type3[Type3["Float16"] = -10] = "Float16";
    Type3[Type3["Float32"] = -11] = "Float32";
    Type3[Type3["Float64"] = -12] = "Float64";
    Type3[Type3["DateDay"] = -13] = "DateDay";
    Type3[Type3["DateMillisecond"] = -14] = "DateMillisecond";
    Type3[Type3["TimestampSecond"] = -15] = "TimestampSecond";
    Type3[Type3["TimestampMillisecond"] = -16] = "TimestampMillisecond";
    Type3[Type3["TimestampMicrosecond"] = -17] = "TimestampMicrosecond";
    Type3[Type3["TimestampNanosecond"] = -18] = "TimestampNanosecond";
    Type3[Type3["TimeSecond"] = -19] = "TimeSecond";
    Type3[Type3["TimeMillisecond"] = -20] = "TimeMillisecond";
    Type3[Type3["TimeMicrosecond"] = -21] = "TimeMicrosecond";
    Type3[Type3["TimeNanosecond"] = -22] = "TimeNanosecond";
    Type3[Type3["DenseUnion"] = -23] = "DenseUnion";
    Type3[Type3["SparseUnion"] = -24] = "SparseUnion";
    Type3[Type3["IntervalDayTime"] = -25] = "IntervalDayTime";
    Type3[Type3["IntervalYearMonth"] = -26] = "IntervalYearMonth";
    Type3[Type3["DurationSecond"] = -27] = "DurationSecond";
    Type3[Type3["DurationMillisecond"] = -28] = "DurationMillisecond";
    Type3[Type3["DurationMicrosecond"] = -29] = "DurationMicrosecond";
    Type3[Type3["DurationNanosecond"] = -30] = "DurationNanosecond";
  })(Type2 || (Type2 = {}));
  (function(BufferType2) {
    BufferType2[BufferType2["OFFSET"] = 0] = "OFFSET";
    BufferType2[BufferType2["DATA"] = 1] = "DATA";
    BufferType2[BufferType2["VALIDITY"] = 2] = "VALIDITY";
    BufferType2[BufferType2["TYPE"] = 3] = "TYPE";
  })(BufferType || (BufferType = {}));
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/pretty.mjs
var exports_pretty = {};
__export(exports_pretty, {
  valueToString: () => valueToString
});
function valueToString(x) {
  if (x === null) {
    return "null";
  }
  if (x === undf) {
    return "undefined";
  }
  switch (typeof x) {
    case "number":
      return `${x}`;
    case "bigint":
      return `${x}`;
    case "string":
      return `"${x}"`;
  }
  if (typeof x[Symbol.toPrimitive] === "function") {
    return x[Symbol.toPrimitive]("string");
  }
  if (ArrayBuffer.isView(x)) {
    if (x instanceof BigInt64Array || x instanceof BigUint64Array) {
      return `[${[...x].map((x2) => valueToString(x2))}]`;
    }
    return `[${x}]`;
  }
  return ArrayBuffer.isView(x) ? `[${x}]` : JSON.stringify(x, (_, y) => typeof y === "bigint" ? `${y}` : y);
}
var undf = undefined;

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/bigint.mjs
function bigIntToNumber(number4) {
  if (typeof number4 === "bigint" && (number4 < Number.MIN_SAFE_INTEGER || number4 > Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${number4} is not safe to convert to a number.`);
  }
  return Number(number4);
}
function divideBigInts(number4, divisor) {
  return bigIntToNumber(number4 / divisor) + bigIntToNumber(number4 % divisor) / bigIntToNumber(divisor);
}

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/bn.mjs
var exports_bn = {};
__export(exports_bn, {
  isArrowBigNumSymbol: () => isArrowBigNumSymbol,
  bigNumToString: () => bigNumToString,
  bigNumToNumber: () => bigNumToNumber,
  bigNumToBigInt: () => bigNumToBigInt,
  BN: () => BN
});
function BigNum(x, ...xs) {
  if (xs.length === 0) {
    return Object.setPrototypeOf(toArrayBufferView(this["TypedArray"], x), this.constructor.prototype);
  }
  return Object.setPrototypeOf(new this["TypedArray"](x, ...xs), this.constructor.prototype);
}
function SignedBigNum(...args) {
  return BigNum.apply(this, args);
}
function UnsignedBigNum(...args) {
  return BigNum.apply(this, args);
}
function DecimalBigNum(...args) {
  return BigNum.apply(this, args);
}
function bigNumToNumber(bn, scale) {
  const { buffer, byteOffset, byteLength, signed } = bn;
  const words = new BigUint64Array(buffer, byteOffset, byteLength / 8);
  const negative = signed && words.at(-1) & BigInt(1) << BigInt(63);
  let number4 = BigInt(0);
  let i = 0;
  if (negative) {
    for (const word of words) {
      number4 |= (word ^ TWO_TO_THE_64_MINUS_1) * (BigInt(1) << BigInt(64 * i++));
    }
    number4 *= BigInt(-1);
    number4 -= BigInt(1);
  } else {
    for (const word of words) {
      number4 |= word * (BigInt(1) << BigInt(64 * i++));
    }
  }
  if (typeof scale === "number") {
    const denominator = BigInt(Math.pow(10, scale));
    const quotient = number4 / denominator;
    const remainder = number4 % denominator;
    return bigIntToNumber(quotient) + bigIntToNumber(remainder) / bigIntToNumber(denominator);
  }
  return bigIntToNumber(number4);
}
function bigNumToString(a) {
  if (a.byteLength === 8) {
    const bigIntArray = new a["BigIntArray"](a.buffer, a.byteOffset, 1);
    return `${bigIntArray[0]}`;
  }
  if (!a["signed"]) {
    return unsignedBigNumToString(a);
  }
  let array2 = new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2);
  const highOrderWord = new Int16Array([array2.at(-1)])[0];
  if (highOrderWord >= 0) {
    return unsignedBigNumToString(a);
  }
  array2 = array2.slice();
  let carry = 1;
  for (let i = 0;i < array2.length; i++) {
    const elem = array2[i];
    const updated = ~elem + carry;
    array2[i] = updated;
    carry &= elem === 0 ? 1 : 0;
  }
  const negated = unsignedBigNumToString(array2);
  return `-${negated}`;
}
function bigNumToBigInt(a) {
  if (a.byteLength === 8) {
    const bigIntArray = new a["BigIntArray"](a.buffer, a.byteOffset, 1);
    return bigIntArray[0];
  } else {
    return bigNumToString(a);
  }
}
function unsignedBigNumToString(a) {
  let digits = "";
  const base643 = new Uint32Array(2);
  let base32 = new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2);
  const checks3 = new Uint32Array((base32 = new Uint16Array(base32).reverse()).buffer);
  let i = -1;
  const n = base32.length - 1;
  do {
    for (base643[0] = base32[i = 0];i < n; ) {
      base32[i++] = base643[1] = base643[0] / 10;
      base643[0] = (base643[0] - base643[1] * 10 << 16) + base32[i];
    }
    base32[i] = base643[1] = base643[0] / 10;
    base643[0] = base643[0] - base643[1] * 10;
    digits = `${base643[0]}${digits}`;
  } while (checks3[0] || checks3[1] || checks3[2] || checks3[3]);
  return digits !== null && digits !== undefined ? digits : `0`;
}

class BN {
  static new(num, isSigned) {
    switch (isSigned) {
      case true:
        return new SignedBigNum(num);
      case false:
        return new UnsignedBigNum(num);
    }
    switch (num.constructor) {
      case Int8Array:
      case Int16Array:
      case Int32Array:
      case BigInt64Array:
        return new SignedBigNum(num);
    }
    if (num.byteLength === 16) {
      return new DecimalBigNum(num);
    }
    return new UnsignedBigNum(num);
  }
  static signed(num) {
    return new SignedBigNum(num);
  }
  static unsigned(num) {
    return new UnsignedBigNum(num);
  }
  static decimal(num) {
    return new DecimalBigNum(num);
  }
  constructor(num, isSigned) {
    return BN.new(num, isSigned);
  }
}
var isArrowBigNumSymbol, TWO_TO_THE_64, TWO_TO_THE_64_MINUS_1;
var init_bn = __esm(() => {
  init_buffer();
  isArrowBigNumSymbol = Symbol.for("isArrowBigNum");
  BigNum.prototype[isArrowBigNumSymbol] = true;
  BigNum.prototype.toJSON = function() {
    return `"${bigNumToString(this)}"`;
  };
  BigNum.prototype.valueOf = function(scale) {
    return bigNumToNumber(this, scale);
  };
  BigNum.prototype.toString = function() {
    return bigNumToString(this);
  };
  BigNum.prototype[Symbol.toPrimitive] = function(hint = "default") {
    switch (hint) {
      case "number":
        return bigNumToNumber(this);
      case "string":
        return bigNumToString(this);
      case "default":
        return bigNumToBigInt(this);
    }
    return bigNumToString(this);
  };
  Object.setPrototypeOf(SignedBigNum.prototype, Object.create(Int32Array.prototype));
  Object.setPrototypeOf(UnsignedBigNum.prototype, Object.create(Uint32Array.prototype));
  Object.setPrototypeOf(DecimalBigNum.prototype, Object.create(Uint32Array.prototype));
  Object.assign(SignedBigNum.prototype, BigNum.prototype, { constructor: SignedBigNum, signed: true, TypedArray: Int32Array, BigIntArray: BigInt64Array });
  Object.assign(UnsignedBigNum.prototype, BigNum.prototype, { constructor: UnsignedBigNum, signed: false, TypedArray: Uint32Array, BigIntArray: BigUint64Array });
  Object.assign(DecimalBigNum.prototype, BigNum.prototype, { constructor: DecimalBigNum, signed: true, TypedArray: Uint32Array, BigIntArray: BigUint64Array });
  TWO_TO_THE_64 = BigInt(4294967296) * BigInt(4294967296);
  TWO_TO_THE_64_MINUS_1 = TWO_TO_THE_64 - BigInt(1);
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/type.mjs
class DataType {
  static isNull(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Null;
  }
  static isInt(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Int;
  }
  static isFloat(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Float;
  }
  static isBinary(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Binary;
  }
  static isLargeBinary(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.LargeBinary;
  }
  static isUtf8(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Utf8;
  }
  static isLargeUtf8(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.LargeUtf8;
  }
  static isBool(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Bool;
  }
  static isDecimal(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Decimal;
  }
  static isDate(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Date;
  }
  static isTime(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Time;
  }
  static isTimestamp(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Timestamp;
  }
  static isInterval(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Interval;
  }
  static isDuration(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Duration;
  }
  static isList(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.List;
  }
  static isStruct(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Struct;
  }
  static isUnion(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Union;
  }
  static isFixedSizeBinary(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.FixedSizeBinary;
  }
  static isFixedSizeList(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.FixedSizeList;
  }
  static isMap(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Map;
  }
  static isDictionary(x) {
    return (x === null || x === undefined ? undefined : x.typeId) === Type2.Dictionary;
  }
  static isDenseUnion(x) {
    return DataType.isUnion(x) && x.mode === UnionMode.Dense;
  }
  static isSparseUnion(x) {
    return DataType.isUnion(x) && x.mode === UnionMode.Sparse;
  }
  constructor(typeId) {
    this.typeId = typeId;
  }
}
function strideForType(type) {
  const t = type;
  switch (type.typeId) {
    case Type2.Decimal:
      return type.bitWidth / 32;
    case Type2.Interval:
      return 1 + t.unit;
    case Type2.FixedSizeList:
      return t.listSize;
    case Type2.FixedSizeBinary:
      return t.byteWidth;
    default:
      return 1;
  }
}
var _a3, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, Null2, Int_, Int8, Int16, Int32, Int64, Uint8, Uint16, Uint32, Uint64, Float, Float16, Float32, Float64, Binary2, LargeBinary2, Utf82, LargeUtf82, Bool2, Decimal2, Date_, Time_, Timestamp_, TimestampMillisecond, Interval_, Duration2, List2, Struct, Union_, FixedSizeBinary2, FixedSizeList2, Map_, getId, Dictionary;
var init_type2 = __esm(() => {
  init_enum();
  _a3 = Symbol.toStringTag;
  DataType[_a3] = ((proto) => {
    proto.children = null;
    proto.ArrayType = Array;
    proto.OffsetArrayType = Int32Array;
    return proto[Symbol.toStringTag] = "DataType";
  })(DataType.prototype);
  Null2 = class Null2 extends DataType {
    constructor() {
      super(Type2.Null);
    }
    toString() {
      return `Null`;
    }
  };
  _b = Symbol.toStringTag;
  Null2[_b] = ((proto) => proto[Symbol.toStringTag] = "Null")(Null2.prototype);
  Int_ = class Int_ extends DataType {
    constructor(isSigned, bitWidth) {
      super(Type2.Int);
      this.isSigned = isSigned;
      this.bitWidth = bitWidth;
    }
    get ArrayType() {
      switch (this.bitWidth) {
        case 8:
          return this.isSigned ? Int8Array : Uint8Array;
        case 16:
          return this.isSigned ? Int16Array : Uint16Array;
        case 32:
          return this.isSigned ? Int32Array : Uint32Array;
        case 64:
          return this.isSigned ? BigInt64Array : BigUint64Array;
      }
      throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() {
      return `${this.isSigned ? `I` : `Ui`}nt${this.bitWidth}`;
    }
  };
  _c = Symbol.toStringTag;
  Int_[_c] = ((proto) => {
    proto.isSigned = null;
    proto.bitWidth = null;
    return proto[Symbol.toStringTag] = "Int";
  })(Int_.prototype);
  Int8 = class Int8 extends Int_ {
    constructor() {
      super(true, 8);
    }
    get ArrayType() {
      return Int8Array;
    }
  };
  Int16 = class Int16 extends Int_ {
    constructor() {
      super(true, 16);
    }
    get ArrayType() {
      return Int16Array;
    }
  };
  Int32 = class Int32 extends Int_ {
    constructor() {
      super(true, 32);
    }
    get ArrayType() {
      return Int32Array;
    }
  };
  Int64 = class Int64 extends Int_ {
    constructor() {
      super(true, 64);
    }
    get ArrayType() {
      return BigInt64Array;
    }
  };
  Uint8 = class Uint8 extends Int_ {
    constructor() {
      super(false, 8);
    }
    get ArrayType() {
      return Uint8Array;
    }
  };
  Uint16 = class Uint16 extends Int_ {
    constructor() {
      super(false, 16);
    }
    get ArrayType() {
      return Uint16Array;
    }
  };
  Uint32 = class Uint32 extends Int_ {
    constructor() {
      super(false, 32);
    }
    get ArrayType() {
      return Uint32Array;
    }
  };
  Uint64 = class Uint64 extends Int_ {
    constructor() {
      super(false, 64);
    }
    get ArrayType() {
      return BigUint64Array;
    }
  };
  Object.defineProperty(Int8.prototype, "ArrayType", { value: Int8Array });
  Object.defineProperty(Int16.prototype, "ArrayType", { value: Int16Array });
  Object.defineProperty(Int32.prototype, "ArrayType", { value: Int32Array });
  Object.defineProperty(Int64.prototype, "ArrayType", { value: BigInt64Array });
  Object.defineProperty(Uint8.prototype, "ArrayType", { value: Uint8Array });
  Object.defineProperty(Uint16.prototype, "ArrayType", { value: Uint16Array });
  Object.defineProperty(Uint32.prototype, "ArrayType", { value: Uint32Array });
  Object.defineProperty(Uint64.prototype, "ArrayType", { value: BigUint64Array });
  Float = class Float extends DataType {
    constructor(precision) {
      super(Type2.Float);
      this.precision = precision;
    }
    get ArrayType() {
      switch (this.precision) {
        case Precision.HALF:
          return Uint16Array;
        case Precision.SINGLE:
          return Float32Array;
        case Precision.DOUBLE:
          return Float64Array;
      }
      throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
    toString() {
      return `Float${this.precision << 5 || 16}`;
    }
  };
  _d = Symbol.toStringTag;
  Float[_d] = ((proto) => {
    proto.precision = null;
    return proto[Symbol.toStringTag] = "Float";
  })(Float.prototype);
  Float16 = class Float16 extends Float {
    constructor() {
      super(Precision.HALF);
    }
  };
  Float32 = class Float32 extends Float {
    constructor() {
      super(Precision.SINGLE);
    }
  };
  Float64 = class Float64 extends Float {
    constructor() {
      super(Precision.DOUBLE);
    }
  };
  Object.defineProperty(Float16.prototype, "ArrayType", { value: Uint16Array });
  Object.defineProperty(Float32.prototype, "ArrayType", { value: Float32Array });
  Object.defineProperty(Float64.prototype, "ArrayType", { value: Float64Array });
  Binary2 = class Binary2 extends DataType {
    constructor() {
      super(Type2.Binary);
    }
    toString() {
      return `Binary`;
    }
  };
  _e = Symbol.toStringTag;
  Binary2[_e] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "Binary";
  })(Binary2.prototype);
  LargeBinary2 = class LargeBinary2 extends DataType {
    constructor() {
      super(Type2.LargeBinary);
    }
    toString() {
      return `LargeBinary`;
    }
  };
  _f = Symbol.toStringTag;
  LargeBinary2[_f] = ((proto) => {
    proto.ArrayType = Uint8Array;
    proto.OffsetArrayType = BigInt64Array;
    return proto[Symbol.toStringTag] = "LargeBinary";
  })(LargeBinary2.prototype);
  Utf82 = class Utf82 extends DataType {
    constructor() {
      super(Type2.Utf8);
    }
    toString() {
      return `Utf8`;
    }
  };
  _g = Symbol.toStringTag;
  Utf82[_g] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "Utf8";
  })(Utf82.prototype);
  LargeUtf82 = class LargeUtf82 extends DataType {
    constructor() {
      super(Type2.LargeUtf8);
    }
    toString() {
      return `LargeUtf8`;
    }
  };
  _h = Symbol.toStringTag;
  LargeUtf82[_h] = ((proto) => {
    proto.ArrayType = Uint8Array;
    proto.OffsetArrayType = BigInt64Array;
    return proto[Symbol.toStringTag] = "LargeUtf8";
  })(LargeUtf82.prototype);
  Bool2 = class Bool2 extends DataType {
    constructor() {
      super(Type2.Bool);
    }
    toString() {
      return `Bool`;
    }
  };
  _j = Symbol.toStringTag;
  Bool2[_j] = ((proto) => {
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "Bool";
  })(Bool2.prototype);
  Decimal2 = class Decimal2 extends DataType {
    constructor(scale, precision, bitWidth = 128) {
      super(Type2.Decimal);
      this.scale = scale;
      this.precision = precision;
      this.bitWidth = bitWidth;
    }
    toString() {
      return `Decimal[${this.precision}e${this.scale > 0 ? `+` : ``}${this.scale}]`;
    }
  };
  _k = Symbol.toStringTag;
  Decimal2[_k] = ((proto) => {
    proto.scale = null;
    proto.precision = null;
    proto.ArrayType = Uint32Array;
    return proto[Symbol.toStringTag] = "Decimal";
  })(Decimal2.prototype);
  Date_ = class Date_ extends DataType {
    constructor(unit) {
      super(Type2.Date);
      this.unit = unit;
    }
    toString() {
      return `Date${(this.unit + 1) * 32}<${DateUnit[this.unit]}>`;
    }
    get ArrayType() {
      return this.unit === DateUnit.DAY ? Int32Array : BigInt64Array;
    }
  };
  _l = Symbol.toStringTag;
  Date_[_l] = ((proto) => {
    proto.unit = null;
    return proto[Symbol.toStringTag] = "Date";
  })(Date_.prototype);
  Time_ = class Time_ extends DataType {
    constructor(unit, bitWidth) {
      super(Type2.Time);
      this.unit = unit;
      this.bitWidth = bitWidth;
    }
    toString() {
      return `Time${this.bitWidth}<${TimeUnit[this.unit]}>`;
    }
    get ArrayType() {
      switch (this.bitWidth) {
        case 32:
          return Int32Array;
        case 64:
          return BigInt64Array;
      }
      throw new Error(`Unrecognized ${this[Symbol.toStringTag]} type`);
    }
  };
  _m = Symbol.toStringTag;
  Time_[_m] = ((proto) => {
    proto.unit = null;
    proto.bitWidth = null;
    return proto[Symbol.toStringTag] = "Time";
  })(Time_.prototype);
  Timestamp_ = class Timestamp_ extends DataType {
    constructor(unit, timezone) {
      super(Type2.Timestamp);
      this.unit = unit;
      this.timezone = timezone;
    }
    toString() {
      return `Timestamp<${TimeUnit[this.unit]}${this.timezone ? `, ${this.timezone}` : ``}>`;
    }
  };
  _o = Symbol.toStringTag;
  Timestamp_[_o] = ((proto) => {
    proto.unit = null;
    proto.timezone = null;
    proto.ArrayType = BigInt64Array;
    return proto[Symbol.toStringTag] = "Timestamp";
  })(Timestamp_.prototype);
  TimestampMillisecond = class TimestampMillisecond extends Timestamp_ {
    constructor(timezone) {
      super(TimeUnit.MILLISECOND, timezone);
    }
  };
  Interval_ = class Interval_ extends DataType {
    constructor(unit) {
      super(Type2.Interval);
      this.unit = unit;
    }
    toString() {
      return `Interval<${IntervalUnit[this.unit]}>`;
    }
  };
  _p = Symbol.toStringTag;
  Interval_[_p] = ((proto) => {
    proto.unit = null;
    proto.ArrayType = Int32Array;
    return proto[Symbol.toStringTag] = "Interval";
  })(Interval_.prototype);
  Duration2 = class Duration2 extends DataType {
    constructor(unit) {
      super(Type2.Duration);
      this.unit = unit;
    }
    toString() {
      return `Duration<${TimeUnit[this.unit]}>`;
    }
  };
  _q = Symbol.toStringTag;
  Duration2[_q] = ((proto) => {
    proto.unit = null;
    proto.ArrayType = BigInt64Array;
    return proto[Symbol.toStringTag] = "Duration";
  })(Duration2.prototype);
  List2 = class List2 extends DataType {
    constructor(child) {
      super(Type2.List);
      this.children = [child];
    }
    toString() {
      return `List<${this.valueType}>`;
    }
    get valueType() {
      return this.children[0].type;
    }
    get valueField() {
      return this.children[0];
    }
    get ArrayType() {
      return this.valueType.ArrayType;
    }
  };
  _r = Symbol.toStringTag;
  List2[_r] = ((proto) => {
    proto.children = null;
    return proto[Symbol.toStringTag] = "List";
  })(List2.prototype);
  Struct = class Struct extends DataType {
    constructor(children) {
      super(Type2.Struct);
      this.children = children;
    }
    toString() {
      return `Struct<{${this.children.map((f) => `${f.name}:${f.type}`).join(`, `)}}>`;
    }
  };
  _s = Symbol.toStringTag;
  Struct[_s] = ((proto) => {
    proto.children = null;
    return proto[Symbol.toStringTag] = "Struct";
  })(Struct.prototype);
  Union_ = class Union_ extends DataType {
    constructor(mode, typeIds, children) {
      super(Type2.Union);
      this.mode = mode;
      this.children = children;
      this.typeIds = typeIds = Int32Array.from(typeIds);
      this.typeIdToChildIndex = typeIds.reduce((typeIdToChildIndex, typeId, idx) => (typeIdToChildIndex[typeId] = idx) && typeIdToChildIndex || typeIdToChildIndex, Object.create(null));
    }
    toString() {
      return `${this[Symbol.toStringTag]}<${this.children.map((x) => `${x.type}`).join(` | `)}>`;
    }
  };
  _t = Symbol.toStringTag;
  Union_[_t] = ((proto) => {
    proto.mode = null;
    proto.typeIds = null;
    proto.children = null;
    proto.typeIdToChildIndex = null;
    proto.ArrayType = Int8Array;
    return proto[Symbol.toStringTag] = "Union";
  })(Union_.prototype);
  FixedSizeBinary2 = class FixedSizeBinary2 extends DataType {
    constructor(byteWidth) {
      super(Type2.FixedSizeBinary);
      this.byteWidth = byteWidth;
    }
    toString() {
      return `FixedSizeBinary[${this.byteWidth}]`;
    }
  };
  _u = Symbol.toStringTag;
  FixedSizeBinary2[_u] = ((proto) => {
    proto.byteWidth = null;
    proto.ArrayType = Uint8Array;
    return proto[Symbol.toStringTag] = "FixedSizeBinary";
  })(FixedSizeBinary2.prototype);
  FixedSizeList2 = class FixedSizeList2 extends DataType {
    constructor(listSize, child) {
      super(Type2.FixedSizeList);
      this.listSize = listSize;
      this.children = [child];
    }
    get valueType() {
      return this.children[0].type;
    }
    get valueField() {
      return this.children[0];
    }
    get ArrayType() {
      return this.valueType.ArrayType;
    }
    toString() {
      return `FixedSizeList[${this.listSize}]<${this.valueType}>`;
    }
  };
  _v = Symbol.toStringTag;
  FixedSizeList2[_v] = ((proto) => {
    proto.children = null;
    proto.listSize = null;
    return proto[Symbol.toStringTag] = "FixedSizeList";
  })(FixedSizeList2.prototype);
  Map_ = class Map_ extends DataType {
    constructor(entries, keysSorted = false) {
      var _y, _z, _0;
      super(Type2.Map);
      this.children = [entries];
      this.keysSorted = keysSorted;
      if (entries) {
        entries["name"] = "entries";
        if ((_y = entries === null || entries === undefined ? undefined : entries.type) === null || _y === undefined ? undefined : _y.children) {
          const key = (_z = entries === null || entries === undefined ? undefined : entries.type) === null || _z === undefined ? undefined : _z.children[0];
          if (key) {
            key["name"] = "key";
          }
          const val = (_0 = entries === null || entries === undefined ? undefined : entries.type) === null || _0 === undefined ? undefined : _0.children[1];
          if (val) {
            val["name"] = "value";
          }
        }
      }
    }
    get keyType() {
      return this.children[0].type.children[0].type;
    }
    get valueType() {
      return this.children[0].type.children[1].type;
    }
    get childType() {
      return this.children[0].type;
    }
    toString() {
      return `Map<{${this.children[0].type.children.map((f) => `${f.name}:${f.type}`).join(`, `)}}>`;
    }
  };
  _w = Symbol.toStringTag;
  Map_[_w] = ((proto) => {
    proto.children = null;
    proto.keysSorted = null;
    return proto[Symbol.toStringTag] = "Map_";
  })(Map_.prototype);
  getId = ((atomicDictionaryId) => () => ++atomicDictionaryId)(-1);
  Dictionary = class Dictionary extends DataType {
    constructor(dictionary, indices, id, isOrdered) {
      super(Type2.Dictionary);
      this.indices = indices;
      this.dictionary = dictionary;
      this.isOrdered = isOrdered || false;
      this.id = id == null ? getId() : bigIntToNumber(id);
    }
    get children() {
      return this.dictionary.children;
    }
    get valueType() {
      return this.dictionary;
    }
    get ArrayType() {
      return this.dictionary.ArrayType;
    }
    toString() {
      return `Dictionary<${this.indices}, ${this.dictionary}>`;
    }
  };
  _x = Symbol.toStringTag;
  Dictionary[_x] = ((proto) => {
    proto.id = null;
    proto.indices = null;
    proto.isOrdered = null;
    proto.dictionary = null;
    return proto[Symbol.toStringTag] = "Dictionary";
  })(Dictionary.prototype);
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor.mjs
class Visitor {
  visitMany(nodes, ...args) {
    return nodes.map((node, i) => this.visit(node, ...args.map((x) => x[i])));
  }
  visit(...args) {
    return this.getVisitFn(args[0], false).apply(this, args);
  }
  getVisitFn(node, throwIfNotFound = true) {
    return getVisitFn(this, node, throwIfNotFound);
  }
  getVisitFnByTypeId(typeId, throwIfNotFound = true) {
    return getVisitFnByTypeId(this, typeId, throwIfNotFound);
  }
  visitNull(_node, ..._args) {
    return null;
  }
  visitBool(_node, ..._args) {
    return null;
  }
  visitInt(_node, ..._args) {
    return null;
  }
  visitFloat(_node, ..._args) {
    return null;
  }
  visitUtf8(_node, ..._args) {
    return null;
  }
  visitLargeUtf8(_node, ..._args) {
    return null;
  }
  visitBinary(_node, ..._args) {
    return null;
  }
  visitLargeBinary(_node, ..._args) {
    return null;
  }
  visitFixedSizeBinary(_node, ..._args) {
    return null;
  }
  visitDate(_node, ..._args) {
    return null;
  }
  visitTimestamp(_node, ..._args) {
    return null;
  }
  visitTime(_node, ..._args) {
    return null;
  }
  visitDecimal(_node, ..._args) {
    return null;
  }
  visitList(_node, ..._args) {
    return null;
  }
  visitStruct(_node, ..._args) {
    return null;
  }
  visitUnion(_node, ..._args) {
    return null;
  }
  visitDictionary(_node, ..._args) {
    return null;
  }
  visitInterval(_node, ..._args) {
    return null;
  }
  visitDuration(_node, ..._args) {
    return null;
  }
  visitFixedSizeList(_node, ..._args) {
    return null;
  }
  visitMap(_node, ..._args) {
    return null;
  }
}
function getVisitFn(visitor, node, throwIfNotFound = true) {
  if (typeof node === "number") {
    return getVisitFnByTypeId(visitor, node, throwIfNotFound);
  }
  if (typeof node === "string" && node in Type2) {
    return getVisitFnByTypeId(visitor, Type2[node], throwIfNotFound);
  }
  if (node && node instanceof DataType) {
    return getVisitFnByTypeId(visitor, inferDType(node), throwIfNotFound);
  }
  if ((node === null || node === undefined ? undefined : node.type) && node.type instanceof DataType) {
    return getVisitFnByTypeId(visitor, inferDType(node.type), throwIfNotFound);
  }
  return getVisitFnByTypeId(visitor, Type2.NONE, throwIfNotFound);
}
function getVisitFnByTypeId(visitor, dtype, throwIfNotFound = true) {
  let fn = null;
  switch (dtype) {
    case Type2.Null:
      fn = visitor.visitNull;
      break;
    case Type2.Bool:
      fn = visitor.visitBool;
      break;
    case Type2.Int:
      fn = visitor.visitInt;
      break;
    case Type2.Int8:
      fn = visitor.visitInt8 || visitor.visitInt;
      break;
    case Type2.Int16:
      fn = visitor.visitInt16 || visitor.visitInt;
      break;
    case Type2.Int32:
      fn = visitor.visitInt32 || visitor.visitInt;
      break;
    case Type2.Int64:
      fn = visitor.visitInt64 || visitor.visitInt;
      break;
    case Type2.Uint8:
      fn = visitor.visitUint8 || visitor.visitInt;
      break;
    case Type2.Uint16:
      fn = visitor.visitUint16 || visitor.visitInt;
      break;
    case Type2.Uint32:
      fn = visitor.visitUint32 || visitor.visitInt;
      break;
    case Type2.Uint64:
      fn = visitor.visitUint64 || visitor.visitInt;
      break;
    case Type2.Float:
      fn = visitor.visitFloat;
      break;
    case Type2.Float16:
      fn = visitor.visitFloat16 || visitor.visitFloat;
      break;
    case Type2.Float32:
      fn = visitor.visitFloat32 || visitor.visitFloat;
      break;
    case Type2.Float64:
      fn = visitor.visitFloat64 || visitor.visitFloat;
      break;
    case Type2.Utf8:
      fn = visitor.visitUtf8;
      break;
    case Type2.LargeUtf8:
      fn = visitor.visitLargeUtf8;
      break;
    case Type2.Binary:
      fn = visitor.visitBinary;
      break;
    case Type2.LargeBinary:
      fn = visitor.visitLargeBinary;
      break;
    case Type2.FixedSizeBinary:
      fn = visitor.visitFixedSizeBinary;
      break;
    case Type2.Date:
      fn = visitor.visitDate;
      break;
    case Type2.DateDay:
      fn = visitor.visitDateDay || visitor.visitDate;
      break;
    case Type2.DateMillisecond:
      fn = visitor.visitDateMillisecond || visitor.visitDate;
      break;
    case Type2.Timestamp:
      fn = visitor.visitTimestamp;
      break;
    case Type2.TimestampSecond:
      fn = visitor.visitTimestampSecond || visitor.visitTimestamp;
      break;
    case Type2.TimestampMillisecond:
      fn = visitor.visitTimestampMillisecond || visitor.visitTimestamp;
      break;
    case Type2.TimestampMicrosecond:
      fn = visitor.visitTimestampMicrosecond || visitor.visitTimestamp;
      break;
    case Type2.TimestampNanosecond:
      fn = visitor.visitTimestampNanosecond || visitor.visitTimestamp;
      break;
    case Type2.Time:
      fn = visitor.visitTime;
      break;
    case Type2.TimeSecond:
      fn = visitor.visitTimeSecond || visitor.visitTime;
      break;
    case Type2.TimeMillisecond:
      fn = visitor.visitTimeMillisecond || visitor.visitTime;
      break;
    case Type2.TimeMicrosecond:
      fn = visitor.visitTimeMicrosecond || visitor.visitTime;
      break;
    case Type2.TimeNanosecond:
      fn = visitor.visitTimeNanosecond || visitor.visitTime;
      break;
    case Type2.Decimal:
      fn = visitor.visitDecimal;
      break;
    case Type2.List:
      fn = visitor.visitList;
      break;
    case Type2.Struct:
      fn = visitor.visitStruct;
      break;
    case Type2.Union:
      fn = visitor.visitUnion;
      break;
    case Type2.DenseUnion:
      fn = visitor.visitDenseUnion || visitor.visitUnion;
      break;
    case Type2.SparseUnion:
      fn = visitor.visitSparseUnion || visitor.visitUnion;
      break;
    case Type2.Dictionary:
      fn = visitor.visitDictionary;
      break;
    case Type2.Interval:
      fn = visitor.visitInterval;
      break;
    case Type2.IntervalDayTime:
      fn = visitor.visitIntervalDayTime || visitor.visitInterval;
      break;
    case Type2.IntervalYearMonth:
      fn = visitor.visitIntervalYearMonth || visitor.visitInterval;
      break;
    case Type2.Duration:
      fn = visitor.visitDuration;
      break;
    case Type2.DurationSecond:
      fn = visitor.visitDurationSecond || visitor.visitDuration;
      break;
    case Type2.DurationMillisecond:
      fn = visitor.visitDurationMillisecond || visitor.visitDuration;
      break;
    case Type2.DurationMicrosecond:
      fn = visitor.visitDurationMicrosecond || visitor.visitDuration;
      break;
    case Type2.DurationNanosecond:
      fn = visitor.visitDurationNanosecond || visitor.visitDuration;
      break;
    case Type2.FixedSizeList:
      fn = visitor.visitFixedSizeList;
      break;
    case Type2.Map:
      fn = visitor.visitMap;
      break;
  }
  if (typeof fn === "function")
    return fn;
  if (!throwIfNotFound)
    return () => null;
  throw new Error(`Unrecognized type '${Type2[dtype]}'`);
}
function inferDType(type) {
  switch (type.typeId) {
    case Type2.Null:
      return Type2.Null;
    case Type2.Int: {
      const { bitWidth, isSigned } = type;
      switch (bitWidth) {
        case 8:
          return isSigned ? Type2.Int8 : Type2.Uint8;
        case 16:
          return isSigned ? Type2.Int16 : Type2.Uint16;
        case 32:
          return isSigned ? Type2.Int32 : Type2.Uint32;
        case 64:
          return isSigned ? Type2.Int64 : Type2.Uint64;
      }
      return Type2.Int;
    }
    case Type2.Float:
      switch (type.precision) {
        case Precision.HALF:
          return Type2.Float16;
        case Precision.SINGLE:
          return Type2.Float32;
        case Precision.DOUBLE:
          return Type2.Float64;
      }
      return Type2.Float;
    case Type2.Binary:
      return Type2.Binary;
    case Type2.LargeBinary:
      return Type2.LargeBinary;
    case Type2.Utf8:
      return Type2.Utf8;
    case Type2.LargeUtf8:
      return Type2.LargeUtf8;
    case Type2.Bool:
      return Type2.Bool;
    case Type2.Decimal:
      return Type2.Decimal;
    case Type2.Time:
      switch (type.unit) {
        case TimeUnit.SECOND:
          return Type2.TimeSecond;
        case TimeUnit.MILLISECOND:
          return Type2.TimeMillisecond;
        case TimeUnit.MICROSECOND:
          return Type2.TimeMicrosecond;
        case TimeUnit.NANOSECOND:
          return Type2.TimeNanosecond;
      }
      return Type2.Time;
    case Type2.Timestamp:
      switch (type.unit) {
        case TimeUnit.SECOND:
          return Type2.TimestampSecond;
        case TimeUnit.MILLISECOND:
          return Type2.TimestampMillisecond;
        case TimeUnit.MICROSECOND:
          return Type2.TimestampMicrosecond;
        case TimeUnit.NANOSECOND:
          return Type2.TimestampNanosecond;
      }
      return Type2.Timestamp;
    case Type2.Date:
      switch (type.unit) {
        case DateUnit.DAY:
          return Type2.DateDay;
        case DateUnit.MILLISECOND:
          return Type2.DateMillisecond;
      }
      return Type2.Date;
    case Type2.Interval:
      switch (type.unit) {
        case IntervalUnit.DAY_TIME:
          return Type2.IntervalDayTime;
        case IntervalUnit.YEAR_MONTH:
          return Type2.IntervalYearMonth;
      }
      return Type2.Interval;
    case Type2.Duration:
      switch (type.unit) {
        case TimeUnit.SECOND:
          return Type2.DurationSecond;
        case TimeUnit.MILLISECOND:
          return Type2.DurationMillisecond;
        case TimeUnit.MICROSECOND:
          return Type2.DurationMicrosecond;
        case TimeUnit.NANOSECOND:
          return Type2.DurationNanosecond;
      }
      return Type2.Duration;
    case Type2.Map:
      return Type2.Map;
    case Type2.List:
      return Type2.List;
    case Type2.Struct:
      return Type2.Struct;
    case Type2.Union:
      switch (type.mode) {
        case UnionMode.Dense:
          return Type2.DenseUnion;
        case UnionMode.Sparse:
          return Type2.SparseUnion;
      }
      return Type2.Union;
    case Type2.FixedSizeBinary:
      return Type2.FixedSizeBinary;
    case Type2.FixedSizeList:
      return Type2.FixedSizeList;
    case Type2.Dictionary:
      return Type2.Dictionary;
  }
  throw new Error(`Unrecognized type '${Type2[type.typeId]}'`);
}
var init_visitor = __esm(() => {
  init_enum();
  init_type2();
  Visitor.prototype.visitInt8 = null;
  Visitor.prototype.visitInt16 = null;
  Visitor.prototype.visitInt32 = null;
  Visitor.prototype.visitInt64 = null;
  Visitor.prototype.visitUint8 = null;
  Visitor.prototype.visitUint16 = null;
  Visitor.prototype.visitUint32 = null;
  Visitor.prototype.visitUint64 = null;
  Visitor.prototype.visitFloat16 = null;
  Visitor.prototype.visitFloat32 = null;
  Visitor.prototype.visitFloat64 = null;
  Visitor.prototype.visitDateDay = null;
  Visitor.prototype.visitDateMillisecond = null;
  Visitor.prototype.visitTimestampSecond = null;
  Visitor.prototype.visitTimestampMillisecond = null;
  Visitor.prototype.visitTimestampMicrosecond = null;
  Visitor.prototype.visitTimestampNanosecond = null;
  Visitor.prototype.visitTimeSecond = null;
  Visitor.prototype.visitTimeMillisecond = null;
  Visitor.prototype.visitTimeMicrosecond = null;
  Visitor.prototype.visitTimeNanosecond = null;
  Visitor.prototype.visitDenseUnion = null;
  Visitor.prototype.visitSparseUnion = null;
  Visitor.prototype.visitIntervalDayTime = null;
  Visitor.prototype.visitIntervalYearMonth = null;
  Visitor.prototype.visitDuration = null;
  Visitor.prototype.visitDurationSecond = null;
  Visitor.prototype.visitDurationMillisecond = null;
  Visitor.prototype.visitDurationMicrosecond = null;
  Visitor.prototype.visitDurationNanosecond = null;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/math.mjs
var exports_math = {};
__export(exports_math, {
  uint16ToFloat64: () => uint16ToFloat64,
  float64ToUint16: () => float64ToUint16
});
function uint16ToFloat64(h) {
  const expo = (h & 31744) >> 10;
  const sigf = (h & 1023) / 1024;
  const sign = Math.pow(-1, (h & 32768) >> 15);
  switch (expo) {
    case 31:
      return sign * (sigf ? Number.NaN : 1 / 0);
    case 0:
      return sign * (sigf ? 0.00006103515625 * sigf : 0);
  }
  return sign * Math.pow(2, expo - 15) * (1 + sigf);
}
function float64ToUint16(d) {
  if (d !== d) {
    return 32256;
  }
  f64[0] = d;
  const sign = (u32[1] & 2147483648) >> 16 & 65535;
  let expo = u32[1] & 2146435072, sigf = 0;
  if (expo >= 1089470464) {
    if (u32[0] > 0) {
      expo = 31744;
    } else {
      expo = (expo & 2080374784) >> 16;
      sigf = (u32[1] & 1048575) >> 10;
    }
  } else if (expo <= 1056964608) {
    sigf = 1048576 + (u32[1] & 1048575);
    sigf = 1048576 + (sigf << (expo >> 20) - 998) >> 21;
    expo = 0;
  } else {
    expo = expo - 1056964608 >> 10;
    sigf = (u32[1] & 1048575) + 512 >> 10;
  }
  return sign | expo | sigf & 65535;
}
var f64, u32;
var init_math = __esm(() => {
  f64 = new Float64Array(1);
  u32 = new Uint32Array(f64.buffer);
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/set.mjs
function wrapSet(fn) {
  return (data, _1, _2) => {
    if (data.setValid(_1, _2 != null)) {
      return fn(data, _1, _2);
    }
  };
}
var SetVisitor, setEpochMsToDays = (data, index, epochMs) => {
  data[index] = Math.floor(epochMs / 86400000);
}, setVariableWidthBytes = (values, valueOffsets, index, value) => {
  if (index + 1 < valueOffsets.length) {
    const x = bigIntToNumber(valueOffsets[index]);
    const y = bigIntToNumber(valueOffsets[index + 1]);
    values.set(value.subarray(0, y - x), x);
  }
}, setBool = ({ offset, values }, index, val) => {
  const idx = offset + index;
  val ? values[idx >> 3] |= 1 << idx % 8 : values[idx >> 3] &= ~(1 << idx % 8);
}, setInt = ({ values }, index, value) => {
  values[index] = value;
}, setFloat = ({ values }, index, value) => {
  values[index] = value;
}, setFloat16 = ({ values }, index, value) => {
  values[index] = float64ToUint16(value);
}, setAnyFloat = (data, index, value) => {
  switch (data.type.precision) {
    case Precision.HALF:
      return setFloat16(data, index, value);
    case Precision.SINGLE:
    case Precision.DOUBLE:
      return setFloat(data, index, value);
  }
}, setDateDay = ({ values }, index, value) => {
  setEpochMsToDays(values, index, value.valueOf());
}, setDateMillisecond = ({ values }, index, value) => {
  values[index] = BigInt(value);
}, setFixedSizeBinary = ({ stride, values }, index, value) => {
  values.set(value.subarray(0, stride), stride * index);
}, setBinary = ({ values, valueOffsets }, index, value) => setVariableWidthBytes(values, valueOffsets, index, value), setUtf8 = ({ values, valueOffsets }, index, value) => setVariableWidthBytes(values, valueOffsets, index, encodeUtf8(value)), setDate = (data, index, value) => {
  data.type.unit === DateUnit.DAY ? setDateDay(data, index, value) : setDateMillisecond(data, index, value);
}, setTimestampSecond = ({ values }, index, value) => {
  values[index] = BigInt(value / 1000);
}, setTimestampMillisecond = ({ values }, index, value) => {
  values[index] = BigInt(value);
}, setTimestampMicrosecond = ({ values }, index, value) => {
  values[index] = BigInt(value * 1000);
}, setTimestampNanosecond = ({ values }, index, value) => {
  values[index] = BigInt(value * 1e6);
}, setTimestamp = (data, index, value) => {
  switch (data.type.unit) {
    case TimeUnit.SECOND:
      return setTimestampSecond(data, index, value);
    case TimeUnit.MILLISECOND:
      return setTimestampMillisecond(data, index, value);
    case TimeUnit.MICROSECOND:
      return setTimestampMicrosecond(data, index, value);
    case TimeUnit.NANOSECOND:
      return setTimestampNanosecond(data, index, value);
  }
}, setTimeSecond = ({ values }, index, value) => {
  values[index] = value;
}, setTimeMillisecond = ({ values }, index, value) => {
  values[index] = value;
}, setTimeMicrosecond = ({ values }, index, value) => {
  values[index] = value;
}, setTimeNanosecond = ({ values }, index, value) => {
  values[index] = value;
}, setTime = (data, index, value) => {
  switch (data.type.unit) {
    case TimeUnit.SECOND:
      return setTimeSecond(data, index, value);
    case TimeUnit.MILLISECOND:
      return setTimeMillisecond(data, index, value);
    case TimeUnit.MICROSECOND:
      return setTimeMicrosecond(data, index, value);
    case TimeUnit.NANOSECOND:
      return setTimeNanosecond(data, index, value);
  }
}, setDecimal = ({ values, stride }, index, value) => {
  values.set(value.subarray(0, stride), stride * index);
}, setList = (data, index, value) => {
  const values = data.children[0];
  const valueOffsets = data.valueOffsets;
  const set2 = instance.getVisitFn(values);
  if (Array.isArray(value)) {
    for (let idx = -1, itr = valueOffsets[index], end = valueOffsets[index + 1];itr < end; ) {
      set2(values, itr++, value[++idx]);
    }
  } else {
    for (let idx = -1, itr = valueOffsets[index], end = valueOffsets[index + 1];itr < end; ) {
      set2(values, itr++, value.get(++idx));
    }
  }
}, setMap = (data, index, value) => {
  const values = data.children[0];
  const { valueOffsets } = data;
  const set2 = instance.getVisitFn(values);
  let { [index]: idx, [index + 1]: end } = valueOffsets;
  const entries = value instanceof Map ? value.entries() : Object.entries(value);
  for (const val of entries) {
    set2(values, idx, val);
    if (++idx >= end)
      break;
  }
}, _setStructArrayValue = (o, v) => (set2, c, _, i) => c && set2(c, o, v[i]), _setStructVectorValue = (o, v) => (set2, c, _, i) => c && set2(c, o, v.get(i)), _setStructMapValue = (o, v) => (set2, c, f, _) => c && set2(c, o, v.get(f.name)), _setStructObjectValue = (o, v) => (set2, c, f, _) => c && set2(c, o, v[f.name]), setStruct = (data, index, value) => {
  const childSetters = data.type.children.map((f) => instance.getVisitFn(f.type));
  const set2 = value instanceof Map ? _setStructMapValue(index, value) : value instanceof Vector ? _setStructVectorValue(index, value) : Array.isArray(value) ? _setStructArrayValue(index, value) : _setStructObjectValue(index, value);
  data.type.children.forEach((f, i) => set2(childSetters[i], data.children[i], f, i));
}, setUnion = (data, index, value) => {
  data.type.mode === UnionMode.Dense ? setDenseUnion(data, index, value) : setSparseUnion(data, index, value);
}, setDenseUnion = (data, index, value) => {
  const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
  const child = data.children[childIndex];
  instance.visit(child, data.valueOffsets[index], value);
}, setSparseUnion = (data, index, value) => {
  const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
  const child = data.children[childIndex];
  instance.visit(child, index, value);
}, setDictionary = (data, index, value) => {
  var _a4;
  (_a4 = data.dictionary) === null || _a4 === undefined || _a4.set(data.values[index], value);
}, setIntervalValue = (data, index, value) => {
  data.type.unit === IntervalUnit.DAY_TIME ? setIntervalDayTime(data, index, value) : setIntervalYearMonth(data, index, value);
}, setIntervalDayTime = ({ values }, index, value) => {
  values.set(value.subarray(0, 2), 2 * index);
}, setIntervalYearMonth = ({ values }, index, value) => {
  values[index] = value[0] * 12 + value[1] % 12;
}, setDurationSecond = ({ values }, index, value) => {
  values[index] = value;
}, setDurationMillisecond = ({ values }, index, value) => {
  values[index] = value;
}, setDurationMicrosecond = ({ values }, index, value) => {
  values[index] = value;
}, setDurationNanosecond = ({ values }, index, value) => {
  values[index] = value;
}, setDuration = (data, index, value) => {
  switch (data.type.unit) {
    case TimeUnit.SECOND:
      return setDurationSecond(data, index, value);
    case TimeUnit.MILLISECOND:
      return setDurationMillisecond(data, index, value);
    case TimeUnit.MICROSECOND:
      return setDurationMicrosecond(data, index, value);
    case TimeUnit.NANOSECOND:
      return setDurationNanosecond(data, index, value);
  }
}, setFixedSizeList = (data, index, value) => {
  const { stride } = data;
  const child = data.children[0];
  const set2 = instance.getVisitFn(child);
  if (Array.isArray(value)) {
    for (let idx = -1, offset = index * stride;++idx < stride; ) {
      set2(child, offset + idx, value[idx]);
    }
  } else {
    for (let idx = -1, offset = index * stride;++idx < stride; ) {
      set2(child, offset + idx, value.get(idx));
    }
  }
}, instance;
var init_set = __esm(() => {
  init_vector2();
  init_visitor();
  init_utf8();
  init_math();
  init_enum();
  SetVisitor = class SetVisitor extends Visitor {
  };
  SetVisitor.prototype.visitBool = wrapSet(setBool);
  SetVisitor.prototype.visitInt = wrapSet(setInt);
  SetVisitor.prototype.visitInt8 = wrapSet(setInt);
  SetVisitor.prototype.visitInt16 = wrapSet(setInt);
  SetVisitor.prototype.visitInt32 = wrapSet(setInt);
  SetVisitor.prototype.visitInt64 = wrapSet(setInt);
  SetVisitor.prototype.visitUint8 = wrapSet(setInt);
  SetVisitor.prototype.visitUint16 = wrapSet(setInt);
  SetVisitor.prototype.visitUint32 = wrapSet(setInt);
  SetVisitor.prototype.visitUint64 = wrapSet(setInt);
  SetVisitor.prototype.visitFloat = wrapSet(setAnyFloat);
  SetVisitor.prototype.visitFloat16 = wrapSet(setFloat16);
  SetVisitor.prototype.visitFloat32 = wrapSet(setFloat);
  SetVisitor.prototype.visitFloat64 = wrapSet(setFloat);
  SetVisitor.prototype.visitUtf8 = wrapSet(setUtf8);
  SetVisitor.prototype.visitLargeUtf8 = wrapSet(setUtf8);
  SetVisitor.prototype.visitBinary = wrapSet(setBinary);
  SetVisitor.prototype.visitLargeBinary = wrapSet(setBinary);
  SetVisitor.prototype.visitFixedSizeBinary = wrapSet(setFixedSizeBinary);
  SetVisitor.prototype.visitDate = wrapSet(setDate);
  SetVisitor.prototype.visitDateDay = wrapSet(setDateDay);
  SetVisitor.prototype.visitDateMillisecond = wrapSet(setDateMillisecond);
  SetVisitor.prototype.visitTimestamp = wrapSet(setTimestamp);
  SetVisitor.prototype.visitTimestampSecond = wrapSet(setTimestampSecond);
  SetVisitor.prototype.visitTimestampMillisecond = wrapSet(setTimestampMillisecond);
  SetVisitor.prototype.visitTimestampMicrosecond = wrapSet(setTimestampMicrosecond);
  SetVisitor.prototype.visitTimestampNanosecond = wrapSet(setTimestampNanosecond);
  SetVisitor.prototype.visitTime = wrapSet(setTime);
  SetVisitor.prototype.visitTimeSecond = wrapSet(setTimeSecond);
  SetVisitor.prototype.visitTimeMillisecond = wrapSet(setTimeMillisecond);
  SetVisitor.prototype.visitTimeMicrosecond = wrapSet(setTimeMicrosecond);
  SetVisitor.prototype.visitTimeNanosecond = wrapSet(setTimeNanosecond);
  SetVisitor.prototype.visitDecimal = wrapSet(setDecimal);
  SetVisitor.prototype.visitList = wrapSet(setList);
  SetVisitor.prototype.visitStruct = wrapSet(setStruct);
  SetVisitor.prototype.visitUnion = wrapSet(setUnion);
  SetVisitor.prototype.visitDenseUnion = wrapSet(setDenseUnion);
  SetVisitor.prototype.visitSparseUnion = wrapSet(setSparseUnion);
  SetVisitor.prototype.visitDictionary = wrapSet(setDictionary);
  SetVisitor.prototype.visitInterval = wrapSet(setIntervalValue);
  SetVisitor.prototype.visitIntervalDayTime = wrapSet(setIntervalDayTime);
  SetVisitor.prototype.visitIntervalYearMonth = wrapSet(setIntervalYearMonth);
  SetVisitor.prototype.visitDuration = wrapSet(setDuration);
  SetVisitor.prototype.visitDurationSecond = wrapSet(setDurationSecond);
  SetVisitor.prototype.visitDurationMillisecond = wrapSet(setDurationMillisecond);
  SetVisitor.prototype.visitDurationMicrosecond = wrapSet(setDurationMicrosecond);
  SetVisitor.prototype.visitDurationNanosecond = wrapSet(setDurationNanosecond);
  SetVisitor.prototype.visitFixedSizeList = wrapSet(setFixedSizeList);
  SetVisitor.prototype.visitMap = wrapSet(setMap);
  instance = new SetVisitor;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/row/struct.mjs
class StructRowProxyHandler {
  isExtensible() {
    return false;
  }
  deleteProperty() {
    return false;
  }
  preventExtensions() {
    return true;
  }
  ownKeys(row) {
    return row[kParent].type.children.map((f) => f.name);
  }
  has(row, key) {
    return row[kParent].type.children.findIndex((f) => f.name === key) !== -1;
  }
  getOwnPropertyDescriptor(row, key) {
    if (row[kParent].type.children.findIndex((f) => f.name === key) !== -1) {
      return { writable: true, enumerable: true, configurable: true };
    }
    return;
  }
  get(row, key) {
    if (Reflect.has(row, key)) {
      return row[key];
    }
    const idx = row[kParent].type.children.findIndex((f) => f.name === key);
    if (idx !== -1) {
      const val = instance2.visit(row[kParent].children[idx], row[kRowIndex]);
      Reflect.set(row, key, val);
      return val;
    }
  }
  set(row, key, val) {
    const idx = row[kParent].type.children.findIndex((f) => f.name === key);
    if (idx !== -1) {
      instance.visit(row[kParent].children[idx], row[kRowIndex], val);
      return Reflect.set(row, key, val);
    } else if (Reflect.has(row, key) || typeof key === "symbol") {
      return Reflect.set(row, key, val);
    }
    return false;
  }
}
var kParent, kRowIndex, StructRow, StructRowIterator;
var init_struct = __esm(() => {
  init_get2();
  init_set();
  kParent = Symbol.for("parent");
  kRowIndex = Symbol.for("rowIndex");
  StructRow = class StructRow {
    constructor(parent, rowIndex) {
      this[kParent] = parent;
      this[kRowIndex] = rowIndex;
      return new Proxy(this, new StructRowProxyHandler);
    }
    toArray() {
      return Object.values(this.toJSON());
    }
    toJSON() {
      const i = this[kRowIndex];
      const parent = this[kParent];
      const keys = parent.type.children;
      const json2 = {};
      for (let j = -1, n = keys.length;++j < n; ) {
        json2[keys[j].name] = instance2.visit(parent.children[j], i);
      }
      return json2;
    }
    toString() {
      return `{${[...this].map(([key, val]) => `${valueToString(key)}: ${valueToString(val)}`).join(", ")}}`;
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return this.toString();
    }
    [Symbol.iterator]() {
      return new StructRowIterator(this[kParent], this[kRowIndex]);
    }
  };
  StructRowIterator = class StructRowIterator {
    constructor(data, rowIndex) {
      this.childIndex = 0;
      this.children = data.children;
      this.rowIndex = rowIndex;
      this.childFields = data.type.children;
      this.numChildren = this.childFields.length;
    }
    [Symbol.iterator]() {
      return this;
    }
    next() {
      const i = this.childIndex;
      if (i < this.numChildren) {
        this.childIndex = i + 1;
        return {
          done: false,
          value: [
            this.childFields[i].name,
            instance2.visit(this.children[i], this.rowIndex)
          ]
        };
      }
      return { done: true, value: null };
    }
  };
  Object.defineProperties(StructRow.prototype, {
    [Symbol.toStringTag]: { enumerable: false, configurable: false, value: "Row" },
    [kParent]: { writable: true, enumerable: false, configurable: false, value: null },
    [kRowIndex]: { writable: true, enumerable: false, configurable: false, value: -1 }
  });
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/get.mjs
function wrapGet(fn) {
  return (data, _1) => data.getValid(_1) ? fn(data, _1) : null;
}
var GetVisitor, epochDaysToMs = (data, index) => 86400000 * data[index], getNull = (_data, _index) => null, getVariableWidthBytes = (values, valueOffsets, index) => {
  if (index + 1 >= valueOffsets.length) {
    return null;
  }
  const x = bigIntToNumber(valueOffsets[index]);
  const y = bigIntToNumber(valueOffsets[index + 1]);
  return values.subarray(x, y);
}, getBool = ({ offset, values }, index) => {
  const idx = offset + index;
  const byte = values[idx >> 3];
  return (byte & 1 << idx % 8) !== 0;
}, getDateDay = ({ values }, index) => epochDaysToMs(values, index), getDateMillisecond = ({ values }, index) => bigIntToNumber(values[index]), getNumeric = ({ stride, values }, index) => values[stride * index], getFloat16 = ({ stride, values }, index) => uint16ToFloat64(values[stride * index]), getBigInts = ({ values }, index) => values[index], getFixedSizeBinary = ({ stride, values }, index) => values.subarray(stride * index, stride * (index + 1)), getBinary = ({ values, valueOffsets }, index) => getVariableWidthBytes(values, valueOffsets, index), getUtf8 = ({ values, valueOffsets }, index) => {
  const bytes = getVariableWidthBytes(values, valueOffsets, index);
  return bytes !== null ? decodeUtf8(bytes) : null;
}, getInt = ({ values }, index) => values[index], getFloat = ({ type, values }, index) => type.precision !== Precision.HALF ? values[index] : uint16ToFloat64(values[index]), getDate = (data, index) => data.type.unit === DateUnit.DAY ? getDateDay(data, index) : getDateMillisecond(data, index), getTimestampSecond = ({ values }, index) => 1000 * bigIntToNumber(values[index]), getTimestampMillisecond = ({ values }, index) => bigIntToNumber(values[index]), getTimestampMicrosecond = ({ values }, index) => divideBigInts(values[index], BigInt(1000)), getTimestampNanosecond = ({ values }, index) => divideBigInts(values[index], BigInt(1e6)), getTimestamp = (data, index) => {
  switch (data.type.unit) {
    case TimeUnit.SECOND:
      return getTimestampSecond(data, index);
    case TimeUnit.MILLISECOND:
      return getTimestampMillisecond(data, index);
    case TimeUnit.MICROSECOND:
      return getTimestampMicrosecond(data, index);
    case TimeUnit.NANOSECOND:
      return getTimestampNanosecond(data, index);
  }
}, getTimeSecond = ({ values }, index) => values[index], getTimeMillisecond = ({ values }, index) => values[index], getTimeMicrosecond = ({ values }, index) => values[index], getTimeNanosecond = ({ values }, index) => values[index], getTime = (data, index) => {
  switch (data.type.unit) {
    case TimeUnit.SECOND:
      return getTimeSecond(data, index);
    case TimeUnit.MILLISECOND:
      return getTimeMillisecond(data, index);
    case TimeUnit.MICROSECOND:
      return getTimeMicrosecond(data, index);
    case TimeUnit.NANOSECOND:
      return getTimeNanosecond(data, index);
  }
}, getDecimal = ({ values, stride }, index) => BN.decimal(values.subarray(stride * index, stride * (index + 1))), getList = (data, index) => {
  const { valueOffsets, stride, children } = data;
  const { [index * stride]: begin, [index * stride + 1]: end } = valueOffsets;
  const child = children[0];
  const slice = child.slice(begin, end - begin);
  return new Vector([slice]);
}, getMap = (data, index) => {
  const { valueOffsets, children } = data;
  const { [index]: begin, [index + 1]: end } = valueOffsets;
  const child = children[0];
  return new MapRow(child.slice(begin, end - begin));
}, getStruct = (data, index) => {
  return new StructRow(data, index);
}, getUnion = (data, index) => {
  return data.type.mode === UnionMode.Dense ? getDenseUnion(data, index) : getSparseUnion(data, index);
}, getDenseUnion = (data, index) => {
  const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
  const child = data.children[childIndex];
  return instance2.visit(child, data.valueOffsets[index]);
}, getSparseUnion = (data, index) => {
  const childIndex = data.type.typeIdToChildIndex[data.typeIds[index]];
  const child = data.children[childIndex];
  return instance2.visit(child, index);
}, getDictionary = (data, index) => {
  var _a4;
  return (_a4 = data.dictionary) === null || _a4 === undefined ? undefined : _a4.get(data.values[index]);
}, getInterval = (data, index) => data.type.unit === IntervalUnit.DAY_TIME ? getIntervalDayTime(data, index) : getIntervalYearMonth(data, index), getIntervalDayTime = ({ values }, index) => values.subarray(2 * index, 2 * (index + 1)), getIntervalYearMonth = ({ values }, index) => {
  const interval = values[index];
  const int32s = new Int32Array(2);
  int32s[0] = Math.trunc(interval / 12);
  int32s[1] = Math.trunc(interval % 12);
  return int32s;
}, getDurationSecond = ({ values }, index) => values[index], getDurationMillisecond = ({ values }, index) => values[index], getDurationMicrosecond = ({ values }, index) => values[index], getDurationNanosecond = ({ values }, index) => values[index], getDuration = (data, index) => {
  switch (data.type.unit) {
    case TimeUnit.SECOND:
      return getDurationSecond(data, index);
    case TimeUnit.MILLISECOND:
      return getDurationMillisecond(data, index);
    case TimeUnit.MICROSECOND:
      return getDurationMicrosecond(data, index);
    case TimeUnit.NANOSECOND:
      return getDurationNanosecond(data, index);
  }
}, getFixedSizeList = (data, index) => {
  const { stride, children } = data;
  const child = children[0];
  const slice = child.slice(index * stride, stride);
  return new Vector([slice]);
}, instance2;
var init_get2 = __esm(() => {
  init_bn();
  init_vector2();
  init_visitor();
  init_map2();
  init_struct();
  init_utf8();
  init_math();
  init_enum();
  GetVisitor = class GetVisitor extends Visitor {
  };
  GetVisitor.prototype.visitNull = wrapGet(getNull);
  GetVisitor.prototype.visitBool = wrapGet(getBool);
  GetVisitor.prototype.visitInt = wrapGet(getInt);
  GetVisitor.prototype.visitInt8 = wrapGet(getNumeric);
  GetVisitor.prototype.visitInt16 = wrapGet(getNumeric);
  GetVisitor.prototype.visitInt32 = wrapGet(getNumeric);
  GetVisitor.prototype.visitInt64 = wrapGet(getBigInts);
  GetVisitor.prototype.visitUint8 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUint16 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUint32 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUint64 = wrapGet(getBigInts);
  GetVisitor.prototype.visitFloat = wrapGet(getFloat);
  GetVisitor.prototype.visitFloat16 = wrapGet(getFloat16);
  GetVisitor.prototype.visitFloat32 = wrapGet(getNumeric);
  GetVisitor.prototype.visitFloat64 = wrapGet(getNumeric);
  GetVisitor.prototype.visitUtf8 = wrapGet(getUtf8);
  GetVisitor.prototype.visitLargeUtf8 = wrapGet(getUtf8);
  GetVisitor.prototype.visitBinary = wrapGet(getBinary);
  GetVisitor.prototype.visitLargeBinary = wrapGet(getBinary);
  GetVisitor.prototype.visitFixedSizeBinary = wrapGet(getFixedSizeBinary);
  GetVisitor.prototype.visitDate = wrapGet(getDate);
  GetVisitor.prototype.visitDateDay = wrapGet(getDateDay);
  GetVisitor.prototype.visitDateMillisecond = wrapGet(getDateMillisecond);
  GetVisitor.prototype.visitTimestamp = wrapGet(getTimestamp);
  GetVisitor.prototype.visitTimestampSecond = wrapGet(getTimestampSecond);
  GetVisitor.prototype.visitTimestampMillisecond = wrapGet(getTimestampMillisecond);
  GetVisitor.prototype.visitTimestampMicrosecond = wrapGet(getTimestampMicrosecond);
  GetVisitor.prototype.visitTimestampNanosecond = wrapGet(getTimestampNanosecond);
  GetVisitor.prototype.visitTime = wrapGet(getTime);
  GetVisitor.prototype.visitTimeSecond = wrapGet(getTimeSecond);
  GetVisitor.prototype.visitTimeMillisecond = wrapGet(getTimeMillisecond);
  GetVisitor.prototype.visitTimeMicrosecond = wrapGet(getTimeMicrosecond);
  GetVisitor.prototype.visitTimeNanosecond = wrapGet(getTimeNanosecond);
  GetVisitor.prototype.visitDecimal = wrapGet(getDecimal);
  GetVisitor.prototype.visitList = wrapGet(getList);
  GetVisitor.prototype.visitStruct = wrapGet(getStruct);
  GetVisitor.prototype.visitUnion = wrapGet(getUnion);
  GetVisitor.prototype.visitDenseUnion = wrapGet(getDenseUnion);
  GetVisitor.prototype.visitSparseUnion = wrapGet(getSparseUnion);
  GetVisitor.prototype.visitDictionary = wrapGet(getDictionary);
  GetVisitor.prototype.visitInterval = wrapGet(getInterval);
  GetVisitor.prototype.visitIntervalDayTime = wrapGet(getIntervalDayTime);
  GetVisitor.prototype.visitIntervalYearMonth = wrapGet(getIntervalYearMonth);
  GetVisitor.prototype.visitDuration = wrapGet(getDuration);
  GetVisitor.prototype.visitDurationSecond = wrapGet(getDurationSecond);
  GetVisitor.prototype.visitDurationMillisecond = wrapGet(getDurationMillisecond);
  GetVisitor.prototype.visitDurationMicrosecond = wrapGet(getDurationMicrosecond);
  GetVisitor.prototype.visitDurationNanosecond = wrapGet(getDurationNanosecond);
  GetVisitor.prototype.visitFixedSizeList = wrapGet(getFixedSizeList);
  GetVisitor.prototype.visitMap = wrapGet(getMap);
  instance2 = new GetVisitor;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/row/map.mjs
class MapRowProxyHandler {
  isExtensible() {
    return false;
  }
  deleteProperty() {
    return false;
  }
  preventExtensions() {
    return true;
  }
  ownKeys(row) {
    return row[kKeysAsStrings];
  }
  has(row, key) {
    return row[kKeysAsStrings].includes(key);
  }
  getOwnPropertyDescriptor(row, key) {
    const idx = row[kKeysAsStrings].indexOf(key);
    if (idx !== -1) {
      return { writable: true, enumerable: true, configurable: true };
    }
    return;
  }
  get(row, key) {
    if (Reflect.has(row, key)) {
      return row[key];
    }
    const idx = row[kKeysAsStrings].indexOf(key);
    if (idx !== -1) {
      const val = instance2.visit(Reflect.get(row, kVals), idx);
      Reflect.set(row, key, val);
      return val;
    }
  }
  set(row, key, val) {
    const idx = row[kKeysAsStrings].indexOf(key);
    if (idx !== -1) {
      instance.visit(Reflect.get(row, kVals), idx, val);
      return Reflect.set(row, key, val);
    } else if (Reflect.has(row, key)) {
      return Reflect.set(row, key, val);
    }
    return false;
  }
}
var kKeys, kVals, kKeysAsStrings, _kKeysAsStrings, MapRow, MapRowIterator;
var init_map2 = __esm(() => {
  init_vector2();
  init_get2();
  init_set();
  kKeys = Symbol.for("keys");
  kVals = Symbol.for("vals");
  kKeysAsStrings = Symbol.for("kKeysAsStrings");
  _kKeysAsStrings = Symbol.for("_kKeysAsStrings");
  MapRow = class MapRow {
    constructor(slice) {
      this[kKeys] = new Vector([slice.children[0]]).memoize();
      this[kVals] = slice.children[1];
      return new Proxy(this, new MapRowProxyHandler);
    }
    get [kKeysAsStrings]() {
      return this[_kKeysAsStrings] || (this[_kKeysAsStrings] = Array.from(this[kKeys].toArray(), String));
    }
    [Symbol.iterator]() {
      return new MapRowIterator(this[kKeys], this[kVals]);
    }
    get size() {
      return this[kKeys].length;
    }
    toArray() {
      return Object.values(this.toJSON());
    }
    toJSON() {
      const keys = this[kKeys];
      const vals = this[kVals];
      const json2 = {};
      for (let i = -1, n = keys.length;++i < n; ) {
        json2[keys.get(i)] = instance2.visit(vals, i);
      }
      return json2;
    }
    toString() {
      return `{${[...this].map(([key, val]) => `${valueToString(key)}: ${valueToString(val)}`).join(", ")}}`;
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return this.toString();
    }
  };
  MapRowIterator = class MapRowIterator {
    constructor(keys, vals) {
      this.keys = keys;
      this.vals = vals;
      this.keyIndex = 0;
      this.numKeys = keys.length;
    }
    [Symbol.iterator]() {
      return this;
    }
    next() {
      const i = this.keyIndex;
      if (i === this.numKeys) {
        return { done: true, value: null };
      }
      this.keyIndex++;
      return {
        done: false,
        value: [
          this.keys.get(i),
          instance2.visit(this.vals, i)
        ]
      };
    }
  };
  Object.defineProperties(MapRow.prototype, {
    [Symbol.toStringTag]: { enumerable: false, configurable: false, value: "Row" },
    [kKeys]: { writable: true, enumerable: false, configurable: false, value: null },
    [kVals]: { writable: true, enumerable: false, configurable: false, value: null },
    [_kKeysAsStrings]: { writable: true, enumerable: false, configurable: false, value: null }
  });
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/vector.mjs
var exports_vector = {};
__export(exports_vector, {
  wrapIndex: () => wrapIndex,
  createElementComparator: () => createElementComparator,
  clampRange: () => clampRange
});
function clampRange(source, begin, end, then) {
  const { length: len = 0 } = source;
  let lhs = typeof begin !== "number" ? 0 : begin;
  let rhs = typeof end !== "number" ? len : end;
  lhs < 0 && (lhs = (lhs % len + len) % len);
  rhs < 0 && (rhs = (rhs % len + len) % len);
  rhs < lhs && (tmp = lhs, lhs = rhs, rhs = tmp);
  rhs > len && (rhs = len);
  return then ? then(source, lhs, rhs) : [lhs, rhs];
}
function createElementComparator(search) {
  const typeofSearch = typeof search;
  if (typeofSearch !== "object" || search === null) {
    if (isNaNFast(search)) {
      return isNaNFast;
    }
    return (value) => value === search;
  }
  if (search instanceof Date) {
    const valueOfSearch = search.valueOf();
    return (value) => value instanceof Date ? value.valueOf() === valueOfSearch : false;
  }
  if (ArrayBuffer.isView(search)) {
    return (value) => value ? compareArrayLike(search, value) : false;
  }
  if (search instanceof Map) {
    return createMapComparator(search);
  }
  if (Array.isArray(search)) {
    return createArrayLikeComparator(search);
  }
  if (search instanceof Vector) {
    return createVectorComparator(search);
  }
  return createObjectComparator(search, true);
}
function createArrayLikeComparator(lhs) {
  const comparators = [];
  for (let i = -1, n = lhs.length;++i < n; ) {
    comparators[i] = createElementComparator(lhs[i]);
  }
  return createSubElementsComparator(comparators);
}
function createMapComparator(lhs) {
  let i = -1;
  const comparators = [];
  for (const v of lhs.values())
    comparators[++i] = createElementComparator(v);
  return createSubElementsComparator(comparators);
}
function createVectorComparator(lhs) {
  const comparators = [];
  for (let i = -1, n = lhs.length;++i < n; ) {
    comparators[i] = createElementComparator(lhs.get(i));
  }
  return createSubElementsComparator(comparators);
}
function createObjectComparator(lhs, allowEmpty = false) {
  const keys = Object.keys(lhs);
  if (!allowEmpty && keys.length === 0) {
    return () => false;
  }
  const comparators = [];
  for (let i = -1, n = keys.length;++i < n; ) {
    comparators[i] = createElementComparator(lhs[keys[i]]);
  }
  return createSubElementsComparator(comparators, keys);
}
function createSubElementsComparator(comparators, keys) {
  return (rhs) => {
    if (!rhs || typeof rhs !== "object") {
      return false;
    }
    switch (rhs.constructor) {
      case Array:
        return compareArray(comparators, rhs);
      case Map:
        return compareObject(comparators, rhs, rhs.keys());
      case MapRow:
      case StructRow:
      case Object:
      case undefined:
        return compareObject(comparators, rhs, keys || Object.keys(rhs));
    }
    return rhs instanceof Vector ? compareVector(comparators, rhs) : false;
  };
}
function compareArray(comparators, arr) {
  const n = comparators.length;
  if (arr.length !== n) {
    return false;
  }
  for (let i = -1;++i < n; ) {
    if (!comparators[i](arr[i])) {
      return false;
    }
  }
  return true;
}
function compareVector(comparators, vec) {
  const n = comparators.length;
  if (vec.length !== n) {
    return false;
  }
  for (let i = -1;++i < n; ) {
    if (!comparators[i](vec.get(i))) {
      return false;
    }
  }
  return true;
}
function compareObject(comparators, obj, keys) {
  const lKeyItr = keys[Symbol.iterator]();
  const rKeyItr = obj instanceof Map ? obj.keys() : Object.keys(obj)[Symbol.iterator]();
  const rValItr = obj instanceof Map ? obj.values() : Object.values(obj)[Symbol.iterator]();
  let i = 0;
  const n = comparators.length;
  let rVal = rValItr.next();
  let lKey = lKeyItr.next();
  let rKey = rKeyItr.next();
  for (;i < n && !lKey.done && !rKey.done && !rVal.done; ++i, lKey = lKeyItr.next(), rKey = rKeyItr.next(), rVal = rValItr.next()) {
    if (lKey.value !== rKey.value || !comparators[i](rVal.value)) {
      break;
    }
  }
  if (i === n && lKey.done && rKey.done && rVal.done) {
    return true;
  }
  lKeyItr.return && lKeyItr.return();
  rKeyItr.return && rKeyItr.return();
  rValItr.return && rValItr.return();
  return false;
}
var tmp, wrapIndex = (index, len) => index < 0 ? len + index : index, isNaNFast = (value) => value !== value;
var init_vector = __esm(() => {
  init_vector2();
  init_map2();
  init_struct();
  init_buffer();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/bit.mjs
var exports_bit = {};
__export(exports_bit, {
  truncateBitmap: () => truncateBitmap,
  setBool: () => setBool2,
  popcnt_uint32: () => popcnt_uint32,
  popcnt_bit_range: () => popcnt_bit_range,
  popcnt_array: () => popcnt_array,
  packBools: () => packBools,
  getBool: () => getBool2,
  getBit: () => getBit,
  BitIterator: () => BitIterator
});
function getBool2(_data, _index, byte, bit) {
  return (byte & 1 << bit) !== 0;
}
function getBit(_data, _index, byte, bit) {
  return (byte & 1 << bit) >> bit;
}
function setBool2(bytes, index, value) {
  return value ? !!(bytes[index >> 3] |= 1 << index % 8) || true : !(bytes[index >> 3] &= ~(1 << index % 8)) && false;
}
function truncateBitmap(offset, length, bitmap) {
  const alignedSize = bitmap.byteLength + 7 & ~7;
  if (offset > 0 || bitmap.byteLength < alignedSize) {
    const bytes = new Uint8Array(alignedSize);
    bytes.set(offset % 8 === 0 ? bitmap.subarray(offset >> 3) : packBools(new BitIterator(bitmap, offset, length, null, getBool2)).subarray(0, alignedSize));
    return bytes;
  }
  return bitmap;
}
function packBools(values) {
  const xs = [];
  let i = 0, bit = 0, byte = 0;
  for (const value of values) {
    value && (byte |= 1 << bit);
    if (++bit === 8) {
      xs[i++] = byte;
      byte = bit = 0;
    }
  }
  if (i === 0 || bit > 0) {
    xs[i++] = byte;
  }
  const b = new Uint8Array(xs.length + 7 & ~7);
  b.set(xs);
  return b;
}
function popcnt_bit_range(data, lhs, rhs) {
  if (rhs - lhs <= 0) {
    return 0;
  }
  if (rhs - lhs < 8) {
    let sum = 0;
    for (const bit of new BitIterator(data, lhs, rhs - lhs, data, getBit)) {
      sum += bit;
    }
    return sum;
  }
  const rhsInside = rhs >> 3 << 3;
  const lhsInside = lhs + (lhs % 8 === 0 ? 0 : 8 - lhs % 8);
  return popcnt_bit_range(data, lhs, lhsInside) + popcnt_bit_range(data, rhsInside, rhs) + popcnt_array(data, lhsInside >> 3, rhsInside - lhsInside >> 3);
}
function popcnt_array(arr, byteOffset, byteLength) {
  let cnt = 0, pos = Math.trunc(byteOffset);
  const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  const len = byteLength === undefined ? arr.byteLength : pos + byteLength;
  while (len - pos >= 4) {
    cnt += popcnt_uint32(view.getUint32(pos));
    pos += 4;
  }
  while (len - pos >= 2) {
    cnt += popcnt_uint32(view.getUint16(pos));
    pos += 2;
  }
  while (len - pos >= 1) {
    cnt += popcnt_uint32(view.getUint8(pos));
    pos += 1;
  }
  return cnt;
}
function popcnt_uint32(uint322) {
  let i = Math.trunc(uint322);
  i = i - (i >>> 1 & 1431655765);
  i = (i & 858993459) + (i >>> 2 & 858993459);
  return (i + (i >>> 4) & 252645135) * 16843009 >>> 24;
}
var BitIterator;
var init_bit = __esm(() => {
  BitIterator = class BitIterator {
    constructor(bytes, begin, length, context, get2) {
      this.bytes = bytes;
      this.length = length;
      this.context = context;
      this.get = get2;
      this.bit = begin % 8;
      this.byteIndex = begin >> 3;
      this.byte = bytes[this.byteIndex++];
      this.index = 0;
    }
    next() {
      if (this.index < this.length) {
        if (this.bit === 8) {
          this.bit = 0;
          this.byte = this.bytes[this.byteIndex++];
        }
        return {
          value: this.get(this.context, this.index++, this.byte, this.bit++)
        };
      }
      return { done: true, value: null };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/data.mjs
class Data {
  get typeId() {
    return this.type.typeId;
  }
  get ArrayType() {
    return this.type.ArrayType;
  }
  get buffers() {
    return [this.valueOffsets, this.values, this.nullBitmap, this.typeIds];
  }
  get nullable() {
    if (this._nullCount !== 0) {
      const { type } = this;
      if (DataType.isSparseUnion(type)) {
        return this.children.some((child) => child.nullable);
      } else if (DataType.isDenseUnion(type)) {
        return this.children.some((child) => child.nullable);
      }
      return this.nullBitmap && this.nullBitmap.byteLength > 0;
    }
    return true;
  }
  get byteLength() {
    let byteLength = 0;
    const { valueOffsets, values, nullBitmap, typeIds } = this;
    valueOffsets && (byteLength += valueOffsets.byteLength);
    values && (byteLength += values.byteLength);
    nullBitmap && (byteLength += nullBitmap.byteLength);
    typeIds && (byteLength += typeIds.byteLength);
    return this.children.reduce((byteLength2, child) => byteLength2 + child.byteLength, byteLength);
  }
  get nullCount() {
    if (DataType.isUnion(this.type)) {
      return this.children.reduce((nullCount2, child) => nullCount2 + child.nullCount, 0);
    }
    let nullCount = this._nullCount;
    let nullBitmap;
    if (nullCount <= kUnknownNullCount && (nullBitmap = this.nullBitmap)) {
      this._nullCount = nullCount = nullBitmap.length === 0 ? 0 : this.length - popcnt_bit_range(nullBitmap, this.offset, this.offset + this.length);
    }
    return nullCount;
  }
  constructor(type, offset, length, nullCount, buffers, children = [], dictionary) {
    this.type = type;
    this.children = children;
    this.dictionary = dictionary;
    this.offset = Math.floor(Math.max(offset || 0, 0));
    this.length = Math.floor(Math.max(length || 0, 0));
    this._nullCount = Math.floor(Math.max(nullCount || 0, -1));
    let buffer;
    if (buffers instanceof Data) {
      this.stride = buffers.stride;
      this.values = buffers.values;
      this.typeIds = buffers.typeIds;
      this.nullBitmap = buffers.nullBitmap;
      this.valueOffsets = buffers.valueOffsets;
    } else {
      this.stride = strideForType(type);
      if (buffers) {
        (buffer = buffers[0]) && (this.valueOffsets = buffer);
        (buffer = buffers[1]) && (this.values = buffer);
        (buffer = buffers[2]) && (this.nullBitmap = buffer);
        (buffer = buffers[3]) && (this.typeIds = buffer);
      }
    }
  }
  getValid(index) {
    const { type } = this;
    if (DataType.isUnion(type)) {
      const union2 = type;
      const child = this.children[union2.typeIdToChildIndex[this.typeIds[index]]];
      const indexInChild = union2.mode === UnionMode.Dense ? this.valueOffsets[index] : index;
      return child.getValid(indexInChild);
    }
    if (this.nullable && this.nullCount > 0) {
      const pos = this.offset + index;
      const val = this.nullBitmap[pos >> 3];
      return (val & 1 << pos % 8) !== 0;
    }
    return true;
  }
  setValid(index, value) {
    let prev;
    const { type } = this;
    if (DataType.isUnion(type)) {
      const union2 = type;
      const child = this.children[union2.typeIdToChildIndex[this.typeIds[index]]];
      const indexInChild = union2.mode === UnionMode.Dense ? this.valueOffsets[index] : index;
      prev = child.getValid(indexInChild);
      child.setValid(indexInChild, value);
    } else {
      let { nullBitmap } = this;
      const { offset, length } = this;
      const idx = offset + index;
      const mask = 1 << idx % 8;
      const byteOffset = idx >> 3;
      if (!nullBitmap || nullBitmap.byteLength <= byteOffset) {
        nullBitmap = new Uint8Array((offset + length + 63 & ~63) >> 3).fill(255);
        if (this.nullCount > 0) {
          nullBitmap.set(truncateBitmap(offset, length, this.nullBitmap), 0);
          Object.assign(this, { nullBitmap });
        } else {
          Object.assign(this, { nullBitmap, _nullCount: 0 });
        }
      }
      const byte = nullBitmap[byteOffset];
      prev = (byte & mask) !== 0;
      nullBitmap[byteOffset] = value ? byte | mask : byte & ~mask;
    }
    if (prev !== !!value) {
      this._nullCount = this.nullCount + (value ? -1 : 1);
    }
    return value;
  }
  clone(type = this.type, offset = this.offset, length = this.length, nullCount = this._nullCount, buffers = this, children = this.children) {
    return new Data(type, offset, length, nullCount, buffers, children, this.dictionary);
  }
  slice(offset, length) {
    const { stride, typeId, children } = this;
    const nullCount = +(this._nullCount === 0) - 1;
    const childStride = typeId === 16 ? stride : 1;
    const buffers = this._sliceBuffers(offset, length, stride, typeId);
    return this.clone(this.type, this.offset + offset, length, nullCount, buffers, children.length === 0 || this.valueOffsets ? children : this._sliceChildren(children, childStride * offset, childStride * length));
  }
  _changeLengthAndBackfillNullBitmap(newLength) {
    if (this.typeId === Type2.Null) {
      return this.clone(this.type, 0, newLength, 0);
    }
    const { length, nullCount } = this;
    const bitmap = new Uint8Array((newLength + 63 & ~63) >> 3).fill(255, 0, length >> 3);
    bitmap[length >> 3] = (1 << length - (length & ~7)) - 1;
    if (nullCount > 0) {
      bitmap.set(truncateBitmap(this.offset, length, this.nullBitmap), 0);
    }
    const buffers = this.buffers;
    buffers[BufferType.VALIDITY] = bitmap;
    return this.clone(this.type, 0, newLength, nullCount + (newLength - length), buffers);
  }
  _sliceBuffers(offset, length, stride, typeId) {
    let arr;
    const { buffers } = this;
    (arr = buffers[BufferType.TYPE]) && (buffers[BufferType.TYPE] = arr.subarray(offset, offset + length));
    (arr = buffers[BufferType.OFFSET]) && (buffers[BufferType.OFFSET] = arr.subarray(offset, offset + length + 1)) || (arr = buffers[BufferType.DATA]) && (buffers[BufferType.DATA] = typeId === 6 ? arr : arr.subarray(stride * offset, stride * (offset + length)));
    return buffers;
  }
  _sliceChildren(children, offset, length) {
    return children.map((child) => child.slice(offset, length));
  }
}
function makeData(props) {
  return makeDataVisitor.visit(props);
}
var kUnknownNullCount = -1, MakeDataVisitor, makeDataVisitor;
var init_data = __esm(() => {
  init_vector2();
  init_enum();
  init_type2();
  init_bit();
  init_visitor();
  init_buffer();
  Data.prototype.children = Object.freeze([]);
  MakeDataVisitor = class MakeDataVisitor extends Visitor {
    visit(props) {
      return this.getVisitFn(props["type"]).call(this, props);
    }
    visitNull(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["length"]: length = 0 } = props;
      return new Data(type, offset, length, length);
    }
    visitBool(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length >> 3, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitInt(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitFloat(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitUtf8(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const data = toUint8Array(props["data"]);
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, data, nullBitmap]);
    }
    visitLargeUtf8(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const data = toUint8Array(props["data"]);
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toBigInt64Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, data, nullBitmap]);
    }
    visitBinary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const data = toUint8Array(props["data"]);
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, data, nullBitmap]);
    }
    visitLargeBinary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const data = toUint8Array(props["data"]);
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toBigInt64Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, data, nullBitmap]);
    }
    visitFixedSizeBinary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitDate(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitTimestamp(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitTime(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitDecimal(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitList(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["child"]: child } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, undefined, nullBitmap], [child]);
    }
    visitStruct(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["children"]: children = [] } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const { length = children.reduce((len, { length: length2 }) => Math.max(len, length2), 0), nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, undefined, nullBitmap], children);
    }
    visitUnion(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["children"]: children = [] } = props;
      const typeIds = toArrayBufferView(type.ArrayType, props["typeIds"]);
      const { ["length"]: length = typeIds.length, ["nullCount"]: nullCount = -1 } = props;
      if (DataType.isSparseUnion(type)) {
        return new Data(type, offset, length, nullCount, [undefined, undefined, undefined, typeIds], children);
      }
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      return new Data(type, offset, length, nullCount, [valueOffsets, undefined, undefined, typeIds], children);
    }
    visitDictionary(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.indices.ArrayType, props["data"]);
      const { ["dictionary"]: dictionary = new Vector([new MakeDataVisitor().visit({ type: type.dictionary })]) } = props;
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap], [], dictionary);
    }
    visitInterval(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitDuration(props) {
      const { ["type"]: type, ["offset"]: offset = 0 } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const data = toArrayBufferView(type.ArrayType, props["data"]);
      const { ["length"]: length = data.length, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, data, nullBitmap]);
    }
    visitFixedSizeList(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["child"]: child = new MakeDataVisitor().visit({ type: type.valueType }) } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const { ["length"]: length = child.length / strideForType(type), ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [undefined, undefined, nullBitmap], [child]);
    }
    visitMap(props) {
      const { ["type"]: type, ["offset"]: offset = 0, ["child"]: child = new MakeDataVisitor().visit({ type: type.childType }) } = props;
      const nullBitmap = toUint8Array(props["nullBitmap"]);
      const valueOffsets = toInt32Array(props["valueOffsets"]);
      const { ["length"]: length = valueOffsets.length - 1, ["nullCount"]: nullCount = props["nullBitmap"] ? -1 : 0 } = props;
      return new Data(type, offset, length, nullCount, [valueOffsets, undefined, nullBitmap], [child]);
    }
  };
  makeDataVisitor = new MakeDataVisitor;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/chunk.mjs
function computeChunkNullable(chunks) {
  return chunks.some((chunk) => chunk.nullable);
}
function computeChunkNullCounts(chunks) {
  return chunks.reduce((nullCount, chunk) => nullCount + chunk.nullCount, 0);
}
function computeChunkOffsets(chunks) {
  return chunks.reduce((offsets, chunk, index) => {
    offsets[index + 1] = offsets[index] + chunk.length;
    return offsets;
  }, new Uint32Array(chunks.length + 1));
}
function sliceChunks(chunks, offsets, begin, end) {
  const slices = [];
  for (let i = -1, n = chunks.length;++i < n; ) {
    const chunk = chunks[i];
    const offset = offsets[i];
    const { length } = chunk;
    if (offset >= end) {
      break;
    }
    if (begin >= offset + length) {
      continue;
    }
    if (offset >= begin && offset + length <= end) {
      slices.push(chunk);
      continue;
    }
    const from = Math.max(0, begin - offset);
    const to = Math.min(end - offset, length);
    slices.push(chunk.slice(from, to - from));
  }
  if (slices.length === 0) {
    slices.push(chunks[0].slice(0, 0));
  }
  return slices;
}
function binarySearch(chunks, offsets, idx, fn) {
  let lhs = 0, mid = 0, rhs = offsets.length - 1;
  do {
    if (lhs >= rhs - 1) {
      return idx < offsets[rhs] ? fn(chunks, lhs, idx - offsets[lhs]) : null;
    }
    mid = lhs + Math.trunc((rhs - lhs) * 0.5);
    idx < offsets[mid] ? rhs = mid : lhs = mid;
  } while (lhs < rhs);
}
function isChunkedValid(data, index) {
  return data.getValid(index);
}
function wrapChunkedCall1(fn) {
  function chunkedFn(chunks, i, j) {
    return fn(chunks[i], j);
  }
  return function(index) {
    const data = this.data;
    return binarySearch(data, this._offsets, index, chunkedFn);
  };
}
function wrapChunkedCall2(fn) {
  let _2;
  function chunkedFn(chunks, i, j) {
    return fn(chunks[i], j, _2);
  }
  return function(index, value) {
    const data = this.data;
    _2 = value;
    const result = binarySearch(data, this._offsets, index, chunkedFn);
    _2 = undefined;
    return result;
  };
}
function wrapChunkedIndexOf(indexOf) {
  let _1;
  function chunkedIndexOf(data, chunkIndex, fromIndex) {
    let begin = fromIndex, index = 0, total = 0;
    for (let i = chunkIndex - 1, n = data.length;++i < n; ) {
      const chunk = data[i];
      if (~(index = indexOf(chunk, _1, begin))) {
        return total + index;
      }
      begin = 0;
      total += chunk.length;
    }
    return -1;
  }
  return function(element, offset) {
    _1 = element;
    const data = this.data;
    const result = typeof offset !== "number" ? chunkedIndexOf(data, 0, 0) : binarySearch(data, this._offsets, offset, chunkedIndexOf);
    _1 = undefined;
    return result;
  };
}
var ChunkedIterator;
var init_chunk = __esm(() => {
  ChunkedIterator = class ChunkedIterator {
    constructor(numChunks = 0, getChunkIterator) {
      this.numChunks = numChunks;
      this.getChunkIterator = getChunkIterator;
      this.chunkIndex = 0;
      this.chunkIterator = this.getChunkIterator(0);
    }
    next() {
      while (this.chunkIndex < this.numChunks) {
        const next = this.chunkIterator.next();
        if (!next.done) {
          return next;
        }
        if (++this.chunkIndex < this.numChunks) {
          this.chunkIterator = this.getChunkIterator(this.chunkIndex);
        }
      }
      return { done: true, value: null };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/indexof.mjs
function nullIndexOf(data, searchElement) {
  return searchElement === null && data.length > 0 ? 0 : -1;
}
function indexOfNull(data, fromIndex) {
  const { nullBitmap } = data;
  if (!nullBitmap || data.nullCount <= 0) {
    return -1;
  }
  let i = 0;
  for (const isValid of new BitIterator(nullBitmap, data.offset + (fromIndex || 0), data.length, nullBitmap, getBool2)) {
    if (!isValid) {
      return i;
    }
    ++i;
  }
  return -1;
}
function indexOfValue(data, searchElement, fromIndex) {
  if (searchElement === undefined) {
    return -1;
  }
  if (searchElement === null) {
    switch (data.typeId) {
      case Type2.Union:
        break;
      case Type2.Dictionary:
        break;
      default:
        return indexOfNull(data, fromIndex);
    }
  }
  const get2 = instance2.getVisitFn(data);
  const compare = createElementComparator(searchElement);
  for (let i = (fromIndex || 0) - 1, n = data.length;++i < n; ) {
    if (compare(get2(data, i))) {
      return i;
    }
  }
  return -1;
}
function indexOfUnion(data, searchElement, fromIndex) {
  const get2 = instance2.getVisitFn(data);
  const compare = createElementComparator(searchElement);
  for (let i = (fromIndex || 0) - 1, n = data.length;++i < n; ) {
    if (compare(get2(data, i))) {
      return i;
    }
  }
  return -1;
}
var IndexOfVisitor, instance3;
var init_indexof = __esm(() => {
  init_enum();
  init_visitor();
  init_get2();
  init_bit();
  init_vector();
  IndexOfVisitor = class IndexOfVisitor extends Visitor {
  };
  IndexOfVisitor.prototype.visitNull = nullIndexOf;
  IndexOfVisitor.prototype.visitBool = indexOfValue;
  IndexOfVisitor.prototype.visitInt = indexOfValue;
  IndexOfVisitor.prototype.visitInt8 = indexOfValue;
  IndexOfVisitor.prototype.visitInt16 = indexOfValue;
  IndexOfVisitor.prototype.visitInt32 = indexOfValue;
  IndexOfVisitor.prototype.visitInt64 = indexOfValue;
  IndexOfVisitor.prototype.visitUint8 = indexOfValue;
  IndexOfVisitor.prototype.visitUint16 = indexOfValue;
  IndexOfVisitor.prototype.visitUint32 = indexOfValue;
  IndexOfVisitor.prototype.visitUint64 = indexOfValue;
  IndexOfVisitor.prototype.visitFloat = indexOfValue;
  IndexOfVisitor.prototype.visitFloat16 = indexOfValue;
  IndexOfVisitor.prototype.visitFloat32 = indexOfValue;
  IndexOfVisitor.prototype.visitFloat64 = indexOfValue;
  IndexOfVisitor.prototype.visitUtf8 = indexOfValue;
  IndexOfVisitor.prototype.visitLargeUtf8 = indexOfValue;
  IndexOfVisitor.prototype.visitBinary = indexOfValue;
  IndexOfVisitor.prototype.visitLargeBinary = indexOfValue;
  IndexOfVisitor.prototype.visitFixedSizeBinary = indexOfValue;
  IndexOfVisitor.prototype.visitDate = indexOfValue;
  IndexOfVisitor.prototype.visitDateDay = indexOfValue;
  IndexOfVisitor.prototype.visitDateMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestamp = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampSecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampMicrosecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimestampNanosecond = indexOfValue;
  IndexOfVisitor.prototype.visitTime = indexOfValue;
  IndexOfVisitor.prototype.visitTimeSecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimeMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimeMicrosecond = indexOfValue;
  IndexOfVisitor.prototype.visitTimeNanosecond = indexOfValue;
  IndexOfVisitor.prototype.visitDecimal = indexOfValue;
  IndexOfVisitor.prototype.visitList = indexOfValue;
  IndexOfVisitor.prototype.visitStruct = indexOfValue;
  IndexOfVisitor.prototype.visitUnion = indexOfValue;
  IndexOfVisitor.prototype.visitDenseUnion = indexOfUnion;
  IndexOfVisitor.prototype.visitSparseUnion = indexOfUnion;
  IndexOfVisitor.prototype.visitDictionary = indexOfValue;
  IndexOfVisitor.prototype.visitInterval = indexOfValue;
  IndexOfVisitor.prototype.visitIntervalDayTime = indexOfValue;
  IndexOfVisitor.prototype.visitIntervalYearMonth = indexOfValue;
  IndexOfVisitor.prototype.visitDuration = indexOfValue;
  IndexOfVisitor.prototype.visitDurationSecond = indexOfValue;
  IndexOfVisitor.prototype.visitDurationMillisecond = indexOfValue;
  IndexOfVisitor.prototype.visitDurationMicrosecond = indexOfValue;
  IndexOfVisitor.prototype.visitDurationNanosecond = indexOfValue;
  IndexOfVisitor.prototype.visitFixedSizeList = indexOfValue;
  IndexOfVisitor.prototype.visitMap = indexOfValue;
  instance3 = new IndexOfVisitor;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/iterator.mjs
function vectorIterator(vector) {
  const { type } = vector;
  if (vector.nullCount === 0 && vector.stride === 1 && (DataType.isInt(type) && type.bitWidth !== 64 || DataType.isTime(type) && type.bitWidth !== 64 || DataType.isFloat(type) && type.precision !== Precision.HALF)) {
    return new ChunkedIterator(vector.data.length, (chunkIndex) => {
      const data = vector.data[chunkIndex];
      return data.values.subarray(0, data.length)[Symbol.iterator]();
    });
  }
  let offset = 0;
  return new ChunkedIterator(vector.data.length, (chunkIndex) => {
    const data = vector.data[chunkIndex];
    const length = data.length;
    const inner = vector.slice(offset, offset + length);
    offset += length;
    return new VectorIterator(inner);
  });
}
var IteratorVisitor, VectorIterator, instance4;
var init_iterator = __esm(() => {
  init_visitor();
  init_enum();
  init_type2();
  init_chunk();
  IteratorVisitor = class IteratorVisitor extends Visitor {
  };
  VectorIterator = class VectorIterator {
    constructor(vector) {
      this.vector = vector;
      this.index = 0;
    }
    next() {
      if (this.index < this.vector.length) {
        return {
          value: this.vector.get(this.index++)
        };
      }
      return { done: true, value: null };
    }
    [Symbol.iterator]() {
      return this;
    }
  };
  IteratorVisitor.prototype.visitNull = vectorIterator;
  IteratorVisitor.prototype.visitBool = vectorIterator;
  IteratorVisitor.prototype.visitInt = vectorIterator;
  IteratorVisitor.prototype.visitInt8 = vectorIterator;
  IteratorVisitor.prototype.visitInt16 = vectorIterator;
  IteratorVisitor.prototype.visitInt32 = vectorIterator;
  IteratorVisitor.prototype.visitInt64 = vectorIterator;
  IteratorVisitor.prototype.visitUint8 = vectorIterator;
  IteratorVisitor.prototype.visitUint16 = vectorIterator;
  IteratorVisitor.prototype.visitUint32 = vectorIterator;
  IteratorVisitor.prototype.visitUint64 = vectorIterator;
  IteratorVisitor.prototype.visitFloat = vectorIterator;
  IteratorVisitor.prototype.visitFloat16 = vectorIterator;
  IteratorVisitor.prototype.visitFloat32 = vectorIterator;
  IteratorVisitor.prototype.visitFloat64 = vectorIterator;
  IteratorVisitor.prototype.visitUtf8 = vectorIterator;
  IteratorVisitor.prototype.visitLargeUtf8 = vectorIterator;
  IteratorVisitor.prototype.visitBinary = vectorIterator;
  IteratorVisitor.prototype.visitLargeBinary = vectorIterator;
  IteratorVisitor.prototype.visitFixedSizeBinary = vectorIterator;
  IteratorVisitor.prototype.visitDate = vectorIterator;
  IteratorVisitor.prototype.visitDateDay = vectorIterator;
  IteratorVisitor.prototype.visitDateMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestamp = vectorIterator;
  IteratorVisitor.prototype.visitTimestampSecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestampMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestampMicrosecond = vectorIterator;
  IteratorVisitor.prototype.visitTimestampNanosecond = vectorIterator;
  IteratorVisitor.prototype.visitTime = vectorIterator;
  IteratorVisitor.prototype.visitTimeSecond = vectorIterator;
  IteratorVisitor.prototype.visitTimeMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitTimeMicrosecond = vectorIterator;
  IteratorVisitor.prototype.visitTimeNanosecond = vectorIterator;
  IteratorVisitor.prototype.visitDecimal = vectorIterator;
  IteratorVisitor.prototype.visitList = vectorIterator;
  IteratorVisitor.prototype.visitStruct = vectorIterator;
  IteratorVisitor.prototype.visitUnion = vectorIterator;
  IteratorVisitor.prototype.visitDenseUnion = vectorIterator;
  IteratorVisitor.prototype.visitSparseUnion = vectorIterator;
  IteratorVisitor.prototype.visitDictionary = vectorIterator;
  IteratorVisitor.prototype.visitInterval = vectorIterator;
  IteratorVisitor.prototype.visitIntervalDayTime = vectorIterator;
  IteratorVisitor.prototype.visitIntervalYearMonth = vectorIterator;
  IteratorVisitor.prototype.visitDuration = vectorIterator;
  IteratorVisitor.prototype.visitDurationSecond = vectorIterator;
  IteratorVisitor.prototype.visitDurationMillisecond = vectorIterator;
  IteratorVisitor.prototype.visitDurationMicrosecond = vectorIterator;
  IteratorVisitor.prototype.visitDurationNanosecond = vectorIterator;
  IteratorVisitor.prototype.visitFixedSizeList = vectorIterator;
  IteratorVisitor.prototype.visitMap = vectorIterator;
  instance4 = new IteratorVisitor;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/vector.mjs
function makeVector(init) {
  if (init) {
    if (init instanceof Data) {
      return new Vector([init]);
    }
    if (init instanceof Vector) {
      return new Vector(init.data);
    }
    if (init.type instanceof DataType) {
      return new Vector([makeData(init)]);
    }
    if (Array.isArray(init)) {
      return new Vector(init.flatMap((v) => unwrapInputs(v)));
    }
    if (ArrayBuffer.isView(init)) {
      if (init instanceof DataView) {
        init = new Uint8Array(init.buffer);
      }
      const props = { offset: 0, length: init.length, nullCount: -1, data: init };
      if (init instanceof Int8Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int8 }))]);
      }
      if (init instanceof Int16Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int16 }))]);
      }
      if (init instanceof Int32Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int32 }))]);
      }
      if (init instanceof BigInt64Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Int64 }))]);
      }
      if (init instanceof Uint8Array || init instanceof Uint8ClampedArray) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint8 }))]);
      }
      if (init instanceof Uint16Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint16 }))]);
      }
      if (init instanceof Uint32Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint32 }))]);
      }
      if (init instanceof BigUint64Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Uint64 }))]);
      }
      if (init instanceof Float32Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Float32 }))]);
      }
      if (init instanceof Float64Array) {
        return new Vector([makeData(Object.assign(Object.assign({}, props), { type: new Float64 }))]);
      }
      throw new Error("Unrecognized input");
    }
  }
  throw new Error("Unrecognized input");
}
function unwrapInputs(x) {
  return x instanceof Data ? [x] : x instanceof Vector ? x.data : makeVector(x).data;
}
var _a4, visitorsByTypeId, vectorPrototypesByTypeId, Vector, MemoizedVector;
var init_vector2 = __esm(() => {
  init_enum();
  init_vector();
  init_type2();
  init_data();
  init_chunk();
  init_get2();
  init_set();
  init_indexof();
  init_iterator();
  init_type2();
  visitorsByTypeId = {};
  vectorPrototypesByTypeId = {};
  Vector = class Vector {
    constructor(input) {
      var _b2, _c2, _d2;
      const data = input[0] instanceof Vector ? input.flatMap((x) => x.data) : input;
      if (data.length === 0 || data.some((x) => !(x instanceof Data))) {
        throw new TypeError("Vector constructor expects an Array of Data instances.");
      }
      const type = (_b2 = data[0]) === null || _b2 === undefined ? undefined : _b2.type;
      switch (data.length) {
        case 0:
          this._offsets = [0];
          break;
        case 1: {
          const { get: get2, set: set2, indexOf } = visitorsByTypeId[type.typeId];
          const unchunkedData = data[0];
          this.isValid = (index) => isChunkedValid(unchunkedData, index);
          this.get = (index) => get2(unchunkedData, index);
          this.set = (index, value) => set2(unchunkedData, index, value);
          this.indexOf = (index) => indexOf(unchunkedData, index);
          this._offsets = [0, unchunkedData.length];
          break;
        }
        default:
          Object.setPrototypeOf(this, vectorPrototypesByTypeId[type.typeId]);
          this._offsets = computeChunkOffsets(data);
          break;
      }
      this.data = data;
      this.type = type;
      this.stride = strideForType(type);
      this.numChildren = (_d2 = (_c2 = type.children) === null || _c2 === undefined ? undefined : _c2.length) !== null && _d2 !== undefined ? _d2 : 0;
      this.length = this._offsets.at(-1);
    }
    get byteLength() {
      return this.data.reduce((byteLength, data) => byteLength + data.byteLength, 0);
    }
    get nullable() {
      return computeChunkNullable(this.data);
    }
    get nullCount() {
      return computeChunkNullCounts(this.data);
    }
    get ArrayType() {
      return this.type.ArrayType;
    }
    get [Symbol.toStringTag]() {
      return `${this.VectorName}<${this.type[Symbol.toStringTag]}>`;
    }
    get VectorName() {
      return `${Type2[this.type.typeId]}Vector`;
    }
    isValid(index) {
      return false;
    }
    get(index) {
      return null;
    }
    at(index) {
      return this.get(wrapIndex(index, this.length));
    }
    set(index, value) {
      return;
    }
    indexOf(element, offset) {
      return -1;
    }
    includes(element, offset) {
      return this.indexOf(element, offset) > -1;
    }
    [Symbol.iterator]() {
      return instance4.visit(this);
    }
    concat(...others) {
      return new Vector(this.data.concat(others.flatMap((x) => x.data).flat(Number.POSITIVE_INFINITY)));
    }
    slice(begin, end) {
      return new Vector(clampRange(this, begin, end, ({ data, _offsets }, begin2, end2) => sliceChunks(data, _offsets, begin2, end2)));
    }
    toJSON() {
      return [...this];
    }
    toArray() {
      const { type, data, length, stride, ArrayType } = this;
      switch (type.typeId) {
        case Type2.Int:
        case Type2.Float:
        case Type2.Decimal:
        case Type2.Time:
        case Type2.Timestamp:
          switch (data.length) {
            case 0:
              return new ArrayType;
            case 1:
              return data[0].values.subarray(0, length * stride);
            default:
              return data.reduce((memo, { values, length: chunk_length }) => {
                memo.array.set(values.subarray(0, chunk_length * stride), memo.offset);
                memo.offset += chunk_length * stride;
                return memo;
              }, { array: new ArrayType(length * stride), offset: 0 }).array;
          }
      }
      return [...this];
    }
    toString() {
      return `[${[...this].join(",")}]`;
    }
    getChild(name) {
      var _b2;
      return this.getChildAt((_b2 = this.type.children) === null || _b2 === undefined ? undefined : _b2.findIndex((f) => f.name === name));
    }
    getChildAt(index) {
      if (index > -1 && index < this.numChildren) {
        return new Vector(this.data.map(({ children }) => children[index]));
      }
      return null;
    }
    get isMemoized() {
      if (DataType.isDictionary(this.type)) {
        return this.data[0].dictionary.isMemoized;
      }
      return false;
    }
    memoize() {
      if (DataType.isDictionary(this.type)) {
        const dictionary = new MemoizedVector(this.data[0].dictionary);
        const newData = this.data.map((data) => {
          const cloned = data.clone();
          cloned.dictionary = dictionary;
          return cloned;
        });
        return new Vector(newData);
      }
      return new MemoizedVector(this);
    }
    unmemoize() {
      if (DataType.isDictionary(this.type) && this.isMemoized) {
        const dictionary = this.data[0].dictionary.unmemoize();
        const newData = this.data.map((data) => {
          const newData2 = data.clone();
          newData2.dictionary = dictionary;
          return newData2;
        });
        return new Vector(newData);
      }
      return this;
    }
  };
  _a4 = Symbol.toStringTag;
  Vector[_a4] = ((proto) => {
    proto.type = DataType.prototype;
    proto.data = [];
    proto.length = 0;
    proto.stride = 1;
    proto.numChildren = 0;
    proto._offsets = new Uint32Array([0]);
    proto[Symbol.isConcatSpreadable] = true;
    const typeIds = Object.keys(Type2).map((T) => Type2[T]).filter((T) => typeof T === "number" && T !== Type2.NONE);
    for (const typeId of typeIds) {
      const get2 = instance2.getVisitFnByTypeId(typeId);
      const set2 = instance.getVisitFnByTypeId(typeId);
      const indexOf = instance3.getVisitFnByTypeId(typeId);
      visitorsByTypeId[typeId] = { get: get2, set: set2, indexOf };
      vectorPrototypesByTypeId[typeId] = Object.create(proto, {
        ["isValid"]: { value: wrapChunkedCall1(isChunkedValid) },
        ["get"]: { value: wrapChunkedCall1(instance2.getVisitFnByTypeId(typeId)) },
        ["set"]: { value: wrapChunkedCall2(instance.getVisitFnByTypeId(typeId)) },
        ["indexOf"]: { value: wrapChunkedIndexOf(instance3.getVisitFnByTypeId(typeId)) }
      });
    }
    return "Vector";
  })(Vector.prototype);
  MemoizedVector = class MemoizedVector extends Vector {
    constructor(vector) {
      super(vector.data);
      const get2 = this.get;
      const set2 = this.set;
      const slice = this.slice;
      const cache = new Array(this.length);
      Object.defineProperty(this, "get", {
        value(index) {
          const cachedValue = cache[index];
          if (cachedValue !== undefined) {
            return cachedValue;
          }
          const value = get2.call(this, index);
          cache[index] = value;
          return value;
        }
      });
      Object.defineProperty(this, "set", {
        value(index, value) {
          set2.call(this, index, value);
          cache[index] = value;
        }
      });
      Object.defineProperty(this, "slice", {
        value: (begin, end) => new MemoizedVector(slice.call(this, begin, end))
      });
      Object.defineProperty(this, "isMemoized", { value: true });
      Object.defineProperty(this, "unmemoize", {
        value: () => new Vector(this.data)
      });
      Object.defineProperty(this, "memoize", {
        value: () => this
      });
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/valid.mjs
function createIsValidFunction(nullValues) {
  if (!nullValues || nullValues.length <= 0) {
    return function isValid(value) {
      return true;
    };
  }
  let fnBody = "";
  const noNaNs = nullValues.filter((x) => x === x);
  if (noNaNs.length > 0) {
    fnBody = `
    switch (x) {${noNaNs.map((x) => `
        case ${valueToCase(x)}:`).join("")}
            return false;
    }`;
  }
  if (nullValues.length !== noNaNs.length) {
    fnBody = `if (x !== x) return false;
${fnBody}`;
  }
  return new Function(`x`, `${fnBody}
return true;`);
}
function valueToCase(x) {
  if (typeof x !== "bigint") {
    return valueToString(x);
  }
  return `${valueToString(x)}n`;
}
var init_valid = () => {};

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/buffer.mjs
function roundLengthUpToNearest64Bytes(len, BPE) {
  const bytesMinus1 = Math.ceil(len) * BPE - 1;
  return (bytesMinus1 - bytesMinus1 % 64 + 64 || 64) / BPE;
}
function resizeArray(arr, len = 0) {
  return arr.length >= len ? arr.subarray(0, len) : memcpy(new arr.constructor(len), arr, 0);
}

class BufferBuilder {
  constructor(bufferType, initialSize = 0, stride = 1) {
    this.length = Math.ceil(initialSize / stride);
    this.buffer = new bufferType(this.length);
    this.stride = stride;
    this.BYTES_PER_ELEMENT = bufferType.BYTES_PER_ELEMENT;
    this.ArrayType = bufferType;
  }
  get byteLength() {
    return Math.ceil(this.length * this.stride) * this.BYTES_PER_ELEMENT;
  }
  get reservedLength() {
    return this.buffer.length / this.stride;
  }
  get reservedByteLength() {
    return this.buffer.byteLength;
  }
  set(index, value) {
    return this;
  }
  append(value) {
    return this.set(this.length, value);
  }
  reserve(extra) {
    if (extra > 0) {
      this.length += extra;
      const stride = this.stride;
      const length = this.length * stride;
      const reserved = this.buffer.length;
      if (length >= reserved) {
        this._resize(reserved === 0 ? roundLengthUpToNearest64Bytes(length * 1, this.BYTES_PER_ELEMENT) : roundLengthUpToNearest64Bytes(length * 2, this.BYTES_PER_ELEMENT));
      }
    }
    return this;
  }
  flush(length = this.length) {
    length = roundLengthUpToNearest64Bytes(length * this.stride, this.BYTES_PER_ELEMENT);
    const array2 = resizeArray(this.buffer, length);
    this.clear();
    return array2;
  }
  clear() {
    this.length = 0;
    this.buffer = new this.ArrayType;
    return this;
  }
  _resize(newLength) {
    return this.buffer = resizeArray(this.buffer, newLength);
  }
}
var DataBufferBuilder, BitmapBufferBuilder, OffsetsBufferBuilder;
var init_buffer2 = __esm(() => {
  init_buffer();
  DataBufferBuilder = class DataBufferBuilder extends BufferBuilder {
    last() {
      return this.get(this.length - 1);
    }
    get(index) {
      return this.buffer[index];
    }
    set(index, value) {
      this.reserve(index - this.length + 1);
      this.buffer[index * this.stride] = value;
      return this;
    }
  };
  BitmapBufferBuilder = class BitmapBufferBuilder extends DataBufferBuilder {
    constructor() {
      super(Uint8Array, 0, 1 / 8);
      this.numValid = 0;
    }
    get numInvalid() {
      return this.length - this.numValid;
    }
    get(idx) {
      return this.buffer[idx >> 3] >> idx % 8 & 1;
    }
    set(idx, val) {
      const { buffer } = this.reserve(idx - this.length + 1);
      const byte = idx >> 3, bit = idx % 8, cur = buffer[byte] >> bit & 1;
      val ? cur === 0 && (buffer[byte] |= 1 << bit, ++this.numValid) : cur === 1 && (buffer[byte] &= ~(1 << bit), --this.numValid);
      return this;
    }
    clear() {
      this.numValid = 0;
      return super.clear();
    }
  };
  OffsetsBufferBuilder = class OffsetsBufferBuilder extends DataBufferBuilder {
    constructor(type) {
      super(type.OffsetArrayType, 1, 1);
    }
    append(value) {
      return this.set(this.length - 1, value);
    }
    set(index, value) {
      const offset = this.length - 1;
      const buffer = this.reserve(index - offset + 1).buffer;
      if (offset < index++ && offset >= 0) {
        buffer.fill(buffer[offset], offset, index);
      }
      buffer[index] = buffer[index - 1] + value;
      return this;
    }
    flush(length = this.length - 1) {
      if (length > this.length) {
        this.set(length - 1, this.BYTES_PER_ELEMENT > 4 ? BigInt(0) : 0);
      }
      return super.flush(length + 1);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder.mjs
class Builder2 {
  static throughNode(options) {
    throw new Error(`"throughNode" not available in this environment`);
  }
  static throughDOM(options) {
    throw new Error(`"throughDOM" not available in this environment`);
  }
  constructor({ type, nullValues: nulls }) {
    this.length = 0;
    this.finished = false;
    this.type = type;
    this.children = [];
    this.nullValues = nulls;
    this.stride = strideForType(type);
    this._nulls = new BitmapBufferBuilder;
    if (nulls && nulls.length > 0) {
      this._isValid = createIsValidFunction(nulls);
    }
  }
  toVector() {
    return new Vector([this.flush()]);
  }
  get ArrayType() {
    return this.type.ArrayType;
  }
  get nullCount() {
    return this._nulls.numInvalid;
  }
  get numChildren() {
    return this.children.length;
  }
  get byteLength() {
    let size = 0;
    const { _offsets, _values, _nulls, _typeIds, children } = this;
    _offsets && (size += _offsets.byteLength);
    _values && (size += _values.byteLength);
    _nulls && (size += _nulls.byteLength);
    _typeIds && (size += _typeIds.byteLength);
    return children.reduce((size2, child) => size2 + child.byteLength, size);
  }
  get reservedLength() {
    return this._nulls.reservedLength;
  }
  get reservedByteLength() {
    let size = 0;
    this._offsets && (size += this._offsets.reservedByteLength);
    this._values && (size += this._values.reservedByteLength);
    this._nulls && (size += this._nulls.reservedByteLength);
    this._typeIds && (size += this._typeIds.reservedByteLength);
    return this.children.reduce((size2, child) => size2 + child.reservedByteLength, size);
  }
  get valueOffsets() {
    return this._offsets ? this._offsets.buffer : null;
  }
  get values() {
    return this._values ? this._values.buffer : null;
  }
  get nullBitmap() {
    return this._nulls ? this._nulls.buffer : null;
  }
  get typeIds() {
    return this._typeIds ? this._typeIds.buffer : null;
  }
  append(value) {
    return this.set(this.length, value);
  }
  isValid(value) {
    return this._isValid(value);
  }
  set(index, value) {
    if (this.setValid(index, this.isValid(value))) {
      this.setValue(index, value);
    }
    return this;
  }
  setValue(index, value) {
    this._setValue(this, index, value);
  }
  setValid(index, valid) {
    this.length = this._nulls.set(index, +valid).length;
    return valid;
  }
  addChild(child, name = `${this.numChildren}`) {
    throw new Error(`Cannot append children to non-nested type "${this.type}"`);
  }
  getChildAt(index) {
    return this.children[index] || null;
  }
  flush() {
    let data;
    let typeIds;
    let nullBitmap;
    let valueOffsets;
    const { type, length, nullCount, _typeIds, _offsets, _values, _nulls } = this;
    if (typeIds = _typeIds === null || _typeIds === undefined ? undefined : _typeIds.flush(length)) {
      valueOffsets = _offsets === null || _offsets === undefined ? undefined : _offsets.flush(length);
    } else if (valueOffsets = _offsets === null || _offsets === undefined ? undefined : _offsets.flush(length)) {
      data = _values === null || _values === undefined ? undefined : _values.flush(_offsets.last());
    } else {
      data = _values === null || _values === undefined ? undefined : _values.flush(length);
    }
    if (nullCount > 0) {
      nullBitmap = _nulls === null || _nulls === undefined ? undefined : _nulls.flush(length);
    }
    const children = this.children.map((child) => child.flush());
    this.clear();
    return makeData({
      type,
      length,
      nullCount,
      children,
      child: children[0],
      data,
      typeIds,
      nullBitmap,
      valueOffsets
    });
  }
  finish() {
    this.finished = true;
    for (const child of this.children)
      child.finish();
    return this;
  }
  clear() {
    var _a5, _b2, _c2, _d2;
    this.length = 0;
    (_a5 = this._nulls) === null || _a5 === undefined || _a5.clear();
    (_b2 = this._values) === null || _b2 === undefined || _b2.clear();
    (_c2 = this._offsets) === null || _c2 === undefined || _c2.clear();
    (_d2 = this._typeIds) === null || _d2 === undefined || _d2.clear();
    for (const child of this.children)
      child.clear();
    return this;
  }
}
var FixedWidthBuilder, VariableWidthBuilder;
var init_builder2 = __esm(() => {
  init_vector2();
  init_data();
  init_map2();
  init_type2();
  init_valid();
  init_buffer2();
  Builder2.prototype.length = 1;
  Builder2.prototype.stride = 1;
  Builder2.prototype.children = null;
  Builder2.prototype.finished = false;
  Builder2.prototype.nullValues = null;
  Builder2.prototype._isValid = () => true;
  FixedWidthBuilder = class FixedWidthBuilder extends Builder2 {
    constructor(opts) {
      super(opts);
      this._values = new DataBufferBuilder(this.ArrayType, 0, this.stride);
    }
    setValue(index, value) {
      const values = this._values;
      values.reserve(index - values.length + 1);
      return super.setValue(index, value);
    }
  };
  VariableWidthBuilder = class VariableWidthBuilder extends Builder2 {
    constructor(opts) {
      super(opts);
      this._pendingLength = 0;
      this._offsets = new OffsetsBufferBuilder(opts.type);
    }
    setValue(index, value) {
      const pending = this._pending || (this._pending = new Map);
      const current = pending.get(index);
      current && (this._pendingLength -= current.length);
      this._pendingLength += value instanceof MapRow ? value[kKeys].length : value.length;
      pending.set(index, value);
    }
    setValid(index, isValid) {
      if (!super.setValid(index, isValid)) {
        (this._pending || (this._pending = new Map)).set(index, undefined);
        return false;
      }
      return true;
    }
    clear() {
      this._pendingLength = 0;
      this._pending = undefined;
      return super.clear();
    }
    flush() {
      this._flush();
      return super.flush();
    }
    finish() {
      this._flush();
      return super.finish();
    }
    _flush() {
      const pending = this._pending;
      const pendingLength = this._pendingLength;
      this._pendingLength = 0;
      this._pending = undefined;
      if (pending && pending.size > 0) {
        this._flushPending(pending, pendingLength);
      }
      return this;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/block.mjs
class Block {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  offset() {
    return this.bb.readInt64(this.bb_pos);
  }
  metaDataLength() {
    return this.bb.readInt32(this.bb_pos + 8);
  }
  bodyLength() {
    return this.bb.readInt64(this.bb_pos + 16);
  }
  static sizeOf() {
    return 24;
  }
  static createBlock(builder, offset, metaDataLength, bodyLength) {
    builder.prep(8, 24);
    builder.writeInt64(BigInt(bodyLength !== null && bodyLength !== undefined ? bodyLength : 0));
    builder.pad(4);
    builder.writeInt32(metaDataLength);
    builder.writeInt64(BigInt(offset !== null && offset !== undefined ? offset : 0));
    return builder.offset();
  }
}

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/footer.mjs
class Footer {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsFooter(bb, obj) {
    return (obj || new Footer).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsFooter(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Footer).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  version() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : MetadataVersion.V1;
  }
  schema(obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new Schema).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
  }
  dictionaries(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new Block).__init(this.bb.__vector(this.bb_pos + offset) + index * 24, this.bb) : null;
  }
  dictionariesLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  recordBatches(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? (obj || new Block).__init(this.bb.__vector(this.bb_pos + offset) + index * 24, this.bb) : null;
  }
  recordBatchesLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  customMetadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new KeyValue).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  customMetadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  static startFooter(builder) {
    builder.startObject(5);
  }
  static addVersion(builder, version2) {
    builder.addFieldInt16(0, version2, MetadataVersion.V1);
  }
  static addSchema(builder, schemaOffset) {
    builder.addFieldOffset(1, schemaOffset, 0);
  }
  static addDictionaries(builder, dictionariesOffset) {
    builder.addFieldOffset(2, dictionariesOffset, 0);
  }
  static startDictionariesVector(builder, numElems) {
    builder.startVector(24, numElems, 8);
  }
  static addRecordBatches(builder, recordBatchesOffset) {
    builder.addFieldOffset(3, recordBatchesOffset, 0);
  }
  static startRecordBatchesVector(builder, numElems) {
    builder.startVector(24, numElems, 8);
  }
  static addCustomMetadata(builder, customMetadataOffset) {
    builder.addFieldOffset(4, customMetadataOffset, 0);
  }
  static createCustomMetadataVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startCustomMetadataVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static endFooter(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static finishFooterBuffer(builder, offset) {
    builder.finish(offset);
  }
  static finishSizePrefixedFooterBuffer(builder, offset) {
    builder.finish(offset, undefined, true);
  }
}
var init_footer = __esm(() => {
  init_flatbuffers();
  init_key_value();
  init_metadata_version();
  init_schema();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/schema.mjs
function mergeMaps(m1, m2) {
  return new Map([...m1 || new Map, ...m2 || new Map]);
}
function generateDictionaryMap(fields, dictionaries = new Map) {
  for (let i = -1, n = fields.length;++i < n; ) {
    const field = fields[i];
    const type = field.type;
    if (DataType.isDictionary(type)) {
      if (!dictionaries.has(type.id)) {
        dictionaries.set(type.id, type.dictionary);
      } else if (dictionaries.get(type.id) !== type.dictionary) {
        throw new Error(`Cannot create Schema containing two different dictionaries with the same Id`);
      }
    }
    if (type.children && type.children.length > 0) {
      generateDictionaryMap(type.children, dictionaries);
    }
  }
  return dictionaries;
}
var Schema2, Field2;
var init_schema2 = __esm(() => {
  init_enum();
  init_type2();
  Schema2 = class Schema2 {
    constructor(fields = [], metadata, dictionaries, metadataVersion = MetadataVersion.V5) {
      this.fields = fields || [];
      this.metadata = metadata || new Map;
      if (!dictionaries) {
        dictionaries = generateDictionaryMap(this.fields);
      }
      this.dictionaries = dictionaries;
      this.metadataVersion = metadataVersion;
    }
    get [Symbol.toStringTag]() {
      return "Schema";
    }
    get names() {
      return this.fields.map((f) => f.name);
    }
    toString() {
      return `Schema<{ ${this.fields.map((f, i) => `${i}: ${f}`).join(", ")} }>`;
    }
    select(fieldNames) {
      const names = new Set(fieldNames);
      const fields = this.fields.filter((f) => names.has(f.name));
      return new Schema2(fields, this.metadata);
    }
    selectAt(fieldIndices) {
      const fields = fieldIndices.map((i) => this.fields[i]).filter(Boolean);
      return new Schema2(fields, this.metadata);
    }
    assign(...args) {
      const other = args[0] instanceof Schema2 ? args[0] : Array.isArray(args[0]) ? new Schema2(args[0]) : new Schema2(args);
      const curFields = [...this.fields];
      const metadata = mergeMaps(mergeMaps(new Map, this.metadata), other.metadata);
      const newFields = other.fields.filter((f2) => {
        const i = curFields.findIndex((f) => f.name === f2.name);
        return ~i ? (curFields[i] = f2.clone({
          metadata: mergeMaps(mergeMaps(new Map, curFields[i].metadata), f2.metadata)
        })) && false : true;
      });
      const newDictionaries = generateDictionaryMap(newFields, new Map);
      return new Schema2([...curFields, ...newFields], metadata, new Map([...this.dictionaries, ...newDictionaries]));
    }
  };
  Schema2.prototype.fields = null;
  Schema2.prototype.metadata = null;
  Schema2.prototype.dictionaries = null;
  Field2 = class Field2 {
    static new(...args) {
      let [name, type, nullable2, metadata] = args;
      if (args[0] && typeof args[0] === "object") {
        ({ name } = args[0]);
        type === undefined && (type = args[0].type);
        nullable2 === undefined && (nullable2 = args[0].nullable);
        metadata === undefined && (metadata = args[0].metadata);
      }
      return new Field2(`${name}`, type, nullable2, metadata);
    }
    constructor(name, type, nullable2 = false, metadata) {
      this.name = name;
      this.type = type;
      this.nullable = nullable2;
      this.metadata = metadata || new Map;
    }
    get typeId() {
      return this.type.typeId;
    }
    get [Symbol.toStringTag]() {
      return "Field";
    }
    toString() {
      return `${this.name}: ${this.type}`;
    }
    clone(...args) {
      let [name, type, nullable2, metadata] = args;
      !args[0] || typeof args[0] !== "object" ? [name = this.name, type = this.type, nullable2 = this.nullable, metadata = this.metadata] = args : { name = this.name, type = this.type, nullable: nullable2 = this.nullable, metadata = this.metadata } = args[0];
      return Field2.new(name, type, nullable2, metadata);
    }
  };
  Field2.prototype.type = null;
  Field2.prototype.name = null;
  Field2.prototype.nullable = null;
  Field2.prototype.metadata = null;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/metadata/file.mjs
class Footer_ {
  static decode(buf) {
    buf = new ByteBuffer2(toUint8Array(buf));
    const footer = Footer.getRootAsFooter(buf);
    const schema = Schema2.decode(footer.schema(), new Map, footer.version());
    return new OffHeapFooter(schema, footer);
  }
  static encode(footer) {
    const b = new Builder3;
    const schemaOffset = Schema2.encode(b, footer.schema);
    Footer.startRecordBatchesVector(b, footer.numRecordBatches);
    for (const rb of [...footer.recordBatches()].slice().reverse()) {
      FileBlock.encode(b, rb);
    }
    const recordBatchesOffset = b.endVector();
    Footer.startDictionariesVector(b, footer.numDictionaries);
    for (const db of [...footer.dictionaryBatches()].slice().reverse()) {
      FileBlock.encode(b, db);
    }
    const dictionaryBatchesOffset = b.endVector();
    Footer.startFooter(b);
    Footer.addSchema(b, schemaOffset);
    Footer.addVersion(b, MetadataVersion.V5);
    Footer.addRecordBatches(b, recordBatchesOffset);
    Footer.addDictionaries(b, dictionaryBatchesOffset);
    Footer.finishFooterBuffer(b, Footer.endFooter(b));
    return b.asUint8Array();
  }
  get numRecordBatches() {
    return this._recordBatches.length;
  }
  get numDictionaries() {
    return this._dictionaryBatches.length;
  }
  constructor(schema, version2 = MetadataVersion.V5, recordBatches, dictionaryBatches) {
    this.schema = schema;
    this.version = version2;
    recordBatches && (this._recordBatches = recordBatches);
    dictionaryBatches && (this._dictionaryBatches = dictionaryBatches);
  }
  *recordBatches() {
    for (let block, i = -1, n = this.numRecordBatches;++i < n; ) {
      if (block = this.getRecordBatch(i)) {
        yield block;
      }
    }
  }
  *dictionaryBatches() {
    for (let block, i = -1, n = this.numDictionaries;++i < n; ) {
      if (block = this.getDictionaryBatch(i)) {
        yield block;
      }
    }
  }
  getRecordBatch(index) {
    return index >= 0 && index < this.numRecordBatches && this._recordBatches[index] || null;
  }
  getDictionaryBatch(index) {
    return index >= 0 && index < this.numDictionaries && this._dictionaryBatches[index] || null;
  }
}

class FileBlock {
  static decode(block) {
    return new FileBlock(block.metaDataLength(), block.bodyLength(), block.offset());
  }
  static encode(b, fileBlock) {
    const { metaDataLength } = fileBlock;
    const offset = BigInt(fileBlock.offset);
    const bodyLength = BigInt(fileBlock.bodyLength);
    return Block.createBlock(b, offset, metaDataLength, bodyLength);
  }
  constructor(metaDataLength, bodyLength, offset) {
    this.metaDataLength = metaDataLength;
    this.offset = bigIntToNumber(offset);
    this.bodyLength = bigIntToNumber(bodyLength);
  }
}
var Builder3, ByteBuffer2, OffHeapFooter;
var init_file = __esm(() => {
  init_footer();
  init_flatbuffers();
  init_schema2();
  init_enum();
  init_buffer();
  Builder3 = Builder;
  ByteBuffer2 = ByteBuffer;
  OffHeapFooter = class OffHeapFooter extends Footer_ {
    get numRecordBatches() {
      return this._footer.recordBatchesLength();
    }
    get numDictionaries() {
      return this._footer.dictionariesLength();
    }
    constructor(schema, _footer) {
      super(schema, _footer.version());
      this._footer = _footer;
    }
    getRecordBatch(index) {
      if (index >= 0 && index < this.numRecordBatches) {
        const fileBlock = this._footer.recordBatches(index);
        if (fileBlock) {
          return FileBlock.decode(fileBlock);
        }
      }
      return null;
    }
    getDictionaryBatch(index) {
      if (index >= 0 && index < this.numDictionaries) {
        const fileBlock = this._footer.dictionaries(index);
        if (fileBlock) {
          return FileBlock.decode(fileBlock);
        }
      }
      return null;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/interfaces.mjs
class ArrowJSON {
  constructor(_json) {
    this._json = _json;
  }
  get schema() {
    return this._json["schema"];
  }
  get batches() {
    return this._json["batches"] || [];
  }
  get dictionaries() {
    return this._json["dictionaries"] || [];
  }
}

class ReadableInterop {
  tee() {
    return this._getDOMStream().tee();
  }
  pipe(writable, options) {
    return this._getNodeStream().pipe(writable, options);
  }
  pipeTo(writable, options) {
    return this._getDOMStream().pipeTo(writable, options);
  }
  pipeThrough(duplex, options) {
    return this._getDOMStream().pipeThrough(duplex, options);
  }
  _getDOMStream() {
    return this._DOMStream || (this._DOMStream = this.toDOMStream());
  }
  _getNodeStream() {
    return this._nodeStream || (this._nodeStream = this.toNodeStream());
  }
}
var ITERATOR_DONE, AsyncQueue;
var init_interfaces = __esm(() => {
  init_tslib_es6();
  init_adapters();
  ITERATOR_DONE = Object.freeze({ done: true, value: undefined });
  AsyncQueue = class AsyncQueue extends ReadableInterop {
    constructor() {
      super();
      this._values = [];
      this.resolvers = [];
      this._closedPromise = new Promise((r) => this._closedPromiseResolve = r);
    }
    get closed() {
      return this._closedPromise;
    }
    cancel(reason) {
      return __awaiter(this, undefined, undefined, function* () {
        yield this.return(reason);
      });
    }
    write(value) {
      if (this._ensureOpen()) {
        this.resolvers.length <= 0 ? this._values.push(value) : this.resolvers.shift().resolve({ done: false, value });
      }
    }
    abort(value) {
      if (this._closedPromiseResolve) {
        this.resolvers.length <= 0 ? this._error = { error: value } : this.resolvers.shift().reject({ done: true, value });
      }
    }
    close() {
      if (this._closedPromiseResolve) {
        const { resolvers } = this;
        while (resolvers.length > 0) {
          resolvers.shift().resolve(ITERATOR_DONE);
        }
        this._closedPromiseResolve();
        this._closedPromiseResolve = undefined;
      }
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    toDOMStream(options) {
      return adapters_default.toDOMStream(this._closedPromiseResolve || this._error ? this : this._values, options);
    }
    toNodeStream(options) {
      return adapters_default.toNodeStream(this._closedPromiseResolve || this._error ? this : this._values, options);
    }
    throw(_) {
      return __awaiter(this, undefined, undefined, function* () {
        yield this.abort(_);
        return ITERATOR_DONE;
      });
    }
    return(_) {
      return __awaiter(this, undefined, undefined, function* () {
        yield this.close();
        return ITERATOR_DONE;
      });
    }
    read(size) {
      return __awaiter(this, undefined, undefined, function* () {
        return (yield this.next(size, "read")).value;
      });
    }
    peek(size) {
      return __awaiter(this, undefined, undefined, function* () {
        return (yield this.next(size, "peek")).value;
      });
    }
    next(..._args) {
      if (this._values.length > 0) {
        return Promise.resolve({ done: false, value: this._values.shift() });
      } else if (this._error) {
        return Promise.reject({ done: true, value: this._error.error });
      } else if (!this._closedPromiseResolve) {
        return Promise.resolve(ITERATOR_DONE);
      } else {
        return new Promise((resolve2, reject) => {
          this.resolvers.push({ resolve: resolve2, reject });
        });
      }
    }
    _ensureOpen() {
      if (this._closedPromiseResolve) {
        return true;
      }
      throw new Error(`AsyncQueue is closed`);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/stream.mjs
class ByteStreamSource {
  constructor(source) {
    this.source = source;
  }
  cancel(reason) {
    this.return(reason);
  }
  peek(size) {
    return this.next(size, "peek").value;
  }
  read(size) {
    return this.next(size, "read").value;
  }
  next(size, cmd = "read") {
    return this.source.next({ cmd, size });
  }
  throw(value) {
    return Object.create(this.source.throw && this.source.throw(value) || ITERATOR_DONE);
  }
  return(value) {
    return Object.create(this.source.return && this.source.return(value) || ITERATOR_DONE);
  }
}

class AsyncByteStreamSource {
  constructor(source) {
    this.source = source;
    this._closedPromise = new Promise((r) => this._closedPromiseResolve = r);
  }
  cancel(reason) {
    return __awaiter(this, undefined, undefined, function* () {
      yield this.return(reason);
    });
  }
  get closed() {
    return this._closedPromise;
  }
  read(size) {
    return __awaiter(this, undefined, undefined, function* () {
      return (yield this.next(size, "read")).value;
    });
  }
  peek(size) {
    return __awaiter(this, undefined, undefined, function* () {
      return (yield this.next(size, "peek")).value;
    });
  }
  next(size_1) {
    return __awaiter(this, arguments, undefined, function* (size, cmd = "read") {
      return yield this.source.next({ cmd, size });
    });
  }
  throw(value) {
    return __awaiter(this, undefined, undefined, function* () {
      const result = this.source.throw && (yield this.source.throw(value)) || ITERATOR_DONE;
      this._closedPromiseResolve && this._closedPromiseResolve();
      this._closedPromiseResolve = undefined;
      return Object.create(result);
    });
  }
  return(value) {
    return __awaiter(this, undefined, undefined, function* () {
      const result = this.source.return && (yield this.source.return(value)) || ITERATOR_DONE;
      this._closedPromiseResolve && this._closedPromiseResolve();
      this._closedPromiseResolve = undefined;
      return Object.create(result);
    });
  }
}
var AsyncByteQueue, ByteStream, AsyncByteStream;
var init_stream = __esm(() => {
  init_tslib_es6();
  init_adapters();
  init_utf8();
  init_interfaces();
  init_buffer();
  AsyncByteQueue = class AsyncByteQueue extends AsyncQueue {
    write(value) {
      if ((value = toUint8Array(value)).byteLength > 0) {
        return super.write(value);
      }
    }
    toString(sync = false) {
      return sync ? decodeUtf8(this.toUint8Array(true)) : this.toUint8Array(false).then(decodeUtf8);
    }
    toUint8Array(sync = false) {
      return sync ? joinUint8Arrays(this._values)[0] : (() => __awaiter(this, undefined, undefined, function* () {
        var _a5, e_1, _b2, _c2;
        const buffers = [];
        let byteLength = 0;
        try {
          for (var _d2 = true, _e2 = __asyncValues(this), _f2;_f2 = yield _e2.next(), _a5 = _f2.done, !_a5; _d2 = true) {
            _c2 = _f2.value;
            _d2 = false;
            const chunk = _c2;
            buffers.push(chunk);
            byteLength += chunk.byteLength;
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (!_d2 && !_a5 && (_b2 = _e2.return))
              yield _b2.call(_e2);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        return joinUint8Arrays(buffers, byteLength)[0];
      }))();
    }
  };
  ByteStream = class ByteStream {
    constructor(source) {
      if (source) {
        this.source = new ByteStreamSource(adapters_default.fromIterable(source));
      }
    }
    [Symbol.iterator]() {
      return this;
    }
    next(value) {
      return this.source.next(value);
    }
    throw(value) {
      return this.source.throw(value);
    }
    return(value) {
      return this.source.return(value);
    }
    peek(size) {
      return this.source.peek(size);
    }
    read(size) {
      return this.source.read(size);
    }
  };
  AsyncByteStream = class AsyncByteStream {
    constructor(source) {
      if (source instanceof AsyncByteStream) {
        this.source = source.source;
      } else if (source instanceof AsyncByteQueue) {
        this.source = new AsyncByteStreamSource(adapters_default.fromAsyncIterable(source));
      } else if (isReadableNodeStream(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromNodeStream(source));
      } else if (isReadableDOMStream(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromDOMStream(source));
      } else if (isFetchResponse(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromDOMStream(source.body));
      } else if (isIterable(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromIterable(source));
      } else if (isPromise(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromAsyncIterable(source));
      } else if (isAsyncIterable(source)) {
        this.source = new AsyncByteStreamSource(adapters_default.fromAsyncIterable(source));
      }
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    next(value) {
      return this.source.next(value);
    }
    throw(value) {
      return this.source.throw(value);
    }
    return(value) {
      return this.source.return(value);
    }
    get closed() {
      return this.source.closed;
    }
    cancel(reason) {
      return this.source.cancel(reason);
    }
    peek(size) {
      return this.source.peek(size);
    }
    read(size) {
      return this.source.read(size);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/file.mjs
var RandomAccessFile, AsyncRandomAccessFile;
var init_file2 = __esm(() => {
  init_tslib_es6();
  init_stream();
  init_buffer();
  RandomAccessFile = class RandomAccessFile extends ByteStream {
    constructor(buffer, byteLength) {
      super();
      this.position = 0;
      this.buffer = toUint8Array(buffer);
      this.size = byteLength === undefined ? this.buffer.byteLength : byteLength;
    }
    readInt32(position) {
      const { buffer, byteOffset } = this.readAt(position, 4);
      return new DataView(buffer, byteOffset).getInt32(0, true);
    }
    seek(position) {
      this.position = Math.min(position, this.size);
      return position < this.size;
    }
    read(nBytes) {
      const { buffer, size, position } = this;
      if (buffer && position < size) {
        if (typeof nBytes !== "number") {
          nBytes = Number.POSITIVE_INFINITY;
        }
        this.position = Math.min(size, position + Math.min(size - position, nBytes));
        return buffer.subarray(position, this.position);
      }
      return null;
    }
    readAt(position, nBytes) {
      const buf = this.buffer;
      const end = Math.min(this.size, position + nBytes);
      return buf ? buf.subarray(position, end) : new Uint8Array(nBytes);
    }
    close() {
      this.buffer && (this.buffer = null);
    }
    throw(value) {
      this.close();
      return { done: true, value };
    }
    return(value) {
      this.close();
      return { done: true, value };
    }
  };
  AsyncRandomAccessFile = class AsyncRandomAccessFile extends AsyncByteStream {
    constructor(file2, byteLength) {
      super();
      this.position = 0;
      this._handle = file2;
      if (typeof byteLength === "number") {
        this.size = byteLength;
      } else {
        this._pending = (() => __awaiter(this, undefined, undefined, function* () {
          this.size = (yield file2.stat()).size;
          delete this._pending;
        }))();
      }
    }
    readInt32(position) {
      return __awaiter(this, undefined, undefined, function* () {
        const { buffer, byteOffset } = yield this.readAt(position, 4);
        return new DataView(buffer, byteOffset).getInt32(0, true);
      });
    }
    seek(position) {
      return __awaiter(this, undefined, undefined, function* () {
        this._pending && (yield this._pending);
        this.position = Math.min(position, this.size);
        return position < this.size;
      });
    }
    read(nBytes) {
      return __awaiter(this, undefined, undefined, function* () {
        this._pending && (yield this._pending);
        const { _handle: file2, size, position } = this;
        if (file2 && position < size) {
          if (typeof nBytes !== "number") {
            nBytes = Number.POSITIVE_INFINITY;
          }
          let pos = position, offset = 0, bytesRead = 0;
          const end = Math.min(size, pos + Math.min(size - pos, nBytes));
          const buffer = new Uint8Array(Math.max(0, (this.position = end) - pos));
          while ((pos += bytesRead) < end && (offset += bytesRead) < buffer.byteLength) {
            ({ bytesRead } = yield file2.read(buffer, offset, buffer.byteLength - offset, pos));
          }
          return buffer;
        }
        return null;
      });
    }
    readAt(position, nBytes) {
      return __awaiter(this, undefined, undefined, function* () {
        this._pending && (yield this._pending);
        const { _handle: file2, size } = this;
        if (file2 && position + nBytes < size) {
          const end = Math.min(size, position + nBytes);
          const buffer = new Uint8Array(end - position);
          return (yield file2.read(buffer, 0, nBytes, position)).buffer;
        }
        return new Uint8Array(nBytes);
      });
    }
    close() {
      return __awaiter(this, undefined, undefined, function* () {
        const f = this._handle;
        this._handle = null;
        f && (yield f.close());
      });
    }
    throw(value) {
      return __awaiter(this, undefined, undefined, function* () {
        yield this.close();
        return { done: true, value };
      });
    }
    return(value) {
      return __awaiter(this, undefined, undefined, function* () {
        yield this.close();
        return { done: true, value };
      });
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/int.mjs
var exports_int = {};
__export(exports_int, {
  Uint64: () => Uint642,
  Int64: () => Int642,
  Int128: () => Int128,
  BaseInt64: () => BaseInt64
});
function intAsHex(value) {
  if (value < 0) {
    value = 4294967295 + value + 1;
  }
  return `0x${value.toString(16)}`;
}

class BaseInt64 {
  constructor(buffer) {
    this.buffer = buffer;
  }
  high() {
    return this.buffer[1];
  }
  low() {
    return this.buffer[0];
  }
  _times(other) {
    const L = new Uint32Array([
      this.buffer[1] >>> 16,
      this.buffer[1] & 65535,
      this.buffer[0] >>> 16,
      this.buffer[0] & 65535
    ]);
    const R = new Uint32Array([
      other.buffer[1] >>> 16,
      other.buffer[1] & 65535,
      other.buffer[0] >>> 16,
      other.buffer[0] & 65535
    ]);
    let product = L[3] * R[3];
    this.buffer[0] = product & 65535;
    let sum = product >>> 16;
    product = L[2] * R[3];
    sum += product;
    product = L[3] * R[2] >>> 0;
    sum += product;
    this.buffer[0] += sum << 16;
    this.buffer[1] = sum >>> 0 < product ? carryBit16 : 0;
    this.buffer[1] += sum >>> 16;
    this.buffer[1] += L[1] * R[3] + L[2] * R[2] + L[3] * R[1];
    this.buffer[1] += L[0] * R[3] + L[1] * R[2] + L[2] * R[1] + L[3] * R[0] << 16;
    return this;
  }
  _plus(other) {
    const sum = this.buffer[0] + other.buffer[0] >>> 0;
    this.buffer[1] += other.buffer[1];
    if (sum < this.buffer[0] >>> 0) {
      ++this.buffer[1];
    }
    this.buffer[0] = sum;
  }
  lessThan(other) {
    return this.buffer[1] < other.buffer[1] || this.buffer[1] === other.buffer[1] && this.buffer[0] < other.buffer[0];
  }
  equals(other) {
    return this.buffer[1] === other.buffer[1] && this.buffer[0] == other.buffer[0];
  }
  greaterThan(other) {
    return other.lessThan(this);
  }
  hex() {
    return `${intAsHex(this.buffer[1])} ${intAsHex(this.buffer[0])}`;
  }
}

class Int128 {
  constructor(buffer) {
    this.buffer = buffer;
  }
  high() {
    return new Int642(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset + 8, 2));
  }
  low() {
    return new Int642(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset, 2));
  }
  negate() {
    this.buffer[0] = ~this.buffer[0] + 1;
    this.buffer[1] = ~this.buffer[1];
    this.buffer[2] = ~this.buffer[2];
    this.buffer[3] = ~this.buffer[3];
    if (this.buffer[0] == 0) {
      ++this.buffer[1];
    }
    if (this.buffer[1] == 0) {
      ++this.buffer[2];
    }
    if (this.buffer[2] == 0) {
      ++this.buffer[3];
    }
    return this;
  }
  times(other) {
    const L0 = new Uint642(new Uint32Array([this.buffer[3], 0]));
    const L1 = new Uint642(new Uint32Array([this.buffer[2], 0]));
    const L2 = new Uint642(new Uint32Array([this.buffer[1], 0]));
    const L3 = new Uint642(new Uint32Array([this.buffer[0], 0]));
    const R0 = new Uint642(new Uint32Array([other.buffer[3], 0]));
    const R1 = new Uint642(new Uint32Array([other.buffer[2], 0]));
    const R2 = new Uint642(new Uint32Array([other.buffer[1], 0]));
    const R3 = new Uint642(new Uint32Array([other.buffer[0], 0]));
    let product = Uint642.multiply(L3, R3);
    this.buffer[0] = product.low();
    const sum = new Uint642(new Uint32Array([product.high(), 0]));
    product = Uint642.multiply(L2, R3);
    sum.plus(product);
    product = Uint642.multiply(L3, R2);
    sum.plus(product);
    this.buffer[1] = sum.low();
    this.buffer[3] = sum.lessThan(product) ? 1 : 0;
    this.buffer[2] = sum.high();
    const high = new Uint642(new Uint32Array(this.buffer.buffer, this.buffer.byteOffset + 8, 2));
    high.plus(Uint642.multiply(L1, R3)).plus(Uint642.multiply(L2, R2)).plus(Uint642.multiply(L3, R1));
    this.buffer[3] += Uint642.multiply(L0, R3).plus(Uint642.multiply(L1, R2)).plus(Uint642.multiply(L2, R1)).plus(Uint642.multiply(L3, R0)).low();
    return this;
  }
  plus(other) {
    const sums = new Uint32Array(4);
    sums[3] = this.buffer[3] + other.buffer[3] >>> 0;
    sums[2] = this.buffer[2] + other.buffer[2] >>> 0;
    sums[1] = this.buffer[1] + other.buffer[1] >>> 0;
    sums[0] = this.buffer[0] + other.buffer[0] >>> 0;
    if (sums[0] < this.buffer[0] >>> 0) {
      ++sums[1];
    }
    if (sums[1] < this.buffer[1] >>> 0) {
      ++sums[2];
    }
    if (sums[2] < this.buffer[2] >>> 0) {
      ++sums[3];
    }
    this.buffer[3] = sums[3];
    this.buffer[2] = sums[2];
    this.buffer[1] = sums[1];
    this.buffer[0] = sums[0];
    return this;
  }
  hex() {
    return `${intAsHex(this.buffer[3])} ${intAsHex(this.buffer[2])} ${intAsHex(this.buffer[1])} ${intAsHex(this.buffer[0])}`;
  }
  static multiply(left, right) {
    const rtrn = new Int128(new Uint32Array(left.buffer));
    return rtrn.times(right);
  }
  static add(left, right) {
    const rtrn = new Int128(new Uint32Array(left.buffer));
    return rtrn.plus(right);
  }
  static from(val, out_buffer = new Uint32Array(4)) {
    return Int128.fromString(typeof val === "string" ? val : val.toString(), out_buffer);
  }
  static fromNumber(num, out_buffer = new Uint32Array(4)) {
    return Int128.fromString(num.toString(), out_buffer);
  }
  static fromString(str, out_buffer = new Uint32Array(4)) {
    const negate = str.startsWith("-");
    const length = str.length;
    const out = new Int128(out_buffer);
    for (let posn = negate ? 1 : 0;posn < length; ) {
      const group = kInt32DecimalDigits < length - posn ? kInt32DecimalDigits : length - posn;
      const chunk = new Int128(new Uint32Array([Number.parseInt(str.slice(posn, posn + group), 10), 0, 0, 0]));
      const multiple = new Int128(new Uint32Array([kPowersOfTen[group], 0, 0, 0]));
      out.times(multiple);
      out.plus(chunk);
      posn += group;
    }
    return negate ? out.negate() : out;
  }
  static convertArray(values) {
    const data = new Uint32Array(values.length * 4);
    for (let i = -1, n = values.length;++i < n; ) {
      Int128.from(values[i], new Uint32Array(data.buffer, data.byteOffset + 4 * 4 * i, 4));
    }
    return data;
  }
}
var carryBit16, kInt32DecimalDigits = 8, kPowersOfTen, Uint642, Int642;
var init_int2 = __esm(() => {
  carryBit16 = 1 << 16;
  kPowersOfTen = [
    1,
    10,
    100,
    1000,
    1e4,
    1e5,
    1e6,
    1e7,
    1e8
  ];
  Uint642 = class Uint642 extends BaseInt64 {
    times(other) {
      this._times(other);
      return this;
    }
    plus(other) {
      this._plus(other);
      return this;
    }
    static from(val, out_buffer = new Uint32Array(2)) {
      return Uint642.fromString(typeof val === "string" ? val : val.toString(), out_buffer);
    }
    static fromNumber(num, out_buffer = new Uint32Array(2)) {
      return Uint642.fromString(num.toString(), out_buffer);
    }
    static fromString(str, out_buffer = new Uint32Array(2)) {
      const length = str.length;
      const out = new Uint642(out_buffer);
      for (let posn = 0;posn < length; ) {
        const group = kInt32DecimalDigits < length - posn ? kInt32DecimalDigits : length - posn;
        const chunk = new Uint642(new Uint32Array([Number.parseInt(str.slice(posn, posn + group), 10), 0]));
        const multiple = new Uint642(new Uint32Array([kPowersOfTen[group], 0]));
        out.times(multiple);
        out.plus(chunk);
        posn += group;
      }
      return out;
    }
    static convertArray(values) {
      const data = new Uint32Array(values.length * 2);
      for (let i = -1, n = values.length;++i < n; ) {
        Uint642.from(values[i], new Uint32Array(data.buffer, data.byteOffset + 2 * i * 4, 2));
      }
      return data;
    }
    static multiply(left, right) {
      const rtrn = new Uint642(new Uint32Array(left.buffer));
      return rtrn.times(right);
    }
    static add(left, right) {
      const rtrn = new Uint642(new Uint32Array(left.buffer));
      return rtrn.plus(right);
    }
  };
  Int642 = class Int642 extends BaseInt64 {
    negate() {
      this.buffer[0] = ~this.buffer[0] + 1;
      this.buffer[1] = ~this.buffer[1];
      if (this.buffer[0] == 0) {
        ++this.buffer[1];
      }
      return this;
    }
    times(other) {
      this._times(other);
      return this;
    }
    plus(other) {
      this._plus(other);
      return this;
    }
    lessThan(other) {
      const this_high = this.buffer[1] << 0;
      const other_high = other.buffer[1] << 0;
      return this_high < other_high || this_high === other_high && this.buffer[0] < other.buffer[0];
    }
    static from(val, out_buffer = new Uint32Array(2)) {
      return Int642.fromString(typeof val === "string" ? val : val.toString(), out_buffer);
    }
    static fromNumber(num, out_buffer = new Uint32Array(2)) {
      return Int642.fromString(num.toString(), out_buffer);
    }
    static fromString(str, out_buffer = new Uint32Array(2)) {
      const negate = str.startsWith("-");
      const length = str.length;
      const out = new Int642(out_buffer);
      for (let posn = negate ? 1 : 0;posn < length; ) {
        const group = kInt32DecimalDigits < length - posn ? kInt32DecimalDigits : length - posn;
        const chunk = new Int642(new Uint32Array([Number.parseInt(str.slice(posn, posn + group), 10), 0]));
        const multiple = new Int642(new Uint32Array([kPowersOfTen[group], 0]));
        out.times(multiple);
        out.plus(chunk);
        posn += group;
      }
      return negate ? out.negate() : out;
    }
    static convertArray(values) {
      const data = new Uint32Array(values.length * 2);
      for (let i = -1, n = values.length;++i < n; ) {
        Int642.from(values[i], new Uint32Array(data.buffer, data.byteOffset + 2 * i * 4, 2));
      }
      return data;
    }
    static multiply(left, right) {
      const rtrn = new Int642(new Uint32Array(left.buffer));
      return rtrn.times(right);
    }
    static add(left, right) {
      const rtrn = new Int642(new Uint32Array(left.buffer));
      return rtrn.plus(right);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/vectorloader.mjs
function binaryDataFromJSON(values) {
  const joined = values.join("");
  const data = new Uint8Array(joined.length / 2);
  for (let i = 0;i < joined.length; i += 2) {
    data[i >> 1] = Number.parseInt(joined.slice(i, i + 2), 16);
  }
  return data;
}
var VectorLoader, JSONVectorLoader;
var init_vectorloader = __esm(() => {
  init_data();
  init_schema2();
  init_type2();
  init_visitor();
  init_bit();
  init_utf8();
  init_int2();
  init_enum();
  init_buffer();
  VectorLoader = class VectorLoader extends Visitor {
    constructor(bytes, nodes, buffers, dictionaries, metadataVersion = MetadataVersion.V5) {
      super();
      this.nodesIndex = -1;
      this.buffersIndex = -1;
      this.bytes = bytes;
      this.nodes = nodes;
      this.buffers = buffers;
      this.dictionaries = dictionaries;
      this.metadataVersion = metadataVersion;
    }
    visit(node) {
      return super.visit(node instanceof Field2 ? node.type : node);
    }
    visitNull(type, { length } = this.nextFieldNode()) {
      return makeData({ type, length });
    }
    visitBool(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitInt(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitFloat(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitUtf8(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), data: this.readData(type) });
    }
    visitLargeUtf8(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), data: this.readData(type) });
    }
    visitBinary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), data: this.readData(type) });
    }
    visitLargeBinary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), data: this.readData(type) });
    }
    visitFixedSizeBinary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitDate(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitTimestamp(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitTime(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitDecimal(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitList(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), child: this.visit(type.children[0]) });
    }
    visitStruct(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), children: this.visitMany(type.children) });
    }
    visitUnion(type, { length, nullCount } = this.nextFieldNode()) {
      if (this.metadataVersion < MetadataVersion.V5) {
        this.readNullBitmap(type, nullCount);
      }
      return type.mode === UnionMode.Sparse ? this.visitSparseUnion(type, { length, nullCount }) : this.visitDenseUnion(type, { length, nullCount });
    }
    visitDenseUnion(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, typeIds: this.readTypeIds(type), valueOffsets: this.readOffsets(type), children: this.visitMany(type.children) });
    }
    visitSparseUnion(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, typeIds: this.readTypeIds(type), children: this.visitMany(type.children) });
    }
    visitDictionary(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type.indices), dictionary: this.readDictionary(type) });
    }
    visitInterval(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitDuration(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), data: this.readData(type) });
    }
    visitFixedSizeList(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), child: this.visit(type.children[0]) });
    }
    visitMap(type, { length, nullCount } = this.nextFieldNode()) {
      return makeData({ type, length, nullCount, nullBitmap: this.readNullBitmap(type, nullCount), valueOffsets: this.readOffsets(type), child: this.visit(type.children[0]) });
    }
    nextFieldNode() {
      return this.nodes[++this.nodesIndex];
    }
    nextBufferRange() {
      return this.buffers[++this.buffersIndex];
    }
    readNullBitmap(type, nullCount, buffer = this.nextBufferRange()) {
      return nullCount > 0 && this.readData(type, buffer) || new Uint8Array(0);
    }
    readOffsets(type, buffer) {
      return this.readData(type, buffer);
    }
    readTypeIds(type, buffer) {
      return this.readData(type, buffer);
    }
    readData(_type, { length, offset } = this.nextBufferRange()) {
      return this.bytes.subarray(offset, offset + length);
    }
    readDictionary(type) {
      return this.dictionaries.get(type.id);
    }
  };
  JSONVectorLoader = class JSONVectorLoader extends VectorLoader {
    constructor(sources, nodes, buffers, dictionaries, metadataVersion) {
      super(new Uint8Array(0), nodes, buffers, dictionaries, metadataVersion);
      this.sources = sources;
    }
    readNullBitmap(_type, nullCount, { offset } = this.nextBufferRange()) {
      return nullCount <= 0 ? new Uint8Array(0) : packBools(this.sources[offset]);
    }
    readOffsets(_type, { offset } = this.nextBufferRange()) {
      return toArrayBufferView(Uint8Array, toArrayBufferView(_type.OffsetArrayType, this.sources[offset]));
    }
    readTypeIds(type, { offset } = this.nextBufferRange()) {
      return toArrayBufferView(Uint8Array, toArrayBufferView(type.ArrayType, this.sources[offset]));
    }
    readData(type, { offset } = this.nextBufferRange()) {
      const { sources } = this;
      if (DataType.isTimestamp(type)) {
        return toArrayBufferView(Uint8Array, Int642.convertArray(sources[offset]));
      } else if ((DataType.isInt(type) || DataType.isTime(type)) && type.bitWidth === 64 || DataType.isDuration(type)) {
        return toArrayBufferView(Uint8Array, Int642.convertArray(sources[offset]));
      } else if (DataType.isDate(type) && type.unit === DateUnit.MILLISECOND) {
        return toArrayBufferView(Uint8Array, Int642.convertArray(sources[offset]));
      } else if (DataType.isDecimal(type)) {
        return toArrayBufferView(Uint8Array, Int128.convertArray(sources[offset]));
      } else if (DataType.isBinary(type) || DataType.isLargeBinary(type) || DataType.isFixedSizeBinary(type)) {
        return binaryDataFromJSON(sources[offset]);
      } else if (DataType.isBool(type)) {
        return packBools(sources[offset]);
      } else if (DataType.isUtf8(type) || DataType.isLargeUtf8(type)) {
        return encodeUtf8(sources[offset].join(""));
      }
      return toArrayBufferView(Uint8Array, toArrayBufferView(type.ArrayType, sources[offset].map((x) => +x)));
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/binary.mjs
var BinaryBuilder;
var init_binary2 = __esm(() => {
  init_buffer2();
  init_builder2();
  init_buffer();
  BinaryBuilder = class BinaryBuilder extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._values = new BufferBuilder(Uint8Array);
    }
    get byteLength() {
      let size = this._pendingLength + this.length * 4;
      this._offsets && (size += this._offsets.byteLength);
      this._values && (size += this._values.byteLength);
      this._nulls && (size += this._nulls.byteLength);
      return size;
    }
    setValue(index, value) {
      return super.setValue(index, toUint8Array(value));
    }
    _flushPending(pending, pendingLength) {
      const offsets = this._offsets;
      const data = this._values.reserve(pendingLength).buffer;
      let offset = 0;
      for (const [index, value] of pending) {
        if (value === undefined) {
          offsets.set(index, 0);
        } else {
          const length = value.length;
          data.set(value, offset);
          offsets.set(index, length);
          offset += length;
        }
      }
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/largebinary.mjs
var LargeBinaryBuilder;
var init_largebinary = __esm(() => {
  init_buffer();
  init_buffer2();
  init_builder2();
  LargeBinaryBuilder = class LargeBinaryBuilder extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._values = new BufferBuilder(Uint8Array);
    }
    get byteLength() {
      let size = this._pendingLength + this.length * 4;
      this._offsets && (size += this._offsets.byteLength);
      this._values && (size += this._values.byteLength);
      this._nulls && (size += this._nulls.byteLength);
      return size;
    }
    setValue(index, value) {
      return super.setValue(index, toUint8Array(value));
    }
    _flushPending(pending, pendingLength) {
      const offsets = this._offsets;
      const data = this._values.reserve(pendingLength).buffer;
      let offset = 0;
      for (const [index, value] of pending) {
        if (value === undefined) {
          offsets.set(index, BigInt(0));
        } else {
          const length = value.length;
          data.set(value, offset);
          offsets.set(index, BigInt(length));
          offset += length;
        }
      }
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/bool.mjs
var BoolBuilder;
var init_bool2 = __esm(() => {
  init_buffer2();
  init_builder2();
  BoolBuilder = class BoolBuilder extends Builder2 {
    constructor(options) {
      super(options);
      this._values = new BitmapBufferBuilder;
    }
    setValue(index, value) {
      this._values.set(index, +value);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/date.mjs
var DateBuilder, DateDayBuilder, DateMillisecondBuilder;
var init_date2 = __esm(() => {
  init_builder2();
  init_set();
  DateBuilder = class DateBuilder extends FixedWidthBuilder {
  };
  DateBuilder.prototype._setValue = setDate;
  DateDayBuilder = class DateDayBuilder extends DateBuilder {
  };
  DateDayBuilder.prototype._setValue = setDateDay;
  DateMillisecondBuilder = class DateMillisecondBuilder extends DateBuilder {
  };
  DateMillisecondBuilder.prototype._setValue = setDateMillisecond;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/decimal.mjs
var DecimalBuilder;
var init_decimal2 = __esm(() => {
  init_builder2();
  init_set();
  DecimalBuilder = class DecimalBuilder extends FixedWidthBuilder {
  };
  DecimalBuilder.prototype._setValue = setDecimal;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/dictionary.mjs
var DictionaryBuilder;
var init_dictionary = __esm(() => {
  init_type2();
  init_builder2();
  init_factories();
  DictionaryBuilder = class DictionaryBuilder extends Builder2 {
    constructor({ type, nullValues: nulls, dictionaryHashFunction: hashFn }) {
      super({ type: new Dictionary(type.dictionary, type.indices, type.id, type.isOrdered) });
      this._nulls = null;
      this._dictionaryOffset = 0;
      this._keysToIndices = Object.create(null);
      this.indices = makeBuilder({ type: this.type.indices, nullValues: nulls });
      this.dictionary = makeBuilder({ type: this.type.dictionary, nullValues: null });
      if (typeof hashFn === "function") {
        this.valueToKey = hashFn;
      }
    }
    get values() {
      return this.indices.values;
    }
    get nullCount() {
      return this.indices.nullCount;
    }
    get nullBitmap() {
      return this.indices.nullBitmap;
    }
    get byteLength() {
      return this.indices.byteLength + this.dictionary.byteLength;
    }
    get reservedLength() {
      return this.indices.reservedLength + this.dictionary.reservedLength;
    }
    get reservedByteLength() {
      return this.indices.reservedByteLength + this.dictionary.reservedByteLength;
    }
    isValid(value) {
      return this.indices.isValid(value);
    }
    setValid(index, valid) {
      const indices = this.indices;
      valid = indices.setValid(index, valid);
      this.length = indices.length;
      return valid;
    }
    setValue(index, value) {
      const keysToIndices = this._keysToIndices;
      const key = this.valueToKey(value);
      let idx = keysToIndices[key];
      if (idx === undefined) {
        keysToIndices[key] = idx = this._dictionaryOffset + this.dictionary.append(value).length - 1;
      }
      return this.indices.setValue(index, idx);
    }
    flush() {
      const type = this.type;
      const prev = this._dictionary;
      const curr = this.dictionary.toVector();
      const data = this.indices.flush().clone(type);
      data.dictionary = prev ? prev.concat(curr) : curr;
      this.finished || (this._dictionaryOffset += curr.length);
      this._dictionary = data.dictionary;
      this.clear();
      return data;
    }
    finish() {
      this.indices.finish();
      this.dictionary.finish();
      this._dictionaryOffset = 0;
      this._keysToIndices = Object.create(null);
      return super.finish();
    }
    clear() {
      this.indices.clear();
      this.dictionary.clear();
      return super.clear();
    }
    valueToKey(val) {
      return typeof val === "string" ? val : `${val}`;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/fixedsizebinary.mjs
var FixedSizeBinaryBuilder;
var init_fixedsizebinary = __esm(() => {
  init_builder2();
  init_set();
  FixedSizeBinaryBuilder = class FixedSizeBinaryBuilder extends FixedWidthBuilder {
  };
  FixedSizeBinaryBuilder.prototype._setValue = setFixedSizeBinary;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/fixedsizelist.mjs
var FixedSizeListBuilder;
var init_fixedsizelist = __esm(() => {
  init_schema2();
  init_builder2();
  init_type2();
  FixedSizeListBuilder = class FixedSizeListBuilder extends Builder2 {
    setValue(index, value) {
      const [child] = this.children;
      const start = index * this.stride;
      for (let i = -1, n = value.length;++i < n; ) {
        child.set(start + i, value[i]);
      }
    }
    addChild(child, name = "0") {
      if (this.numChildren > 0) {
        throw new Error("FixedSizeListBuilder can only have one child.");
      }
      const childIndex = this.children.push(child);
      this.type = new FixedSizeList2(this.type.listSize, new Field2(name, child.type, true));
      return childIndex;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/float.mjs
var FloatBuilder, Float16Builder, Float32Builder, Float64Builder;
var init_float = __esm(() => {
  init_math();
  init_builder2();
  FloatBuilder = class FloatBuilder extends FixedWidthBuilder {
    setValue(index, value) {
      this._values.set(index, value);
    }
  };
  Float16Builder = class Float16Builder extends FloatBuilder {
    setValue(index, value) {
      super.setValue(index, float64ToUint16(value));
    }
  };
  Float32Builder = class Float32Builder extends FloatBuilder {
  };
  Float64Builder = class Float64Builder extends FloatBuilder {
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/interval.mjs
var IntervalBuilder, IntervalDayTimeBuilder, IntervalYearMonthBuilder;
var init_interval2 = __esm(() => {
  init_builder2();
  init_set();
  IntervalBuilder = class IntervalBuilder extends FixedWidthBuilder {
  };
  IntervalBuilder.prototype._setValue = setIntervalValue;
  IntervalDayTimeBuilder = class IntervalDayTimeBuilder extends IntervalBuilder {
  };
  IntervalDayTimeBuilder.prototype._setValue = setIntervalDayTime;
  IntervalYearMonthBuilder = class IntervalYearMonthBuilder extends IntervalBuilder {
  };
  IntervalYearMonthBuilder.prototype._setValue = setIntervalYearMonth;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/duration.mjs
var DurationBuilder, DurationSecondBuilder, DurationMillisecondBuilder, DurationMicrosecondBuilder, DurationNanosecondBuilder;
var init_duration2 = __esm(() => {
  init_builder2();
  init_set();
  DurationBuilder = class DurationBuilder extends FixedWidthBuilder {
  };
  DurationBuilder.prototype._setValue = setDuration;
  DurationSecondBuilder = class DurationSecondBuilder extends DurationBuilder {
  };
  DurationSecondBuilder.prototype._setValue = setDurationSecond;
  DurationMillisecondBuilder = class DurationMillisecondBuilder extends DurationBuilder {
  };
  DurationMillisecondBuilder.prototype._setValue = setDurationMillisecond;
  DurationMicrosecondBuilder = class DurationMicrosecondBuilder extends DurationBuilder {
  };
  DurationMicrosecondBuilder.prototype._setValue = setDurationMicrosecond;
  DurationNanosecondBuilder = class DurationNanosecondBuilder extends DurationBuilder {
  };
  DurationNanosecondBuilder.prototype._setValue = setDurationNanosecond;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/int.mjs
var IntBuilder, Int8Builder, Int16Builder, Int32Builder, Int64Builder, Uint8Builder, Uint16Builder, Uint32Builder, Uint64Builder;
var init_int3 = __esm(() => {
  init_builder2();
  IntBuilder = class IntBuilder extends FixedWidthBuilder {
    setValue(index, value) {
      this._values.set(index, value);
    }
  };
  Int8Builder = class Int8Builder extends IntBuilder {
  };
  Int16Builder = class Int16Builder extends IntBuilder {
  };
  Int32Builder = class Int32Builder extends IntBuilder {
  };
  Int64Builder = class Int64Builder extends IntBuilder {
  };
  Uint8Builder = class Uint8Builder extends IntBuilder {
  };
  Uint16Builder = class Uint16Builder extends IntBuilder {
  };
  Uint32Builder = class Uint32Builder extends IntBuilder {
  };
  Uint64Builder = class Uint64Builder extends IntBuilder {
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/list.mjs
var ListBuilder;
var init_list2 = __esm(() => {
  init_schema2();
  init_type2();
  init_buffer2();
  init_builder2();
  ListBuilder = class ListBuilder extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._offsets = new OffsetsBufferBuilder(opts.type);
    }
    addChild(child, name = "0") {
      if (this.numChildren > 0) {
        throw new Error("ListBuilder can only have one child.");
      }
      this.children[this.numChildren] = child;
      this.type = new List2(new Field2(name, child.type, true));
      return this.numChildren - 1;
    }
    _flushPending(pending) {
      const offsets = this._offsets;
      const [child] = this.children;
      for (const [index, value] of pending) {
        if (typeof value === "undefined") {
          offsets.set(index, 0);
        } else {
          const v = value;
          const n = v.length;
          const start = offsets.set(index, n).buffer[index];
          for (let i = -1;++i < n; ) {
            child.set(start + i, v[i]);
          }
        }
      }
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/map.mjs
var MapBuilder;
var init_map3 = __esm(() => {
  init_schema2();
  init_type2();
  init_builder2();
  MapBuilder = class MapBuilder extends VariableWidthBuilder {
    set(index, value) {
      return super.set(index, value);
    }
    setValue(index, value) {
      const row = value instanceof Map ? value : new Map(Object.entries(value));
      const pending = this._pending || (this._pending = new Map);
      const current = pending.get(index);
      current && (this._pendingLength -= current.size);
      this._pendingLength += row.size;
      pending.set(index, row);
    }
    addChild(child, name = `${this.numChildren}`) {
      if (this.numChildren > 0) {
        throw new Error("ListBuilder can only have one child.");
      }
      this.children[this.numChildren] = child;
      this.type = new Map_(new Field2(name, child.type, true), this.type.keysSorted);
      return this.numChildren - 1;
    }
    _flushPending(pending) {
      const offsets = this._offsets;
      const [child] = this.children;
      for (const [index, value] of pending) {
        if (value === undefined) {
          offsets.set(index, 0);
        } else {
          let { [index]: idx, [index + 1]: end } = offsets.set(index, value.size).buffer;
          for (const val of value.entries()) {
            child.set(idx, val);
            if (++idx >= end)
              break;
          }
        }
      }
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/null.mjs
var NullBuilder;
var init_null2 = __esm(() => {
  init_builder2();
  NullBuilder = class NullBuilder extends Builder2 {
    setValue(index, value) {}
    setValid(index, valid) {
      this.length = Math.max(index + 1, this.length);
      return valid;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/struct.mjs
var StructBuilder;
var init_struct2 = __esm(() => {
  init_schema2();
  init_builder2();
  init_type2();
  StructBuilder = class StructBuilder extends Builder2 {
    setValue(index, value) {
      const { children, type } = this;
      switch (Array.isArray(value) || value.constructor) {
        case true:
          return type.children.forEach((_, i) => children[i].set(index, value[i]));
        case Map:
          return type.children.forEach((f, i) => children[i].set(index, value.get(f.name)));
        default:
          return type.children.forEach((f, i) => children[i].set(index, value[f.name]));
      }
    }
    setValid(index, valid) {
      if (!super.setValid(index, valid)) {
        this.children.forEach((child) => child.setValid(index, valid));
      }
      return valid;
    }
    addChild(child, name = `${this.numChildren}`) {
      const childIndex = this.children.push(child);
      this.type = new Struct([...this.type.children, new Field2(name, child.type, true)]);
      return childIndex;
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/timestamp.mjs
var TimestampBuilder, TimestampSecondBuilder, TimestampMillisecondBuilder, TimestampMicrosecondBuilder, TimestampNanosecondBuilder;
var init_timestamp2 = __esm(() => {
  init_builder2();
  init_set();
  TimestampBuilder = class TimestampBuilder extends FixedWidthBuilder {
  };
  TimestampBuilder.prototype._setValue = setTimestamp;
  TimestampSecondBuilder = class TimestampSecondBuilder extends TimestampBuilder {
  };
  TimestampSecondBuilder.prototype._setValue = setTimestampSecond;
  TimestampMillisecondBuilder = class TimestampMillisecondBuilder extends TimestampBuilder {
  };
  TimestampMillisecondBuilder.prototype._setValue = setTimestampMillisecond;
  TimestampMicrosecondBuilder = class TimestampMicrosecondBuilder extends TimestampBuilder {
  };
  TimestampMicrosecondBuilder.prototype._setValue = setTimestampMicrosecond;
  TimestampNanosecondBuilder = class TimestampNanosecondBuilder extends TimestampBuilder {
  };
  TimestampNanosecondBuilder.prototype._setValue = setTimestampNanosecond;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/time.mjs
var TimeBuilder, TimeSecondBuilder, TimeMillisecondBuilder, TimeMicrosecondBuilder, TimeNanosecondBuilder;
var init_time2 = __esm(() => {
  init_builder2();
  init_set();
  TimeBuilder = class TimeBuilder extends FixedWidthBuilder {
  };
  TimeBuilder.prototype._setValue = setTime;
  TimeSecondBuilder = class TimeSecondBuilder extends TimeBuilder {
  };
  TimeSecondBuilder.prototype._setValue = setTimeSecond;
  TimeMillisecondBuilder = class TimeMillisecondBuilder extends TimeBuilder {
  };
  TimeMillisecondBuilder.prototype._setValue = setTimeMillisecond;
  TimeMicrosecondBuilder = class TimeMicrosecondBuilder extends TimeBuilder {
  };
  TimeMicrosecondBuilder.prototype._setValue = setTimeMicrosecond;
  TimeNanosecondBuilder = class TimeNanosecondBuilder extends TimeBuilder {
  };
  TimeNanosecondBuilder.prototype._setValue = setTimeNanosecond;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/union.mjs
var UnionBuilder, SparseUnionBuilder, DenseUnionBuilder;
var init_union2 = __esm(() => {
  init_schema2();
  init_buffer2();
  init_builder2();
  init_type2();
  UnionBuilder = class UnionBuilder extends Builder2 {
    constructor(options) {
      super(options);
      this._typeIds = new DataBufferBuilder(Int8Array, 0, 1);
      if (typeof options["valueToChildTypeId"] === "function") {
        this._valueToChildTypeId = options["valueToChildTypeId"];
      }
    }
    get typeIdToChildIndex() {
      return this.type.typeIdToChildIndex;
    }
    append(value, childTypeId) {
      return this.set(this.length, value, childTypeId);
    }
    set(index, value, childTypeId) {
      if (childTypeId === undefined) {
        childTypeId = this._valueToChildTypeId(this, value, index);
      }
      this.setValue(index, value, childTypeId);
      return this;
    }
    setValue(index, value, childTypeId) {
      this._typeIds.set(index, childTypeId);
      const childIndex = this.type.typeIdToChildIndex[childTypeId];
      const child = this.children[childIndex];
      child === null || child === undefined || child.set(index, value);
    }
    addChild(child, name = `${this.children.length}`) {
      const childTypeId = this.children.push(child);
      const { type: { children, mode, typeIds } } = this;
      const fields = [...children, new Field2(name, child.type)];
      this.type = new Union_(mode, [...typeIds, childTypeId], fields);
      return childTypeId;
    }
    _valueToChildTypeId(builder, value, offset) {
      throw new Error(`Cannot map UnionBuilder value to child typeId. Pass the \`childTypeId\` as the second argument to unionBuilder.append(), or supply a \`valueToChildTypeId\` function as part of the UnionBuilder constructor options.`);
    }
  };
  SparseUnionBuilder = class SparseUnionBuilder extends UnionBuilder {
  };
  DenseUnionBuilder = class DenseUnionBuilder extends UnionBuilder {
    constructor(options) {
      super(options);
      this._offsets = new DataBufferBuilder(Int32Array);
    }
    setValue(index, value, childTypeId) {
      const id = this._typeIds.set(index, childTypeId).buffer[index];
      const child = this.getChildAt(this.type.typeIdToChildIndex[id]);
      const denseIndex = this._offsets.set(index, child.length).buffer[index];
      child === null || child === undefined || child.set(denseIndex, value);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/utf8.mjs
var Utf8Builder;
var init_utf83 = __esm(() => {
  init_utf8();
  init_binary2();
  init_buffer2();
  init_builder2();
  Utf8Builder = class Utf8Builder extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._values = new BufferBuilder(Uint8Array);
    }
    get byteLength() {
      let size = this._pendingLength + this.length * 4;
      this._offsets && (size += this._offsets.byteLength);
      this._values && (size += this._values.byteLength);
      this._nulls && (size += this._nulls.byteLength);
      return size;
    }
    setValue(index, value) {
      return super.setValue(index, encodeUtf8(value));
    }
    _flushPending(pending, pendingLength) {}
  };
  Utf8Builder.prototype._flushPending = BinaryBuilder.prototype._flushPending;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/builder/largeutf8.mjs
var LargeUtf8Builder;
var init_largeutf8 = __esm(() => {
  init_utf8();
  init_buffer2();
  init_builder2();
  init_largebinary();
  LargeUtf8Builder = class LargeUtf8Builder extends VariableWidthBuilder {
    constructor(opts) {
      super(opts);
      this._values = new BufferBuilder(Uint8Array);
    }
    get byteLength() {
      let size = this._pendingLength + this.length * 4;
      this._offsets && (size += this._offsets.byteLength);
      this._values && (size += this._values.byteLength);
      this._nulls && (size += this._nulls.byteLength);
      return size;
    }
    setValue(index, value) {
      return super.setValue(index, encodeUtf8(value));
    }
    _flushPending(pending, pendingLength) {}
  };
  LargeUtf8Builder.prototype._flushPending = LargeBinaryBuilder.prototype._flushPending;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/builderctor.mjs
var GetBuilderCtor, instance5;
var init_builderctor = __esm(() => {
  init_visitor();
  init_binary2();
  init_largebinary();
  init_bool2();
  init_date2();
  init_decimal2();
  init_dictionary();
  init_fixedsizebinary();
  init_fixedsizelist();
  init_float();
  init_interval2();
  init_duration2();
  init_int3();
  init_list2();
  init_map3();
  init_null2();
  init_struct2();
  init_timestamp2();
  init_time2();
  init_union2();
  init_utf83();
  init_largeutf8();
  GetBuilderCtor = class GetBuilderCtor extends Visitor {
    visitNull() {
      return NullBuilder;
    }
    visitBool() {
      return BoolBuilder;
    }
    visitInt() {
      return IntBuilder;
    }
    visitInt8() {
      return Int8Builder;
    }
    visitInt16() {
      return Int16Builder;
    }
    visitInt32() {
      return Int32Builder;
    }
    visitInt64() {
      return Int64Builder;
    }
    visitUint8() {
      return Uint8Builder;
    }
    visitUint16() {
      return Uint16Builder;
    }
    visitUint32() {
      return Uint32Builder;
    }
    visitUint64() {
      return Uint64Builder;
    }
    visitFloat() {
      return FloatBuilder;
    }
    visitFloat16() {
      return Float16Builder;
    }
    visitFloat32() {
      return Float32Builder;
    }
    visitFloat64() {
      return Float64Builder;
    }
    visitUtf8() {
      return Utf8Builder;
    }
    visitLargeUtf8() {
      return LargeUtf8Builder;
    }
    visitBinary() {
      return BinaryBuilder;
    }
    visitLargeBinary() {
      return LargeBinaryBuilder;
    }
    visitFixedSizeBinary() {
      return FixedSizeBinaryBuilder;
    }
    visitDate() {
      return DateBuilder;
    }
    visitDateDay() {
      return DateDayBuilder;
    }
    visitDateMillisecond() {
      return DateMillisecondBuilder;
    }
    visitTimestamp() {
      return TimestampBuilder;
    }
    visitTimestampSecond() {
      return TimestampSecondBuilder;
    }
    visitTimestampMillisecond() {
      return TimestampMillisecondBuilder;
    }
    visitTimestampMicrosecond() {
      return TimestampMicrosecondBuilder;
    }
    visitTimestampNanosecond() {
      return TimestampNanosecondBuilder;
    }
    visitTime() {
      return TimeBuilder;
    }
    visitTimeSecond() {
      return TimeSecondBuilder;
    }
    visitTimeMillisecond() {
      return TimeMillisecondBuilder;
    }
    visitTimeMicrosecond() {
      return TimeMicrosecondBuilder;
    }
    visitTimeNanosecond() {
      return TimeNanosecondBuilder;
    }
    visitDecimal() {
      return DecimalBuilder;
    }
    visitList() {
      return ListBuilder;
    }
    visitStruct() {
      return StructBuilder;
    }
    visitUnion() {
      return UnionBuilder;
    }
    visitDenseUnion() {
      return DenseUnionBuilder;
    }
    visitSparseUnion() {
      return SparseUnionBuilder;
    }
    visitDictionary() {
      return DictionaryBuilder;
    }
    visitInterval() {
      return IntervalBuilder;
    }
    visitIntervalDayTime() {
      return IntervalDayTimeBuilder;
    }
    visitIntervalYearMonth() {
      return IntervalYearMonthBuilder;
    }
    visitDuration() {
      return DurationBuilder;
    }
    visitDurationSecond() {
      return DurationSecondBuilder;
    }
    visitDurationMillisecond() {
      return DurationMillisecondBuilder;
    }
    visitDurationMicrosecond() {
      return DurationMicrosecondBuilder;
    }
    visitDurationNanosecond() {
      return DurationNanosecondBuilder;
    }
    visitFixedSizeList() {
      return FixedSizeListBuilder;
    }
    visitMap() {
      return MapBuilder;
    }
  };
  instance5 = new GetBuilderCtor;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/typecomparator.mjs
function compareConstructor(type, other) {
  return other instanceof type.constructor;
}
function compareAny(type, other) {
  return type === other || compareConstructor(type, other);
}
function compareInt(type, other) {
  return type === other || compareConstructor(type, other) && type.bitWidth === other.bitWidth && type.isSigned === other.isSigned;
}
function compareFloat(type, other) {
  return type === other || compareConstructor(type, other) && type.precision === other.precision;
}
function compareFixedSizeBinary(type, other) {
  return type === other || compareConstructor(type, other) && type.byteWidth === other.byteWidth;
}
function compareDate(type, other) {
  return type === other || compareConstructor(type, other) && type.unit === other.unit;
}
function compareTimestamp(type, other) {
  return type === other || compareConstructor(type, other) && type.unit === other.unit && type.timezone === other.timezone;
}
function compareTime(type, other) {
  return type === other || compareConstructor(type, other) && type.unit === other.unit && type.bitWidth === other.bitWidth;
}
function compareList(type, other) {
  return type === other || compareConstructor(type, other) && type.children.length === other.children.length && instance6.compareManyFields(type.children, other.children);
}
function compareStruct(type, other) {
  return type === other || compareConstructor(type, other) && type.children.length === other.children.length && instance6.compareManyFields(type.children, other.children);
}
function compareUnion(type, other) {
  return type === other || compareConstructor(type, other) && type.mode === other.mode && type.typeIds.every((x, i) => x === other.typeIds[i]) && instance6.compareManyFields(type.children, other.children);
}
function compareDictionary(type, other) {
  return type === other || compareConstructor(type, other) && type.id === other.id && type.isOrdered === other.isOrdered && instance6.visit(type.indices, other.indices) && instance6.visit(type.dictionary, other.dictionary);
}
function compareInterval(type, other) {
  return type === other || compareConstructor(type, other) && type.unit === other.unit;
}
function compareDuration(type, other) {
  return type === other || compareConstructor(type, other) && type.unit === other.unit;
}
function compareFixedSizeList(type, other) {
  return type === other || compareConstructor(type, other) && type.listSize === other.listSize && type.children.length === other.children.length && instance6.compareManyFields(type.children, other.children);
}
function compareMap(type, other) {
  return type === other || compareConstructor(type, other) && type.keysSorted === other.keysSorted && type.children.length === other.children.length && instance6.compareManyFields(type.children, other.children);
}
function compareSchemas(schema, other) {
  return instance6.compareSchemas(schema, other);
}
function compareFields(field, other) {
  return instance6.compareFields(field, other);
}
function compareTypes(type, other) {
  return instance6.visit(type, other);
}
var TypeComparator, instance6;
var init_typecomparator = __esm(() => {
  init_visitor();
  TypeComparator = class TypeComparator extends Visitor {
    compareSchemas(schema, other) {
      return schema === other || other instanceof schema.constructor && this.compareManyFields(schema.fields, other.fields);
    }
    compareManyFields(fields, others) {
      return fields === others || Array.isArray(fields) && Array.isArray(others) && fields.length === others.length && fields.every((f, i) => this.compareFields(f, others[i]));
    }
    compareFields(field, other) {
      return field === other || other instanceof field.constructor && field.name === other.name && field.nullable === other.nullable && this.visit(field.type, other.type);
    }
  };
  TypeComparator.prototype.visitNull = compareAny;
  TypeComparator.prototype.visitBool = compareAny;
  TypeComparator.prototype.visitInt = compareInt;
  TypeComparator.prototype.visitInt8 = compareInt;
  TypeComparator.prototype.visitInt16 = compareInt;
  TypeComparator.prototype.visitInt32 = compareInt;
  TypeComparator.prototype.visitInt64 = compareInt;
  TypeComparator.prototype.visitUint8 = compareInt;
  TypeComparator.prototype.visitUint16 = compareInt;
  TypeComparator.prototype.visitUint32 = compareInt;
  TypeComparator.prototype.visitUint64 = compareInt;
  TypeComparator.prototype.visitFloat = compareFloat;
  TypeComparator.prototype.visitFloat16 = compareFloat;
  TypeComparator.prototype.visitFloat32 = compareFloat;
  TypeComparator.prototype.visitFloat64 = compareFloat;
  TypeComparator.prototype.visitUtf8 = compareAny;
  TypeComparator.prototype.visitLargeUtf8 = compareAny;
  TypeComparator.prototype.visitBinary = compareAny;
  TypeComparator.prototype.visitLargeBinary = compareAny;
  TypeComparator.prototype.visitFixedSizeBinary = compareFixedSizeBinary;
  TypeComparator.prototype.visitDate = compareDate;
  TypeComparator.prototype.visitDateDay = compareDate;
  TypeComparator.prototype.visitDateMillisecond = compareDate;
  TypeComparator.prototype.visitTimestamp = compareTimestamp;
  TypeComparator.prototype.visitTimestampSecond = compareTimestamp;
  TypeComparator.prototype.visitTimestampMillisecond = compareTimestamp;
  TypeComparator.prototype.visitTimestampMicrosecond = compareTimestamp;
  TypeComparator.prototype.visitTimestampNanosecond = compareTimestamp;
  TypeComparator.prototype.visitTime = compareTime;
  TypeComparator.prototype.visitTimeSecond = compareTime;
  TypeComparator.prototype.visitTimeMillisecond = compareTime;
  TypeComparator.prototype.visitTimeMicrosecond = compareTime;
  TypeComparator.prototype.visitTimeNanosecond = compareTime;
  TypeComparator.prototype.visitDecimal = compareAny;
  TypeComparator.prototype.visitList = compareList;
  TypeComparator.prototype.visitStruct = compareStruct;
  TypeComparator.prototype.visitUnion = compareUnion;
  TypeComparator.prototype.visitDenseUnion = compareUnion;
  TypeComparator.prototype.visitSparseUnion = compareUnion;
  TypeComparator.prototype.visitDictionary = compareDictionary;
  TypeComparator.prototype.visitInterval = compareInterval;
  TypeComparator.prototype.visitIntervalDayTime = compareInterval;
  TypeComparator.prototype.visitIntervalYearMonth = compareInterval;
  TypeComparator.prototype.visitDuration = compareDuration;
  TypeComparator.prototype.visitDurationSecond = compareDuration;
  TypeComparator.prototype.visitDurationMillisecond = compareDuration;
  TypeComparator.prototype.visitDurationMicrosecond = compareDuration;
  TypeComparator.prototype.visitDurationNanosecond = compareDuration;
  TypeComparator.prototype.visitFixedSizeList = compareFixedSizeList;
  TypeComparator.prototype.visitMap = compareMap;
  instance6 = new TypeComparator;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/factories.mjs
function makeBuilder(options) {
  const type = options.type;
  const builder = new (instance5.getVisitFn(type)())(options);
  if (type.children && type.children.length > 0) {
    const children = options["children"] || [];
    const defaultOptions = { nullValues: options["nullValues"] };
    const getChildOptions = Array.isArray(children) ? (_, i) => children[i] || defaultOptions : ({ name }) => children[name] || defaultOptions;
    for (const [index, field] of type.children.entries()) {
      const { type: type2 } = field;
      const opts = getChildOptions(field, index);
      builder.children.push(makeBuilder(Object.assign(Object.assign({}, opts), { type: type2 })));
    }
  }
  return builder;
}
function vectorFromArray(init, type) {
  if (init instanceof Data || init instanceof Vector || init.type instanceof DataType || ArrayBuffer.isView(init)) {
    return makeVector(init);
  }
  const options = { type: type !== null && type !== undefined ? type : inferType(init), nullValues: [null] };
  const chunks = [...builderThroughIterable(options)(init)];
  const vector = chunks.length === 1 ? chunks[0] : chunks.reduce((a, b) => a.concat(b));
  if (DataType.isDictionary(vector.type)) {
    return vector.memoize();
  }
  return vector;
}
function inferType(value) {
  if (value.length === 0) {
    return new Null2;
  }
  let nullsCount = 0;
  let arraysCount = 0;
  let objectsCount = 0;
  let numbersCount = 0;
  let stringsCount = 0;
  let bigintsCount = 0;
  let booleansCount = 0;
  let datesCount = 0;
  for (const val of value) {
    if (val == null) {
      ++nullsCount;
      continue;
    }
    switch (typeof val) {
      case "bigint":
        ++bigintsCount;
        continue;
      case "boolean":
        ++booleansCount;
        continue;
      case "number":
        ++numbersCount;
        continue;
      case "string":
        ++stringsCount;
        continue;
      case "object":
        if (Array.isArray(val)) {
          ++arraysCount;
        } else if (Object.prototype.toString.call(val) === "[object Date]") {
          ++datesCount;
        } else {
          ++objectsCount;
        }
        continue;
    }
    throw new TypeError("Unable to infer Vector type from input values, explicit type declaration expected.");
  }
  if (numbersCount + nullsCount === value.length) {
    return new Float64;
  } else if (stringsCount + nullsCount === value.length) {
    return new Dictionary(new Utf82, new Int32);
  } else if (bigintsCount + nullsCount === value.length) {
    return new Int64;
  } else if (booleansCount + nullsCount === value.length) {
    return new Bool2;
  } else if (datesCount + nullsCount === value.length) {
    return new TimestampMillisecond;
  } else if (arraysCount + nullsCount === value.length) {
    const array2 = value;
    const childType = inferType(array2[array2.findIndex((ary) => ary != null)]);
    if (array2.every((ary) => ary == null || compareTypes(childType, inferType(ary)))) {
      return new List2(new Field2("", childType, true));
    }
  } else if (objectsCount + nullsCount === value.length) {
    const fields = new Map;
    for (const row of value) {
      for (const key of Object.keys(row)) {
        if (!fields.has(key) && row[key] != null) {
          fields.set(key, new Field2(key, inferType([row[key]]), true));
        }
      }
    }
    return new Struct([...fields.values()]);
  }
  throw new TypeError("Unable to infer Vector type from input values, explicit type declaration expected.");
}
function builderThroughIterable(options) {
  const { ["queueingStrategy"]: queueingStrategy = "count" } = options;
  const { ["highWaterMark"]: highWaterMark = queueingStrategy !== "bytes" ? Number.POSITIVE_INFINITY : Math.pow(2, 14) } = options;
  const sizeProperty = queueingStrategy !== "bytes" ? "length" : "byteLength";
  return function* (source) {
    let numChunks = 0;
    const builder = makeBuilder(options);
    for (const value of source) {
      if (builder.append(value)[sizeProperty] >= highWaterMark) {
        ++numChunks && (yield builder.toVector());
      }
    }
    if (builder.finish().length > 0 || numChunks === 0) {
      yield builder.toVector();
    }
  };
}
var init_factories = __esm(() => {
  init_schema2();
  init_type2();
  init_data();
  init_vector2();
  init_builderctor();
  init_typecomparator();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/util/recordbatch.mjs
function distributeVectorsIntoRecordBatches(schema, vecs) {
  return uniformlyDistributeChunksAcrossRecordBatches(schema, vecs.map((v) => v.data.concat()));
}
function uniformlyDistributeChunksAcrossRecordBatches(schema, cols) {
  const fields = [...schema.fields];
  const batches = [];
  const memo = { numBatches: cols.reduce((n, c) => Math.max(n, c.length), 0) };
  let numBatches = 0, batchLength = 0;
  let i = -1;
  const numColumns = cols.length;
  let child, children = [];
  while (memo.numBatches-- > 0) {
    for (batchLength = Number.POSITIVE_INFINITY, i = -1;++i < numColumns; ) {
      children[i] = child = cols[i].shift();
      batchLength = Math.min(batchLength, child ? child.length : batchLength);
    }
    if (Number.isFinite(batchLength)) {
      children = distributeChildren(fields, batchLength, children, cols, memo);
      if (batchLength > 0) {
        batches[numBatches++] = makeData({
          type: new Struct(fields),
          length: batchLength,
          nullCount: 0,
          children: children.slice()
        });
      }
    }
  }
  return [
    schema = schema.assign(fields),
    batches.map((data) => new RecordBatch2(schema, data))
  ];
}
function distributeChildren(fields, batchLength, children, columns, memo) {
  var _a5;
  const nullBitmapSize = (batchLength + 63 & ~63) >> 3;
  for (let i = -1, n = columns.length;++i < n; ) {
    const child = children[i];
    const length = child === null || child === undefined ? undefined : child.length;
    if (length >= batchLength) {
      if (length === batchLength) {
        children[i] = child;
      } else {
        children[i] = child.slice(0, batchLength);
        memo.numBatches = Math.max(memo.numBatches, columns[i].unshift(child.slice(batchLength, length - batchLength)));
      }
    } else {
      const field = fields[i];
      fields[i] = field.clone({ nullable: true });
      children[i] = (_a5 = child === null || child === undefined ? undefined : child._changeLengthAndBackfillNullBitmap(batchLength)) !== null && _a5 !== undefined ? _a5 : makeData({
        type: field.type,
        length: batchLength,
        nullCount: batchLength,
        nullBitmap: new Uint8Array(nullBitmapSize)
      });
    }
  }
  return children;
}
var init_recordbatch = __esm(() => {
  init_data();
  init_type2();
  init_recordbatch2();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/table.mjs
var _a5, Table;
var init_table = __esm(() => {
  init_enum();
  init_data();
  init_vector2();
  init_schema2();
  init_type2();
  init_typecomparator();
  init_recordbatch();
  init_chunk();
  init_get2();
  init_set();
  init_indexof();
  init_iterator();
  init_vector();
  init_recordbatch2();
  Table = class Table {
    constructor(...args) {
      var _b2, _c2;
      if (args.length === 0) {
        this.batches = [];
        this.schema = new Schema2([]);
        this._offsets = [0];
        return this;
      }
      let schema;
      let offsets;
      if (args[0] instanceof Schema2) {
        schema = args.shift();
      }
      if (args.at(-1) instanceof Uint32Array) {
        offsets = args.pop();
      }
      const unwrap = (x) => {
        if (x) {
          if (x instanceof RecordBatch2) {
            return [x];
          } else if (x instanceof Table) {
            return x.batches;
          } else if (x instanceof Data) {
            if (x.type instanceof Struct) {
              return [new RecordBatch2(new Schema2(x.type.children), x)];
            }
          } else if (Array.isArray(x)) {
            return x.flatMap((v) => unwrap(v));
          } else if (typeof x[Symbol.iterator] === "function") {
            return [...x].flatMap((v) => unwrap(v));
          } else if (typeof x === "object") {
            const keys = Object.keys(x);
            const vecs = keys.map((k) => new Vector([x[k]]));
            const batchSchema = schema !== null && schema !== undefined ? schema : new Schema2(keys.map((k, i) => new Field2(String(k), vecs[i].type, vecs[i].nullable)));
            const [, batches2] = distributeVectorsIntoRecordBatches(batchSchema, vecs);
            return batches2.length === 0 ? [new RecordBatch2(x)] : batches2;
          }
        }
        return [];
      };
      const batches = args.flatMap((v) => unwrap(v));
      schema = (_c2 = schema !== null && schema !== undefined ? schema : (_b2 = batches[0]) === null || _b2 === undefined ? undefined : _b2.schema) !== null && _c2 !== undefined ? _c2 : new Schema2([]);
      if (!(schema instanceof Schema2)) {
        throw new TypeError("Table constructor expects a [Schema, RecordBatch[]] pair.");
      }
      for (const batch of batches) {
        if (!(batch instanceof RecordBatch2)) {
          throw new TypeError("Table constructor expects a [Schema, RecordBatch[]] pair.");
        }
        if (!compareSchemas(schema, batch.schema)) {
          throw new TypeError("Table and inner RecordBatch schemas must be equivalent.");
        }
      }
      this.schema = schema;
      this.batches = batches;
      this._offsets = offsets !== null && offsets !== undefined ? offsets : computeChunkOffsets(this.data);
    }
    get data() {
      return this.batches.map(({ data }) => data);
    }
    get numCols() {
      return this.schema.fields.length;
    }
    get numRows() {
      return this.data.reduce((numRows, data) => numRows + data.length, 0);
    }
    get nullCount() {
      if (this._nullCount === -1) {
        this._nullCount = computeChunkNullCounts(this.data);
      }
      return this._nullCount;
    }
    isValid(index) {
      return false;
    }
    get(index) {
      return null;
    }
    at(index) {
      return this.get(wrapIndex(index, this.numRows));
    }
    set(index, value) {
      return;
    }
    indexOf(element, offset) {
      return -1;
    }
    [Symbol.iterator]() {
      if (this.batches.length > 0) {
        return instance4.visit(new Vector(this.data));
      }
      return new Array(0)[Symbol.iterator]();
    }
    toArray() {
      return [...this];
    }
    toString() {
      return `[
  ${this.toArray().join(`,
  `)}
]`;
    }
    concat(...others) {
      const schema = this.schema;
      const data = this.data.concat(others.flatMap(({ data: data2 }) => data2));
      return new Table(schema, data.map((data2) => new RecordBatch2(schema, data2)));
    }
    slice(begin, end) {
      const schema = this.schema;
      [begin, end] = clampRange({ length: this.numRows }, begin, end);
      const data = sliceChunks(this.data, this._offsets, begin, end);
      return new Table(schema, data.map((chunk) => new RecordBatch2(schema, chunk)));
    }
    getChild(name) {
      return this.getChildAt(this.schema.fields.findIndex((f) => f.name === name));
    }
    getChildAt(index) {
      if (index > -1 && index < this.schema.fields.length) {
        const data = this.data.map((data2) => data2.children[index]);
        if (data.length === 0) {
          const { type } = this.schema.fields[index];
          const empty = makeData({ type, length: 0, nullCount: 0 });
          data.push(empty._changeLengthAndBackfillNullBitmap(this.numRows));
        }
        return new Vector(data);
      }
      return null;
    }
    setChild(name, child) {
      var _b2;
      return this.setChildAt((_b2 = this.schema.fields) === null || _b2 === undefined ? undefined : _b2.findIndex((f) => f.name === name), child);
    }
    setChildAt(index, child) {
      let schema = this.schema;
      let batches = [...this.batches];
      if (index > -1 && index < this.numCols) {
        if (!child) {
          child = new Vector([makeData({ type: new Null2, length: this.numRows })]);
        }
        const fields = schema.fields.slice();
        const field = fields[index].clone({ type: child.type });
        const children = this.schema.fields.map((_, i) => this.getChildAt(i));
        [fields[index], children[index]] = [field, child];
        [schema, batches] = distributeVectorsIntoRecordBatches(schema, children);
      }
      return new Table(schema, batches);
    }
    select(columnNames) {
      const nameToIndex = this.schema.fields.reduce((m, f, i) => m.set(f.name, i), new Map);
      return this.selectAt(columnNames.map((columnName) => nameToIndex.get(columnName)).filter((x) => x > -1));
    }
    selectAt(columnIndices) {
      const schema = this.schema.selectAt(columnIndices);
      const data = this.batches.map((batch) => batch.selectAt(columnIndices));
      return new Table(schema, data);
    }
    assign(other) {
      const fields = this.schema.fields;
      const [indices, oldToNew] = other.schema.fields.reduce((memo, f2, newIdx) => {
        const [indices2, oldToNew2] = memo;
        const i = fields.findIndex((f) => f.name === f2.name);
        ~i ? oldToNew2[i] = newIdx : indices2.push(newIdx);
        return memo;
      }, [[], []]);
      const schema = this.schema.assign(other.schema);
      const columns = [
        ...fields.map((_, i) => [i, oldToNew[i]]).map(([i, j]) => j === undefined ? this.getChildAt(i) : other.getChildAt(j)),
        ...indices.map((i) => other.getChildAt(i))
      ].filter(Boolean);
      return new Table(...distributeVectorsIntoRecordBatches(schema, columns));
    }
  };
  _a5 = Symbol.toStringTag;
  Table[_a5] = ((proto) => {
    proto.schema = null;
    proto.batches = [];
    proto._offsets = new Uint32Array([0]);
    proto._nullCount = -1;
    proto[Symbol.isConcatSpreadable] = true;
    proto["isValid"] = wrapChunkedCall1(isChunkedValid);
    proto["get"] = wrapChunkedCall1(instance2.getVisitFn(Type2.Struct));
    proto["set"] = wrapChunkedCall2(instance.getVisitFn(Type2.Struct));
    proto["indexOf"] = wrapChunkedIndexOf(instance3.getVisitFn(Type2.Struct));
    return "Table";
  })(Table.prototype);
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/recordbatch.mjs
function ensureSameLengthData(schema, chunks, maxLength = chunks.reduce((max, col) => Math.max(max, col.length), 0)) {
  var _b2;
  const fields = [...schema.fields];
  const children = [...chunks];
  const nullBitmapSize = (maxLength + 63 & ~63) >> 3;
  for (const [idx, field] of schema.fields.entries()) {
    const chunk = chunks[idx];
    if (!chunk || chunk.length !== maxLength) {
      fields[idx] = field.clone({ nullable: true });
      children[idx] = (_b2 = chunk === null || chunk === undefined ? undefined : chunk._changeLengthAndBackfillNullBitmap(maxLength)) !== null && _b2 !== undefined ? _b2 : makeData({
        type: field.type,
        length: maxLength,
        nullCount: maxLength,
        nullBitmap: new Uint8Array(nullBitmapSize)
      });
    }
  }
  return [
    schema.assign(fields),
    makeData({ type: new Struct(fields), length: maxLength, children })
  ];
}
function collectDictionaries(fields, children, dictionaries = new Map) {
  var _b2, _c2;
  if (((_b2 = fields === null || fields === undefined ? undefined : fields.length) !== null && _b2 !== undefined ? _b2 : 0) > 0 && (fields === null || fields === undefined ? undefined : fields.length) === (children === null || children === undefined ? undefined : children.length)) {
    for (let i = -1, n = fields.length;++i < n; ) {
      const { type } = fields[i];
      const data = children[i];
      for (const next of [data, ...((_c2 = data === null || data === undefined ? undefined : data.dictionary) === null || _c2 === undefined ? undefined : _c2.data) || []]) {
        collectDictionaries(type.children, next === null || next === undefined ? undefined : next.children, dictionaries);
      }
      if (DataType.isDictionary(type)) {
        const { id } = type;
        if (!dictionaries.has(id)) {
          if (data === null || data === undefined ? undefined : data.dictionary) {
            dictionaries.set(id, data.dictionary);
          }
        } else if (dictionaries.get(id) !== data.dictionary) {
          throw new Error(`Cannot create Schema containing two different dictionaries with the same Id`);
        }
      }
    }
  }
  return dictionaries;
}
var _a6, RecordBatch2, _InternalEmptyPlaceholderRecordBatch;
var init_recordbatch2 = __esm(() => {
  init_data();
  init_table();
  init_vector2();
  init_schema2();
  init_type2();
  init_vector();
  init_get2();
  init_set();
  init_indexof();
  init_iterator();
  RecordBatch2 = class RecordBatch2 {
    constructor(...args) {
      switch (args.length) {
        case 2: {
          [this.schema] = args;
          if (!(this.schema instanceof Schema2)) {
            throw new TypeError("RecordBatch constructor expects a [Schema, Data] pair.");
          }
          [
            ,
            this.data = makeData({
              nullCount: 0,
              type: new Struct(this.schema.fields),
              children: this.schema.fields.map((f) => makeData({ type: f.type, nullCount: 0 }))
            })
          ] = args;
          if (!(this.data instanceof Data)) {
            throw new TypeError("RecordBatch constructor expects a [Schema, Data] pair.");
          }
          [this.schema, this.data] = ensureSameLengthData(this.schema, this.data.children);
          break;
        }
        case 1: {
          const [obj] = args;
          const { fields, children, length } = Object.keys(obj).reduce((memo, name, i) => {
            memo.children[i] = obj[name];
            memo.length = Math.max(memo.length, obj[name].length);
            memo.fields[i] = Field2.new({ name, type: obj[name].type, nullable: true });
            return memo;
          }, {
            length: 0,
            fields: new Array,
            children: new Array
          });
          const schema = new Schema2(fields);
          const data = makeData({ type: new Struct(fields), length, children, nullCount: 0 });
          [this.schema, this.data] = ensureSameLengthData(schema, data.children, length);
          break;
        }
        default:
          throw new TypeError("RecordBatch constructor expects an Object mapping names to child Data, or a [Schema, Data] pair.");
      }
    }
    get dictionaries() {
      return this._dictionaries || (this._dictionaries = collectDictionaries(this.schema.fields, this.data.children));
    }
    get numCols() {
      return this.schema.fields.length;
    }
    get numRows() {
      return this.data.length;
    }
    get nullCount() {
      return this.data.nullCount;
    }
    isValid(index) {
      return this.data.getValid(index);
    }
    get(index) {
      return instance2.visit(this.data, index);
    }
    at(index) {
      return this.get(wrapIndex(index, this.numRows));
    }
    set(index, value) {
      return instance.visit(this.data, index, value);
    }
    indexOf(element, offset) {
      return instance3.visit(this.data, element, offset);
    }
    [Symbol.iterator]() {
      return instance4.visit(new Vector([this.data]));
    }
    toArray() {
      return [...this];
    }
    concat(...others) {
      return new Table(this.schema, [this, ...others]);
    }
    slice(begin, end) {
      const [slice] = new Vector([this.data]).slice(begin, end).data;
      return new RecordBatch2(this.schema, slice);
    }
    getChild(name) {
      var _b2;
      return this.getChildAt((_b2 = this.schema.fields) === null || _b2 === undefined ? undefined : _b2.findIndex((f) => f.name === name));
    }
    getChildAt(index) {
      if (index > -1 && index < this.schema.fields.length) {
        return new Vector([this.data.children[index]]);
      }
      return null;
    }
    setChild(name, child) {
      var _b2;
      return this.setChildAt((_b2 = this.schema.fields) === null || _b2 === undefined ? undefined : _b2.findIndex((f) => f.name === name), child);
    }
    setChildAt(index, child) {
      let schema = this.schema;
      let data = this.data;
      if (index > -1 && index < this.numCols) {
        if (!child) {
          child = new Vector([makeData({ type: new Null2, length: this.numRows })]);
        }
        const fields = schema.fields.slice();
        const children = data.children.slice();
        const field = fields[index].clone({ type: child.type });
        [fields[index], children[index]] = [field, child.data[0]];
        schema = new Schema2(fields, new Map(this.schema.metadata));
        data = makeData({ type: new Struct(fields), children });
      }
      return new RecordBatch2(schema, data);
    }
    select(columnNames) {
      const schema = this.schema.select(columnNames);
      const type = new Struct(schema.fields);
      const children = [];
      for (const name of columnNames) {
        const index = this.schema.fields.findIndex((f) => f.name === name);
        if (~index) {
          children[index] = this.data.children[index];
        }
      }
      return new RecordBatch2(schema, makeData({ type, length: this.numRows, children }));
    }
    selectAt(columnIndices) {
      const schema = this.schema.selectAt(columnIndices);
      const children = columnIndices.map((i) => this.data.children[i]).filter(Boolean);
      const subset = makeData({ type: new Struct(schema.fields), length: this.numRows, children });
      return new RecordBatch2(schema, subset);
    }
  };
  _a6 = Symbol.toStringTag;
  RecordBatch2[_a6] = ((proto) => {
    proto._nullCount = -1;
    proto[Symbol.isConcatSpreadable] = true;
    return "RecordBatch";
  })(RecordBatch2.prototype);
  _InternalEmptyPlaceholderRecordBatch = class _InternalEmptyPlaceholderRecordBatch extends RecordBatch2 {
    constructor(schema) {
      const children = schema.fields.map((f) => makeData({ type: f.type }));
      const data = makeData({ type: new Struct(schema.fields), nullCount: 0, children });
      super(schema, data);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/fb/message.mjs
class Message {
  constructor() {
    this.bb = null;
    this.bb_pos = 0;
  }
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsMessage(bb, obj) {
    return (obj || new Message).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsMessage(bb, obj) {
    bb.setPosition(bb.position() + SIZE_PREFIX_LENGTH);
    return (obj || new Message).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  version() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readInt16(this.bb_pos + offset) : MetadataVersion.V1;
  }
  headerType() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : MessageHeader.NONE;
  }
  header(obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
  }
  bodyLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readInt64(this.bb_pos + offset) : BigInt("0");
  }
  customMetadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new KeyValue).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  customMetadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  static startMessage(builder) {
    builder.startObject(5);
  }
  static addVersion(builder, version2) {
    builder.addFieldInt16(0, version2, MetadataVersion.V1);
  }
  static addHeaderType(builder, headerType) {
    builder.addFieldInt8(1, headerType, MessageHeader.NONE);
  }
  static addHeader(builder, headerOffset) {
    builder.addFieldOffset(2, headerOffset, 0);
  }
  static addBodyLength(builder, bodyLength) {
    builder.addFieldInt64(3, bodyLength, BigInt("0"));
  }
  static addCustomMetadata(builder, customMetadataOffset) {
    builder.addFieldOffset(4, customMetadataOffset, 0);
  }
  static createCustomMetadataVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1;i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startCustomMetadataVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static endMessage(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static finishMessageBuffer(builder, offset) {
    builder.finish(offset);
  }
  static finishSizePrefixedMessageBuffer(builder, offset) {
    builder.finish(offset, undefined, true);
  }
  static createMessage(builder, version2, headerType, headerOffset, bodyLength, customMetadataOffset) {
    Message.startMessage(builder);
    Message.addVersion(builder, version2);
    Message.addHeaderType(builder, headerType);
    Message.addHeader(builder, headerOffset);
    Message.addBodyLength(builder, bodyLength);
    Message.addCustomMetadata(builder, customMetadataOffset);
    return Message.endMessage(builder);
  }
}
var init_message = __esm(() => {
  init_flatbuffers();
  init_key_value();
  init_message_header();
  init_metadata_version();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/typeassembler.mjs
var TypeAssembler, instance7;
var init_typeassembler = __esm(() => {
  init_visitor();
  init_null();
  init_int();
  init_floating_point();
  init_binary();
  init_large_binary();
  init_bool();
  init_utf82();
  init_large_utf8();
  init_decimal();
  init_date();
  init_time();
  init_timestamp();
  init_interval();
  init_duration();
  init_list();
  init_struct_();
  init_union();
  init_dictionary_encoding();
  init_fixed_size_binary();
  init_fixed_size_list();
  init_map();
  TypeAssembler = class TypeAssembler extends Visitor {
    visit(node, builder) {
      return node == null || builder == null ? undefined : super.visit(node, builder);
    }
    visitNull(_node, b) {
      Null.startNull(b);
      return Null.endNull(b);
    }
    visitInt(node, b) {
      Int.startInt(b);
      Int.addBitWidth(b, node.bitWidth);
      Int.addIsSigned(b, node.isSigned);
      return Int.endInt(b);
    }
    visitFloat(node, b) {
      FloatingPoint.startFloatingPoint(b);
      FloatingPoint.addPrecision(b, node.precision);
      return FloatingPoint.endFloatingPoint(b);
    }
    visitBinary(_node, b) {
      Binary.startBinary(b);
      return Binary.endBinary(b);
    }
    visitLargeBinary(_node, b) {
      LargeBinary.startLargeBinary(b);
      return LargeBinary.endLargeBinary(b);
    }
    visitBool(_node, b) {
      Bool.startBool(b);
      return Bool.endBool(b);
    }
    visitUtf8(_node, b) {
      Utf8.startUtf8(b);
      return Utf8.endUtf8(b);
    }
    visitLargeUtf8(_node, b) {
      LargeUtf8.startLargeUtf8(b);
      return LargeUtf8.endLargeUtf8(b);
    }
    visitDecimal(node, b) {
      Decimal.startDecimal(b);
      Decimal.addScale(b, node.scale);
      Decimal.addPrecision(b, node.precision);
      Decimal.addBitWidth(b, node.bitWidth);
      return Decimal.endDecimal(b);
    }
    visitDate(node, b) {
      Date2.startDate(b);
      Date2.addUnit(b, node.unit);
      return Date2.endDate(b);
    }
    visitTime(node, b) {
      Time.startTime(b);
      Time.addUnit(b, node.unit);
      Time.addBitWidth(b, node.bitWidth);
      return Time.endTime(b);
    }
    visitTimestamp(node, b) {
      const timezone = node.timezone && b.createString(node.timezone) || undefined;
      Timestamp.startTimestamp(b);
      Timestamp.addUnit(b, node.unit);
      if (timezone !== undefined) {
        Timestamp.addTimezone(b, timezone);
      }
      return Timestamp.endTimestamp(b);
    }
    visitInterval(node, b) {
      Interval.startInterval(b);
      Interval.addUnit(b, node.unit);
      return Interval.endInterval(b);
    }
    visitDuration(node, b) {
      Duration.startDuration(b);
      Duration.addUnit(b, node.unit);
      return Duration.endDuration(b);
    }
    visitList(_node, b) {
      List.startList(b);
      return List.endList(b);
    }
    visitStruct(_node, b) {
      Struct_.startStruct_(b);
      return Struct_.endStruct_(b);
    }
    visitUnion(node, b) {
      Union.startTypeIdsVector(b, node.typeIds.length);
      const typeIds = Union.createTypeIdsVector(b, node.typeIds);
      Union.startUnion(b);
      Union.addMode(b, node.mode);
      Union.addTypeIds(b, typeIds);
      return Union.endUnion(b);
    }
    visitDictionary(node, b) {
      const indexType = this.visit(node.indices, b);
      DictionaryEncoding.startDictionaryEncoding(b);
      DictionaryEncoding.addId(b, BigInt(node.id));
      DictionaryEncoding.addIsOrdered(b, node.isOrdered);
      if (indexType !== undefined) {
        DictionaryEncoding.addIndexType(b, indexType);
      }
      return DictionaryEncoding.endDictionaryEncoding(b);
    }
    visitFixedSizeBinary(node, b) {
      FixedSizeBinary.startFixedSizeBinary(b);
      FixedSizeBinary.addByteWidth(b, node.byteWidth);
      return FixedSizeBinary.endFixedSizeBinary(b);
    }
    visitFixedSizeList(node, b) {
      FixedSizeList.startFixedSizeList(b);
      FixedSizeList.addListSize(b, node.listSize);
      return FixedSizeList.endFixedSizeList(b);
    }
    visitMap(node, b) {
      Map2.startMap(b);
      Map2.addKeysSorted(b, node.keysSorted);
      return Map2.endMap(b);
    }
  };
  instance7 = new TypeAssembler;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/metadata/json.mjs
function schemaFromJSON(_schema, dictionaries = new Map) {
  return new Schema2(schemaFieldsFromJSON(_schema, dictionaries), customMetadataFromJSON(_schema["metadata"]), dictionaries);
}
function recordBatchFromJSON(b) {
  return new RecordBatch3(b["count"], fieldNodesFromJSON(b["columns"]), buffersFromJSON(b["columns"]));
}
function dictionaryBatchFromJSON(b) {
  return new DictionaryBatch2(recordBatchFromJSON(b["data"]), b["id"], b["isDelta"]);
}
function schemaFieldsFromJSON(_schema, dictionaries) {
  return (_schema["fields"] || []).filter(Boolean).map((f) => Field2.fromJSON(f, dictionaries));
}
function fieldChildrenFromJSON(_field, dictionaries) {
  return (_field["children"] || []).filter(Boolean).map((f) => Field2.fromJSON(f, dictionaries));
}
function fieldNodesFromJSON(xs) {
  return (xs || []).reduce((fieldNodes, column) => [
    ...fieldNodes,
    new FieldNode2(column["count"], nullCountFromJSON(column["VALIDITY"])),
    ...fieldNodesFromJSON(column["children"])
  ], []);
}
function buffersFromJSON(xs, buffers = []) {
  for (let i = -1, n = (xs || []).length;++i < n; ) {
    const column = xs[i];
    column["VALIDITY"] && buffers.push(new BufferRegion(buffers.length, column["VALIDITY"].length));
    column["TYPE_ID"] && buffers.push(new BufferRegion(buffers.length, column["TYPE_ID"].length));
    column["OFFSET"] && buffers.push(new BufferRegion(buffers.length, column["OFFSET"].length));
    column["DATA"] && buffers.push(new BufferRegion(buffers.length, column["DATA"].length));
    buffers = buffersFromJSON(column["children"], buffers);
  }
  return buffers;
}
function nullCountFromJSON(validity) {
  return (validity || []).reduce((sum, val) => sum + +(val === 0), 0);
}
function fieldFromJSON(_field, dictionaries) {
  let id;
  let keys;
  let field;
  let dictMeta;
  let type;
  let dictType;
  if (!dictionaries || !(dictMeta = _field["dictionary"])) {
    type = typeFromJSON(_field, fieldChildrenFromJSON(_field, dictionaries));
    field = new Field2(_field["name"], type, _field["nullable"], customMetadataFromJSON(_field["metadata"]));
  } else if (!dictionaries.has(id = dictMeta["id"])) {
    keys = (keys = dictMeta["indexType"]) ? indexTypeFromJSON(keys) : new Int32;
    dictionaries.set(id, type = typeFromJSON(_field, fieldChildrenFromJSON(_field, dictionaries)));
    dictType = new Dictionary(type, keys, id, dictMeta["isOrdered"]);
    field = new Field2(_field["name"], dictType, _field["nullable"], customMetadataFromJSON(_field["metadata"]));
  } else {
    keys = (keys = dictMeta["indexType"]) ? indexTypeFromJSON(keys) : new Int32;
    dictType = new Dictionary(dictionaries.get(id), keys, id, dictMeta["isOrdered"]);
    field = new Field2(_field["name"], dictType, _field["nullable"], customMetadataFromJSON(_field["metadata"]));
  }
  return field || null;
}
function customMetadataFromJSON(metadata = []) {
  return new Map(metadata.map(({ key, value }) => [key, value]));
}
function indexTypeFromJSON(_type) {
  return new Int_(_type["isSigned"], _type["bitWidth"]);
}
function typeFromJSON(f, children) {
  const typeId = f["type"]["name"];
  switch (typeId) {
    case "NONE":
      return new Null2;
    case "null":
      return new Null2;
    case "binary":
      return new Binary2;
    case "largebinary":
      return new LargeBinary2;
    case "utf8":
      return new Utf82;
    case "largeutf8":
      return new LargeUtf82;
    case "bool":
      return new Bool2;
    case "list":
      return new List2((children || [])[0]);
    case "struct":
      return new Struct(children || []);
    case "struct_":
      return new Struct(children || []);
  }
  switch (typeId) {
    case "int": {
      const t = f["type"];
      return new Int_(t["isSigned"], t["bitWidth"]);
    }
    case "floatingpoint": {
      const t = f["type"];
      return new Float(Precision[t["precision"]]);
    }
    case "decimal": {
      const t = f["type"];
      return new Decimal2(t["scale"], t["precision"], t["bitWidth"]);
    }
    case "date": {
      const t = f["type"];
      return new Date_(DateUnit[t["unit"]]);
    }
    case "time": {
      const t = f["type"];
      return new Time_(TimeUnit[t["unit"]], t["bitWidth"]);
    }
    case "timestamp": {
      const t = f["type"];
      return new Timestamp_(TimeUnit[t["unit"]], t["timezone"]);
    }
    case "interval": {
      const t = f["type"];
      return new Interval_(IntervalUnit[t["unit"]]);
    }
    case "duration": {
      const t = f["type"];
      return new Duration2(TimeUnit[t["unit"]]);
    }
    case "union": {
      const t = f["type"];
      const [m, ...ms] = (t["mode"] + "").toLowerCase();
      const mode = m.toUpperCase() + ms.join("");
      return new Union_(UnionMode[mode], t["typeIds"] || [], children || []);
    }
    case "fixedsizebinary": {
      const t = f["type"];
      return new FixedSizeBinary2(t["byteWidth"]);
    }
    case "fixedsizelist": {
      const t = f["type"];
      return new FixedSizeList2(t["listSize"], (children || [])[0]);
    }
    case "map": {
      const t = f["type"];
      return new Map_((children || [])[0], t["keysSorted"]);
    }
  }
  throw new Error(`Unrecognized type: "${typeId}"`);
}
var init_json = __esm(() => {
  init_schema2();
  init_type2();
  init_message2();
  init_enum();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/metadata/message.mjs
class Message2 {
  static fromJSON(msg, headerType) {
    const message = new Message2(0, MetadataVersion.V5, headerType);
    message._createHeader = messageHeaderFromJSON(msg, headerType);
    return message;
  }
  static decode(buf) {
    buf = new ByteBuffer3(toUint8Array(buf));
    const _message = Message.getRootAsMessage(buf);
    const bodyLength = _message.bodyLength();
    const version2 = _message.version();
    const headerType = _message.headerType();
    const message = new Message2(bodyLength, version2, headerType);
    message._createHeader = decodeMessageHeader(_message, headerType);
    return message;
  }
  static encode(message) {
    const b = new Builder4;
    let headerOffset = -1;
    if (message.isSchema()) {
      headerOffset = Schema2.encode(b, message.header());
    } else if (message.isRecordBatch()) {
      headerOffset = RecordBatch3.encode(b, message.header());
    } else if (message.isDictionaryBatch()) {
      headerOffset = DictionaryBatch2.encode(b, message.header());
    }
    Message.startMessage(b);
    Message.addVersion(b, MetadataVersion.V5);
    Message.addHeader(b, headerOffset);
    Message.addHeaderType(b, message.headerType);
    Message.addBodyLength(b, BigInt(message.bodyLength));
    Message.finishMessageBuffer(b, Message.endMessage(b));
    return b.asUint8Array();
  }
  static from(header, bodyLength = 0) {
    if (header instanceof Schema2) {
      return new Message2(0, MetadataVersion.V5, MessageHeader.Schema, header);
    }
    if (header instanceof RecordBatch3) {
      return new Message2(bodyLength, MetadataVersion.V5, MessageHeader.RecordBatch, header);
    }
    if (header instanceof DictionaryBatch2) {
      return new Message2(bodyLength, MetadataVersion.V5, MessageHeader.DictionaryBatch, header);
    }
    throw new Error(`Unrecognized Message header: ${header}`);
  }
  get type() {
    return this.headerType;
  }
  get version() {
    return this._version;
  }
  get headerType() {
    return this._headerType;
  }
  get bodyLength() {
    return this._bodyLength;
  }
  header() {
    return this._createHeader();
  }
  isSchema() {
    return this.headerType === MessageHeader.Schema;
  }
  isRecordBatch() {
    return this.headerType === MessageHeader.RecordBatch;
  }
  isDictionaryBatch() {
    return this.headerType === MessageHeader.DictionaryBatch;
  }
  constructor(bodyLength, version2, headerType, header) {
    this._version = version2;
    this._headerType = headerType;
    this.body = new Uint8Array(0);
    header && (this._createHeader = () => header);
    this._bodyLength = bigIntToNumber(bodyLength);
  }
}

class RecordBatch3 {
  get nodes() {
    return this._nodes;
  }
  get length() {
    return this._length;
  }
  get buffers() {
    return this._buffers;
  }
  constructor(length, nodes, buffers) {
    this._nodes = nodes;
    this._buffers = buffers;
    this._length = bigIntToNumber(length);
  }
}

class DictionaryBatch2 {
  get id() {
    return this._id;
  }
  get data() {
    return this._data;
  }
  get isDelta() {
    return this._isDelta;
  }
  get length() {
    return this.data.length;
  }
  get nodes() {
    return this.data.nodes;
  }
  get buffers() {
    return this.data.buffers;
  }
  constructor(data, id, isDelta = false) {
    this._data = data;
    this._isDelta = isDelta;
    this._id = bigIntToNumber(id);
  }
}

class BufferRegion {
  constructor(offset, length) {
    this.offset = bigIntToNumber(offset);
    this.length = bigIntToNumber(length);
  }
}

class FieldNode2 {
  constructor(length, nullCount) {
    this.length = bigIntToNumber(length);
    this.nullCount = bigIntToNumber(nullCount);
  }
}
function messageHeaderFromJSON(message, type) {
  return () => {
    switch (type) {
      case MessageHeader.Schema:
        return Schema2.fromJSON(message);
      case MessageHeader.RecordBatch:
        return RecordBatch3.fromJSON(message);
      case MessageHeader.DictionaryBatch:
        return DictionaryBatch2.fromJSON(message);
    }
    throw new Error(`Unrecognized Message type: { name: ${MessageHeader[type]}, type: ${type} }`);
  };
}
function decodeMessageHeader(message, type) {
  return () => {
    switch (type) {
      case MessageHeader.Schema:
        return Schema2.decode(message.header(new Schema), new Map, message.version());
      case MessageHeader.RecordBatch:
        return RecordBatch3.decode(message.header(new RecordBatch), message.version());
      case MessageHeader.DictionaryBatch:
        return DictionaryBatch2.decode(message.header(new DictionaryBatch), message.version());
    }
    throw new Error(`Unrecognized Message type: { name: ${MessageHeader[type]}, type: ${type} }`);
  };
}
function decodeSchema(_schema, dictionaries = new Map, version2 = MetadataVersion.V5) {
  const fields = decodeSchemaFields(_schema, dictionaries);
  return new Schema2(fields, decodeCustomMetadata(_schema), dictionaries, version2);
}
function decodeRecordBatch(batch, version2 = MetadataVersion.V5) {
  if (batch.compression() !== null) {
    throw new Error("Record batch compression not implemented");
  }
  return new RecordBatch3(batch.length(), decodeFieldNodes(batch), decodeBuffers(batch, version2));
}
function decodeDictionaryBatch(batch, version2 = MetadataVersion.V5) {
  return new DictionaryBatch2(RecordBatch3.decode(batch.data(), version2), batch.id(), batch.isDelta());
}
function decodeBufferRegion(b) {
  return new BufferRegion(b.offset(), b.length());
}
function decodeFieldNode(f) {
  return new FieldNode2(f.length(), f.nullCount());
}
function decodeFieldNodes(batch) {
  const nodes = [];
  for (let f, i = -1, j = -1, n = batch.nodesLength();++i < n; ) {
    if (f = batch.nodes(i)) {
      nodes[++j] = FieldNode2.decode(f);
    }
  }
  return nodes;
}
function decodeBuffers(batch, version2) {
  const bufferRegions = [];
  for (let b, i = -1, j = -1, n = batch.buffersLength();++i < n; ) {
    if (b = batch.buffers(i)) {
      if (version2 < MetadataVersion.V4) {
        b.bb_pos += 8 * (i + 1);
      }
      bufferRegions[++j] = BufferRegion.decode(b);
    }
  }
  return bufferRegions;
}
function decodeSchemaFields(schema, dictionaries) {
  const fields = [];
  for (let f, i = -1, j = -1, n = schema.fieldsLength();++i < n; ) {
    if (f = schema.fields(i)) {
      fields[++j] = Field2.decode(f, dictionaries);
    }
  }
  return fields;
}
function decodeFieldChildren(field, dictionaries) {
  const children = [];
  for (let f, i = -1, j = -1, n = field.childrenLength();++i < n; ) {
    if (f = field.children(i)) {
      children[++j] = Field2.decode(f, dictionaries);
    }
  }
  return children;
}
function decodeField(f, dictionaries) {
  let id;
  let field;
  let type;
  let keys;
  let dictType;
  let dictMeta;
  if (!dictionaries || !(dictMeta = f.dictionary())) {
    type = decodeFieldType(f, decodeFieldChildren(f, dictionaries));
    field = new Field2(f.name(), type, f.nullable(), decodeCustomMetadata(f));
  } else if (!dictionaries.has(id = bigIntToNumber(dictMeta.id()))) {
    keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new Int32;
    dictionaries.set(id, type = decodeFieldType(f, decodeFieldChildren(f, dictionaries)));
    dictType = new Dictionary(type, keys, id, dictMeta.isOrdered());
    field = new Field2(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
  } else {
    keys = (keys = dictMeta.indexType()) ? decodeIndexType(keys) : new Int32;
    dictType = new Dictionary(dictionaries.get(id), keys, id, dictMeta.isOrdered());
    field = new Field2(f.name(), dictType, f.nullable(), decodeCustomMetadata(f));
  }
  return field || null;
}
function decodeCustomMetadata(parent) {
  const data = new Map;
  if (parent) {
    for (let entry, key, i = -1, n = Math.trunc(parent.customMetadataLength());++i < n; ) {
      if ((entry = parent.customMetadata(i)) && (key = entry.key()) != null) {
        data.set(key, entry.value());
      }
    }
  }
  return data;
}
function decodeIndexType(_type) {
  return new Int_(_type.isSigned(), _type.bitWidth());
}
function decodeFieldType(f, children) {
  const typeId = f.typeType();
  switch (typeId) {
    case Type["NONE"]:
      return new Null2;
    case Type["Null"]:
      return new Null2;
    case Type["Binary"]:
      return new Binary2;
    case Type["LargeBinary"]:
      return new LargeBinary2;
    case Type["Utf8"]:
      return new Utf82;
    case Type["LargeUtf8"]:
      return new LargeUtf82;
    case Type["Bool"]:
      return new Bool2;
    case Type["List"]:
      return new List2((children || [])[0]);
    case Type["Struct_"]:
      return new Struct(children || []);
  }
  switch (typeId) {
    case Type["Int"]: {
      const t = f.type(new Int);
      return new Int_(t.isSigned(), t.bitWidth());
    }
    case Type["FloatingPoint"]: {
      const t = f.type(new FloatingPoint);
      return new Float(t.precision());
    }
    case Type["Decimal"]: {
      const t = f.type(new Decimal);
      return new Decimal2(t.scale(), t.precision(), t.bitWidth());
    }
    case Type["Date"]: {
      const t = f.type(new Date2);
      return new Date_(t.unit());
    }
    case Type["Time"]: {
      const t = f.type(new Time);
      return new Time_(t.unit(), t.bitWidth());
    }
    case Type["Timestamp"]: {
      const t = f.type(new Timestamp);
      return new Timestamp_(t.unit(), t.timezone());
    }
    case Type["Interval"]: {
      const t = f.type(new Interval);
      return new Interval_(t.unit());
    }
    case Type["Duration"]: {
      const t = f.type(new Duration);
      return new Duration2(t.unit());
    }
    case Type["Union"]: {
      const t = f.type(new Union);
      return new Union_(t.mode(), t.typeIdsArray() || [], children || []);
    }
    case Type["FixedSizeBinary"]: {
      const t = f.type(new FixedSizeBinary);
      return new FixedSizeBinary2(t.byteWidth());
    }
    case Type["FixedSizeList"]: {
      const t = f.type(new FixedSizeList);
      return new FixedSizeList2(t.listSize(), (children || [])[0]);
    }
    case Type["Map"]: {
      const t = f.type(new Map2);
      return new Map_((children || [])[0], t.keysSorted());
    }
  }
  throw new Error(`Unrecognized type: "${Type[typeId]}" (${typeId})`);
}
function encodeSchema(b, schema) {
  const fieldOffsets = schema.fields.map((f) => Field2.encode(b, f));
  Schema.startFieldsVector(b, fieldOffsets.length);
  const fieldsVectorOffset = Schema.createFieldsVector(b, fieldOffsets);
  const metadataOffset = !(schema.metadata && schema.metadata.size > 0) ? -1 : Schema.createCustomMetadataVector(b, [...schema.metadata].map(([k, v]) => {
    const key = b.createString(`${k}`);
    const val = b.createString(`${v}`);
    KeyValue.startKeyValue(b);
    KeyValue.addKey(b, key);
    KeyValue.addValue(b, val);
    return KeyValue.endKeyValue(b);
  }));
  Schema.startSchema(b);
  Schema.addFields(b, fieldsVectorOffset);
  Schema.addEndianness(b, platformIsLittleEndian ? Endianness.Little : Endianness.Big);
  if (metadataOffset !== -1) {
    Schema.addCustomMetadata(b, metadataOffset);
  }
  return Schema.endSchema(b);
}
function encodeField(b, field) {
  let nameOffset = -1;
  let typeOffset = -1;
  let dictionaryOffset = -1;
  const type = field.type;
  let typeId = field.typeId;
  if (!DataType.isDictionary(type)) {
    typeOffset = instance7.visit(type, b);
  } else {
    typeId = type.dictionary.typeId;
    dictionaryOffset = instance7.visit(type, b);
    typeOffset = instance7.visit(type.dictionary, b);
  }
  const childOffsets = (type.children || []).map((f) => Field2.encode(b, f));
  const childrenVectorOffset = Field.createChildrenVector(b, childOffsets);
  const metadataOffset = !(field.metadata && field.metadata.size > 0) ? -1 : Field.createCustomMetadataVector(b, [...field.metadata].map(([k, v]) => {
    const key = b.createString(`${k}`);
    const val = b.createString(`${v}`);
    KeyValue.startKeyValue(b);
    KeyValue.addKey(b, key);
    KeyValue.addValue(b, val);
    return KeyValue.endKeyValue(b);
  }));
  if (field.name) {
    nameOffset = b.createString(field.name);
  }
  Field.startField(b);
  Field.addType(b, typeOffset);
  Field.addTypeType(b, typeId);
  Field.addChildren(b, childrenVectorOffset);
  Field.addNullable(b, !!field.nullable);
  if (nameOffset !== -1) {
    Field.addName(b, nameOffset);
  }
  if (dictionaryOffset !== -1) {
    Field.addDictionary(b, dictionaryOffset);
  }
  if (metadataOffset !== -1) {
    Field.addCustomMetadata(b, metadataOffset);
  }
  return Field.endField(b);
}
function encodeRecordBatch(b, recordBatch) {
  const nodes = recordBatch.nodes || [];
  const buffers = recordBatch.buffers || [];
  RecordBatch.startNodesVector(b, nodes.length);
  for (const n of nodes.slice().reverse())
    FieldNode2.encode(b, n);
  const nodesVectorOffset = b.endVector();
  RecordBatch.startBuffersVector(b, buffers.length);
  for (const b_ of buffers.slice().reverse())
    BufferRegion.encode(b, b_);
  const buffersVectorOffset = b.endVector();
  RecordBatch.startRecordBatch(b);
  RecordBatch.addLength(b, BigInt(recordBatch.length));
  RecordBatch.addNodes(b, nodesVectorOffset);
  RecordBatch.addBuffers(b, buffersVectorOffset);
  return RecordBatch.endRecordBatch(b);
}
function encodeDictionaryBatch(b, dictionaryBatch) {
  const dataOffset = RecordBatch3.encode(b, dictionaryBatch.data);
  DictionaryBatch.startDictionaryBatch(b);
  DictionaryBatch.addId(b, BigInt(dictionaryBatch.id));
  DictionaryBatch.addIsDelta(b, dictionaryBatch.isDelta);
  DictionaryBatch.addData(b, dataOffset);
  return DictionaryBatch.endDictionaryBatch(b);
}
function encodeFieldNode(b, node) {
  return FieldNode.createFieldNode(b, BigInt(node.length), BigInt(node.nullCount));
}
function encodeBufferRegion(b, node) {
  return Buffer2.createBuffer(b, BigInt(node.offset), BigInt(node.length));
}
var Builder4, ByteBuffer3, platformIsLittleEndian;
var init_message2 = __esm(() => {
  init_flatbuffers();
  init_schema();
  init_int();
  init_record_batch();
  init_dictionary_batch();
  init_field();
  init_type();
  init_key_value();
  init_endianness();
  init_floating_point();
  init_decimal();
  init_date();
  init_time();
  init_timestamp();
  init_interval();
  init_duration();
  init_union();
  init_fixed_size_binary();
  init_fixed_size_list();
  init_map();
  init_message();
  init_schema2();
  init_buffer();
  init_enum();
  init_typeassembler();
  init_json();
  init_type2();
  Builder4 = Builder;
  ByteBuffer3 = ByteBuffer;
  Field2["encode"] = encodeField;
  Field2["decode"] = decodeField;
  Field2["fromJSON"] = fieldFromJSON;
  Schema2["encode"] = encodeSchema;
  Schema2["decode"] = decodeSchema;
  Schema2["fromJSON"] = schemaFromJSON;
  RecordBatch3["encode"] = encodeRecordBatch;
  RecordBatch3["decode"] = decodeRecordBatch;
  RecordBatch3["fromJSON"] = recordBatchFromJSON;
  DictionaryBatch2["encode"] = encodeDictionaryBatch;
  DictionaryBatch2["decode"] = decodeDictionaryBatch;
  DictionaryBatch2["fromJSON"] = dictionaryBatchFromJSON;
  FieldNode2["encode"] = encodeFieldNode;
  FieldNode2["decode"] = decodeFieldNode;
  BufferRegion["encode"] = encodeBufferRegion;
  BufferRegion["decode"] = decodeBufferRegion;
  platformIsLittleEndian = (() => {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true);
    return new Int16Array(buffer)[0] === 256;
  })();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/message.mjs
function checkForMagicArrowString(buffer, index = 0) {
  for (let i = -1, n = MAGIC.length;++i < n; ) {
    if (MAGIC[i] !== buffer[index + i]) {
      return false;
    }
  }
  return true;
}
var invalidMessageType = (type) => `Expected ${MessageHeader[type]} Message in stream, but was null or length 0.`, nullMessage = (type) => `Header pointer of flatbuffer-encoded ${MessageHeader[type]} Message is null or length 0.`, invalidMessageMetadata = (expected, actual) => `Expected to read ${expected} metadata bytes, but only read ${actual}.`, invalidMessageBodyLength = (expected, actual) => `Expected to read ${expected} bytes for message body, but only read ${actual}.`, MessageReader, AsyncMessageReader, JSONMessageReader, PADDING = 4, MAGIC_STR = "ARROW1", MAGIC, magicLength, magicAndPadding, magicX2AndPadding;
var init_message3 = __esm(() => {
  init_tslib_es6();
  init_enum();
  init_flatbuffers();
  init_message2();
  init_file2();
  init_buffer();
  init_stream();
  init_interfaces();
  MessageReader = class MessageReader {
    constructor(source) {
      this.source = source instanceof ByteStream ? source : new ByteStream(source);
    }
    [Symbol.iterator]() {
      return this;
    }
    next() {
      let r;
      if ((r = this.readMetadataLength()).done) {
        return ITERATOR_DONE;
      }
      if (r.value === -1 && (r = this.readMetadataLength()).done) {
        return ITERATOR_DONE;
      }
      if ((r = this.readMetadata(r.value)).done) {
        return ITERATOR_DONE;
      }
      return r;
    }
    throw(value) {
      return this.source.throw(value);
    }
    return(value) {
      return this.source.return(value);
    }
    readMessage(type) {
      let r;
      if ((r = this.next()).done) {
        return null;
      }
      if (type != null && r.value.headerType !== type) {
        throw new Error(invalidMessageType(type));
      }
      return r.value;
    }
    readMessageBody(bodyLength) {
      if (bodyLength <= 0) {
        return new Uint8Array(0);
      }
      const buf = toUint8Array(this.source.read(bodyLength));
      if (buf.byteLength < bodyLength) {
        throw new Error(invalidMessageBodyLength(bodyLength, buf.byteLength));
      }
      return buf.byteOffset % 8 === 0 && buf.byteOffset + buf.byteLength <= buf.buffer.byteLength ? buf : buf.slice();
    }
    readSchema(throwIfNull = false) {
      const type = MessageHeader.Schema;
      const message = this.readMessage(type);
      const schema = message === null || message === undefined ? undefined : message.header();
      if (throwIfNull && !schema) {
        throw new Error(nullMessage(type));
      }
      return schema;
    }
    readMetadataLength() {
      const buf = this.source.read(PADDING);
      const bb = buf && new ByteBuffer(buf);
      const len = (bb === null || bb === undefined ? undefined : bb.readInt32(0)) || 0;
      return { done: len === 0, value: len };
    }
    readMetadata(metadataLength) {
      const buf = this.source.read(metadataLength);
      if (!buf) {
        return ITERATOR_DONE;
      }
      if (buf.byteLength < metadataLength) {
        throw new Error(invalidMessageMetadata(metadataLength, buf.byteLength));
      }
      return { done: false, value: Message2.decode(buf) };
    }
  };
  AsyncMessageReader = class AsyncMessageReader {
    constructor(source, byteLength) {
      this.source = source instanceof AsyncByteStream ? source : isFileHandle(source) ? new AsyncRandomAccessFile(source, byteLength) : new AsyncByteStream(source);
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    next() {
      return __awaiter(this, undefined, undefined, function* () {
        let r;
        if ((r = yield this.readMetadataLength()).done) {
          return ITERATOR_DONE;
        }
        if (r.value === -1 && (r = yield this.readMetadataLength()).done) {
          return ITERATOR_DONE;
        }
        if ((r = yield this.readMetadata(r.value)).done) {
          return ITERATOR_DONE;
        }
        return r;
      });
    }
    throw(value) {
      return __awaiter(this, undefined, undefined, function* () {
        return yield this.source.throw(value);
      });
    }
    return(value) {
      return __awaiter(this, undefined, undefined, function* () {
        return yield this.source.return(value);
      });
    }
    readMessage(type) {
      return __awaiter(this, undefined, undefined, function* () {
        let r;
        if ((r = yield this.next()).done) {
          return null;
        }
        if (type != null && r.value.headerType !== type) {
          throw new Error(invalidMessageType(type));
        }
        return r.value;
      });
    }
    readMessageBody(bodyLength) {
      return __awaiter(this, undefined, undefined, function* () {
        if (bodyLength <= 0) {
          return new Uint8Array(0);
        }
        const buf = toUint8Array(yield this.source.read(bodyLength));
        if (buf.byteLength < bodyLength) {
          throw new Error(invalidMessageBodyLength(bodyLength, buf.byteLength));
        }
        return buf.byteOffset % 8 === 0 && buf.byteOffset + buf.byteLength <= buf.buffer.byteLength ? buf : buf.slice();
      });
    }
    readSchema() {
      return __awaiter(this, arguments, undefined, function* (throwIfNull = false) {
        const type = MessageHeader.Schema;
        const message = yield this.readMessage(type);
        const schema = message === null || message === undefined ? undefined : message.header();
        if (throwIfNull && !schema) {
          throw new Error(nullMessage(type));
        }
        return schema;
      });
    }
    readMetadataLength() {
      return __awaiter(this, undefined, undefined, function* () {
        const buf = yield this.source.read(PADDING);
        const bb = buf && new ByteBuffer(buf);
        const len = (bb === null || bb === undefined ? undefined : bb.readInt32(0)) || 0;
        return { done: len === 0, value: len };
      });
    }
    readMetadata(metadataLength) {
      return __awaiter(this, undefined, undefined, function* () {
        const buf = yield this.source.read(metadataLength);
        if (!buf) {
          return ITERATOR_DONE;
        }
        if (buf.byteLength < metadataLength) {
          throw new Error(invalidMessageMetadata(metadataLength, buf.byteLength));
        }
        return { done: false, value: Message2.decode(buf) };
      });
    }
  };
  JSONMessageReader = class JSONMessageReader extends MessageReader {
    constructor(source) {
      super(new Uint8Array(0));
      this._schema = false;
      this._body = [];
      this._batchIndex = 0;
      this._dictionaryIndex = 0;
      this._json = source instanceof ArrowJSON ? source : new ArrowJSON(source);
    }
    next() {
      const { _json } = this;
      if (!this._schema) {
        this._schema = true;
        const message = Message2.fromJSON(_json.schema, MessageHeader.Schema);
        return { done: false, value: message };
      }
      if (this._dictionaryIndex < _json.dictionaries.length) {
        const batch = _json.dictionaries[this._dictionaryIndex++];
        this._body = batch["data"]["columns"];
        const message = Message2.fromJSON(batch, MessageHeader.DictionaryBatch);
        return { done: false, value: message };
      }
      if (this._batchIndex < _json.batches.length) {
        const batch = _json.batches[this._batchIndex++];
        this._body = batch["columns"];
        const message = Message2.fromJSON(batch, MessageHeader.RecordBatch);
        return { done: false, value: message };
      }
      this._body = [];
      return ITERATOR_DONE;
    }
    readMessageBody(_bodyLength) {
      return flattenDataSources(this._body);
      function flattenDataSources(xs) {
        return (xs || []).reduce((buffers, column) => [
          ...buffers,
          ...column["VALIDITY"] && [column["VALIDITY"]] || [],
          ...column["TYPE_ID"] && [column["TYPE_ID"]] || [],
          ...column["OFFSET"] && [column["OFFSET"]] || [],
          ...column["DATA"] && [column["DATA"]] || [],
          ...flattenDataSources(column["children"])
        ], []);
      }
    }
    readMessage(type) {
      let r;
      if ((r = this.next()).done) {
        return null;
      }
      if (type != null && r.value.headerType !== type) {
        throw new Error(invalidMessageType(type));
      }
      return r.value;
    }
    readSchema() {
      const type = MessageHeader.Schema;
      const message = this.readMessage(type);
      const schema = message === null || message === undefined ? undefined : message.header();
      if (!message || !schema) {
        throw new Error(nullMessage(type));
      }
      return schema;
    }
  };
  MAGIC = new Uint8Array(MAGIC_STR.length);
  for (let i = 0;i < MAGIC_STR.length; i += 1) {
    MAGIC[i] = MAGIC_STR.codePointAt(i);
  }
  magicLength = MAGIC.length;
  magicAndPadding = magicLength + PADDING;
  magicX2AndPadding = magicLength * 2 + PADDING;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/reader.mjs
class RecordBatchReaderImpl {
  get numDictionaries() {
    return this._dictionaryIndex;
  }
  get numRecordBatches() {
    return this._recordBatchIndex;
  }
  constructor(dictionaries = new Map) {
    this.closed = false;
    this.autoDestroy = true;
    this._dictionaryIndex = 0;
    this._recordBatchIndex = 0;
    this.dictionaries = dictionaries;
  }
  isSync() {
    return false;
  }
  isAsync() {
    return false;
  }
  isFile() {
    return false;
  }
  isStream() {
    return false;
  }
  reset(schema) {
    this._dictionaryIndex = 0;
    this._recordBatchIndex = 0;
    this.schema = schema;
    this.dictionaries = new Map;
    return this;
  }
  _loadRecordBatch(header, body) {
    const children = this._loadVectors(header, body, this.schema.fields);
    const data = makeData({ type: new Struct(this.schema.fields), length: header.length, children });
    return new RecordBatch2(this.schema, data);
  }
  _loadDictionaryBatch(header, body) {
    const { id, isDelta } = header;
    const { dictionaries, schema } = this;
    const dictionary = dictionaries.get(id);
    const type = schema.dictionaries.get(id);
    const data = this._loadVectors(header.data, body, [type]);
    return (dictionary && isDelta ? dictionary.concat(new Vector(data)) : new Vector(data)).memoize();
  }
  _loadVectors(header, body, types) {
    return new VectorLoader(body, header.nodes, header.buffers, this.dictionaries, this.schema.metadataVersion).visitMany(types);
  }
}
function shouldAutoDestroy(self, options) {
  return options && typeof options["autoDestroy"] === "boolean" ? options["autoDestroy"] : self["autoDestroy"];
}
function* readAllSync(source) {
  const reader = RecordBatchReader.from(source);
  try {
    if (!reader.open({ autoDestroy: false }).closed) {
      do {
        yield reader;
      } while (!reader.reset().open().closed);
    }
  } finally {
    reader.cancel();
  }
}
function readAllAsync(source) {
  return __asyncGenerator(this, arguments, function* readAllAsync_1() {
    const reader = yield __await(RecordBatchReader.from(source));
    try {
      if (!(yield __await(reader.open({ autoDestroy: false }))).closed) {
        do {
          yield yield __await(reader);
        } while (!(yield __await(reader.reset().open())).closed);
      }
    } finally {
      yield __await(reader.cancel());
    }
  });
}
function fromArrowJSON(source) {
  return new RecordBatchStreamReader(new RecordBatchJSONReaderImpl(source));
}
function fromByteStream(source) {
  const bytes = source.peek(magicLength + 7 & ~7);
  return bytes && bytes.byteLength >= 4 ? !checkForMagicArrowString(bytes) ? new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(source)) : new RecordBatchFileReader(new RecordBatchFileReaderImpl(source.read())) : new RecordBatchStreamReader(new RecordBatchStreamReaderImpl(function* () {}()));
}
function fromAsyncByteStream(source) {
  return __awaiter(this, undefined, undefined, function* () {
    const bytes = yield source.peek(magicLength + 7 & ~7);
    return bytes && bytes.byteLength >= 4 ? !checkForMagicArrowString(bytes) ? new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(source)) : new RecordBatchFileReader(new RecordBatchFileReaderImpl(yield source.read())) : new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(function() {
      return __asyncGenerator(this, arguments, function* () {});
    }()));
  });
}
function fromFileHandle(source) {
  return __awaiter(this, undefined, undefined, function* () {
    const { size } = yield source.stat();
    const file2 = new AsyncRandomAccessFile(source, size);
    if (size >= magicX2AndPadding && checkForMagicArrowString(yield file2.readAt(0, magicLength + 7 & ~7))) {
      return new AsyncRecordBatchFileReader(new AsyncRecordBatchFileReaderImpl(file2));
    }
    return new AsyncRecordBatchStreamReader(new AsyncRecordBatchStreamReaderImpl(file2));
  });
}
var RecordBatchReader, RecordBatchStreamReader, AsyncRecordBatchStreamReader, RecordBatchFileReader, AsyncRecordBatchFileReader, RecordBatchStreamReaderImpl, AsyncRecordBatchStreamReaderImpl, RecordBatchFileReaderImpl, AsyncRecordBatchFileReaderImpl, RecordBatchJSONReaderImpl;
var init_reader = __esm(() => {
  init_tslib_es6();
  init_data();
  init_vector2();
  init_type2();
  init_enum();
  init_file();
  init_adapters();
  init_stream();
  init_file2();
  init_vectorloader();
  init_recordbatch2();
  init_interfaces();
  init_message3();
  RecordBatchReader = class RecordBatchReader extends ReadableInterop {
    constructor(impl) {
      super();
      this._impl = impl;
    }
    get closed() {
      return this._impl.closed;
    }
    get schema() {
      return this._impl.schema;
    }
    get autoDestroy() {
      return this._impl.autoDestroy;
    }
    get dictionaries() {
      return this._impl.dictionaries;
    }
    get numDictionaries() {
      return this._impl.numDictionaries;
    }
    get numRecordBatches() {
      return this._impl.numRecordBatches;
    }
    get footer() {
      return this._impl.isFile() ? this._impl.footer : null;
    }
    isSync() {
      return this._impl.isSync();
    }
    isAsync() {
      return this._impl.isAsync();
    }
    isFile() {
      return this._impl.isFile();
    }
    isStream() {
      return this._impl.isStream();
    }
    next() {
      return this._impl.next();
    }
    throw(value) {
      return this._impl.throw(value);
    }
    return(value) {
      return this._impl.return(value);
    }
    cancel() {
      return this._impl.cancel();
    }
    reset(schema) {
      this._impl.reset(schema);
      this._DOMStream = undefined;
      this._nodeStream = undefined;
      return this;
    }
    open(options) {
      const opening = this._impl.open(options);
      return isPromise(opening) ? opening.then(() => this) : this;
    }
    readRecordBatch(index) {
      return this._impl.isFile() ? this._impl.readRecordBatch(index) : null;
    }
    [Symbol.iterator]() {
      return this._impl[Symbol.iterator]();
    }
    [Symbol.asyncIterator]() {
      return this._impl[Symbol.asyncIterator]();
    }
    toDOMStream() {
      return adapters_default.toDOMStream(this.isSync() ? { [Symbol.iterator]: () => this } : { [Symbol.asyncIterator]: () => this });
    }
    toNodeStream() {
      return adapters_default.toNodeStream(this.isSync() ? { [Symbol.iterator]: () => this } : { [Symbol.asyncIterator]: () => this }, { objectMode: true });
    }
    static throughNode(options) {
      throw new Error(`"throughNode" not available in this environment`);
    }
    static throughDOM(writableStrategy, readableStrategy) {
      throw new Error(`"throughDOM" not available in this environment`);
    }
    static from(source) {
      if (source instanceof RecordBatchReader) {
        return source;
      } else if (isArrowJSON(source)) {
        return fromArrowJSON(source);
      } else if (isFileHandle(source)) {
        return fromFileHandle(source);
      } else if (isPromise(source)) {
        return (() => __awaiter(this, undefined, undefined, function* () {
          return yield RecordBatchReader.from(yield source);
        }))();
      } else if (isFetchResponse(source) || isReadableDOMStream(source) || isReadableNodeStream(source) || isAsyncIterable(source)) {
        return fromAsyncByteStream(new AsyncByteStream(source));
      }
      return fromByteStream(new ByteStream(source));
    }
    static readAll(source) {
      if (source instanceof RecordBatchReader) {
        return source.isSync() ? readAllSync(source) : readAllAsync(source);
      } else if (isArrowJSON(source) || ArrayBuffer.isView(source) || isIterable(source) || isIteratorResult(source)) {
        return readAllSync(source);
      }
      return readAllAsync(source);
    }
  };
  RecordBatchStreamReader = class RecordBatchStreamReader extends RecordBatchReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
    readAll() {
      return [...this];
    }
    [Symbol.iterator]() {
      return this._impl[Symbol.iterator]();
    }
    [Symbol.asyncIterator]() {
      return __asyncGenerator(this, arguments, function* _a7() {
        yield __await(yield* __asyncDelegator(__asyncValues(this[Symbol.iterator]())));
      });
    }
  };
  AsyncRecordBatchStreamReader = class AsyncRecordBatchStreamReader extends RecordBatchReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
    readAll() {
      return __awaiter(this, undefined, undefined, function* () {
        var _a7, e_1, _b2, _c2;
        const batches = new Array;
        try {
          for (var _d2 = true, _e2 = __asyncValues(this), _f2;_f2 = yield _e2.next(), _a7 = _f2.done, !_a7; _d2 = true) {
            _c2 = _f2.value;
            _d2 = false;
            const batch = _c2;
            batches.push(batch);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (!_d2 && !_a7 && (_b2 = _e2.return))
              yield _b2.call(_e2);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        return batches;
      });
    }
    [Symbol.iterator]() {
      throw new Error(`AsyncRecordBatchStreamReader is not Iterable`);
    }
    [Symbol.asyncIterator]() {
      return this._impl[Symbol.asyncIterator]();
    }
  };
  RecordBatchFileReader = class RecordBatchFileReader extends RecordBatchStreamReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
  };
  AsyncRecordBatchFileReader = class AsyncRecordBatchFileReader extends AsyncRecordBatchStreamReader {
    constructor(_impl) {
      super(_impl);
      this._impl = _impl;
    }
  };
  RecordBatchStreamReaderImpl = class RecordBatchStreamReaderImpl extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
      super(dictionaries);
      this._reader = !isArrowJSON(source) ? new MessageReader(this._handle = source) : new JSONMessageReader(this._handle = source);
    }
    isSync() {
      return true;
    }
    isStream() {
      return true;
    }
    [Symbol.iterator]() {
      return this;
    }
    cancel() {
      if (!this.closed && (this.closed = true)) {
        this.reset()._reader.return();
        this._reader = null;
        this.dictionaries = null;
      }
    }
    open(options) {
      if (!this.closed) {
        this.autoDestroy = shouldAutoDestroy(this, options);
        if (!(this.schema || (this.schema = this._reader.readSchema()))) {
          this.cancel();
        }
      }
      return this;
    }
    throw(value) {
      if (!this.closed && this.autoDestroy && (this.closed = true)) {
        return this.reset()._reader.throw(value);
      }
      return ITERATOR_DONE;
    }
    return(value) {
      if (!this.closed && this.autoDestroy && (this.closed = true)) {
        return this.reset()._reader.return(value);
      }
      return ITERATOR_DONE;
    }
    next() {
      if (this.closed) {
        return ITERATOR_DONE;
      }
      let message;
      const { _reader: reader } = this;
      while (message = this._readNextMessageAndValidate()) {
        if (message.isSchema()) {
          this.reset(message.header());
        } else if (message.isRecordBatch()) {
          this._recordBatchIndex++;
          const header = message.header();
          const buffer = reader.readMessageBody(message.bodyLength);
          const recordBatch = this._loadRecordBatch(header, buffer);
          return { done: false, value: recordBatch };
        } else if (message.isDictionaryBatch()) {
          this._dictionaryIndex++;
          const header = message.header();
          const buffer = reader.readMessageBody(message.bodyLength);
          const vector = this._loadDictionaryBatch(header, buffer);
          this.dictionaries.set(header.id, vector);
        }
      }
      if (this.schema && this._recordBatchIndex === 0) {
        this._recordBatchIndex++;
        return { done: false, value: new _InternalEmptyPlaceholderRecordBatch(this.schema) };
      }
      return this.return();
    }
    _readNextMessageAndValidate(type) {
      return this._reader.readMessage(type);
    }
  };
  AsyncRecordBatchStreamReaderImpl = class AsyncRecordBatchStreamReaderImpl extends RecordBatchReaderImpl {
    constructor(source, dictionaries) {
      super(dictionaries);
      this._reader = new AsyncMessageReader(this._handle = source);
    }
    isAsync() {
      return true;
    }
    isStream() {
      return true;
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    cancel() {
      return __awaiter(this, undefined, undefined, function* () {
        if (!this.closed && (this.closed = true)) {
          yield this.reset()._reader.return();
          this._reader = null;
          this.dictionaries = null;
        }
      });
    }
    open(options) {
      return __awaiter(this, undefined, undefined, function* () {
        if (!this.closed) {
          this.autoDestroy = shouldAutoDestroy(this, options);
          if (!(this.schema || (this.schema = yield this._reader.readSchema()))) {
            yield this.cancel();
          }
        }
        return this;
      });
    }
    throw(value) {
      return __awaiter(this, undefined, undefined, function* () {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
          return yield this.reset()._reader.throw(value);
        }
        return ITERATOR_DONE;
      });
    }
    return(value) {
      return __awaiter(this, undefined, undefined, function* () {
        if (!this.closed && this.autoDestroy && (this.closed = true)) {
          return yield this.reset()._reader.return(value);
        }
        return ITERATOR_DONE;
      });
    }
    next() {
      return __awaiter(this, undefined, undefined, function* () {
        if (this.closed) {
          return ITERATOR_DONE;
        }
        let message;
        const { _reader: reader } = this;
        while (message = yield this._readNextMessageAndValidate()) {
          if (message.isSchema()) {
            yield this.reset(message.header());
          } else if (message.isRecordBatch()) {
            this._recordBatchIndex++;
            const header = message.header();
            const buffer = yield reader.readMessageBody(message.bodyLength);
            const recordBatch = this._loadRecordBatch(header, buffer);
            return { done: false, value: recordBatch };
          } else if (message.isDictionaryBatch()) {
            this._dictionaryIndex++;
            const header = message.header();
            const buffer = yield reader.readMessageBody(message.bodyLength);
            const vector = this._loadDictionaryBatch(header, buffer);
            this.dictionaries.set(header.id, vector);
          }
        }
        if (this.schema && this._recordBatchIndex === 0) {
          this._recordBatchIndex++;
          return { done: false, value: new _InternalEmptyPlaceholderRecordBatch(this.schema) };
        }
        return yield this.return();
      });
    }
    _readNextMessageAndValidate(type) {
      return __awaiter(this, undefined, undefined, function* () {
        return yield this._reader.readMessage(type);
      });
    }
  };
  RecordBatchFileReaderImpl = class RecordBatchFileReaderImpl extends RecordBatchStreamReaderImpl {
    get footer() {
      return this._footer;
    }
    get numDictionaries() {
      return this._footer ? this._footer.numDictionaries : 0;
    }
    get numRecordBatches() {
      return this._footer ? this._footer.numRecordBatches : 0;
    }
    constructor(source, dictionaries) {
      super(source instanceof RandomAccessFile ? source : new RandomAccessFile(source), dictionaries);
    }
    isSync() {
      return true;
    }
    isFile() {
      return true;
    }
    open(options) {
      if (!this.closed && !this._footer) {
        this.schema = (this._footer = this._readFooter()).schema;
        for (const block of this._footer.dictionaryBatches()) {
          block && this._readDictionaryBatch(this._dictionaryIndex++);
        }
      }
      return super.open(options);
    }
    readRecordBatch(index) {
      var _a7;
      if (this.closed) {
        return null;
      }
      if (!this._footer) {
        this.open();
      }
      const block = (_a7 = this._footer) === null || _a7 === undefined ? undefined : _a7.getRecordBatch(index);
      if (block && this._handle.seek(block.offset)) {
        const message = this._reader.readMessage(MessageHeader.RecordBatch);
        if (message === null || message === undefined ? undefined : message.isRecordBatch()) {
          const header = message.header();
          const buffer = this._reader.readMessageBody(message.bodyLength);
          const recordBatch = this._loadRecordBatch(header, buffer);
          return recordBatch;
        }
      }
      return null;
    }
    _readDictionaryBatch(index) {
      var _a7;
      const block = (_a7 = this._footer) === null || _a7 === undefined ? undefined : _a7.getDictionaryBatch(index);
      if (block && this._handle.seek(block.offset)) {
        const message = this._reader.readMessage(MessageHeader.DictionaryBatch);
        if (message === null || message === undefined ? undefined : message.isDictionaryBatch()) {
          const header = message.header();
          const buffer = this._reader.readMessageBody(message.bodyLength);
          const vector = this._loadDictionaryBatch(header, buffer);
          this.dictionaries.set(header.id, vector);
        }
      }
    }
    _readFooter() {
      const { _handle } = this;
      const offset = _handle.size - magicAndPadding;
      const length = _handle.readInt32(offset);
      const buffer = _handle.readAt(offset - length, length);
      return Footer_.decode(buffer);
    }
    _readNextMessageAndValidate(type) {
      var _a7;
      if (!this._footer) {
        this.open();
      }
      if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
        const block = (_a7 = this._footer) === null || _a7 === undefined ? undefined : _a7.getRecordBatch(this._recordBatchIndex);
        if (block && this._handle.seek(block.offset)) {
          return this._reader.readMessage(type);
        }
      }
      return null;
    }
  };
  AsyncRecordBatchFileReaderImpl = class AsyncRecordBatchFileReaderImpl extends AsyncRecordBatchStreamReaderImpl {
    get footer() {
      return this._footer;
    }
    get numDictionaries() {
      return this._footer ? this._footer.numDictionaries : 0;
    }
    get numRecordBatches() {
      return this._footer ? this._footer.numRecordBatches : 0;
    }
    constructor(source, ...rest) {
      const byteLength = typeof rest[0] !== "number" ? rest.shift() : undefined;
      const dictionaries = rest[0] instanceof Map ? rest.shift() : undefined;
      super(source instanceof AsyncRandomAccessFile ? source : new AsyncRandomAccessFile(source, byteLength), dictionaries);
    }
    isFile() {
      return true;
    }
    isAsync() {
      return true;
    }
    open(options) {
      const _super = Object.create(null, {
        open: { get: () => super.open }
      });
      return __awaiter(this, undefined, undefined, function* () {
        if (!this.closed && !this._footer) {
          this.schema = (this._footer = yield this._readFooter()).schema;
          for (const block of this._footer.dictionaryBatches()) {
            block && (yield this._readDictionaryBatch(this._dictionaryIndex++));
          }
        }
        return yield _super.open.call(this, options);
      });
    }
    readRecordBatch(index) {
      return __awaiter(this, undefined, undefined, function* () {
        var _a7;
        if (this.closed) {
          return null;
        }
        if (!this._footer) {
          yield this.open();
        }
        const block = (_a7 = this._footer) === null || _a7 === undefined ? undefined : _a7.getRecordBatch(index);
        if (block && (yield this._handle.seek(block.offset))) {
          const message = yield this._reader.readMessage(MessageHeader.RecordBatch);
          if (message === null || message === undefined ? undefined : message.isRecordBatch()) {
            const header = message.header();
            const buffer = yield this._reader.readMessageBody(message.bodyLength);
            const recordBatch = this._loadRecordBatch(header, buffer);
            return recordBatch;
          }
        }
        return null;
      });
    }
    _readDictionaryBatch(index) {
      return __awaiter(this, undefined, undefined, function* () {
        var _a7;
        const block = (_a7 = this._footer) === null || _a7 === undefined ? undefined : _a7.getDictionaryBatch(index);
        if (block && (yield this._handle.seek(block.offset))) {
          const message = yield this._reader.readMessage(MessageHeader.DictionaryBatch);
          if (message === null || message === undefined ? undefined : message.isDictionaryBatch()) {
            const header = message.header();
            const buffer = yield this._reader.readMessageBody(message.bodyLength);
            const vector = this._loadDictionaryBatch(header, buffer);
            this.dictionaries.set(header.id, vector);
          }
        }
      });
    }
    _readFooter() {
      return __awaiter(this, undefined, undefined, function* () {
        const { _handle } = this;
        _handle._pending && (yield _handle._pending);
        const offset = _handle.size - magicAndPadding;
        const length = yield _handle.readInt32(offset);
        const buffer = yield _handle.readAt(offset - length, length);
        return Footer_.decode(buffer);
      });
    }
    _readNextMessageAndValidate(type) {
      return __awaiter(this, undefined, undefined, function* () {
        if (!this._footer) {
          yield this.open();
        }
        if (this._footer && this._recordBatchIndex < this.numRecordBatches) {
          const block = this._footer.getRecordBatch(this._recordBatchIndex);
          if (block && (yield this._handle.seek(block.offset))) {
            return yield this._reader.readMessage(type);
          }
        }
        return null;
      });
    }
  };
  RecordBatchJSONReaderImpl = class RecordBatchJSONReaderImpl extends RecordBatchStreamReaderImpl {
    constructor(source, dictionaries) {
      super(source, dictionaries);
    }
    _loadVectors(header, body, types) {
      return new JSONVectorLoader(body, header.nodes, header.buffers, this.dictionaries, this.schema.metadataVersion).visitMany(types);
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/visitor/vectorassembler.mjs
function addBuffer(values) {
  const byteLength = values.byteLength + 7 & ~7;
  this.buffers.push(values);
  this.bufferRegions.push(new BufferRegion(this._byteLength, byteLength));
  this._byteLength += byteLength;
  return this;
}
function assembleUnion(data) {
  var _a7;
  const { type, length, typeIds, valueOffsets } = data;
  addBuffer.call(this, typeIds);
  if (type.mode === UnionMode.Sparse) {
    return assembleNestedVector.call(this, data);
  } else if (type.mode === UnionMode.Dense) {
    if (data.offset <= 0) {
      addBuffer.call(this, valueOffsets);
      return assembleNestedVector.call(this, data);
    } else {
      const shiftedOffsets = new Int32Array(length);
      const childOffsets = Object.create(null);
      const childLengths = Object.create(null);
      for (let typeId, shift, index = -1;++index < length; ) {
        if ((typeId = typeIds[index]) === undefined) {
          continue;
        }
        if ((shift = childOffsets[typeId]) === undefined) {
          shift = childOffsets[typeId] = valueOffsets[index];
        }
        shiftedOffsets[index] = valueOffsets[index] - shift;
        childLengths[typeId] = ((_a7 = childLengths[typeId]) !== null && _a7 !== undefined ? _a7 : 0) + 1;
      }
      addBuffer.call(this, shiftedOffsets);
      this.visitMany(data.children.map((child, childIndex) => {
        const typeId = type.typeIds[childIndex];
        const childOffset = childOffsets[typeId];
        const childLength = childLengths[typeId];
        return child.slice(childOffset, Math.min(length, childLength));
      }));
    }
  }
  return this;
}
function assembleBoolVector(data) {
  let values;
  if (data.nullCount >= data.length) {
    return addBuffer.call(this, new Uint8Array(0));
  } else if ((values = data.values) instanceof Uint8Array) {
    return addBuffer.call(this, truncateBitmap(data.offset, data.length, values));
  }
  return addBuffer.call(this, packBools(data.values));
}
function assembleFlatVector(data) {
  return addBuffer.call(this, data.values.subarray(0, data.length * data.stride));
}
function assembleFlatListVector(data) {
  const { length, values, valueOffsets } = data;
  const begin = bigIntToNumber(valueOffsets[0]);
  const end = bigIntToNumber(valueOffsets[length]);
  const byteLength = Math.min(end - begin, values.byteLength - begin);
  addBuffer.call(this, rebaseValueOffsets(-begin, length + 1, valueOffsets));
  addBuffer.call(this, values.subarray(begin, begin + byteLength));
  return this;
}
function assembleListVector(data) {
  const { length, valueOffsets } = data;
  if (valueOffsets) {
    const { [0]: begin, [length]: end } = valueOffsets;
    addBuffer.call(this, rebaseValueOffsets(-begin, length + 1, valueOffsets));
    return this.visit(data.children[0].slice(begin, end - begin));
  }
  return this.visit(data.children[0]);
}
function assembleNestedVector(data) {
  return this.visitMany(data.type.children.map((_, i) => data.children[i]).filter(Boolean))[0];
}
var VectorAssembler;
var init_vectorassembler = __esm(() => {
  init_vector2();
  init_visitor();
  init_enum();
  init_recordbatch2();
  init_buffer();
  init_bit();
  init_message2();
  init_type2();
  VectorAssembler = class VectorAssembler extends Visitor {
    static assemble(...args) {
      const unwrap = (nodes) => nodes.flatMap((node) => Array.isArray(node) ? unwrap(node) : node instanceof RecordBatch2 ? node.data.children : node.data);
      const assembler = new VectorAssembler;
      assembler.visitMany(unwrap(args));
      return assembler;
    }
    constructor() {
      super();
      this._byteLength = 0;
      this._nodes = [];
      this._buffers = [];
      this._bufferRegions = [];
    }
    visit(data) {
      if (data instanceof Vector) {
        this.visitMany(data.data);
        return this;
      }
      const { type } = data;
      if (!DataType.isDictionary(type)) {
        const { length } = data;
        if (length > 2147483647) {
          throw new RangeError("Cannot write arrays larger than 2^31 - 1 in length");
        }
        if (DataType.isUnion(type)) {
          this.nodes.push(new FieldNode2(length, 0));
        } else {
          const { nullCount } = data;
          if (!DataType.isNull(type)) {
            addBuffer.call(this, nullCount <= 0 ? new Uint8Array(0) : truncateBitmap(data.offset, length, data.nullBitmap));
          }
          this.nodes.push(new FieldNode2(length, nullCount));
        }
      }
      return super.visit(data);
    }
    visitNull(_null4) {
      return this;
    }
    visitDictionary(data) {
      return this.visit(data.clone(data.type.indices));
    }
    get nodes() {
      return this._nodes;
    }
    get buffers() {
      return this._buffers;
    }
    get byteLength() {
      return this._byteLength;
    }
    get bufferRegions() {
      return this._bufferRegions;
    }
  };
  VectorAssembler.prototype.visitBool = assembleBoolVector;
  VectorAssembler.prototype.visitInt = assembleFlatVector;
  VectorAssembler.prototype.visitFloat = assembleFlatVector;
  VectorAssembler.prototype.visitUtf8 = assembleFlatListVector;
  VectorAssembler.prototype.visitLargeUtf8 = assembleFlatListVector;
  VectorAssembler.prototype.visitBinary = assembleFlatListVector;
  VectorAssembler.prototype.visitLargeBinary = assembleFlatListVector;
  VectorAssembler.prototype.visitFixedSizeBinary = assembleFlatVector;
  VectorAssembler.prototype.visitDate = assembleFlatVector;
  VectorAssembler.prototype.visitTimestamp = assembleFlatVector;
  VectorAssembler.prototype.visitTime = assembleFlatVector;
  VectorAssembler.prototype.visitDecimal = assembleFlatVector;
  VectorAssembler.prototype.visitList = assembleListVector;
  VectorAssembler.prototype.visitStruct = assembleNestedVector;
  VectorAssembler.prototype.visitUnion = assembleUnion;
  VectorAssembler.prototype.visitInterval = assembleFlatVector;
  VectorAssembler.prototype.visitDuration = assembleFlatVector;
  VectorAssembler.prototype.visitFixedSizeList = assembleListVector;
  VectorAssembler.prototype.visitMap = assembleListVector;
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/writer.mjs
function writeAll(writer, input) {
  let chunks = input;
  if (input instanceof Table) {
    chunks = input.batches;
    writer.reset(undefined, input.schema);
  }
  for (const batch of chunks) {
    writer.write(batch);
  }
  return writer.finish();
}
function writeAllAsync(writer, batches) {
  return __awaiter(this, undefined, undefined, function* () {
    var _a7, batches_1, batches_1_1;
    var _b2, e_1, _c2, _d2;
    try {
      for (_a7 = true, batches_1 = __asyncValues(batches);batches_1_1 = yield batches_1.next(), _b2 = batches_1_1.done, !_b2; _a7 = true) {
        _d2 = batches_1_1.value;
        _a7 = false;
        const batch = _d2;
        writer.write(batch);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (!_a7 && !_b2 && (_c2 = batches_1.return))
          yield _c2.call(batches_1);
      } finally {
        if (e_1)
          throw e_1.error;
      }
    }
    return writer.finish();
  });
}
var RecordBatchWriter, RecordBatchStreamWriter, RecordBatchFileWriter;
var init_writer = __esm(() => {
  init_tslib_es6();
  init_table();
  init_message3();
  init_vector2();
  init_message2();
  init_message2();
  init_file();
  init_enum();
  init_typecomparator();
  init_stream();
  init_vectorassembler();
  init_buffer();
  init_recordbatch2();
  init_interfaces();
  RecordBatchWriter = class RecordBatchWriter extends ReadableInterop {
    static throughNode(options) {
      throw new Error(`"throughNode" not available in this environment`);
    }
    static throughDOM(writableStrategy, readableStrategy) {
      throw new Error(`"throughDOM" not available in this environment`);
    }
    constructor(options) {
      super();
      this._position = 0;
      this._started = false;
      this._sink = new AsyncByteQueue;
      this._schema = null;
      this._dictionaryBlocks = [];
      this._recordBatchBlocks = [];
      this._seenDictionaries = new Map;
      this._dictionaryDeltaOffsets = new Map;
      isObject2(options) || (options = { autoDestroy: true, writeLegacyIpcFormat: false });
      this._autoDestroy = typeof options.autoDestroy === "boolean" ? options.autoDestroy : true;
      this._writeLegacyIpcFormat = typeof options.writeLegacyIpcFormat === "boolean" ? options.writeLegacyIpcFormat : false;
    }
    toString(sync = false) {
      return this._sink.toString(sync);
    }
    toUint8Array(sync = false) {
      return this._sink.toUint8Array(sync);
    }
    writeAll(input) {
      if (isPromise(input)) {
        return input.then((x) => this.writeAll(x));
      } else if (isAsyncIterable(input)) {
        return writeAllAsync(this, input);
      }
      return writeAll(this, input);
    }
    get closed() {
      return this._sink.closed;
    }
    [Symbol.asyncIterator]() {
      return this._sink[Symbol.asyncIterator]();
    }
    toDOMStream(options) {
      return this._sink.toDOMStream(options);
    }
    toNodeStream(options) {
      return this._sink.toNodeStream(options);
    }
    close() {
      return this.reset()._sink.close();
    }
    abort(reason) {
      return this.reset()._sink.abort(reason);
    }
    finish() {
      this._autoDestroy ? this.close() : this.reset(this._sink, this._schema);
      return this;
    }
    reset(sink = this._sink, schema = null) {
      if (sink === this._sink || sink instanceof AsyncByteQueue) {
        this._sink = sink;
      } else {
        this._sink = new AsyncByteQueue;
        if (sink && isWritableDOMStream(sink)) {
          this.toDOMStream({ type: "bytes" }).pipeTo(sink);
        } else if (sink && isWritableNodeStream(sink)) {
          this.toNodeStream({ objectMode: false }).pipe(sink);
        }
      }
      if (this._started && this._schema) {
        this._writeFooter(this._schema);
      }
      this._started = false;
      this._dictionaryBlocks = [];
      this._recordBatchBlocks = [];
      this._seenDictionaries = new Map;
      this._dictionaryDeltaOffsets = new Map;
      if (!schema || !compareSchemas(schema, this._schema)) {
        if (schema == null) {
          this._position = 0;
          this._schema = null;
        } else {
          this._started = true;
          this._schema = schema;
          this._writeSchema(schema);
        }
      }
      return this;
    }
    write(payload) {
      let schema = null;
      if (!this._sink) {
        throw new Error(`RecordBatchWriter is closed`);
      } else if (payload == null) {
        return this.finish() && undefined;
      } else if (payload instanceof Table && !(schema = payload.schema)) {
        return this.finish() && undefined;
      } else if (payload instanceof RecordBatch2 && !(schema = payload.schema)) {
        return this.finish() && undefined;
      }
      if (schema && !compareSchemas(schema, this._schema)) {
        if (this._started && this._autoDestroy) {
          return this.close();
        }
        this.reset(this._sink, schema);
      }
      if (payload instanceof RecordBatch2) {
        if (!(payload instanceof _InternalEmptyPlaceholderRecordBatch)) {
          this._writeRecordBatch(payload);
        }
      } else if (payload instanceof Table) {
        this.writeAll(payload.batches);
      } else if (isIterable(payload)) {
        this.writeAll(payload);
      }
    }
    _writeMessage(message, alignment = 8) {
      const a = alignment - 1;
      const buffer = Message2.encode(message);
      const flatbufferSize = buffer.byteLength;
      const prefixSize = !this._writeLegacyIpcFormat ? 8 : 4;
      const alignedSize = flatbufferSize + prefixSize + a & ~a;
      const nPaddingBytes = alignedSize - flatbufferSize - prefixSize;
      if (message.headerType === MessageHeader.RecordBatch) {
        this._recordBatchBlocks.push(new FileBlock(alignedSize, message.bodyLength, this._position));
      } else if (message.headerType === MessageHeader.DictionaryBatch) {
        this._dictionaryBlocks.push(new FileBlock(alignedSize, message.bodyLength, this._position));
      }
      if (!this._writeLegacyIpcFormat) {
        this._write(Int32Array.of(-1));
      }
      this._write(Int32Array.of(alignedSize - prefixSize));
      if (flatbufferSize > 0) {
        this._write(buffer);
      }
      return this._writePadding(nPaddingBytes);
    }
    _write(chunk) {
      if (this._started) {
        const buffer = toUint8Array(chunk);
        if (buffer && buffer.byteLength > 0) {
          this._sink.write(buffer);
          this._position += buffer.byteLength;
        }
      }
      return this;
    }
    _writeSchema(schema) {
      return this._writeMessage(Message2.from(schema));
    }
    _writeFooter(schema) {
      return this._writeLegacyIpcFormat ? this._write(Int32Array.of(0)) : this._write(Int32Array.of(-1, 0));
    }
    _writeMagic() {
      return this._write(MAGIC);
    }
    _writePadding(nBytes) {
      return nBytes > 0 ? this._write(new Uint8Array(nBytes)) : this;
    }
    _writeRecordBatch(batch) {
      const { byteLength, nodes, bufferRegions, buffers } = VectorAssembler.assemble(batch);
      const recordBatch = new RecordBatch3(batch.numRows, nodes, bufferRegions);
      const message = Message2.from(recordBatch, byteLength);
      return this._writeDictionaries(batch)._writeMessage(message)._writeBodyBuffers(buffers);
    }
    _writeDictionaryBatch(dictionary, id, isDelta = false) {
      const { byteLength, nodes, bufferRegions, buffers } = VectorAssembler.assemble(new Vector([dictionary]));
      const recordBatch = new RecordBatch3(dictionary.length, nodes, bufferRegions);
      const dictionaryBatch = new DictionaryBatch2(recordBatch, id, isDelta);
      const message = Message2.from(dictionaryBatch, byteLength);
      return this._writeMessage(message)._writeBodyBuffers(buffers);
    }
    _writeBodyBuffers(buffers) {
      let buffer;
      let size, padding;
      for (let i = -1, n = buffers.length;++i < n; ) {
        if ((buffer = buffers[i]) && (size = buffer.byteLength) > 0) {
          this._write(buffer);
          if ((padding = (size + 7 & ~7) - size) > 0) {
            this._writePadding(padding);
          }
        }
      }
      return this;
    }
    _writeDictionaries(batch) {
      var _a7, _b2;
      for (const [id, dictionary] of batch.dictionaries) {
        const chunks = (_a7 = dictionary === null || dictionary === undefined ? undefined : dictionary.data) !== null && _a7 !== undefined ? _a7 : [];
        const prevDictionary = this._seenDictionaries.get(id);
        const offset = (_b2 = this._dictionaryDeltaOffsets.get(id)) !== null && _b2 !== undefined ? _b2 : 0;
        if (!prevDictionary || prevDictionary.data[0] !== chunks[0]) {
          for (const [index, chunk] of chunks.entries())
            this._writeDictionaryBatch(chunk, id, index > 0);
        } else if (offset < chunks.length) {
          for (const chunk of chunks.slice(offset))
            this._writeDictionaryBatch(chunk, id, true);
        }
        this._seenDictionaries.set(id, dictionary);
        this._dictionaryDeltaOffsets.set(id, chunks.length);
      }
      return this;
    }
  };
  RecordBatchStreamWriter = class RecordBatchStreamWriter extends RecordBatchWriter {
    static writeAll(input, options) {
      const writer = new RecordBatchStreamWriter(options);
      if (isPromise(input)) {
        return input.then((x) => writer.writeAll(x));
      } else if (isAsyncIterable(input)) {
        return writeAllAsync(writer, input);
      }
      return writeAll(writer, input);
    }
  };
  RecordBatchFileWriter = class RecordBatchFileWriter extends RecordBatchWriter {
    static writeAll(input) {
      const writer = new RecordBatchFileWriter;
      if (isPromise(input)) {
        return input.then((x) => writer.writeAll(x));
      } else if (isAsyncIterable(input)) {
        return writeAllAsync(writer, input);
      }
      return writeAll(writer, input);
    }
    constructor() {
      super();
      this._autoDestroy = true;
    }
    _writeSchema(schema) {
      return this._writeMagic()._writePadding(2);
    }
    _writeDictionaryBatch(dictionary, id, isDelta = false) {
      if (!isDelta && this._seenDictionaries.has(id)) {
        throw new Error("The Arrow File format does not support replacement dictionaries. ");
      }
      return super._writeDictionaryBatch(dictionary, id, isDelta);
    }
    _writeFooter(schema) {
      const buffer = Footer_.encode(new Footer_(schema, MetadataVersion.V5, this._recordBatchBlocks, this._dictionaryBlocks));
      return super._writeFooter(schema)._write(buffer)._write(Int32Array.of(buffer.byteLength))._writeMagic();
    }
  };
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/whatwg/iterable.mjs
function toDOMStream(source, options) {
  if (isAsyncIterable(source)) {
    return asyncIterableAsReadableDOMStream(source, options);
  }
  if (isIterable(source)) {
    return iterableAsReadableDOMStream(source, options);
  }
  throw new Error(`toDOMStream() must be called with an Iterable or AsyncIterable`);
}
function iterableAsReadableDOMStream(source, options) {
  let it = null;
  const bm = (options === null || options === undefined ? undefined : options.type) === "bytes" || false;
  const hwm = (options === null || options === undefined ? undefined : options.highWaterMark) || Math.pow(2, 24);
  return new ReadableStream(Object.assign(Object.assign({}, options), {
    start(controller) {
      next(controller, it || (it = source[Symbol.iterator]()));
    },
    pull(controller) {
      it ? next(controller, it) : controller.close();
    },
    cancel() {
      ((it === null || it === undefined ? undefined : it.return) && it.return() || true) && (it = null);
    }
  }), Object.assign({ highWaterMark: bm ? hwm : undefined }, options));
  function next(controller, it2) {
    let buf;
    let r = null;
    let size = controller.desiredSize || null;
    while (!(r = it2.next(bm ? size : null)).done) {
      if (ArrayBuffer.isView(r.value) && (buf = toUint8Array(r.value))) {
        size != null && bm && (size = size - buf.byteLength + 1);
        r.value = buf;
      }
      controller.enqueue(r.value);
      if (size != null && --size <= 0) {
        return;
      }
    }
    controller.close();
  }
}
function asyncIterableAsReadableDOMStream(source, options) {
  let it = null;
  const bm = (options === null || options === undefined ? undefined : options.type) === "bytes" || false;
  const hwm = (options === null || options === undefined ? undefined : options.highWaterMark) || Math.pow(2, 24);
  return new ReadableStream(Object.assign(Object.assign({}, options), {
    start(controller) {
      return __awaiter(this, undefined, undefined, function* () {
        yield next(controller, it || (it = source[Symbol.asyncIterator]()));
      });
    },
    pull(controller) {
      return __awaiter(this, undefined, undefined, function* () {
        it ? yield next(controller, it) : controller.close();
      });
    },
    cancel() {
      return __awaiter(this, undefined, undefined, function* () {
        ((it === null || it === undefined ? undefined : it.return) && (yield it.return()) || true) && (it = null);
      });
    }
  }), Object.assign({ highWaterMark: bm ? hwm : undefined }, options));
  function next(controller, it2) {
    return __awaiter(this, undefined, undefined, function* () {
      let buf;
      let r = null;
      let size = controller.desiredSize || null;
      while (!(r = yield it2.next(bm ? size : null)).done) {
        if (ArrayBuffer.isView(r.value) && (buf = toUint8Array(r.value))) {
          size != null && bm && (size = size - buf.byteLength + 1);
          r.value = buf;
        }
        controller.enqueue(r.value);
        if (size != null && --size <= 0) {
          return;
        }
      }
      controller.close();
    });
  }
}
var init_iterable = __esm(() => {
  init_tslib_es6();
  init_buffer();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/whatwg/builder.mjs
function builderThroughDOMStream(options) {
  return new BuilderTransform(options);
}

class BuilderTransform {
  constructor(options) {
    this._numChunks = 0;
    this._finished = false;
    this._bufferedSize = 0;
    const { ["readableStrategy"]: readableStrategy, ["writableStrategy"]: writableStrategy, ["queueingStrategy"]: queueingStrategy = "count" } = options, builderOptions = __rest(options, ["readableStrategy", "writableStrategy", "queueingStrategy"]);
    this._controller = null;
    this._builder = makeBuilder(builderOptions);
    this._getSize = queueingStrategy !== "bytes" ? chunkLength : chunkByteLength;
    const { ["highWaterMark"]: readableHighWaterMark = queueingStrategy === "bytes" ? Math.pow(2, 14) : 1000 } = Object.assign({}, readableStrategy);
    const { ["highWaterMark"]: writableHighWaterMark = queueingStrategy === "bytes" ? Math.pow(2, 14) : 1000 } = Object.assign({}, writableStrategy);
    this["readable"] = new ReadableStream({
      ["cancel"]: () => {
        this._builder.clear();
      },
      ["pull"]: (c) => {
        this._maybeFlush(this._builder, this._controller = c);
      },
      ["start"]: (c) => {
        this._maybeFlush(this._builder, this._controller = c);
      }
    }, {
      highWaterMark: readableHighWaterMark,
      size: queueingStrategy !== "bytes" ? chunkLength : chunkByteLength
    });
    this["writable"] = new WritableStream({
      ["abort"]: () => {
        this._builder.clear();
      },
      ["write"]: () => {
        this._maybeFlush(this._builder, this._controller);
      },
      ["close"]: () => {
        this._maybeFlush(this._builder.finish(), this._controller);
      }
    }, {
      highWaterMark: writableHighWaterMark,
      size: (value) => this._writeValueAndReturnChunkSize(value)
    });
  }
  _writeValueAndReturnChunkSize(value) {
    const bufferedSize = this._bufferedSize;
    this._bufferedSize = this._getSize(this._builder.append(value));
    return this._bufferedSize - bufferedSize;
  }
  _maybeFlush(builder, controller) {
    if (controller == null) {
      return;
    }
    if (this._bufferedSize >= controller.desiredSize) {
      ++this._numChunks && this._enqueue(controller, builder.toVector());
    }
    if (builder.finished) {
      if (builder.length > 0 || this._numChunks === 0) {
        ++this._numChunks && this._enqueue(controller, builder.toVector());
      }
      if (!this._finished && (this._finished = true)) {
        this._enqueue(controller, null);
      }
    }
  }
  _enqueue(controller, chunk) {
    this._bufferedSize = 0;
    this._controller = null;
    chunk == null ? controller.close() : controller.enqueue(chunk);
  }
}
var chunkLength = (chunk) => {
  var _a7;
  return (_a7 = chunk === null || chunk === undefined ? undefined : chunk.length) !== null && _a7 !== undefined ? _a7 : 0;
}, chunkByteLength = (chunk) => {
  var _a7;
  return (_a7 = chunk === null || chunk === undefined ? undefined : chunk.byteLength) !== null && _a7 !== undefined ? _a7 : 0;
};
var init_builder3 = __esm(() => {
  init_tslib_es6();
  init_factories();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/whatwg/reader.mjs
function recordBatchReaderThroughDOMStream(writableStrategy, readableStrategy) {
  const queue = new AsyncByteQueue;
  let reader = null;
  const readable = new ReadableStream({
    cancel() {
      return __awaiter(this, undefined, undefined, function* () {
        yield queue.close();
      });
    },
    start(controller) {
      return __awaiter(this, undefined, undefined, function* () {
        yield next(controller, reader || (reader = yield open()));
      });
    },
    pull(controller) {
      return __awaiter(this, undefined, undefined, function* () {
        reader ? yield next(controller, reader) : controller.close();
      });
    }
  });
  return { writable: new WritableStream(queue, Object.assign({ highWaterMark: Math.pow(2, 14) }, writableStrategy)), readable };
  function open() {
    return __awaiter(this, undefined, undefined, function* () {
      return yield (yield RecordBatchReader.from(queue)).open(readableStrategy);
    });
  }
  function next(controller, reader2) {
    return __awaiter(this, undefined, undefined, function* () {
      let size = controller.desiredSize;
      let r = null;
      while (!(r = yield reader2.next()).done) {
        controller.enqueue(r.value);
        if (size != null && --size <= 0) {
          return;
        }
      }
      controller.close();
    });
  }
}
var init_reader2 = __esm(() => {
  init_tslib_es6();
  init_stream();
  init_reader();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/io/whatwg/writer.mjs
function recordBatchWriterThroughDOMStream(writableStrategy, readableStrategy) {
  const writer = new this(writableStrategy);
  const reader = new AsyncByteStream(writer);
  const readable = new ReadableStream({
    cancel() {
      return __awaiter(this, undefined, undefined, function* () {
        yield reader.cancel();
      });
    },
    pull(controller) {
      return __awaiter(this, undefined, undefined, function* () {
        yield next(controller);
      });
    },
    start(controller) {
      return __awaiter(this, undefined, undefined, function* () {
        yield next(controller);
      });
    }
  }, Object.assign({ highWaterMark: Math.pow(2, 14) }, readableStrategy));
  return { writable: new WritableStream(writer, writableStrategy), readable };
  function next(controller) {
    return __awaiter(this, undefined, undefined, function* () {
      let buf = null;
      let size = controller.desiredSize;
      while (buf = yield reader.read(size || null)) {
        controller.enqueue(buf);
        if (size != null && (size -= buf.byteLength) <= 0) {
          return;
        }
      }
      controller.close();
    });
  }
}
var init_writer2 = __esm(() => {
  init_tslib_es6();
  init_stream();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/ipc/serialization.mjs
function tableFromIPC(input) {
  const reader = RecordBatchReader.from(input);
  if (isPromise(reader)) {
    return reader.then((reader2) => tableFromIPC(reader2));
  }
  if (reader.isAsync()) {
    return reader.readAll().then((xs) => new Table(xs));
  }
  return new Table(reader.readAll());
}
function tableToIPC(table, type = "stream") {
  return (type === "stream" ? RecordBatchStreamWriter : RecordBatchFileWriter).writeAll(table).toUint8Array(true);
}
var init_serialization = __esm(() => {
  init_table();
  init_reader();
  init_writer();
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/Arrow.mjs
var util;
var init_Arrow = __esm(() => {
  init_type2();
  init_table();
  init_factories();
  init_serialization();
  init_bn();
  init_int2();
  init_bit();
  init_math();
  init_buffer();
  init_vector();
  init_typecomparator();
  util = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, exports_bn), exports_int), exports_bit), exports_math), exports_buffer), exports_vector), exports_pretty), {
    compareSchemas,
    compareFields,
    compareTypes
  });
});

// node_modules/.bun/apache-arrow@17.0.0/node_modules/apache-arrow/Arrow.dom.mjs
var init_Arrow_dom = __esm(() => {
  init_adapters();
  init_builder2();
  init_reader();
  init_writer();
  init_iterable();
  init_builder3();
  init_reader2();
  init_writer2();
  init_Arrow();
  adapters_default.toDOMStream = toDOMStream;
  Builder2["throughDOM"] = builderThroughDOMStream;
  RecordBatchReader["throughDOM"] = recordBatchReaderThroughDOMStream;
  RecordBatchFileReader["throughDOM"] = recordBatchReaderThroughDOMStream;
  RecordBatchStreamReader["throughDOM"] = recordBatchReaderThroughDOMStream;
  RecordBatchWriter["throughDOM"] = recordBatchWriterThroughDOMStream;
  RecordBatchFileWriter["throughDOM"] = recordBatchWriterThroughDOMStream;
  RecordBatchStreamWriter["throughDOM"] = recordBatchWriterThroughDOMStream;
});

// packages/file-io/codecs/arrow.ts
var exports_arrow = {};
__export(exports_arrow, {
  arrowCodec: () => arrowCodec
});
function cellToString(v) {
  if (v === null || v === undefined)
    return null;
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
var arrowCodec;
var init_arrow = __esm(() => {
  init_Arrow_dom();
  init_table_plan();
  init_values();
  arrowCodec = {
    id: "arrow",
    extensions: [".arrow", ".feather", ".arrows"],
    contentTypes: ["arrow", "feather", "vnd.apache.arrow"],
    parse(bytes, name) {
      warnIfHuge(bytes, name);
      const table = tableFromIPC(bytes);
      const columns = table.schema.fields.map((f) => f.name);
      const raw = table.toArray().map((r) => r.toJSON());
      return { rows: normalizeRows(raw), columns };
    },
    serialize(rows, columns) {
      const fields = {};
      for (const col of columns) {
        const values = rows.map((r) => cellToString(cellAt(r, col)));
        fields[col] = vectorFromArray(values, new Utf82);
      }
      return tableToIPC(new Table(fields), "file");
    }
  };
});

// packages/file-io/index.ts
init_table_plan();

// packages/file-io/codecs/registry.ts
var DESCRIPTORS = [
  {
    id: "csv",
    extensions: [".csv"],
    contentTypes: ["csv"],
    load: () => Promise.resolve().then(() => (init_csv(), exports_csv)).then((m) => m.csvCodec)
  },
  {
    id: "jsonl",
    extensions: [".jsonl", ".ndjson"],
    contentTypes: ["jsonl", "ndjson"],
    load: () => Promise.resolve().then(() => (init_jsonl(), exports_jsonl)).then((m) => m.jsonlCodec)
  },
  {
    id: "parquet",
    extensions: [".parquet", ".pq"],
    contentTypes: ["parquet"],
    load: () => Promise.resolve().then(() => (init_parquet(), exports_parquet)).then((m) => m.parquetCodec)
  },
  {
    id: "arrow",
    extensions: [".arrow", ".feather", ".arrows"],
    contentTypes: ["arrow", "feather", "vnd.apache.arrow"],
    load: () => Promise.resolve().then(() => (init_arrow(), exports_arrow)).then((m) => m.arrowCodec)
  }
];
function formatForExtension(pathname) {
  const lower = pathname.toLowerCase();
  for (const d of DESCRIPTORS) {
    if (d.extensions.some((ext) => lower.endsWith(ext)))
      return d.id;
  }
  return null;
}
function detectFormat(pathname, contentType) {
  const byExt = formatForExtension(pathname);
  if (byExt)
    return byExt;
  const ct = contentType?.toLowerCase() ?? "";
  for (const d of DESCRIPTORS) {
    if (d.contentTypes.some((frag) => ct.includes(frag)))
      return d.id;
  }
  return null;
}
// packages/file-io/index.ts
function sampleNameFromUrl(url2, format2) {
  const segment = url2.pathname.split("/").filter(Boolean).pop() ?? "";
  if (segment)
    return segment;
  return `download.${format2}`;
}
async function fetchTable(url2, fetchImpl = fetch) {
  const trimmed = url2.trim();
  if (!trimmed)
    throw new Error("Enter a URL.");
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("That doesn’t look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }
  let response;
  try {
    response = await fetchImpl(parsed.toString(), { redirect: "follow" });
  } catch (e) {
    throw new Error(`Couldn’t fetch ${parsed.hostname} — network error or CORS blocked. (${e.message})`);
  }
  if (!response.ok) {
    throw new Error(`Fetch failed: HTTP ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type");
  const format2 = detectFormat(parsed.pathname, contentType);
  if (!format2) {
    throw new Error("Could not detect format. URL must end in .csv, .jsonl, .parquet, or .arrow.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { name: sampleNameFromUrl(parsed, format2), bytes, format: format2 };
}
function serializeFlow(spec) {
  const source = (spec.table ? spec.table.split("/").pop() : "") || "input.csv";
  return JSON.stringify({ version: 2, source, spec }, null, 2) + `
`;
}

// packages/file-io/browser-fs.ts
var fsWindow = () => window;

class BrowserFilePort {
  hasFileSystemAccess = typeof window !== "undefined" && typeof fsWindow().showOpenFilePicker === "function";
  async pickOpen(accept) {
    if (this.hasFileSystemAccess) {
      try {
        const [handle] = await fsWindow().showOpenFilePicker({
          multiple: false,
          types: [{ description: "Tables", accept: { "text/*": accept } }]
        });
        if (!handle)
          return null;
        const file2 = await handle.getFile();
        return { name: file2.name, bytes: new Uint8Array(await file2.arrayBuffer()) };
      } catch (e) {
        if (e.name === "AbortError")
          return null;
        throw e;
      }
    }
    return this.pickOpenFallback(accept);
  }
  pickOpenFallback(accept) {
    return new Promise((resolve2, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept.join(",");
      input.style.display = "none";
      input.addEventListener("change", () => {
        const file2 = input.files?.[0];
        input.remove();
        if (!file2) {
          resolve2(null);
          return;
        }
        file2.arrayBuffer().then((buf) => resolve2({ name: file2.name, bytes: new Uint8Array(buf) }), reject);
      });
      document.body.appendChild(input);
      input.click();
    });
  }
  async pickSave(suggestedName, accept, content) {
    if (this.hasFileSystemAccess) {
      try {
        const handle = await fsWindow().showSaveFilePicker({
          suggestedName,
          types: [{ description: "Tables", accept: { "text/*": accept } }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return { status: "saved", name: handle.name };
      } catch (e) {
        if (e.name === "AbortError")
          return { status: "cancelled" };
        throw e;
      }
    }
    const url2 = URL.createObjectURL(new Blob([content], { type: "application/octet-stream" }));
    const anchor = document.createElement("a");
    anchor.href = url2;
    anchor.download = suggestedName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url2);
    return { status: "downloaded", name: suggestedName };
  }
}

// packages/file-io/demo.ts
var $ = (id) => document.getElementById(id);
var port = new BrowserFilePort;
$("fio-fsa").textContent = port.hasFileSystemAccess ? "File System Access API: available — Open and Save use real dialogs." : "File System Access API: missing — Open uses an upload field, Save downloads.";
var current = null;
function show(picked, format2) {
  current = picked;
  $("fio-name").textContent = picked.name;
  $("fio-format").textContent = format2 ?? detectFormat(picked.name, null) ?? "unknown";
  $("fio-preview").textContent = new TextDecoder().decode(picked.bytes).split(`
`).slice(0, 20).join(`
`);
  $("fio-error").textContent = "";
  $("fio-save").disabled = false;
}
function showError(e) {
  $("fio-error").textContent = e.message;
}
$("fio-open").addEventListener("click", async () => {
  try {
    const picked = await port.pickOpen([".csv", ".jsonl"]);
    if (picked)
      show(picked);
  } catch (e) {
    showError(e);
  }
});
$("fio-fetch").addEventListener("click", async () => {
  $("fio-error").textContent = "";
  try {
    const fetched = await fetchTable($("fio-url").value);
    show(fetched, fetched.format);
  } catch (e) {
    showError(e);
  }
});
$("fio-save").addEventListener("click", async () => {
  if (!current)
    return;
  try {
    const outcome = await port.pickSave(current.name, [".csv", ".jsonl"], current.bytes);
    $("fio-outcome").textContent = outcome.status === "cancelled" ? "cancelled" : `${outcome.status} as ${outcome.name}`;
  } catch (e) {
    showError(e);
  }
});
var sampleSpec = {
  table: "data/people.csv",
  columns: [{ id: "name" }, { id: "age" }],
  transformations: []
};
$("out").textContent = serializeFlow(sampleSpec);
