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
      )
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
      currentProp = currentProp[key];
    });
    return currentProp;
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":");
    let currentProp: any = this;

    keys.forEach((key, index) => {
      if (!currentProp[key]) {
        this.checkStoreAndAllowedToWrite(currentProp, key);
        currentProp[key] = index === keys.length - 1 ? value : {};
      } else if (index === keys.length - 1) {
        currentProp[key] = value;
      }
      currentProp = currentProp[key];
    });
    return value;
  }

  writeEntries(entries: JSONObject): void {
    throw new Error("Method not implemented.");
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

  private checkStoreAndAllowedToRead(store: any, key: string) {
    if (store instanceof Store && !store.allowedToRead(key)) {
      throw new Error(`Read access denied for key: ${key}`);
    }
  }

  private checkStoreAndAllowedToWrite(store: any, key: string) {
    if (store instanceof Store) {
      const property = store.getProperty(key);
      if (!property && !store.allowedToWrite(key)) {
        throw new Error(`Write access denied for key: ${key}`);
      }
    }
  }
}
