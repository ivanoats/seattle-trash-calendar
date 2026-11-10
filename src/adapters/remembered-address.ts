import type { Address } from "../domain/calendar";

export const addressStorageKey = "seattle-pickup:address:v1";
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class RememberedAddress {
  constructor(private readonly storage: () => StoragePort) {}
  read(): Address | undefined {
    try {
      const value = JSON.parse(
        this.storage().getItem(addressStorageKey) ?? "null",
      );
      if (
        value?.version === 1 &&
        typeof value.id === "string" &&
        value.id.length > 0 &&
        value.id.length <= 200 &&
        typeof value.label === "string" &&
        value.label.length > 0 &&
        value.label.length <= 500
      ) {
        return { id: value.id, label: value.label };
      }
    } catch {
      /* Storage may be disabled or contain malformed data. */
    }
    return undefined;
  }
  save(address: Address): boolean {
    try {
      this.storage().setItem(
        addressStorageKey,
        JSON.stringify({ version: 1, ...address }),
      );
      return true;
    } catch {
      return false;
    }
  }
  forget(): boolean {
    try {
      this.storage().removeItem(addressStorageKey);
      return true;
    } catch {
      return false;
    }
  }
}
