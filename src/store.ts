import "reflect-metadata";

import { JSONArray, JSONObject, JSONPrimitive, JSONValue } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

const permissionMetadataKey = Symbol("permission");

export function Restrict(permission?: Permission): any {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(
      permissionMetadataKey,
      permission || "none",
      target,
      propertyKey,
    );
  };
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";

  allowedToRead(key: string): boolean {
    const permission = this.getPermission(key);
    return permission.includes("r");
  }

  allowedToWrite(key: string): boolean {
    const permission = this.getPermission(key);
    return permission.includes("w");
  }

  read(path: string): StoreResult {
    const keys = path.split(":");
    let currentProp: any = this;
    keys.forEach((key) => {
      this.checkStoreAndAllowedToRead(currentProp, key);
      currentProp = this.extractValue(currentProp[key]);
    });
    return currentProp;
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":");
    let currentProp: any = this;
    const entries = this.valueToEntries({ value });

    keys.forEach((key, index) => {
      if (!currentProp[key]) {
        this.checkStoreAndAllowedToWrite(currentProp, key);
        currentProp[key] = this.isLastIndex(keys, index)
          ? entries
          : new Store();
      } else if (this.isLastIndex(keys, index)) {
        currentProp[key] = entries;
      }
      currentProp = currentProp[key];
    });
    return value;
  }

  writeEntries(entries: JSONObject): void {
    for (const [key, value] of Object.entries(entries)) {
      this.checkStoreAndAllowedToWrite(this, key);
      this.setProperty(key, value);
    }
  }

  entries(): JSONObject {
    const entries: JSONObject = {};

    for (const key in this) {
      const permission = this.getPermission(key);
      if (!permission.includes("none")) {
        entries[key] = this[key] as JSONValue;
      }
    }
    return entries;
  }

  private getPermission(key: string): Permission {
    const permission = Reflect.getMetadata(permissionMetadataKey, this, key);
    return permission || this.defaultPolicy;
  }

  private getProperty<T extends StoreValue>(key: string): T {
    return Reflect.get(this, key) as T;
  }

  private setProperty(key: string, value: StoreValue) {
    Reflect.set(this, key, value);
  }

  private checkStoreAndAllowedToRead(store: any, key: string) {
    if (store instanceof Store && !store.allowedToRead(key)) {
      throw new Error(`Read access denied for key: ${key}`);
    }
  }

  private isLastIndex(array: any[], index: number) {
    return array.length - 1 === index;
  }

  private checkStoreAndAllowedToWrite(store: any, key: string) {
    if (store instanceof Store) {
      const property = store.getProperty(key);
      if (!property && !store.allowedToWrite(key)) {
        throw new Error(`Write access denied for key: ${key}`);
      }
    }
  }

  private extractValue(value: StoreValue): StoreValue {
    return typeof value === "function" ?
      value() :
      value;
  }

  private valueToEntries({
    entries = {},
    value,
  }: {
    entries?: any;
    value: any;
  }) {
    if (typeof value !== "object") {
      return value;
    }
    for (const key in value) {
      if (typeof value[key] === "object") {
        entries[key] = new Store();
        this.valueToEntries({ entries: entries[key], value: value[key] });
      } else {
        entries[key] = value[key];
      }
    }

    return entries;
  }
}
