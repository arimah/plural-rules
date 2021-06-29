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

exports.Range = (lower, upper) => ({
  kind: 'Range',
  lower,
  upper,
});

exports.Expr = (operand, modDivisor = null) => ({
  kind: 'Expr',
  operand,
  modDivisor,
});
