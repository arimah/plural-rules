import ParseError from './parse-error';
import lex, { Lexer, Token } from './lexer';
import {
  PluralRuleSet,
  PluralRule,
  Condition,
  Alternative,
  Relation,
  Expr,
  Value,
  RangeList,
  Range,
  Samples,
  SampleList,
  SampleValue,
  SampleRange,
  PluralCategory,
} from './types';

/*
 * The full grammar from the Unicode Consortium, cleaned up ever so slightly,
 * is as follows:
 *
 *   rules           = rule (';' rule)*
 *   rule            = keyword ':' condition samples
 *                   | 'other' ':' samples
 *   keyword         = [a-z]+
 *   keyword         = [a-z]+
 *
 *   condition       = and_condition ('or' and_condition)*
 *   samples         = ('@integer' sampleList)?
 *                     ('@decimal' sampleList)?
 *   and_condition   = relation ('and' relation)*
 *   relation        = is_relation | in_relation | within_relation
 *   is_relation     = expr 'is' ('not')? value
 *   in_relation     = expr (('not')? 'in' | '=' | '!=') range_list
 *   within_relation = expr ('not')? 'within' range_list
 *   expr            = operand (('mod' | '%') value)?
 *   operand         = 'n' | 'i' | 'f' | 't' | 'v' | 'w' | 'c' | 'e'
 *   range_list      = (range | value) (',' range_list)?
 *   range           = value '..' value
 *   value           = digit+
 *   sampleList      = sampleRange (',' sampleRange)* (',' ('…'|'...'))?
 *   sampleRange     = sampleValue ('~' sampleValue)?
 *   sampleValue     = value ('.' digit+)? ([ce] digitPos digit+)?
 *   digit           = [0-9]
 *   digitPos        = [1-9]
 *
 * In this parser, we use 'keyword' to refer to the operator words - 'and',
 * 'or', 'not', 'is', 'within', and so on. What the official grammar calls a
 * keyword, we refer to as a 'plural category'.
 */

/**
 * Parses a plural rule set, which contains plural categories, their
 * corresponding conditions, and optional sample values for each category.
 *
 * Example:
 *
 *     one: n = 1;
 *     two: n mod 10 = 2 and n != 12 @integer 2, 22, 32, 102, 112, 122, ...
 *
 * The exact syntax of plural rules is beyond the scope of this comment.
 * @param source The source string to parse.
 * @return The parsed plural rule set.
 * @throws {ParseError} A syntax error was encountered.
 */
export function parseRuleSet(source: string): PluralRuleSet {
 /*
  * This parses a set of rules:
  *
  *   rules           = rule (';' rule)*
  *   rule            = keyword ':' condition samples
  *                   | 'other' ':' samples
  *   keyword         = [a-z]+
  *   keyword         = [a-z]+
  *
  * Note: 'keyword' here means plural category.
  */
  const lexer = lex(source);

  const rules = new Map<PluralCategory, PluralRule>();

  // Note: The way the grammar is laid out, 'samples' is totally optional, and
  // 'other' can only have samples. As a result, a rule set like this:
  //
  //   one: n = 1;
  //   other:
  //
  // should be *legal*. I don't know if this is intended, but for the sake of
  // conforming with the spec, this code permits it. The spec also does *not*
  // say that 'other' must be last. Indeed, it specifically says rule order
  // must not matter.
  let other: Samples | null = null;
  // Duplicated plural categories are not permitted, so we must keep track of
  // whether we have seen 'other', even if it has no samples.
  let otherSeen = false;

  if (lexer.peek().kind !== 'EOF') {
    do {
      // The official grammar allows any sequence of [a-z]+ as the plural
      // category name, so we must follow suit. The only name that is special
      // is 'other', which cannot have a condition.
      let category: string;
      const token = lexer.next();
      if (token.kind === 'PluralCategory') {
        category = token.name;
      } else if (Token.isKeyword(token) || Token.isOperand(token)) {
        category = token.kind;
      } else {
        return expected(`a plural category`, token);
      }

      if (!lexer.accept(':')) {
        return expected(`':' after plural category`, lexer.peek());
      }

      if (category === 'other') {
        if (otherSeen) {
          throw new ParseError(`Category 'other' occurs more than once`);
        }
        otherSeen = true;
        other = parseSamples(lexer);
      } else {
        if (rules.has(category)) {
          throw new ParseError(`Category '${category}' occurs more than once`);
        }
        const rule = parseRuleBody(lexer);
        rules.set(category, rule);
      }
    } while (lexer.accept(';'));
  }

  expectEOF(lexer);

  return { kind: 'PluralRuleSet', rules, other };
}

