const assert = require('assert');
const { parseRuleSet, getPluralCategory } = require('../dist');

describe('getPluralCategory()', () => {
  const FractionPattern = /\.(\d+)/;

  const getFraction = source => {
    const m = source.match(FractionPattern);
    return m ? m[1] : '';
  };

  function* sampleValues(sampleList) {
    for (const range of sampleList.ranges) {
      if (range.kind === 'SampleValue') {
        // Single sample value.
        // Note: Unicode's data uses 'c' before the exponent; we must replace
        // it with 'e' to make it compatible with parseFloat().
        yield range.source.replace('c', 'e');
        continue;
      }

      // Range of sample values.
      // Note: None of Unicode's data uses ranges with exponents, i.e. no
      // `1c3~2c3` or `1.5c6~2.2c6`.
      const { start, end } = range;

      const startFraction = getFraction(start.source);
      if (!startFraction) {
        // Integer range
        for (let i = start.value; i <= end.value; i++) {
          yield i;
        }
      } else {
        // Decimal range
        const endFraction = getFraction(end.source);

        // Start and end must have the same number of digits.
        if (startFraction.length !== endFraction.length) {
          throw new Error(`Fraction digit mismatch: ${start.source}~${end.source}`);
        }

        const decimals = startFraction.length;
        const delta = 1/Math.pow(10, decimals);
        // Avoid floating-point errors by using toFixed and parsing the result...
        // Works better than just i += delta.
        // e.g. 0.2 + 0.1 == 0.30000000000000004, whereas +'0.3' == 0.3
        for (let i = start.value; i <= end.value; i = +(i + delta).toFixed(decimals)) {
          yield i.toFixed(decimals);
        }
      }
    }
  }

  const testSamples = (locale, rules, category, samples) => {
    if (samples.integer) {
      for (const n of sampleValues(samples.integer)) {
        const actual = getPluralCategory(n, rules);
        assert.strictEqual(
          actual,
          category,
          `${locale}: @integer: ${n} should be ${category}, got ${actual}`
        );
      }
    }

    if (samples.decimal) {
      for (const n of sampleValues(samples.decimal)) {
        const actual = getPluralCategory(n, rules);
        assert.strictEqual(
          actual,
          category,
          `${locale}: @decimal: ${n} should be ${category}, got ${actual}`
        );
      }
    }
  };

  const categorize = (locale, source) => {
    const rules = parseRuleSet(source);
    for (const [category, { samples }] of rules.rules.entries()) {
      if (!samples) {
        throw new Error(`Locale ${locale}: '${category}' is missing samples`);
      }
      testSamples(locale, rules, category, samples);
    }
    if (!rules.other) {
      throw new Error(`Locale ${locale}: 'other' is missing samples`);
    }
    testSamples(locale, rules, 'other', rules.other);
  };

  // These rules are taken from the CLDR data for natural languages. The locale
  // code is the first in the list for each group. These tests do not include
  // every possible set of plural rules, but a hopefully representative subset.
  // https://github.com/unicode-org/cldr/blob/d1cc488/common/supplemental/plurals.xml

  it('resolves other only', () => {
    categorize('bm', `
      other: @integer 0~15, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, other', () => {
    categorize('am', `
      one: i = 0 or n = 1 @integer 0, 1 @decimal 0.0~1.0, 0.00~0.04;
      other: @integer 2~17, 100, 1000, 10000, 100000, 1000000, … @decimal 1.1~2.6, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('ff', `
      one: i = 0,1 @integer 0, 1 @decimal 0.0~1.5;
      other: @integer 2~17, 100, 1000, 10000, 100000, 1000000, … @decimal 2.0~3.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    // These also include English.
    // Interestingly, according to these rules, 1.0 is pluralised while 1 is not.
    categorize('ast', `
      one: i = 1 and v = 0 @integer 1;
      other: @integer 0, 2~16, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('si', `
      one: n = 0,1 or i = 0 and f = 1 @integer 0, 1 @decimal 0.0, 0.1, 1.0, 0.00, 0.01, 1.00, 0.000, 0.001, 1.000, 0.0000, 0.0001, 1.0000;
      other: @integer 2~17, 100, 1000, 10000, 100000, 1000000, … @decimal 0.2~0.9, 1.1~1.8, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('da', `
      one: n = 1 or t != 0 and i = 0,1 @integer 1 @decimal 0.1~1.6;
      other: @integer 0, 2~16, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 2.0~3.4, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('is', `
      one: t = 0 and i % 10 = 1 and i % 100 != 11 or t != 0 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, … @decimal 0.1~1.6, 10.1, 100.1, 1000.1, …;
      other: @integer 0, 2~16, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves zero, one, other', () => {
    categorize('lv', `
      zero: n % 10 = 0 or n % 100 = 11..19 or v = 2 and f % 100 = 11..19 @integer 0, 10~20, 30, 40, 50, 60, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …;
      one: n % 10 = 1 and n % 100 != 11 or v = 2 and f % 10 = 1 and f % 100 != 11 or v != 2 and f % 10 = 1 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, … @decimal 0.1, 1.0, 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 10.1, 100.1, 1000.1, …;
      other: @integer 2~9, 22~29, 102, 1002, … @decimal 0.2~0.9, 1.2~1.9, 10.2, 100.2, 1000.2, …
    `);

    categorize('lag', `
      zero: n = 0 @integer 0 @decimal 0.0, 0.00, 0.000, 0.0000;
      one: i = 0,1 and n != 0 @integer 1 @decimal 0.1~1.6;
      other: @integer 2~17, 100, 1000, 10000, 100000, 1000000, … @decimal 2.0~3.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('ksh', `
      zero: n = 0 @integer 0 @decimal 0.0, 0.00, 0.000, 0.0000;
      one: n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000;
      other: @integer 2~17, 100, 1000, 10000, 100000, 1000000, … @decimal 0.1~0.9, 1.1~1.7, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, two, other', () => {
    categorize('iu', `
      one: n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000;
      two: n = 2 @integer 2 @decimal 2.0, 2.00, 2.000, 2.0000;
      other: @integer 0, 3~17, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0~0.9, 1.1~1.6, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, few, other', () => {
    categorize('shi', `
      one: i = 0 or n = 1 @integer 0, 1 @decimal 0.0~1.0, 0.00~0.04;
      few: n = 2..10 @integer 2~10 @decimal 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 2.00, 3.00, 4.00, 5.00, 6.00, 7.00, 8.00;
      other: @integer 11~26, 100, 1000, 10000, 100000, 1000000, … @decimal 1.1~1.9, 2.1~2.7, 10.1, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('bs', `
      one: v = 0 and i % 10 = 1 and i % 100 != 11 or f % 10 = 1 and f % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, … @decimal 0.1, 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 10.1, 100.1, 1000.1, …;
      few: v = 0 and i % 10 = 2..4 and i % 100 != 12..14 or f % 10 = 2..4 and f % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, … @decimal 0.2~0.4, 1.2~1.4, 2.2~2.4, 3.2~3.4, 4.2~4.4, 5.2, 10.2, 100.2, 1000.2, …;
      other: @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 0.5~1.0, 1.5~2.0, 2.5~2.7, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, many, other', () => {
    categorize('fr', `
      one: i = 0,1 @integer 0, 1 @decimal 0.0~1.5;
      many: e = 0 and i != 0 and i % 1000000 = 0 and v = 0 or e != 0..5 @integer 1000000, 1c6, 2c6, 3c6, 4c6, 5c6, 6c6, … @decimal 1.0000001c6, 1.1c6, 2.0000001c6, 2.1c6, 3.0000001c6, 3.1c6, …;
      other: @integer 2~17, 100, 1000, 10000, 100000, 1c3, 2c3, 3c3, 4c3, 5c3, 6c3, … @decimal 2.0~3.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, 1.0001c3, 1.1c3, 2.0001c3, 2.1c3, 3.0001c3, 3.1c3, …
    `);
  });

  it('resolves one, two, few, other', () => {
    categorize('dsb', `
      one: v = 0 and i % 100 = 1 or f % 100 = 1 @integer 1, 101, 201, 301, 401, 501, 601, 701, 1001, … @decimal 0.1, 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 10.1, 100.1, 1000.1, …;
      two: v = 0 and i % 100 = 2 or f % 100 = 2 @integer 2, 102, 202, 302, 402, 502, 602, 702, 1002, … @decimal 0.2, 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 10.2, 100.2, 1000.2, …;
      few: v = 0 and i % 100 = 3..4 or f % 100 = 3..4 @integer 3, 4, 103, 104, 203, 204, 303, 304, 403, 404, 503, 504, 603, 604, 703, 704, 1003, … @decimal 0.3, 0.4, 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4, 6.3, 6.4, 7.3, 7.4, 10.3, 100.3, 1000.3, …;
      other: @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 0.5~1.0, 1.5~2.0, 2.5~2.7, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, two, many, other', () => {
    categorize('he', `
      one: i = 1 and v = 0 @integer 1;
      two: i = 2 and v = 0 @integer 2;
      many: v = 0 and n != 0..10 and n % 10 = 0 @integer 20, 30, 40, 50, 60, 70, 80, 90, 100, 1000, 10000, 100000, 1000000, …;
      other: @integer 0, 3~17, 101, 1001, … @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, few, many, other', () => {
    categorize('pl', `
      one: i = 1 and v = 0 @integer 1;
      few: v = 0 and i % 10 = 2..4 and i % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, …;
      many: v = 0 and i != 1 and i % 10 = 0..1 or v = 0 and i % 10 = 5..9 or v = 0 and i % 100 = 12..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, …;
      other: @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('be', `
      one: n % 10 = 1 and n % 100 != 11 @integer 1, 21, 31, 41, 51, 61, 71, 81, 101, 1001, … @decimal 1.0, 21.0, 31.0, 41.0, 51.0, 61.0, 71.0, 81.0, 101.0, 1001.0, …;
      few: n % 10 = 2..4 and n % 100 != 12..14 @integer 2~4, 22~24, 32~34, 42~44, 52~54, 62, 102, 1002, … @decimal 2.0, 3.0, 4.0, 22.0, 23.0, 24.0, 32.0, 33.0, 102.0, 1002.0, …;
      many: n % 10 = 0 or n % 10 = 5..9 or n % 100 = 11..14 @integer 0, 5~19, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …;
      other: @decimal 0.1~0.9, 1.1~1.7, 10.1, 100.1, 1000.1, …
    `);

    categorize('mt', `
      one: n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000;
      few: n = 0 or n % 100 = 2..10 @integer 0, 2~10, 102~107, 1002, … @decimal 0.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 102.0, 1002.0, …;
      many: n % 100 = 11..19 @integer 11~19, 111~117, 1011, … @decimal 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 111.0, 1011.0, …;
      other: @integer 20~35, 100, 1000, 10000, 100000, 1000000, … @decimal 0.1~0.9, 1.1~1.7, 10.1, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });

  it('resolves one, two, few, many, other', () => {
    categorize('ga', `
      one: n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000;
      two: n = 2 @integer 2 @decimal 2.0, 2.00, 2.000, 2.0000;
      few: n = 3..6 @integer 3~6 @decimal 3.0, 4.0, 5.0, 6.0, 3.00, 4.00, 5.00, 6.00, 3.000, 4.000, 5.000, 6.000, 3.0000, 4.0000, 5.0000, 6.0000;
      many: n = 7..10 @integer 7~10 @decimal 7.0, 8.0, 9.0, 10.0, 7.00, 8.00, 9.00, 10.00, 7.000, 8.000, 9.000, 10.000, 7.0000, 8.0000, 9.0000, 10.0000;
      other: @integer 0, 11~25, 100, 1000, 10000, 100000, 1000000, … @decimal 0.0~0.9, 1.1~1.6, 10.1, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('gv', `
      one: v = 0 and i % 10 = 1 @integer 1, 11, 21, 31, 41, 51, 61, 71, 101, 1001, …;
      two: v = 0 and i % 10 = 2 @integer 2, 12, 22, 32, 42, 52, 62, 72, 102, 1002, …;
      few: v = 0 and i % 100 = 0,20,40,60,80 @integer 0, 20, 40, 60, 80, 100, 120, 140, 1000, 10000, 100000, 1000000, …;
      many: v != 0   @decimal 0.0~1.5, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …;
      other: @integer 3~10, 13~19, 23, 103, 1003, …
    `);
  });

  // The final boss: all six (standard) categories.

  it('resolves zero, one, two, few, many, other', () => {
    categorize('ar', `
      zero: n = 0 @integer 0 @decimal 0.0, 0.00, 0.000, 0.0000;
      one: n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000;
      two: n = 2 @integer 2 @decimal 2.0, 2.00, 2.000, 2.0000;
      few: n % 100 = 3..10 @integer 3~10, 103~110, 1003, … @decimal 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 103.0, 1003.0, …;
      many: n % 100 = 11..99 @integer 11~26, 111, 1011, … @decimal 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 111.0, 1011.0, …;
      other: @integer 100~102, 200~202, 300~302, 400~402, 500~502, 600, 1000, 10000, 100000, 1000000, … @decimal 0.1~0.9, 1.1~1.7, 10.1, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);

    categorize('cy', `
      zero: n = 0 @integer 0 @decimal 0.0, 0.00, 0.000, 0.0000;
      one: n = 1 @integer 1 @decimal 1.0, 1.00, 1.000, 1.0000;
      two: n = 2 @integer 2 @decimal 2.0, 2.00, 2.000, 2.0000;
      few: n = 3 @integer 3 @decimal 3.0, 3.00, 3.000, 3.0000;
      many: n = 6 @integer 6 @decimal 6.0, 6.00, 6.000, 6.0000;
      other: @integer 4, 5, 7~20, 100, 1000, 10000, 100000, 1000000, … @decimal 0.1~0.9, 1.1~1.7, 10.0, 100.0, 1000.0, 10000.0, 100000.0, 1000000.0, …
    `);
  });
});
