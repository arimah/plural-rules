import { Operands, getOperands } from './operands';
import {
  PluralRuleSet,
  PluralRule,
  PluralCategory,
  Condition,
  Relation,
  Expr,
  Range,
} from './types';

/**
 * Gets the plural category of a number based on the specified rules.
 * @param rules The rule set to match the number against.
 * @param n The number to get the plural category for. If the value is a string,
 *        it's parsed by `parseFloat()`. Decimal digits and exponents are taken
 *        from the input string. If the value is a number, decimal digits and
 *        exponents are taken from the `String()`-formatted value.
 * @return The first matching plural category, or `'other'` if no category
 *         matched.
 */
export function getPluralCategory(
  rules: PluralRuleSet,
  n: number | string
): PluralCategory {
  if (rules.rules.size > 0) {
    const op = getOperands(n);
    for (const [category, rule] of rules.rules) {
      if (testCondition(rule.condition, op)) {
        return category;
      }
    }
  }
  return 'other';
}

/**
 * Tests a plural rule against a number.
 * @param rule The rule to test the number against.
 * @param n The number to test. If the value is a string, it's parsed by
 *        `parseFloat()`. Decimal digits and exponents are taken from the input
 *        string. If the value is a number, decimal digits and exponents are
 *        taken from the `String()`-formatted value.
 * @return True if the number matches the plural rule. Otherwise, false.
 */
export function testPluralRule(rule: PluralRule, n: number | string): boolean {
  const op = getOperands(n);
  return testCondition(rule.condition, op);
}

function testCondition(node: Condition, op: Operands): boolean {
  switch (node.kind) {
    case 'OrCondition': {
      const { alternatives } = node;
      for (let i = 0; i < alternatives.length; i++) {
        if (testCondition(alternatives[i], op)) {
          return true;
        }
      }
      return false;
    }
    case 'AndCondition': {
      const { relations } = node;
      for (let i = 0; i < relations.length; i++) {
        if (!testRelation(relations[i], op)) {
          return false;
        }
      }
      return true;
    }
    case 'Relation':
      return testRelation(node, op);
  }
}

function testRelation(relation: Relation, op: Operands): boolean {
  let value = evaluateExpr(relation.expr, op);

  let anyRangeMatches = false;
  const { ranges } = relation;
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (
      range.kind === 'Value'
        ? range.value === value
        : rangeContains(range, value, relation.within)
    ) {
      anyRangeMatches = true;
      break;
    }
  }

  // If relation.negated is false, return true if anyRangeMatches is true;
  // If relation.negated is true, return true if anyRangeMatches is false.
  // In other words,
  return anyRangeMatches !== relation.negated;
}

function evaluateExpr(expr: Expr, op: Operands): number {
  const value = op[expr.operand];
  if (expr.modDivisor) {
    return value % expr.modDivisor.value;
  }
  return value;
}

function rangeContains(range: Range, value: number, within: boolean): boolean {
  if (!within && !Number.isInteger(value)) {
    // If within is false, then values in ranges only match against integers.
    // Basically, `1.5 in 1..2` is false, but `1.5 within 1..2` is true.
    return false;
  }
  return range.start.value <= value && value <= range.end.value;
}