/**
 * Parses a single plural rule (without plural category name). The rule contains
 * the conditions that trigger the rule, as well as optional sample values that
 * the rule matches.
 *
 * The parser does not verify that the rule matches the supplied sample values,
 * if there are any.
 *
 * Examples:
 *
 * * `n = 1`
 * * `n = 0, 1 or n in 11..19`
 * * `n mod 10 not in 0, 4..8 @integer 1, 2, 3, 9, 11, 12, 13, 19, ...`
 * @param source The source string to parse.
 * @return The parsed plural rule.
 * @throws {ParseError} A syntax error was encountered.
 */
export function parseRule(source: string): PluralRule {
  /*
   * This parses a rule *without* the plural category prefix, which means:
   *
   *   standalone_rule = condition samples
   *
   * (samples is potentially zero-length)
   */
  const lexer = lex(source);
  const rule = parseRuleBody(lexer);
  expectEOF(lexer);

  return rule;
}

function expectEOF(lexer: Lexer) {
  const token = lexer.next();
  if (token.kind !== 'EOF') {
    expected(`end-of-file`, token);
  }
}

function parseRuleBody(lexer: Lexer): PluralRule {
  /*
   * This parses the part of a rule that comes after the plural category prefix,
   * which means:
   *
   *   rule_body = condition samples
   *
   * (samples is potentially zero-length)
   */
  const condition = parseCondition(lexer);
  const samples = parseSamples(lexer);
  return { kind: 'PluralRule', condition, samples };
}

function parseCondition(lexer: Lexer): Condition {
  /*
   * condition = and_condition ('or' and_condition)*
   */
  const left = parseAndCondition(lexer);

  if (lexer.peek().kind === 'or') {
    const alternatives = [left];
    while (lexer.accept('or')) {
      alternatives.push(parseAndCondition(lexer));
    }
    return { kind: 'OrCondition', alternatives };
  }

  return left;
}

function parseAndCondition(lexer: Lexer): Alternative {
  /*
   * and_condition = relation ('and' relation)*
   */
  const left = parseRelation(lexer);

  if (lexer.peek().kind === 'and') {
    const relations = [left];
    while (lexer.accept('and')) {
      relations.push(parseRelation(lexer));
    }
    return { kind: 'AndCondition', relations };
  }

  return left;
}

function parseRelation(lexer: Lexer): Relation {
  /*
   * relation        = is_relation | in_relation | within_relation
   * is_relation     = expr 'is' ('not')? value
   * in_relation     = expr (('not')? 'in' | '=' | '!=') range_list
   * within_relation = expr ('not')? 'within' range_list
   */
  const expr = parseExpr(lexer);

  // We can safely consume one token after the expression; there's
  // no relation that is just an expression.
  let token = lexer.next();
  let negated = false;

  if (token.kind === 'is') {
    // is_relation
    negated = lexer.accept('not');
    const value = expectIntValue(
      lexer,
      negated
        ? `value after 'is not'`
        : `value or 'not' after 'is'`
    );
    return { kind: 'Relation', expr, negated, ranges: [value], within: false };
  }

  let within = false;
  if (token.kind === 'not') {
    negated = true;
    token = lexer.next();

    // 'not' must be followed by 'in' or 'within', never '=' or '!='.
    if (token.kind !== 'in' && token.kind !== 'within') {
      return expected(`'in' or 'within' after 'not'`, token);
    }
    within = token.kind === 'within';
  } else if (token.kind === '!=') {
    // '!=' is the same as 'not in'
    negated = true;
  } else if (token.kind === 'within') {
    // 'within' is a legacy form that changes its ranges to include non-integer
    // values. E.g. `n in 1..3` means the same as `n = 1 or n = 2 or n = 3`, but
    // `n within 1..3` means `1 <= n <= 3`. In the modern form, the latter is
    // written as `i in 1..3` or `i = 1..3`.
    within = true;
  } else if (token.kind !== 'in' && token.kind !== '=') {
    return expected(`'=', '!=', 'is', 'in', 'within' or 'not'`, token);
  }

  const ranges = parseRangeList(lexer);
  return { kind: 'Relation', expr, ranges, negated, within };
};

