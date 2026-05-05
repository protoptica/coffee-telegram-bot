export function formatCoffeeCard(entry) {
  const lines = [
    `☕ ${entry.coffeeName || "Unknown coffee"}`,
    entry.roasterName ? `Roaster: ${entry.roasterName}` : null,
    entry.originCountry ? `Origin: ${entry.originCountry}` : null,
    entry.process ? `Process: ${entry.process}` : null,
    entry.variety ? `Variety: ${entry.variety}` : null,
    entry.descriptors?.length ? `Notes: ${entry.descriptors.join(", ")}` : null,
    entry.rating ? `Rating: ${"●".repeat(entry.rating)} (${entry.rating}/5)` : null,
  ];

  return lines.filter(Boolean).join("\n");
}

export function formatEntryList(entries) {
  if (!entries.length) {
    return "No coffees saved yet. Send me a bag photo to start your collection.";
  }

  return entries
    .map((entry, index) => {
      const date = new Date(entry.createdAt).toLocaleDateString("en-GB");
      const rating = entry.rating ? ` - ${entry.rating}/5` : "";
      return `${index + 1}. ${entry.coffeeName} (${date})${rating}`;
    })
    .join("\n");
}
