/**
 * Bikram Sambat (BS) <-> Anno Domini (AD) Date Conversion Utility for IZone
 * Powered by Reference Table Calendar Data & Full Day-by-Day Database Generator
 */

export interface BSYearData {
  yearBS: number;
  daysInMonths: number[]; // 12 numbers for [Baisakh..Chaitra]
  startAD: string; // ISO date string YYYY-MM-DD for Baisakh 1
}

export interface BSDayRecord {
  adDate: string; // YYYY-MM-DD AD
  bsDate: string; // YYYY-MM-DD BS
  bsYear: number;
  bsMonth: number;
  bsMonthName: string;
  bsMonthNameNp: string;
  bsDay: number;
  dayOfWeekName: string; // 'Sunday', 'Monday', ...
  dayOfWeekNameNp: string; // 'आइतबार', 'सोमबार', ...
  fiscalYear: string; // e.g. '2081-82', '2082-83'
  quarter: string; // 'Q1', 'Q2', 'Q3', 'Q4'
  isWeekend: boolean; // True for Saturday in Nepal
}

export interface CalendarBounds {
  minAD: string;
  maxAD: string;
  minBS: string;
  maxBS: string;
  totalDaysMapped: number;
  mappedYearsCount: number;
  mappedYears: number[];
}

export const NEPALI_MONTHS_EN = [
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

export const NEPALI_MONTHS_NP = [
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

export const DAYS_OF_WEEK_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAYS_OF_WEEK_NP = [
  'आइतबार',
  'सोमबार',
  'मंगलबार',
  'बुधबार',
  'बिहीबार',
  'शुक्रबार',
  'शनिबार',
];

// Default built-in BS Calendar Lookup Engine (2078 BS to 2085 BS)
const INITIAL_BS_CALENDAR_DATA: Record<number, BSYearData> = {
  2078: {
    yearBS: 2078,
    daysInMonths: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    startAD: '2021-04-14',
  },
  2079: {
    yearBS: 2079,
    daysInMonths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    startAD: '2022-04-14',
  },
  2080: {
    yearBS: 2080,
    daysInMonths: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    startAD: '2023-04-14',
  },
  2081: {
    yearBS: 2081,
    daysInMonths: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    startAD: '2024-04-13',
  },
  2082: {
    yearBS: 2082,
    daysInMonths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    startAD: '2025-04-14',
  },
  2083: {
    yearBS: 2083,
    daysInMonths: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    startAD: '2026-04-14',
  },
  2084: {
    yearBS: 2084,
    daysInMonths: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    startAD: '2027-04-14',
  },
  2085: {
    yearBS: 2085,
    daysInMonths: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    startAD: '2028-04-13',
  },
};

const STORAGE_KEY = 'izone_bs_calendar_data';

/**
 * Loads BS Calendar Dataset from Local Storage or returns initial defaults
 */
export function getBsCalendarData(): Record<number, BSYearData> {
  if (typeof window === 'undefined') return { ...INITIAL_BS_CALENDAR_DATA };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...INITIAL_BS_CALENDAR_DATA, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load bsCalendarData from storage:', e);
  }
  return { ...INITIAL_BS_CALENDAR_DATA };
}

/**
 * Save updated bsCalendarData to Local Storage
 */
export function saveBsCalendarData(data: Record<number, BSYearData>): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save bsCalendarData:', e);
    }
  }
}

/**
 * Automatically seeds or updates a year's month length array.
 */
export function seedBSYearCalendar(
  yearBS: number,
  daysInMonths: number[],
  customStartAD?: string
): Record<number, BSYearData> {
  if (daysInMonths.length !== 12) {
    throw new Error('Month array must contain exactly 12 integers [Baisakh..Chaitra].');
  }

  const currentData = getBsCalendarData();

  let startAD = customStartAD;
  if (!startAD) {
    const prevYear = currentData[yearBS - 1];
    if (prevYear) {
      const prevTotalDays = prevYear.daysInMonths.reduce((a, b) => a + b, 0);
      const prevStartDate = new Date(prevYear.startAD);
      prevStartDate.setDate(prevStartDate.getDate() + prevTotalDays);
      startAD = prevStartDate.toISOString().split('T')[0];
    } else {
      const estADYear = yearBS - 57;
      startAD = `${estADYear}-04-14`;
    }
  }

  const updatedData: Record<number, BSYearData> = {
    ...currentData,
    [yearBS]: {
      yearBS,
      daysInMonths: [...daysInMonths],
      startAD,
    },
  };

  saveBsCalendarData(updatedData);
  return updatedData;
}

