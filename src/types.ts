export interface PluralRuleSet {
  readonly kind: 'PluralRuleSet';
  readonly rules: ReadonlyMap<PluralCategory, PluralRule>;
  readonly other: Samples | null;
}

export type PluralCategory = string;

export interface PluralRule {
  readonly kind: 'PluralRule';
  readonly condition: Condition;
  readonly samples: Samples | null;
}

export type Condition =
  | OrCondition
  | AndCondition
  | Relation;

export interface OrCondition {
  readonly kind: 'OrCondition';
  readonly alternatives: readonly Alternative[];
}

export type Alternative =
  | AndCondition
  | Relation;

export interface AndCondition {
  readonly kind: 'AndCondition';
  readonly relations: readonly Relation[];
}

export interface Relation {
  readonly kind: 'Relation';
  readonly expr: Expr;
  readonly ranges: RangeList;
  readonly negated: boolean;
  readonly within: boolean;
}

export type RangeList = readonly (Range | Value)[];

export interface Expr {
  readonly kind: 'Expr';
  readonly operand: Operand;
  readonly modDivisor: Value | null;
}

export type Operand = 'n' | 'i' | 'f' | 't' | 'v' | 'w' | 'c' | 'e';

export interface Range {
  readonly kind: 'Range';
  readonly lower: Value;
  readonly upper: Value;
}

export interface Value {
  readonly kind: 'Value';
  readonly value: number;
  readonly source: string;
}

export interface Samples {
  readonly kind: 'Samples';
  readonly integer: SampleList | null;
  readonly decimal: SampleList | null;
}

export interface SampleList {
  readonly kind: 'SampleList';
  readonly ranges: SampleRangeList;
  readonly infinite: boolean;
}

export type SampleRangeList = readonly (SampleRange | SampleValue)[];

export interface SampleRange {
  readonly kind: 'SampleRange';
  readonly upper: SampleValue;
  readonly lower: SampleValue;
}

export interface SampleValue {
  readonly kind: 'SampleValue';
  readonly value: number;
  readonly source: string;
}
