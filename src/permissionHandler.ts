import { Store } from "./store";

export class PermissionHandler {
  static checkReadPermission(store: any, key: string) {
    if (store instanceof Store && !store.allowedToRead(key)) {
      throw new Error(`Read access denied for key: ${key}`);
    }
  }

  static checkWritePermission(store: any, key: string) {
    if (store instanceof Store && !store.allowedToWrite(key)) {
      const property = store.read(key);
      if (!property && !store.allowedToWrite(key)) {
        throw new Error(`Write access denied for key: ${key}`);
      }
    }
  }
}
