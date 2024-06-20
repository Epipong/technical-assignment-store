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

/**
 * decorator should be able to set the access permissions
 * to the data fields of the classes that use it
 * @param permission can be "r": read-only; "w": write-only; "rw": read and write; "none": no access
 * @returns
 */
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

  /**
   * check permission if the key is allowed to read.
   * @param key
   * @returns
   */
  allowedToRead(key: string): boolean {
    const permission = this.getPermission(key);
    return permission.includes("r");
  }

  /**
   * check permission if the key is allowed to write.
   * @param key
   * @returns
   */
  allowedToWrite(key: string): boolean {
    const permission = this.getPermission(key);
    return permission.includes("w");
  }

  /**
   * read a value from the path given.
   * @param path nested keys
   * @returns the value from the path.
   */
  read(path: string): StoreResult {
    const keys = path.split(":");
    let currentProp: any = this;
    keys.forEach((key) => {
      PermissionHandler.checkReadPermission(currentProp, key);
      currentProp = Utils.extractValue(currentProp[key]);
    });
    return currentProp;
  }

  /**
   * write a value to the path.
   * @param path nested keys
   * @param value value to assign
   * @returns
   */
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

  /**
   * write new entries.
   * @param entries values to write in the store.
   */
  writeEntries(entries: JSONObject): void {
    for (const [key, value] of Object.entries(entries)) {
      PermissionHandler.checkWritePermission(this, key);
      this.setProperty(key, value);
    }
  }

  /**
   * list all existing entries.
   * @returns allowed entries
   */
  entries(): JSONObject {
    const entries: JSONObject = {};
    for (const key in this) {
      const permission = this.getPermission(key);
      if (permission.includes("r")) {
        entries[key] = this[key] as JSONValue;
      }
    }
    return entries;
  }

  /**
   * get the permission of a specific key.
   * @param key
   * @returns
   */
  private getPermission(key: string): Permission {
    const permission = Reflect.getMetadata(permissionMetadataKey, this, key);
    return permission || this.defaultPolicy;
  }

  /**
   * set an existing or new property.
   * @param key
   * @param value
   */
  private setProperty(key: string, value: StoreValue) {
    Reflect.set(this, key, value);
  }
}
