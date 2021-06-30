/**
 * A parse node for an entire rule set. Contains a mapping from plural category
 * ('zero', 'one', 'two', 'few', 'many', or a custom category) to the rule for
 * that category, as well as optional samples values for the 'other' category.
 */
export interface PluralRuleSet {
  readonly kind: 'PluralRuleSet';
  /**
   * The plural categories that are defined in this rule set. The key is the
   * category name, the value is the rule for that category. If the rule set
   * declares no plural rules for any category, this map will be empty.
   */
  readonly rules: ReadonlyMap<PluralCategory, PluralRule>;
  /**
   * Sample values for the 'other' category. This is the category that is used
   * when no other category matches, so cannot have any conditions associated
   * with it.
   */
  readonly other: Samples | null;
}

/**
 * A plural category. This is typically one of the standard categories ('zero',
 * 'one', 'two', 'few', 'many') or a custom category.
 */
export type PluralCategory = string;

/**
 * A parse node for a single plural category rule. Contains the condition that
 * determines when the category should be used, along with optional sample
 * values for the category.
 */
export interface PluralRule {
  readonly kind: 'PluralRule';
  /**
   * The condition that determines when the category should be used.
   */
  readonly condition: Condition;
  /**
   * Sample values for the category.
   */
  readonly samples: Samples | null;
}

export type Condition =
  | OrCondition
  | AndCondition
  | Relation;

/**
 * A parse node for an "or" condition. The condition matches if any alternative
 * matches.
 */
export interface OrCondition {
  readonly kind: 'OrCondition';
  /**
   * The possible alternatives. The "or" condition matches if any of these
   * alternatives match.
   */
  readonly alternatives: readonly Alternative[];
}

export type Alternative =
  | AndCondition
  | Relation;

/**
 * A parse node for an "and" condition. The condition matches if all contained
 * relations match.
 */
export interface AndCondition {
  readonly kind: 'AndCondition';
  /**
   * The relations that must match for the "and" condition to match.
   */
  readonly relations: readonly Relation[];
}

/**
 * A parse node for a basic relation. A relation describes a value or range of
 * values that the input number must match (or, if `negated` is true, must not
 * match).
 */
export interface Relation {
  readonly kind: 'Relation';
  /**
   * The expression that is matched against the ranges (and values) in `ranges`.
   */
  readonly expr: Expr;
  /**
   * The ranges (and values) that the expression in `expr` is matched against.
   */
  readonly ranges: RangeList;
  /**
   * If true, the relation matches if *none* of the entries in `ranges` match
   * the expression in `expr`. If false, the relation matches if *any* entry in
   * `ranges` matches.
   */
  readonly negated: boolean;
  /**
   * If true, the relation was created using the `within` keyword. In this case
   * any range in `ranges` contains every value between the start and end. The
   * default behaviour is for a range to match only integers.
   */
  readonly within: boolean;
}

export type RangeList = readonly (Range | Value)[];

/**
 * A parse node for an expression whose value is based on the input number.
 * Contains the operand, as well as an optional modulo divisor.
 */
export interface Expr {
  readonly kind: 'Expr';
  /**
   * The operand that the expression gets its value from, derived from the
   * input number.
   */
  readonly operand: Operand;
  /**
   * The modulo divisor. If not null, the value of the expression is the
   * remainder of `operand` divided by this field's value.
   */
  readonly modDivisor: Value | null;
}

/**
 * The operand that an expression gets its value from. The value is taken from
 * part of the input number. The exact meaning of these is defined in the CLDR
 * documentation.
 */
export type Operand = 'n' | 'i' | 'f' | 't' | 'v' | 'w' | 'c' | 'e';

/**
 * A parse node for a range. Contains a start value and an end value; both are
 * inclusive. By default, a range matches only *integers*. For instance, `1..4`
 * contains the values 1, 2, 3 and 4. If `within` is true in the containing
 * `Relation`, then the range includes non-integer values as well.
 */
export interface Range {
  readonly kind: 'Range';
  /**
   * The start of the range, inclusive.
   */
  readonly start: Value;
  /**
   * The end of the range, inclusive.
   */
  readonly end: Value;
}

/**
 * A parse node for an integer value.
 */
export interface Value {
  readonly kind: 'Value';
  /**
   * The parsed numeric value.
   */
  readonly value: number;
  /**
   * The source text of the numeric value.
   */
  readonly source: string;
}

/**
 * A parse node for sample values. These are non-normative example values for
 * a plural category.
 */
export interface Samples {
  readonly kind: 'Samples';
  /**
   * Integer sample values. Notably, the parser does *not* verify that the
   * actual `SampleValue`s contained in the list are integers.
   */
  readonly integer: SampleList | null;
  /**
   * Decimal sample values.
   */
  readonly decimal: SampleList | null;
}

/**
 * A parse node for a list of sample values. The list can be exhaustive or
 * infinite. In the latter case, it obviously does not contain every possible
 * value for the plural category.
 */
export interface SampleList {
  readonly kind: 'SampleList';
  /**
   * Ranges and values contained in the sample list.
   */
  readonly ranges: SampleRangeList;
  /**
   * If true, the sample list is infinite (ends with `...` or `…`); the list of
   * values in `ranges` is non-exhaustive.
   */
  readonly infinite: boolean;
}

export type SampleRangeList = readonly (SampleRange | SampleValue)[];

/**
 * A parse node for a range of sample values. Contains a start value and an end
 * value (both inclusive). The bounds must have the same number of decimal
 * digits and exponent digits (both of which may be zero), and the range
 * encompasses all values between the start and end that have the same number
 * of decimal digits and/or exponent digits. For example, the sample range
 * `1.3~1.5` contains the values 1.3, 1.4 and 1.5 exactly, while the range `5~8`
 * contains 5, 6, 7 and 8.
 *
 * The parser does *not* verify the number of decimal digits or exponent digits
 * of either bound.
 */
export interface SampleRange {
  readonly kind: 'SampleRange';
  /**
   * The start of the range, inclusive.
   */
  readonly start: SampleValue;
  /**
   * The end of the range, inclusive.
   */
  readonly end: SampleValue;
}

/**
 * A parse node for a sample value. This value can be an integer or a real
 * number. A real number can include any number of decimal digits and/or an
 * exponential part.
 */
export interface SampleValue {
  readonly kind: 'SampleValue';
  /**
   * The parsed numeric value. Note that this value may not correspond *exactly*
   * with the value stored in `source`, due to limited floating point precision.
   */
  readonly value: number;
  /**
   * The source text of the numeric value.
   */
  readonly source: string;
}
