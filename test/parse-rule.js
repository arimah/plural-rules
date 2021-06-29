const assert = require('assert');
const { ParseError, parseRule } = require('../dist');
const {
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

describe('parseRule()', () => {
  const parses = (rule, expected) => {
    const actual = parseRule(rule);
    assert.deepStrictEqual(actual, expected);
  };

  const rejects = (rule, message) => {
    assert.throws(() => parseRule(rule), new ParseError(message));
  };

  it('recognizes every operand', () => {
    for (const operand of ['n', 'i', 'f', 't', 'v', 'w', 'c', 'e']) {
      parses(`${operand} = 0`, PluralRule(
        Relation({
          expr: Expr(operand),
          ranges: [{ kind: 'Value', source: '0', value: 0 }],
        })
      ));
    }
  });

  it('parses simple equalities', () => {
    // 'in', '=' and 'is' produce identical parse trees with a simple value
    // on the right.
    for (const rule of ['n = 123', 'n in 123', 'n is 123']) {
      parses(rule, PluralRule(
        Relation({
          expr: Expr('n'),
          ranges: [Value(123)],
        })
      ));
    }

    // 'within' is handled differently.
    parses('n within 123', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Value(123)],
        within: true,
      })
    ));
  });

  it('rejects invalid simple equalities', () => {
    rejects('n = one', `Expected value or range; got plural category 'one'`);
    rejects('n = 1.23', `Expected an integer value; got value '1.23'`);
    rejects('n = -1', `Invalid character: -`);
    rejects('f is t', `Expected value or 'not' after 'is'; got 't'`);
    rejects('f is in 10', `Expected value or 'not' after 'is'; got 'in'`);
    rejects('n in %', `Expected value or range; got '%'`);
    rejects('n within ...', `Expected value or range; got '...'`);
  });

  it('parses simple inequalities', () => {
    // 'not in', '!=' and 'is not' produce identical parse trees with a simple
    // value on the right.
    for (const rule of ['n != 456', 'n not in 456', 'n is not 456']) {
      parses(rule, PluralRule(
        Relation({
          expr: Expr('n'),
          ranges: [Value(456)],
          negated: true,
        })
      ));
    }

    // 'not within' is handled differently.
    parses('n not within 456', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Value(456)],
        negated: true,
        within: true,
      })
    ));
  });

  it('rejects invalid simple equalities', () => {
    rejects('n != mod', `Expected value or range; got 'mod'`);
    rejects('v is not w', `Expected value after 'is not'; got 'w'`);
    rejects('n not 10', `Expected 'in' or 'within' after 'not'; got value '10'`);
    rejects('n not = 10', `Expected 'in' or 'within' after 'not'; got '='`);
    rejects('n not != 10', `Expected 'in' or 'within' after 'not'; got '!='`);
    rejects('n not in not 42', `Expected value or range; got 'not'`);
    rejects('n not in ,', `Expected value or range; got ','`);
    rejects('e not within ;', `Expected value or range; got ';'`);
  });

  it('parses multiple values in a range list', () => {
    parses('n in 1, 2', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Value(1), Value(2)],
      })
    ));

    parses('n != 3, 4, 5', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Value(3), Value(4), Value(5)],
        negated: true,
      })
    ));

    parses('n within 6, 7, 8, 9', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Value(6), Value(7), Value(8), Value(9)],
        within: true,
      })
    ));
  });

  it('rejects multiple values after "is"', () => {
    rejects('n is 1, 2, 3', `Expected end-of-file; got ','`);
  });

  it('parses ranges', () => {
    // 'in' and '=' produce identical parse trees with a range on the right.
    for (const rule of ['n = 1..10', 'n in 1..10']) {
      parses(rule, PluralRule(
        Relation({
          expr: Expr('n'),
          ranges: [Range(Value(1), Value(10))],
        })
      ));
    }

    // 'within' is handled differently.
    parses('n within 1..10', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Range(Value(1), Value(10))],
        within: true,
      })
    ));
  });

  it('rejects a range after "is"', () => {
    rejects('n is 1..10', `Expected end-of-file; got '..'`);
  });

  it('parses negated ranges', () => {
    // 'not in' and '!=' produce identical parse trees with a range on the right.
    for (const rule of ['n != 1..10', 'n not in 1..10']) {
      parses(rule, PluralRule(
        Relation({
          expr: Expr('n'),
          ranges: [Range(Value(1), Value(10))],
          negated: true,
        })
      ));
    }

    // 'not within' is handled differently.
    parses('n not within 1..10', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [Range(Value(1), Value(10))],
        negated: true,
        within: true,
      })
    ));
  });

  it('rejects invalid ranges', () => {
    rejects('n in 1…10', `Expected end-of-file; got '...'`);
    rejects('n in not 1..10', `Expected value or range; got 'not'`);
    rejects('n within 5~10', `Expected end-of-file; got '~'`);
    rejects('n in 0..10..20', `Expected end-of-file; got '..'`);
    rejects('n in 0.1..0.2', `Expected an integer value; got value '0.1'`);
  });

  it('parses multiple ranges', () => {
    for (const rule of ['n = 1..2, 3..4', 'n in 1..2, 3..4']) {
      parses(rule, PluralRule(
        Relation({
          expr: Expr('n'),
          ranges: [
            Range(Value(1), Value(2)),
            Range(Value(3), Value(4))
          ],
        })
      ));
    }

    parses('n within 1..2, 3..4', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [
          Range(Value(1), Value(2)),
          Range(Value(3), Value(4)),
        ],
        within: true,
      })
    ));
  });

  it('rejects invalid multiple ranges', () => {
    rejects('n in 1..2,, 3..4', `Expected value or range; got ','`);
    rejects('n = 1..2 3..4', `Expected end-of-file; got value '3'`);
    rejects('n not within 1..2; 3..4', `Expected end-of-file; got ';'`);
  });

  it('parses a mix of simple values and ranges', () => {
    parses('n = 1, 2..5, 6', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [
          Value(1),
          Range(Value(2), Value(5)),
          Value(6),
        ],
      })
    ));

    parses('n not in 1..5, 7, 9..14', PluralRule(
      Relation({
        expr: Expr('n'),
        ranges: [
          Range(Value(1), Value(5)),
          Value(7),
          Range(Value(9), Value(14)),
        ],
        negated: true,
      })
    ));
  });

  // The following syntax tests are deliberately simplified, as we've tested
  // basically everything that can come after '=', '!=', 'in', etc. above.

  it('parses modulo expressions', () => {
    parses('n mod 10 = 1', PluralRule(
      Relation({
        expr: Expr('n', Value(10)),
        ranges: [Value(1)],
      })
    ));

    parses('i % 10 in 1', PluralRule(
      Relation({
        expr: Expr('i', Value(10)),
        ranges: [Value(1)],
      })
    ));
  });

  it('rejects invalid modulo expressions', () => {
    rejects('n mod i', `Expected value after 'mod' or '%'; got 'i'`);
    rejects('n = 1 mod 10', `Expected end-of-file; got 'mod'`);
    rejects('n = 1 % 10', `Expected end-of-file; got '%'`);
    // modulo expression must be followed by a relation operator
    rejects('i % 10', `Expected '=', '!=', 'is', 'in', 'within' or 'not'; got end-of-file`);
  });

  it('parses "and" conditions', () => {
    parses('n != 11 and n % 10 = 1', PluralRule(
      AndCondition([
        Relation({
          expr: Expr('n'),
          ranges: [Value(11)],
          negated: true,
        }),
        Relation({
          expr: Expr('n', Value(10)),
          ranges: [Value(1)],
        }),
      ])
    ));

    // Consecutive relations should end up under the same AndCondition,
    // and definitely not an AndCondition nested under another.
    parses('n = 1 and n = 2 and n = 3', PluralRule(
      AndCondition([
        Relation({ expr: Expr('n'), ranges: [Value(1)] }),
        Relation({ expr: Expr('n'), ranges: [Value(2)] }),
        Relation({ expr: Expr('n'), ranges: [Value(3)] }),
      ])
    ));
  });

  it('rejects invalid "and" conditions', () => {
    rejects('n = 1 and 2', `Expected an operand (n, i, f, t, v, w, c, e); got value '2'`);
    rejects('n = 1 and and n = 2', `Expected an operand (n, i, f, t, v, w, c, e); got 'and'`);
    rejects('n = 1, and n = 2', `Expected value or range; got 'and'`);
  });

  it('parses "or" conditions', () => {
    parses('n = 1 or n mod 10 = 2', PluralRule(
      OrCondition([
        Relation({ expr: Expr('n'), ranges: [Value(1)] }),
        Relation({
          expr: Expr('n', Value(10)),
          ranges: [Value(2)],
        }),
      ])
    ));

    // Similar to 'and' conditions, consecutive alternatives should
    // end up under the same OrCondition.
    parses('n = 1 or n = 2 or n = 3', PluralRule(
      OrCondition([
        Relation({ expr: Expr('n'), ranges: [Value(1)] }),
        Relation({ expr: Expr('n'), ranges: [Value(2)] }),
        Relation({ expr: Expr('n'), ranges: [Value(3)] }),
      ])
    ));
  });

  it('rejects invalid "or" conditions', () => {
    rejects('n = 1 or 2', `Expected an operand (n, i, f, t, v, w, c, e); got value '2'`);
    rejects('n = 1 or or n = 2', `Expected an operand (n, i, f, t, v, w, c, e); got 'or'`);
    rejects('n = 1, or n = 2', `Expected value or range; got 'or'`);
  });

  it('parses "or" and "and" with correct precedence', () => {
    // A or B and C == A or (B and C)
    parses('n = 1 or n != 2 and n % 10 = 2', PluralRule(
      OrCondition([
        Relation({ expr: Expr('n'), ranges: [Value(1)] }),
        AndCondition([
          Relation({
            expr: Expr('n'),
            ranges: [Value(2)],
            negated: true,
          }),
          Relation({
            expr: Expr('n', Value(10)),
            ranges: [Value(2)],
          }),
        ]),
      ])
    ));

    // A and B or C and D == (A and B) or (C and D)
    parses('n = 1 and n = 2 or n = 3 and n = 4', PluralRule(
      OrCondition([
        AndCondition([
          Relation({ expr: Expr('n'), ranges: [Value(1)] }),
          Relation({ expr: Expr('n'), ranges: [Value(2)] }),
        ]),
        AndCondition([
          Relation({ expr: Expr('n'), ranges: [Value(3)] }),
          Relation({ expr: Expr('n'), ranges: [Value(4)] }),
        ]),
      ])
    ));
  });

  it('parses "@integer" sample values', () => {
    parses('n = 1 @integer 1', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        integer: SampleList([SampleValue(1)])
      }),
    ));

    parses('n = 1 @integer 1, 2~5', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        integer: SampleList([
          SampleValue(1),
          SampleRange(SampleValue(2), SampleValue(5))
        ])
      })
    ));

    parses('n = 1 @integer 1, 10, 100, ...', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        integer: SampleList([
          SampleValue(1),
          SampleValue(10),
          SampleValue(100),
        ], true),
      })
    ));
  });

  it('rejects invalid "@integer" samples', () => {
    rejects('n = 1 @integer ...', `Expected at least one sample value or range before '...'`);
    rejects('n = 1 @integer 1,', `Expected sample value or sample range; got end-of-file`);
    rejects('n = 1 @integer 1…', `Expected end-of-file; got '...'`);
  });

  it('parses "@decimal" sample values', () => {
    parses('n = 1 @decimal 1.00', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        decimal: SampleList([SampleValue(1, '1.00')])
      }),
    ));

    parses('n = 1 @decimal 1, 2.01~2.09', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        decimal: SampleList([
          SampleValue(1),
          SampleRange(SampleValue(2.01, '2.01'), SampleValue(2.09, '2.09'))
        ])
      })
    ));

    parses('n = 1 @decimal 1, 2.0, 3.00, …', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        decimal: SampleList([
          SampleValue(1),
          SampleValue(2, '2.0'),
          SampleValue(3, '3.00'),
        ], true),
      })
    ));
  });

  it('rejects invalid "@decimal" samples', () => {
    rejects('n = 1 @decimal ...', `Expected at least one sample value or range before '...'`);
    rejects('n = 1 @decimal 1,', `Expected sample value or sample range; got end-of-file`);
    rejects('n = 1 @decimal 1…', `Expected end-of-file; got '...'`);
  });

  it('parses a mix of "@integer" and "@decimal"', () => {
    parses('n = 1 @integer 1 @decimal 2', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        integer: SampleList([SampleValue(1)]),
        decimal: SampleList([SampleValue(2)]),
      })
    ));

    parses('n = 1 @integer 1, 2, … @decimal 3, 4, ...', PluralRule(
      Relation({ expr: Expr('n'), ranges: [Value(1)] }),
      Samples({
        integer: SampleList([SampleValue(1), SampleValue(2)], true),
        decimal: SampleList([SampleValue(3), SampleValue(4)], true),
      })
    ));
  });

  it('rejects "@decimal" before "@integer"', () => {
    rejects('n = 1 @decimal 1 @integer 1', `Expected end-of-file; got '@integer'`);
  });

  it('rejects unknown sample categories', () => {
    rejects('n = 1 @real 1', `Unknown keyword token: @real`);
    rejects('n = 1 @int 1', `Unknown keyword token: @int`);
    rejects('n = 1 @itneger 1', `Unknown keyword token: @itneger`);
    rejects('n = 1 @foobar 1', `Unknown keyword token: @foobar`);
  });
});
