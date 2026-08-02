/**
 * Bikram Sambat (BS) <-> Anno Domini (AD) Date Conversion Utility for IZone
 * Custom engine tailored for Nepali Fiscal Years & Inventory Logs.
 */

const NEPALI_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

const NEPALI_MONTHS_NP = [
  'वैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भाद्र',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
];

/**
 * Converts AD ISO Date String (e.g., "2026-07-31") to formatted BS String.
 * In Nepal, BS calendar is ~56 years and 8.5 months ahead of AD.
 * BS new year (Baisakh 1) falls around April 13-14.
 */
export function convertADToBS(adDateStr: string): {
  yearBS: number;
  monthBS: number;
  dayBS: number;
  monthName: string;
  formattedBS: string;
  formattedBSShort: string;
} {
  const date = new Date(adDateStr || Date.now());
  if (isNaN(date.getTime())) {
    return {
      yearBS: 2083,
      monthBS: 4,
      dayBS: 16,
      monthName: 'Shrawan',
      formattedBS: '16 Shrawan 2083 BS',
      formattedBSShort: '2083-04-16 BS',
    };
  }

  const yearAD = date.getFullYear();
  const monthAD = date.getMonth(); // 0-indexed (0 = Jan, 6 = Jul)
  const dayAD = date.getDate();

  let yearBS = yearAD + 56;
  let monthBS = 1;
  let dayBS = 1;

  // Approximate BS Month Mapping based on standard Nepali Calendar Offset
  // April 14 ~ Baisakh 1
  if (monthAD === 0) {
    // Jan: Poush (mid) to Magh
    yearBS = yearAD + 56;
    if (dayAD < 15) {
      monthBS = 9; // Poush
      dayBS = dayAD + 16;
    } else {
      monthBS = 10; // Magh
      dayBS = dayAD - 14;
    }
  } else if (monthAD === 1) {
    // Feb: Magh to Falgun
    yearBS = yearAD + 56;
    if (dayAD < 13) {
      monthBS = 10;
      dayBS = dayAD + 17;
    } else {
      monthBS = 11;
      dayBS = dayAD - 12;
    }
  } else if (monthAD === 2) {
    // Mar: Falgun to Chaitra
    yearBS = yearAD + 56;
    if (dayAD < 14) {
      monthBS = 11;
      dayBS = dayAD + 16;
    } else {
      monthBS = 12;
      dayBS = dayAD - 13;
    }
  } else if (monthAD === 3) {
    // Apr: Chaitra to Baisakh (BS New Year)
    if (dayAD < 14) {
      yearBS = yearAD + 56;
      monthBS = 12;
      dayBS = dayAD + 18;
    } else {
      yearBS = yearAD + 57; // BS New Year!
      monthBS = 1;
      dayBS = dayAD - 13;
    }
  } else if (monthAD === 4) {
    // May: Baisakh to Jestha
    yearBS = yearAD + 57;
    if (dayAD < 15) {
      monthBS = 1;
      dayBS = dayAD + 17;
    } else {
      monthBS = 2;
      dayBS = dayAD - 14;
    }
  } else if (monthAD === 5) {
    // Jun: Jestha to Ashadh
    yearBS = yearAD + 57;
    if (dayAD < 15) {
      monthBS = 2;
      dayBS = dayAD + 17;
    } else {
      monthBS = 3;
      dayBS = dayAD - 14;
    }
  } else if (monthAD === 6) {
    // Jul: Ashadh to Shrawan (Nepali Fiscal Year Start ~ Mid July)
    yearBS = yearAD + 57;
    if (dayAD < 16) {
      monthBS = 3;
      dayBS = dayAD + 16;
    } else {
      monthBS = 4; // Shrawan
      dayBS = dayAD - 15;
    }
  } else if (monthAD === 7) {
    // Aug: Shrawan to Bhadra
    yearBS = yearAD + 57;
    if (dayAD < 17) {
      monthBS = 4;
      dayBS = dayAD + 16;
    } else {
      monthBS = 5;
      dayBS = dayAD - 16;
    }
  } else if (monthAD === 8) {
    // Sep: Bhadra to Ashwin
    yearBS = yearAD + 57;
    if (dayAD < 17) {
      monthBS = 5;
      dayBS = dayAD + 15;
    } else {
      monthBS = 6;
      dayBS = dayAD - 16;
    }
  } else if (monthAD === 9) {
    // Oct: Ashwin to Kartik
    yearBS = yearAD + 57;
    if (dayAD < 18) {
      monthBS = 6;
      dayBS = dayAD + 14;
    } else {
      monthBS = 7;
      dayBS = dayAD - 17;
    }
  } else if (monthAD === 10) {
    // Nov: Kartik to Mangsir
    yearBS = yearAD + 57;
    if (dayAD < 17) {
      monthBS = 7;
      dayBS = dayAD + 14;
    } else {
      monthBS = 8;
      dayBS = dayAD - 16;
    }
  } else {
    // Dec: Mangsir to Poush
    yearBS = yearAD + 57;
    if (dayAD < 16) {
      monthBS = 8;
      dayBS = dayAD + 15;
    } else {
      monthBS = 9;
      dayBS = dayAD - 15;
    }
  }

  const monthName = NEPALI_MONTHS_EN[monthBS - 1] || 'Shrawan';
  const padDay = dayBS < 10 ? `0${dayBS}` : `${dayBS}`;
  const padMonth = monthBS < 10 ? `0${monthBS}` : `${monthBS}`;

  return {
    yearBS,
    monthBS,
    dayBS,
    monthName,
    formattedBS: `${dayBS} ${monthName} ${yearBS} BS`,
    formattedBSShort: `${yearBS}-${padMonth}-${padDay} BS`,
  };
}

/**
 * Calculates the current Fiscal Year in Nepal based on AD Date.
 * Nepali Fiscal Year runs from Shrawan 1 (~July 16) to Ashadh end (~July 15).
 * e.g., July 2026 is early FY 2083/84 BS or FY 2082/83 BS depending on exact day.
 */
export function getNepaliFiscalYear(adDateStr?: string): string {
  const date = adDateStr ? new Date(adDateStr) : new Date();
  const bs = convertADToBS(date.toISOString().split('T')[0]);

  // If BS month is >= 4 (Shrawan or later), the fiscal year is yearBS / (yearBS + 1)
  // If BS month is < 4 (Baisakh, Jestha, Ashadh), fiscal year is (yearBS - 1) / yearBS
  let startYear = bs.yearBS;
  if (bs.monthBS < 4) {
    startYear = bs.yearBS - 1;
  }
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}/${endYearShort}`;
}

export function formatDualDate(adDateStr: string, mode: 'BS' | 'AD' = 'BS'): string {
  if (!adDateStr) return '-';
  const adFormatted = adDateStr.split('T')[0];
  const bsObj = convertADToBS(adFormatted);

  if (mode === 'BS') {
    return `${bsObj.formattedBS} (${adFormatted})`;
  }
  return `${adFormatted} (${bsObj.formattedBSShort})`;
}
