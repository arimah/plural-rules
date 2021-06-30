export interface Operands {
  /**
   * The absolute value of the source number.
   */
  readonly n: number;
  /**
   * The integer digits of `n`.
   */
  readonly i: number;
  /**
   * The number of visible fraction digits in `n`, *with* trailing zeroes.
   */
  readonly v: number;
  /**
   * The number of visible fraction digits in `n`, *without* trailing zeroes.
   */
  readonly w: number;
  /**
   * The visible fraction digits in `n`, *with* trailing zeroes.
   */
  readonly f: number;
  /**
   * The visible fraction digits in `n`, *with* trailing zeroes.
   */
  readonly t: number;
  /**
   * The decimal exponent value: exponent of the power of 10 used in compact
   * decimal formatting.
   */
  readonly c: number;
  /**
   * Synonym for `c`.
   */
  readonly e: number,
}

export function getOperands(input: number | string): Operands {
  // CLDR plural operands rely as much on the textual representation as they
  // do on the numeric value. If the input is a string, we retain it so we
  // can manipulate it.
  let n: number;
  let s: string;

  if (typeof input === 'number') {
    n = Math.abs(input);
    s = String(input);
  } else {
    n = Math.abs(parseFloat(input));
    s = input;
  }

  if (!Number.isFinite(n)) {
    // NaN, Infinity and -Infinity are not permitted.
    throw new Error(`Number is not finite: ${input}`);
  }

  // n and i are by far the most common operands, so precalculate them.
  // Everything else is calculated on demand.
  return {
    n,
    i: n | 0,
    get v(): number {
      return getFraction(s).length;
    },
    get w(): number {
      return getFraction(s).replace(/0+$/, '').length;
    },
    get f(): number {
      return +getFraction(s);
    },
    get t(): number {
      return +getFraction(s).replace(/0+$/, '');
    },
    get c(): number {
      return getExponent(s);
    },
    get e(): number {
      return getExponent(s);
    },
  };
}

// If the number has passed parseFloat(), we can probably assume it's
// reasonably formatted, so simple regexes are fine.
const FractionPattern = /\.(\d+)/;
const ExponentPattern = /[eE][+\-](\d+)/;

function getFraction(source: string): string {
  const m = source.match(FractionPattern);
  return m ? m[1] : '';
}

function getExponent(source: string): number {
  const m = source.match(ExponentPattern);
  return m ? +m[1] : 0;
}
