import { Store, StoreValue } from "./store";

export class Utils {
  static isLastIndex(array: any[], index: number) {
    return array.length >= 0 && index >= 0 && array.length - 1 === index;
  }

  static extractValue(value: StoreValue): StoreValue {
    return typeof value === "function" ? value() : value;
  }

  static valueToEntries(value: any): StoreValue {
    if (typeof value !== "object") {
      return value;
    }

    const entries: any = new Store();
    for (const key in value) {
      entries[key] =
        typeof value[key] === "object"
          ? this.valueToEntries(value[key])
          : Utils.extractValue(value[key]);
    }
    return entries;
  }
}