/**
 * Parses raw input string like "2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]"
 */
export function parseAndSeedBSInput(inputStr: string): {
  success: boolean;
  message: string;
  yearBS?: number;
} {
  try {
    const trimmed = inputStr.trim();
    const colonMatch = trimmed.match(/^(\d{4})\s*[:=]\s*\[([\d\s,]+)\]$/);

    if (colonMatch) {
      const yearBS = parseInt(colonMatch[1], 10);
      const arrStr = colonMatch[2];
      const monthDays = arrStr
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      if (monthDays.length !== 12) {
        return {
          success: false,
          message: `Found ${monthDays.length} months instead of 12 for BS year ${yearBS}.`,
        };
      }

      seedBSYearCalendar(yearBS, monthDays);
      return {
        success: true,
        message: `Successfully seeded BS Year ${yearBS} with ${monthDays.reduce(
          (a, b) => a + b,
          0
        )} total days into database lookup table!`,
        yearBS,
      };
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const jsonObj = JSON.parse(trimmed);
      let count = 0;
      for (const [key, val] of Object.entries(jsonObj)) {
        const yearBS = parseInt(key, 10);
        if (!isNaN(yearBS) && Array.isArray(val) && val.length === 12) {
          seedBSYearCalendar(yearBS, val as number[]);
          count++;
        }
      }
      if (count > 0) {
        return {
          success: true,
          message: `Successfully batch seeded ${count} BS Calendar year(s)!`,
        };
      }
    }

    return {
      success: false,
      message:
        'Invalid format. Use format: "2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]"',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to parse calendar input: ${err.message || 'Syntax error'}`,
    };
  }
}

/**
 * Helper to compute Fiscal Year string for a given BS Year & Month (e.g. 2082-83)
 * In Nepal, Shrawan (Month 4) to Chaitra (Month 12) belong to Start Year (e.g., 2082-83).
 * Baisakh (Month 1) to Ashadh (Month 3) belong to previous year's start (e.g., 2081-82).
 */
export function formatNepaliFiscalYearCode(yearBS: number, monthBS: number): string {
  let startYear = yearBS;
  if (monthBS < 4) {
    startYear = yearBS - 1;
  }
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}

/**
 * Computes Fiscal Quarter in Nepal
 * Q1: Shrawan, Bhadra, Ashwin (Months 4, 5, 6)
 * Q2: Kartik, Mangsir, Poush (Months 7, 8, 9)
 * Q3: Magh, Falgun, Chaitra (Months 10, 11, 12)
 * Q4: Baisakh, Jestha, Ashadh (Months 1, 2, 3)
 */
export function getNepaliQuarter(monthBS: number): string {
  if (monthBS >= 4 && monthBS <= 6) return 'Q1';
  if (monthBS >= 7 && monthBS <= 9) return 'Q2';
  if (monthBS >= 10 && monthBS <= 12) return 'Q3';
  return 'Q4';
}

/**
 * Generates full day-by-day lookup table records (`BSDayRecord[]`)
 * for all mapped BS years.
 */
export function generateCalendarDatabase(): BSDayRecord[] {
  const calendarData = getBsCalendarData();
  const sortedYears = Object.values(calendarData).sort((a, b) => a.yearBS - b.yearBS);
  const records: BSDayRecord[] = [];

  for (const yData of sortedYears) {
    const startADDate = new Date(yData.startAD);
    let runningDate = new Date(startADDate);

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthBS = monthIdx + 1;
      const daysInMonth = yData.daysInMonths[monthIdx] || 30;

      for (let dayBS = 1; dayBS <= daysInMonth; dayBS++) {
        const adDateStr = runningDate.toISOString().split('T')[0];
        const dayOfWeekIndex = runningDate.getUTCDay(); // 0 = Sun, 6 = Sat

        const padMonth = monthBS < 10 ? `0${monthBS}` : `${monthBS}`;
        const padDay = dayBS < 10 ? `0${dayBS}` : `${dayBS}`;
        const bsDateStr = `${yData.yearBS}-${padMonth}-${padDay}`;

        const fyCode = formatNepaliFiscalYearCode(yData.yearBS, monthBS);
        const qtr = getNepaliQuarter(monthBS);

        records.push({
          adDate: adDateStr,
          bsDate: bsDateStr,
          bsYear: yData.yearBS,
          bsMonth: monthBS,
          bsMonthName: NEPALI_MONTHS_EN[monthIdx],
          bsMonthNameNp: NEPALI_MONTHS_NP[monthIdx],
          bsDay: dayBS,
          dayOfWeekName: DAYS_OF_WEEK_EN[dayOfWeekIndex],
          dayOfWeekNameNp: DAYS_OF_WEEK_NP[dayOfWeekIndex],
          fiscalYear: fyCode,
          quarter: qtr,
          isWeekend: dayOfWeekIndex === 6, // Saturday is weekend in Nepal
        });

        // Increment 1 day
        runningDate.setDate(runningDate.getDate() + 1);
      }
    }
  }

  return records;
}

/**
 * Retrieves the current bounds of the mapped Nepali Calendar database
 */
export function getCalendarBounds(): CalendarBounds {
  const db = generateCalendarDatabase();
  if (db.length === 0) {
    return {
      minAD: '2021-04-14',
      maxAD: '2029-04-12',
      minBS: '2078-01-01',
      maxBS: '2085-12-31',
      totalDaysMapped: 0,
      mappedYearsCount: 0,
      mappedYears: [],
    };
  }

  const minAD = db[0].adDate;
  const maxAD = db[db.length - 1].adDate;
  const minBS = db[0].bsDate;
  const maxBS = db[db.length - 1].bsDate;

  const yearsSet = Array.from(new Set(db.map((r) => r.bsYear))).sort((a, b) => a - b);

  return {
    minAD,
    maxAD,
    minBS,
    maxBS,
    totalDaysMapped: db.length,
    mappedYearsCount: yearsSet.length,
    mappedYears: yearsSet,
  };
}

/**
 * Checks whether an AD date string is within mapped calendar database bounds
 */
export function isDateInBounds(adDateStr: string): {
  inBounds: boolean;
  message?: string;
  bounds: CalendarBounds;
} {
  const bounds = getCalendarBounds();
  if (!adDateStr) return { inBounds: true, bounds };

  const targetDateStr = adDateStr.split('T')[0];

  if (targetDateStr < bounds.minAD || targetDateStr > bounds.maxAD) {
    return {
      inBounds: false,
      message: `Date ${targetDateStr} is outside mapped calendar database bounds (${bounds.minAD} to ${bounds.maxAD} AD | BS ${bounds.minBS} to ${bounds.maxBS}).`,
      bounds,
    };
  }

  return { inBounds: true, bounds };
}

/**
 * Looks up exact day record from the generated calendar database table.
 */
export function lookupBSDayRecord(adDateStr: string): BSDayRecord {
  const targetDateStr = (adDateStr || new Date().toISOString()).split('T')[0];
  const db = generateCalendarDatabase();

  const record = db.find((r) => r.adDate === targetDateStr);
  if (record) {
    return record;
  }

  // Fallback calculation if exact date is out of bounds
  try {
    const fallbackBS = convertADToBS(targetDateStr);
    const targetDate = new Date(targetDateStr);
    const dayOfWeekIndex = isNaN(targetDate.getTime()) ? 0 : targetDate.getUTCDay();

    return {
      adDate: targetDateStr,
      bsDate: fallbackBS.formattedBSShort.replace(' BS', ''),
      bsYear: fallbackBS.yearBS,
      bsMonth: fallbackBS.monthBS,
      bsMonthName: fallbackBS.monthName,
      bsMonthNameNp: NEPALI_MONTHS_NP[fallbackBS.monthBS - 1] || 'वैशाख',
      bsDay: fallbackBS.dayBS,
      dayOfWeekName: DAYS_OF_WEEK_EN[dayOfWeekIndex],
      dayOfWeekNameNp: DAYS_OF_WEEK_NP[dayOfWeekIndex],
      fiscalYear: formatNepaliFiscalYearCode(fallbackBS.yearBS, fallbackBS.monthBS),
      quarter: getNepaliQuarter(fallbackBS.monthBS),
      isWeekend: dayOfWeekIndex === 6,
    };
  } catch (err: any) {
    const targetDate = new Date(targetDateStr);
    const estBSYear = isNaN(targetDate.getTime()) ? 2083 : targetDate.getUTCFullYear() + 57;
    const dayOfWeekIndex = isNaN(targetDate.getTime()) ? 0 : targetDate.getUTCDay();

    return {
      adDate: targetDateStr,
      bsDate: `${estBSYear}-??-?? [Unseeded BS Year]`,
      bsYear: estBSYear,
      bsMonth: 1,
      bsMonthName: 'Unmapped',
      bsMonthNameNp: 'अवर्गीकृत',
      bsDay: 1,
      dayOfWeekName: DAYS_OF_WEEK_EN[dayOfWeekIndex],
      dayOfWeekNameNp: DAYS_OF_WEEK_NP[dayOfWeekIndex],
      fiscalYear: `${estBSYear}-${String(estBSYear + 1).slice(-2)}`,
      quarter: 'Q1',
      isWeekend: dayOfWeekIndex === 6,
    };
  }
}

/**
 * Converts AD Date String (YYYY-MM-DD) to formatted BS String using reference bsCalendarData.
 */
export function convertADToBS(adDateStr: string): {
  yearBS: number;
  monthBS: number;
  dayBS: number;
  monthName: string;
  formattedBS: string;
  formattedBSShort: string;
} {
  const targetDateStr = (adDateStr || new Date().toISOString()).split('T')[0];
  const targetDate = new Date(targetDateStr);

  if (isNaN(targetDate.getTime())) {
    return {
      yearBS: 2083,
      monthBS: 4,
      dayBS: 16,
      monthName: 'Shrawan',
      formattedBS: '16 Shrawan 2083 BS',
      formattedBSShort: '2083-04-16 BS',
    };
  }

  const calendarData = getBsCalendarData();
  const sortedYears = Object.values(calendarData).sort((a, b) => a.yearBS - b.yearBS);

  if (sortedYears.length === 0) {
    throw new Error('No BS Calendar years seeded in database.');
  }

  // Check if targetDate is before min mapped startAD or after max mapped end
  const minStartAD = new Date(sortedYears[0].startAD);
  const maxYearData = sortedYears[sortedYears.length - 1];
  const maxDays = maxYearData.daysInMonths.reduce((a, b) => a + b, 0);
  const maxEndAD = new Date(maxYearData.startAD);
  maxEndAD.setDate(maxEndAD.getDate() + maxDays - 1);

  if (targetDate < minStartAD || targetDate > maxEndAD) {
    const estYearBS = targetDate.getUTCFullYear() + 57;
    throw new Error(
      `BS Calendar month array for year ~${estYearBS} (AD Date: ${targetDateStr}) is missing from database (bs_calendar_years). Please seed the 12-month array first.`
    );
  }

  let selectedYearData = sortedYears[0];

  for (const yData of sortedYears) {
    const baisakh1 = new Date(yData.startAD);
    if (targetDate >= baisakh1) {
      selectedYearData = yData;
    } else {
      break;
    }
  }

  const baisakh1Date = new Date(selectedYearData.startAD);
  const diffTime = targetDate.getTime() - baisakh1Date.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let monthBS = 1;
  let dayBS = 1;

  for (let i = 0; i < 12; i++) {
    const daysInCurrentMonth = selectedYearData.daysInMonths[i] || 30;
    if (diffDays >= daysInCurrentMonth) {
      diffDays -= daysInCurrentMonth;
      monthBS++;
    } else {
      dayBS = diffDays + 1;
      break;
    }
  }

  if (monthBS > 12) {
    monthBS = 12;
    dayBS = selectedYearData.daysInMonths[11] || 30;
  }

  const yearBS = selectedYearData.yearBS;
  const monthName = NEPALI_MONTHS_EN[monthBS - 1] || 'Baisakh';
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
 * Converts BS Date (year, month 1-12, day) to AD Date String (YYYY-MM-DD)
 */
export function convertBSToAD(yearBS: number, monthBS: number, dayBS: number): string {
  const calendarData = getBsCalendarData();
  const yearData = calendarData[yearBS];

  if (!yearData) {
    throw new Error(
      `BS Year ${yearBS} month array is missing from calendar database (bs_calendar_years). Please seed the 12-month array for BS ${yearBS} first.`
    );
  }

  const baisakh1 = new Date(yearData.startAD);
  let totalDaysToAdd = 0;

  for (let i = 0; i < monthBS - 1; i++) {
    totalDaysToAdd += yearData.daysInMonths[i] || 30;
  }
  totalDaysToAdd += dayBS - 1;

  const resultAD = new Date(baisakh1);
  resultAD.setDate(resultAD.getDate() + totalDaysToAdd);

  return resultAD.toISOString().split('T')[0];
}

/**
 * Calculates current Fiscal Year code in Nepal based on AD Date (e.g. "2082-83").
 */
export function getNepaliFiscalYear(adDateStr?: string): string {
  const dateStr = adDateStr ? adDateStr.split('T')[0] : new Date().toISOString().split('T')[0];
  const bs = convertADToBS(dateStr);
  return formatNepaliFiscalYearCode(bs.yearBS, bs.monthBS);
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
