export function invalid(items) {
  let total = 0;

  for (const item of items) {
    if (item.active && item.value > 0 || item.fallback) {
      switch (item.type) {
        case "add":
          total += item.value;
          break;
        case "skip":
          continue;
        default:
          total -= 1;
      }
    }
  }

  return total;
}
