const test = require("node:test");
const assert = require("node:assert");
const { totalPrice, applyDiscount, average, formatName } = require("../src/cart");

test("totalPrice sums price * qty", () => {
  const items = [
    { price: 10, qty: 2 },
    { price: 5, qty: 1 },
  ];
  assert.strictEqual(totalPrice(items), 25);
});

test("totalPrice of an empty cart is 0", () => {
  assert.strictEqual(totalPrice([]), 0);
});

test("applyDiscount takes a percentage (20 means 20%)", () => {
  assert.strictEqual(applyDiscount(200, 20), 160);
});

test("average of numbers", () => {
  assert.strictEqual(average([2, 4, 6]), 4);
});

test("formatName trims and uppercases", () => {
  assert.strictEqual(formatName({ name: "  ada " }), "ADA");
});

test("formatName falls back to GUEST when there is no user", () => {
  assert.strictEqual(formatName(null), "GUEST");
});
