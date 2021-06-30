exports.PluralRuleSet = (rules, other = null) => ({
  kind: 'PluralRuleSet',
  rules,
  other,
});

exports.PluralRule = (condition, samples = null) => ({
  kind: 'PluralRule',
  condition,
  samples,
})

exports.OrCondition = alternatives => ({
  kind: 'OrCondition',
  alternatives,
});

exports.AndCondition = relations => ({
  kind: 'AndCondition',
  relations,
});

exports.Relation = ({expr, ranges, negated = false, within = false}) => ({
  kind: 'Relation',
  expr,
  ranges,
  negated,
  within,
});

exports.Value = (value, source = String(value)) => ({
  kind: 'Value',
  source,
  value,
});

exports.Range = (start, end) => ({
  kind: 'Range',
  start,
  end,
});

exports.Expr = (operand, modDivisor = null) => ({
  kind: 'Expr',
  operand,
  modDivisor,
});

exports.Samples = ({integer = null, decimal = null}) => ({
  kind: 'Samples',
  integer,
  decimal,
});

exports.SampleList = (ranges, infinite = false) => ({
  kind: 'SampleList',
  ranges,
  infinite,
});

exports.SampleRange = (start, end) => ({
  kind: 'SampleRange',
  start,
  end,
});

exports.SampleValue = (value, source = String(value)) => ({
  kind: 'SampleValue',
  source,
  value,
});
