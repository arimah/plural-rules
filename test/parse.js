const assert = require('assert');
const { ParseError, parse } = require('../dist');
const {
  PluralRuleSet,
  PluralRule,
  AndCondition,
  OrCondition,
  Relation,
  Value,
  Range,
  Expr,
  Samples,
  SampleList,
  SampleRange,
  SampleValue,
} = require('./helpers');

// This file does NOT test many complex rule patterns. Those tests go in ./parse-rule;
// the regular parse() function uses the same parsing logic internally.

describe('parse()', () => {
  const parses = (source, expected) => {
    const actual = parse(source);
    assert.deepStrictEqual(actual, expected);
  };

  const rejects = (source, message) => {
    assert.throws(() => parse(source), new ParseError(message));
  };

  it('parses empty documents', () => {
    // Nothing specified basically means "everything is 'other'".
    for (const source of ['', '   ', '\n', '   \r\n   ']) {
      parses(source, PluralRuleSet(new Map(), null));
    }
  });

  it('parses a single rule', () => {
    parses('one: n = 1', PluralRuleSet(
      new Map([
        ['one', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(1)] })
        )],
      ])
    ));
  });

  it('parses two rules', () => {
    parses('one: n = 1; two: n = 2', PluralRuleSet(
      new Map([
        ['one', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(1)] }),
        )],
        ['two', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(2)] }),
        )],
      ])
    ));
  });

  it('parses three rules', () => {
    const source = `
      one: n % 10 = 1 and n % 100 != 11;
      few: n % 10 = 2..4 or n % 100 = 20, 30, 40;
      many: n = 5..7
    `;
    parses(source, PluralRuleSet(
      new Map([
        ['one', PluralRule(
          AndCondition([
            Relation({
              expr: Expr('n', Value(10)),
              ranges: [Value(1)],
            }),
            Relation({
              expr: Expr('n', Value(100)),
              ranges: [Value(11)],
              negated: true,
            }),
          ])
        )],
        ['few', PluralRule(
          OrCondition([
            Relation({
              expr: Expr('n', Value(10)),
              ranges: [Range(Value(2), Value(4))],
            }),
            Relation({
              expr: Expr('n', Value(100)),
              ranges: [Value(20), Value(30), Value(40)],
            }),
          ])
        )],
        ['many', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Range(Value(5), Value(7))] })
        )],
      ])
    ));
  });

  it('parses custom plural categories', () => {
    const source = `
      uno: n = 1;
      foobar: n = 2;
      mod: n = 3;
      and: n = 4
    `;
    parses(source, PluralRuleSet(
      new Map([
        ['uno', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(1)] })
        )],
        ['foobar', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(2)] })
        )],
        ['mod', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(3)] })
        )],
        ['and', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(4)] })
        )],
      ])
    ));
  });

  it('rejects incorrectly separated rules', () => {
    rejects('one: n = 1. two: n = 2', `Invalid character: .`);
    rejects('one: n = 1; two: n = 2;', `Expected a plural category; got end-of-file`);
  });

  it('rejects incorrectly named rules', () => {
    rejects('one n=1', `Expected ':' after plural category; got 'n'`);
    rejects('one = n = 1', `Expected ':' after plural category; got '='`);
    rejects('one is n = 1', `Expected ':' after plural category; got 'is'`);
    rejects('1: n = one', `Expected a plural category; got value '1'`);
  });

  it('rejects duplicate categories', () => {
    rejects(`foo: n = 1; foo: n = 2`, `Category 'foo' occurs more than once`);
    rejects(`other: ; other: `, `Category 'other' occurs more than once`);
  });

  it('parses samples for "other"', () => {
    parses('other: @integer 2~10, 22~20, 100, 1000, ...', PluralRuleSet(
      new Map(),
      Samples({
        integer: SampleList([
          SampleRange(SampleValue(2), SampleValue(10)),
          SampleRange(SampleValue(22), SampleValue(20)),
          SampleValue(100),
          SampleValue(1000),
        ], true),
      })
    ));
  });

  it('parses an empty "other"', () => {
    parses('other:', PluralRuleSet(new Map(), null));
    // Empty 'other' can come in the middle too
    parses('other: ; one: n = 1', PluralRuleSet(
      new Map([
        ['one', PluralRule(
          Relation({ expr: Expr('n'), ranges: [Value(1)] })
        )]
      ])
    ));
  });

  it('rejects rules for "other"', () => {
    // FIXME: better error message
    rejects('other: n != 1', `Expected end-of-file; got 'n'`);
  });
});
