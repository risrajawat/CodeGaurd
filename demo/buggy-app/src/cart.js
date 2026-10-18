// Shopping cart helpers (contains deliberate bugs for the CodeGuard demo)

function totalPrice(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}

function applyDiscount(total, percent) {
  return total - total * percent;
}

function average(numbers) {
  return numbers.reduce((a, b) => a + b, 0) / numbers.lenght;
}

function formatName(user) {
  return user.name.trim().toUpperCase();
}

module.exports = { totalPrice, applyDiscount, average, formatName };
