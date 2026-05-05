const COUNTRIES = [
  ["colombia", "Colombia"],
  ["columbia", "Colombia"],
  ["колумбия", "Colombia"],
  ["costa rica", "Costa Rica"],
  ["коста-рика", "Costa Rica"],
  ["коста рика", "Costa Rica"],
  ["ethiopia", "Ethiopia"],
  ["эфиопия", "Ethiopia"],
  ["kenya", "Kenya"],
  ["кения", "Kenya"],
  ["brazil", "Brazil"],
  ["бразилия", "Brazil"],
  ["china", "China"],
  ["китай", "China"],
  ["rwanda", "Rwanda"],
  ["руанда", "Rwanda"],
  ["guatemala", "Guatemala"],
  ["гватемала", "Guatemala"],
  ["honduras", "Honduras"],
  ["гондурас", "Honduras"],
  ["panama", "Panama"],
  ["панама", "Panama"],
];

const GENERIC_HEADINGS = [
  "filter coffee",
  "coffee",
  "specialty coffee",
  "filter",
  "под фильтр",
  "Подробнее:",
  "proudly roasted",
  "roasted in",
];

const PROCESS_PATTERNS = [
  [/анаэроб/i, "Anaerobic"],
  [/anaerob/i, "Anaerobic"],
  [/натурал/i, "Natural"],
  [/natural/i, "Natural"],
  [/мыт/i, "Washed"],
  [/washed/i, "Washed"],
  [/honey/i, "Honey"],
  [/хани/i, "Honey"],
];

const VARIETY_LABELS = ["разновидность", "variety"];
const DESCRIPTOR_LABELS = ["дескриптор", "notes", "flavor", "вкус", "taste"];

export function parseCoffeeText(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lowered = lines.map((line) => line.toLowerCase());
  const coffeeName = pickCoffeeName(lines, lowered);
  const originCountry = extractCountry(lowered.join("\n"));
  const process = extractProcess(lowered.join("\n"));
  const variety = extractVariety(lines);
  const descriptors = extractDescriptors(lines);
  const roasterName = extractRoaster(lines, coffeeName);

  return {
    coffeeName,
    roasterName,
    originCountry,
    process,
    variety,
    descriptors,
  };
}

function pickCoffeeName(lines, lowered) {
  for (let index = 0; index < Math.min(lines.length, 6); index += 1) {
    const line = lines[index];
    const normalized = lowered[index];

    if (normalized.length < 4) continue;
    if (GENERIC_HEADINGS.some((item) => normalized.includes(item.toLowerCase()))) continue;
    if (/^(обработка|разновидность|ростер|roasted|filter)/i.test(line)) continue;
    if (/^[0-9]{2,4}\s?(g|гр|г)$/i.test(line)) continue;

    return line;
  }

  return lines[0] ?? "Unknown Coffee";
}

function extractCountry(rawText) {
  for (const [pattern, label] of COUNTRIES) {
    if (rawText.includes(pattern)) {
      return label;
    }
  }
  return null;
}

function extractProcess(rawText) {
  const matches = [];
  for (const [regex, label] of PROCESS_PATTERNS) {
    if (regex.test(rawText)) {
      matches.push(label);
    }
  }
  if (!matches.length) return null;
  return [...new Set(matches)].join(", ");
}

function extractVariety(lines) {
  for (const line of lines) {
    const lowered = line.toLowerCase();
    for (const label of VARIETY_LABELS) {
      const index = lowered.indexOf(label);
      if (index !== -1) {
        const value = line.slice(index + label.length).replace(/^[:\s-]+/, "").trim();
        if (value) return value;
      }
    }
  }
  return null;
}

function extractDescriptors(lines) {
  for (const line of lines) {
    const lowered = line.toLowerCase();

    for (const label of DESCRIPTOR_LABELS) {
      const index = lowered.indexOf(label);
      if (index !== -1) {
        const value = line.slice(index + label.length).replace(/^[:\s-]+/, "").trim();
        const parsed = splitDescriptors(value);
        if (parsed.length) return parsed;
      }
    }

    if (line.includes(",") && line.length > 12) {
      const parsed = splitDescriptors(line);
      if (parsed.length >= 2) return parsed;
    }
  }

  return [];
}

function splitDescriptors(value) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 1)
    .slice(0, 6);
}

function extractRoaster(lines, coffeeName) {
  const coffeeNameLower = (coffeeName ?? "").toLowerCase();

  for (const line of lines.slice(0, 5)) {
    const lowered = line.toLowerCase();
    if (lowered === coffeeNameLower) continue;
    if (lowered.includes("coffee") && !lowered.includes("filter coffee")) return line;
    if (lowered.includes(".coffee")) return line;
    if (lowered.includes("roasted in")) continue;
  }

  return null;
}
