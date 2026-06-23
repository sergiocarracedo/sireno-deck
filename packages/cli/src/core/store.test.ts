import { describe, expect, it } from "vitest";

import { createStore } from "./store.ts";

describe("createStore", () => {
  it("get returns undefined for missing key", () => {
    const store = createStore();
    const scope = store.buttonScope<number>("test", "btn");
    expect(scope.get("missing")).toBeUndefined();
  });

  it("set + get roundtrip", () => {
    const store = createStore();
    const scope = store.buttonScope<string>("test", "btn");
    scope.set("greeting", "hello");
    expect(scope.get("greeting")).toBe("hello");
  });

  it("update applies function to current value", () => {
    const store = createStore();
    const scope = store.buttonScope<number>("test", "btn");
    scope.set("count", 5);
    const next = scope.update("count", (n) => (n ?? 0) + 1);
    expect(next).toBe(6);
    expect(scope.get("count")).toBe(6);
  });

  it("update on missing key uses undefined as input", () => {
    const store = createStore();
    const scope = store.buttonScope<number>("test", "btn");
    const next = scope.update("first", (n) => (n ?? 0) + 10);
    expect(next).toBe(10);
  });

  it("clear removes all keys", () => {
    const store = createStore();
    const scope = store.buttonScope<string>("test", "btn");
    scope.set("a", "1");
    scope.set("b", "2");
    scope.clear();
    expect(scope.snapshot()).toEqual({});
  });

  it("snapshot returns a frozen map of all keys", () => {
    const store = createStore();
    const scope = store.buttonScope<string>("test", "btn");
    scope.set("a", "1");
    scope.set("b", "2");
    const snap = scope.snapshot();
    expect(snap).toEqual({ a: "1", b: "2" });
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it("addon scopes are isolated by addonName", () => {
    const store = createStore();
    store.addonScope<string>("addon-a").set("key", "from-a");
    store.addonScope<string>("addon-b").set("key", "from-b");
    expect(store.addonScope<string>("addon-a").get("key")).toBe("from-a");
    expect(store.addonScope<string>("addon-b").get("key")).toBe("from-b");
  });

  it("button scopes are isolated from addon scopes for the same addon", () => {
    const store = createStore();
    store.addonScope<string>("addon-a").set("k", "addon-value");
    store.buttonScope<string>("addon-a", "btn-1").set("k", "button-value");
    expect(store.addonScope<string>("addon-a").get("k")).toBe("addon-value");
    expect(store.buttonScope<string>("addon-a", "btn-1").get("k")).toBe("button-value");
  });

  it("button scopes are isolated by buttonId", () => {
    const store = createStore();
    store.buttonScope<string>("addon-a", "btn-1").set("k", "v1");
    store.buttonScope<string>("addon-a", "btn-2").set("k", "v2");
    expect(store.buttonScope<string>("addon-a", "btn-1").get("k")).toBe("v1");
    expect(store.buttonScope<string>("addon-a", "btn-2").get("k")).toBe("v2");
  });

  it("clearAddon removes addon scope but keeps button scopes", () => {
    const store = createStore();
    store.addonScope<string>("addon-a").set("k", "addon");
    store.buttonScope<string>("addon-a", "btn-1").set("k", "button");
    store.clearAddon("addon-a");
    expect(store.addonScope<string>("addon-a").get("k")).toBeUndefined();
    expect(store.buttonScope<string>("addon-a", "btn-1").get("k")).toBe("button");
  });
});
