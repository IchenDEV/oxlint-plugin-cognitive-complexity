export function valid(value) {
  if (value > 10) {
    return "large";
  }

  return value ?? "missing";
}