function parseExpr(lexer: Lexer): Expr {
  /*
   * expr    = operand (('mod' | '%') value)?
   * operand = 'n' | 'i' | 'f' | 't' | 'v' | 'w' | 'c' | 'e'
   */
  const operand = lexer.next();
  if (!Token.isOperand(operand)) {
    return expected(`an operand (n, i, f, t, v, w, c, e)`, operand);
  }

  let modDivisor: Value | null = null;
  if (lexer.accept('mod') || lexer.accept('%')) {
    modDivisor = expectIntValue(lexer, `value after 'mod' or '%'`);
  }

  return { kind: 'Expr', operand: operand.kind, modDivisor };
}

function parseRangeList(lexer: Lexer): RangeList {
  /*
   * range_list = (range | value) (',' range_list)?
   * range      = value '..' value
   */
  const ranges: (Range | Value)[] = [];
  do {
    const start = expectIntValue(lexer, `value or range`);

    if (lexer.accept('..')) {
      const end = expectIntValue(lexer, `value after '..'`);
      ranges.push({ kind: 'Range', start, end });
    } else {
      ranges.push(start);
    }
  } while (lexer.accept(','));
  return ranges;
}

function expectIntValue(lexer: Lexer, message: string): Value {
  const token = lexer.next();
  if (token.kind !== 'Value') {
    return expected(message, token);
  }
  if (!token.isInt) {
    return expected(`an integer value`, token);
  }
  return {
    kind: 'Value',
    source: token.source,
    value: parseInt(token.source, 10),
  };
}

function parseSamples(lexer: Lexer): Samples | null {
  /*
   * samples = ('@integer' sampleList)?
   *           ('@decimal' sampleList)?
   */
  let integer: SampleList | null = null;
  if (lexer.accept('@integer')) {
    integer = parseSampleList(lexer);
  }

  let decimal: SampleList | null = null;
  if (lexer.accept('@decimal')) {
    decimal = parseSampleList(lexer);
  }

  if (!integer && !decimal) {
    return null;
  }

  return { kind: 'Samples', integer, decimal };
}

function parseSampleList(lexer: Lexer): SampleList {
  /*
   * sampleList  = sampleRange (',' sampleRange)* (',' ('…'|'...'))?
   * sampleRange = sampleValue ('~' sampleValue)?
   */
  const ranges: (SampleValue | SampleRange)[] = [];
  let infinite = false;

  do {
    if (lexer.accept('...')) {
      if (ranges.length === 0) {
        throw new ParseError(
          `Expected at least one sample value or range before '...'`
        );
      }
      infinite = true;
      break; // '...' is always last
    }

    const start = expectSampleValue(lexer, `sample value or sample range`);
    if (lexer.accept('~')) {
      const end = expectSampleValue(lexer, `sample value after '~'`);
      ranges.push({ kind: 'SampleRange', start, end });
    } else {
      ranges.push(start);
    }
  } while (lexer.accept(','));

  return { kind: 'SampleList', ranges, infinite };
}

function expectSampleValue(lexer: Lexer, message: string): SampleValue {
  const token = lexer.next();
  if (token.kind !== 'Value') {
    return expected(message, token);
  }
  return {
    kind: 'SampleValue',
    source: token.source,
    value: token.isInt
      ? parseInt(token.source, 10)
      : parseFloat(token.source.replace('c', 'e')),
  };
}

function expected(expected: string, actual: Token): never {
  throw new ParseError(`Expected ${expected}; got ${Token.describe(actual)}`);
}
