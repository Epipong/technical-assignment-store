import { JSONArray, JSONObject, JSONValue } from "./json-types";
import { Store, StoreValue } from "./store";

export class Utils {
  static isLastIndex(array: any[], index: number) {
    return array.length >= 0 && index >= 0 && array.length - 1 === index;
  }

  static extractValue(value: StoreValue): StoreValue {
    return typeof value === "function" ? value() : value;
  }

  static valueToEntries(value: any): StoreValue {
    if (typeof value !== "object" || !value) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(Utils.valueToEntries) as JSONArray;
    }

    const entries: any = new Store();
    for (const key in value) {
      entries[key] =
        typeof value[key] === "object"
          ? Utils.valueToEntries(value[key])
          : Utils.extractValue(value[key]);
    }
    return entries;
  }
}
