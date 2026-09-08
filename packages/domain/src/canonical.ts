import { failProtocol, ProtocolError } from "./errors";

declare const canonicalJsonBrand: unique symbol;

export type CanonicalJson = string & {
  readonly [canonicalJsonBrand]: "RovaultaCanonicalJsonV1";
};

export type CanonicalValue =
  | null
  | boolean
  | string
  | number
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

const MAX_CANONICAL_DEPTH = 64;
const MAX_CANONICAL_NODES = 10_000;

interface CanonicalState {
  readonly active: Set<object>;
  nodes: number;
}

function failCanonical(message: string, path: string): never {
  return failProtocol("CANONICALIZATION_FAILURE", message, path);
}

function assertCanonicalString(value: string, path: string): void {
  if (value.normalize("NFC") !== value) {
    failCanonical("Strings must already use NFC normalization", path);
  }

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        failCanonical("Strings must not contain unpaired UTF-16 surrogates", path);
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      failCanonical("Strings must not contain unpaired UTF-16 surrogates", path);
    }
  }
}

function enterNode(value: object, state: CanonicalState, path: string): void {
  if (state.active.has(value)) failCanonical("Cyclic values are not supported", path);
  state.active.add(value);
}

function serializeArray(
  value: readonly unknown[],
  state: CanonicalState,
  depth: number,
  path: string,
): string {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    return failCanonical("Only ordinary arrays are supported", path);
  }

  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key === "symbol") failCanonical("Symbol keys are not supported", path);
    if (key === "length") continue;
    if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
      failCanonical("Arrays must not have custom properties", path);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      failCanonical("Accessors and hidden array properties are not supported", path);
    }
  }

  enterNode(value, state, path);
  try {
    const items: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) failCanonical("Sparse arrays are not supported", path);
      items.push(serializeValue(value[index], state, depth + 1, `${path}[${index}]`));
    }
    return `[${items.join(",")}]`;
  } finally {
    state.active.delete(value);
  }
}

function serializeObject(
  value: object,
  state: CanonicalState,
  depth: number,
  path: string,
): string {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return failCanonical("Only plain data objects are supported", path);
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    return failCanonical("Symbol keys are not supported", path);
  }

  const keys = ownKeys as string[];
  for (const key of keys) {
    assertCanonicalString(key, path);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      failCanonical("Accessors and hidden properties are not supported", path);
    }
  }

  keys.sort();
  enterNode(value, state, path);
  try {
    const fields = keys.map((key, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        return failCanonical("Object changed during canonicalization", path);
      }
      return `${JSON.stringify(key)}:${serializeValue(
        descriptor.value,
        state,
        depth + 1,
        `${path}.{${index}}`,
      )}`;
    });
    return `{${fields.join(",")}}`;
  } finally {
    state.active.delete(value);
  }
}

function serializeValue(
  value: unknown,
  state: CanonicalState,
  depth: number,
  path: string,
): string {
  state.nodes += 1;
  if (depth > MAX_CANONICAL_DEPTH || state.nodes > MAX_CANONICAL_NODES) {
    return failCanonical("Canonical value exceeds structural limits", path);
  }

  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    assertCanonicalString(value, path);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      return failCanonical("Numbers must be safe integers and must not be negative zero", path);
    }
    return String(value);
  }
  if (Array.isArray(value)) return serializeArray(value, state, depth, path);
  if (typeof value === "object") return serializeObject(value, state, depth, path);

  return failCanonical("Unsupported canonical value type", path);
}

/** Serializes the strict Rovaulta Canonical JSON v1 data subset. */
export function canonicalSerialize(value: unknown): CanonicalJson {
  try {
    return serializeValue(
      value,
      { active: new Set<object>(), nodes: 0 },
      0,
      "$canonical",
    ) as CanonicalJson;
  } catch (error) {
    if (error instanceof ProtocolError) throw error;
    return failCanonical("Canonicalization failed while inspecting the value", "$canonical");
  }
}

/** UTF-8 encodes canonical JSON without relying on browser or Node globals. */
export function canonicalBytes(value: unknown): Uint8Array {
  const canonical = canonicalSerialize(value);
  const bytes: number[] = [];

  for (let index = 0; index < canonical.length; index += 1) {
    let codePoint = canonical.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const low = canonical.charCodeAt(index + 1);
      codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
      index += 1;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return Uint8Array.from(bytes);
}
