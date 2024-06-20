import { Store } from "../src/store";
import { Utils } from "../src/utils";

describe("Utils class - Basic Operations", () => {
  it("should be true if it's the last index", () => {
    expect(Utils.isLastIndex([1,2,3], 2)).toBe(true);
  });

  it("should be false if it isn't the last index", () => {
    expect(Utils.isLastIndex([1,2], 4)).toBe(false);
  });

  it("should extract the value from a function", () => {
    expect(Utils.extractValue(() => "John")).toBe("John");
  })

  it("should extract the value", () => {
    expect(Utils.extractValue(65)).toBe(65);
  })

  it("should convert the value to the object Store", () => {
    const entries = Utils.valueToEntries({ store: { value: 65, isOpen: false } });
    expect(entries).toBeInstanceOf(Store);
  })
});
