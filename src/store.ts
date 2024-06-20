import "reflect-metadata";

import { JSONArray, JSONObject, JSONPrimitive, JSONValue } from "./json-types";
import { PermissionHandler } from "./permissionHandler";
import { Utils } from "./utils";

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
      PermissionHandler.checkReadPermission(currentProp, key);
      currentProp = Utils.extractValue(currentProp[key]);
    });
    return currentProp;
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":");
    let currentProp: any = this;
    const entries = Utils.valueToEntries(value);

    keys.forEach((key, index) => {
      PermissionHandler.checkWritePermission(currentProp, key);
      currentProp[key] = Utils.isLastIndex(keys, index)
        ? Utils.extractValue(entries)
        : new Store();
      currentProp = currentProp[key];
    });
    return Utils.extractValue(value);
  }

  writeEntries(entries: JSONObject): void {
    for (const [key, value] of Object.entries(entries)) {
      PermissionHandler.checkWritePermission(this, key);
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

  private setProperty(key: string, value: StoreValue) {
    Reflect.set(this, key, value);
  }
}
