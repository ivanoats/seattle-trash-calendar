import { expect, it } from "vitest";
import {
  RememberedAddress,
  addressStorageKey,
} from "../src/adapters/remembered-address";
import { addresses } from "./fixtures";
it("stores only a versioned address and supports explicit removal", () => {
  const data = new Map<string, string>();
  const remembered = new RememberedAddress(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  }));
  expect(remembered.read()).toBeUndefined();
  expect(remembered.save(addresses[0])).toBe(true);
  expect(remembered.read()).toEqual(addresses[0]);
  expect(JSON.parse(data.get(addressStorageKey)!)).toEqual({
    version: 1,
    ...addresses[0],
  });
  expect(remembered.forget()).toBe(true);
  expect(remembered.read()).toBeUndefined();
});
it.each([
  "broken",
  "{}",
  '{"version":2}',
  '{"version":1,"id":"","label":"a"}',
  '{"version":1,"id":"a","label":5}',
])("ignores invalid storage: %s", (value) => {
  const remembered = new RememberedAddress(() => ({
    getItem: () => value,
    setItem: () => {},
    removeItem: () => {},
  }));
  expect(remembered.read()).toBeUndefined();
});
it("degrades gracefully when accessing storage throws", () => {
  const remembered = new RememberedAddress(() => {
    throw new Error("blocked");
  });
  expect(remembered.read()).toBeUndefined();
  expect(remembered.save(addresses[0])).toBe(false);
  expect(remembered.forget()).toBe(false);
});
