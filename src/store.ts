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

export function Restrict(...permissions: Permission[]): any {
  return (target: Object, propertyKey: string | symbol) => {
    permissions.forEach((permission) =>
      Reflect.defineMetadata(
        permissionMetadataKey,
        permission,
        target,
        propertyKey,
      ),
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
    let current: any = this;

    keys.forEach((key) => {
      if (current instanceof Store && !current.allowedToRead(key)) {
        throw new Error(`Read access denied for key: ${key}`);
      }
      current = current[key];
    });

    return current;
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":");
    let current: any = this;
    let store: Store = this;

    keys.forEach((key) => {
      if (current instanceof Store) {
        store = current;
      }
      if (current[key] === undefined) {
        if (!store.allowedToWrite(key)) {
          throw new Error(`Write access denied for key: ${key}`);
        }
        current[key] = {};
      }
      current = current[key];
    });

    const lastKey = keys.pop();
    if (lastKey) {
      if (!store.allowedToWrite(lastKey)) {
        throw new Error(`Write access denied for key: ${lastKey}`);
      }
      store.setProperty(lastKey, value);
    }
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

  private setProperty(key: string, value: StoreValue): void {
    Reflect.set(this, key, value);
  }
}
