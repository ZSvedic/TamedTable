# ChatGPT, "Give me the steps as a script I can run myself."

Copied with the panel's copy button. Host text below, unchanged.

Paste this into **Excel → Automate → New Script** and run it on the active sheet. It applies the same cleanup: names, countries, DOBs, and available phone numbers; blank phones stay blank.

```typescript
function main(workbook: ExcelScript.Workbook) {
  const sheet = workbook.getActiveWorksheet();
  const used = sheet.getUsedRange();
  if (!used) return;

  const values = used.getValues();
  const headers = values[0].map(v => String(v).trim());

  const firstNameCol = headers.indexOf("FirstName");
  const lastNameCol = headers.indexOf("LastName");
  const dobCol = headers.indexOf("DOB");
  const countryCol = headers.indexOf("Country");
  const phoneCol = headers.indexOf("Phone");

  if ([firstNameCol, lastNameCol, dobCol, countryCol, phoneCol].some(c => c < 0)) {
    throw new Error("Expected columns: FirstName, LastName, DOB, Country, Phone.");
  }

  const countryMap: Record<string, string> = {
    "UK": "United Kingdom",
    "England": "United Kingdom",
    "The Bahamas": "Bahamas",
    "Deutschland": "Germany"
  };

  const countryCodes: Record<string, string> = {
    "USA": "1",
    "Canada": "1",
    "Bahamas": "1242",
    "United Kingdom": "44",
    "Australia": "61",
    "Croatia": "385",
    "Germany": "49",
    "Spain": "34",
    "China": "86",
    "Japan": "81",
    "Saudi Arabia": "966"
  };

  function titleCaseName(value: string, isLastName = false): string {
    if (!value) return value;

    const particles = new Set(["van", "der", "de", "den", "von", "da", "di"]);
    const words = value.toLowerCase().split(/\s+/);

    return words.map((word, index) => {
      if (isLastName && index > 0 && particles.has(word)) return word;

      // O'Neil / D'Angelo
      let result = word.replace(/(^|['’-])([a-zà-ÿ])/g, (_, prefix, letter) =>
        prefix + letter.toUpperCase()
      );

      // McDonald
      if (result.startsWith("Mc") && result.length > 2) {
        result = "Mc" + result.charAt(2).toUpperCase() + result.slice(3);
      }

      return result.charAt(0).toUpperCase() + result.slice(1);
    }).join(" ");
  }

  function parseDate(value: string): number | null {
    const text = value.trim()
      .replace(/^'+|'+$/g, "")
      .replace(/(\d+)(st|nd|rd|th)/gi, "$1");

    if (!text || text === "NA" || text === "-") return null;

    let year: number, month: number, day: number;
    let match: RegExpMatchArray | null;

    // yyyy-mm-dd, yyyy/mm/dd, yyyy.mm.dd, yyyy_mm_dd
    match = text.match(/^(\d{4})[-/._](\d{1,2})[-/._](\d{1,2})$/);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      // dd-mm-yyyy or mm/dd/yyyy. Matches prior cleanup: 03/04/1983 = March 4, 1983.
      match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\.?$/);
      if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        year = Number(match[3]);

        if (text.includes("/")) {
          month = a;
          day = b;
        } else {
          day = a;
          month = b;
        }
      } else {
        const normalized = text
          .replace(/^(\d{1,2})\s+of\s+/i, "$1 ")
          .replace(/Oktober/i, "October");

        const parsed = new Date(normalized);
        if (isNaN(parsed.getTime())) return null;

        year = parsed.getFullYear();
        month = parsed.getMonth() + 1;
        day = parsed.getDate();
      }
    }

    const utc = Date.UTC(year, month - 1, day);
    const check = new Date(utc);

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) return null;

    // Excel's 1900 date system.
    return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
  }

  function normalizePhone(value: string, country: string): string {
    const original = value.trim();
    if (!original) return "";

    let digits = original.replace(/\D/g, "");
    if (!digits) return "";

    // Convert 00 international prefix to standard country-code digits.
    if (digits.startsWith("00")) digits = digits.slice(2);

    const code = countryCodes[country];
    if (!code) return "+" + digits;

    // If the number already has the expected country code, retain it.
    if (digits.startsWith(code)) return "+" + digits;

    // Germany local format: remove domestic trunk prefix before country code.
    if (country === "Germany" && digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    return "+" + code + digits;
  }

  for (let r = 1; r < values.length; r++) {
    const row = values[r];

    const originalCountry = String(row[countryCol] ?? "").trim();
    const country = countryMap[originalCountry] ?? originalCountry;

    row[firstNameCol] = titleCaseName(String(row[firstNameCol] ?? ""));
    row[lastNameCol] = titleCaseName(String(row[lastNameCol] ?? ""), true);
    row[countryCol] = country;

    const rawPhone = String(row[phoneCol] ?? "").trim();
    if (rawPhone) {
      row[phoneCol] = normalizePhone(rawPhone, country);
    }

    const rawDob = String(row[dobCol] ?? "").trim();
    const serial = parseDate(rawDob);
    if (serial !== null) {
      row[dobCol] = serial;
    }
  }

  used.setValues(values);

  // Keep phone values as text and format valid DOBs consistently.
  sheet.getRangeByIndexes(1, phoneCol, values.length - 1, 1)
    .setNumberFormat("@");

  for (let r = 1; r < values.length; r++) {
    const rawDob = String(values[r][dobCol] ?? "");
    if (typeof values[r][dobCol] === "number") {
      sheet.getCell(r, dobCol).setNumberFormat("yyyy-mm-dd");
    } else if (rawDob === "NA" || rawDob === "-" || rawDob === "") {
      sheet.getCell(r, dobCol).setNumberFormat("@");
    }
  }
}
```

This leaves missing phone numbers blank instead of inventing values.
