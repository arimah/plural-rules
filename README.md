# CLDR Plural Rules Parser

Parse and evaluate [CLDR plural rules][cldr-plural-rules]. **Does not come with built-in plural rules; use [`Intl.PluralRules`][intl-pluralrules] for that.**

## Usage

```js
import { parseRuleSet, getPluralCategory } from 'cldr-plural-rules';

// Parse a plural rule set:
const rules = parseRuleSet(`
  one: n mod 10 = 1 and n != 11;
  few: n mod 100 = 2..4
`);

// Look up the plural category of a number:
console.log(getPluralCategory(rules, 0)); // other
console.log(getPluralCategory(rules, 1)); // one
console.log(getPluralCategory(rules, 4)); // few
console.log(getPluralCategory(rules, 11)); // other
console.log(getPluralCategory(rules, 42)); // other
console.log(getPluralCategory(rules, 103)); // few
```

## About

In English, plurals are pretty straightforward. Nouns are singular if the number is 1, plural otherwise: 0 things, 1 thing, 2 things, 3 things, and so on. In French, singular is used for 0 as well: 0 truc, 1 truc, 2 trucs. Other languages go beyond mere singular vs plural, up to *six* distinct forms for Arabic. The rules can get pretty complex.

The [CLDR][] defines a small [grammar for plural rules][cldr-plural-rules]. This package parses rule definitions into a high-level syntax tree, and can evaluate such a syntax tree to find a number's plural category. See the CLDR for details on the plural rule syntax.

This package can [parse rule sets](#parseruleset) with multiple categories, as in the example under [Usage](#usage). It can also [parse a single category rule](#parserule), as in `n mod 10 = 1`. The parser is strict and *will* throw an error if it encounters invalid syntax.

This package accepts plural categories of any name (that contains letters a-z), in addition to the standard categories *zero*, *one*, *two*, *few*, *many* and *other*. The *other* category is the fallback category used when no other matches; it cannot have any rules.

Sample values can be embedded alongside the rule. Sample values are retained but not verified by this package. They can be accessed through `rule.samples` (or `ruleset.other` for *other* category samples), which is null if no samples were specified.

### Limitations

**This is *not* a replacement for [`Intl.PluralRules`][intl-pluralrules].** This package does *not* ship with any plural rules for any locales. It's strictly a parser and evaluator.

**Rules are not validated for correctness.** By CLDR's specification, rules must be non-overlapping. A rule set like `one: n = 1; few: n mod 10 = 1` is invalid, as the number 1 matches both *one* and *few*. This package does not attempt to find overlapping categories; it just returns the first category that matches. Similarly, impossible rules like `n = 0 and n = 1` or `n in 10..1` are not detected.

### Compatibility

The code makes use of [ES6 classes][caniuse-es6-class], [`for...of`][caniuse-for-of] and [map `@@iterator`][caniuse-map-iterator]. It will run in evergreen browsers, but not IE11 or earlier. It also works in nearly all versions of Node.js (but only v14 and above are officially supported).

## API documentation

* [`parseRuleSet()`](#parseruleset)
* [`parseRule()`](#parserule)
* [`getPluralCategory()`](#getpluralcategory)
* [`testPluralRule()`](#testpluralrule)
* [`ParseError`](#parseerror)

### `parseRuleSet()`

> `function parseRuleSet(source: string): PluralRuleSet`

Parses a plural rule set, which contains plural categories, their corresponding conditions, and optional sample values for each category.

If sample values are included, the parser does not verify them.

Example:

```
one: n = 1;
two: n mod 10 = 2 and n != 12 @integer 2, 22, 32, 102, 112, 122, ...
```

The exact details of the syntax are described in the [CLDR plural rules documentation][cldr-plural-rules].

**Arguments:**

* `source`: The rule text to parse.

**Returns:** A high-level syntax tree containing the parsed rules. The returned value can be passed to [`getPluralCategory()`](#getpluralcategory).

An individual category's rule can be accessed through `ruleSet.rules.get('name')`.

### `parseRule()`

> `function parseRule(source: string): PluralRule`

Parses a single plural rule (without plural category name). The rule contains the conditions that trigger the rule, as well as optional sample values that the rule matches.

If sample values are included, the parser does not verify them.

Examples:

* `n = 1`
* `n = 0, 1 or n in 11..19`
* `n mod 10 not in 0, 4..8 @integer 1, 2, 3, 9, 11, 12, 13, 19, ...`

**Arguments:**

* `source`: The rule text to parse.

**Returns:** A high-level syntax tree containing the parsed rule. The returned value can be passed to [`testPluralRule()`](#testpluralrule).

### `getPluralCategory()`

> `function getPluralCategory(rules: PluralRuleSet, n: number | string): string`

Gets the plural category of a number based on the specified rules.

**Arguments:**

* `rules`: The rule set to match the number against.
* `n`: The number to get the plural category for. If the value is a string, it's parsed by `parseFloat()`. Decimal digits and exponents are taken from the input string. If the value is a number, decimal digits and exponents are taken from the `String()`-formatted value.

**Returns:** The first matching plural category, or `'other'` if no category matched.

### `testPluralRule()`

> `function testPluralRule(rule: PluralRule, n: number | string): boolean`

Tests a single plural rule against a number.

**Arguments:**

* `rule`: The rule to test the number against.
* `n`: The number to test. If the value is a string, it's parsed by `parseFloat()`. Decimal digits and exponents are taken from the input string. If the value is a number, decimal digits and exponents are taken from the `String()`-formatted value.

**Returns:** True if the number matches the rule. Otherwise, false.

### `ParseError`

> `class ParseError extends Error`

The error type that is thrown when the parser encounters invalid syntax.

[cldr]: http://cldr.unicode.org/
[cldr-plural-rules]: https://unicode.org/reports/tr35/tr35-numbers.html#Language_Plural_Rules
[intl-pluralrules]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules
[caniuse-es6-class]: https://caniuse.com/es6-class
[caniuse-for-of]: https://caniuse.com/mdn-javascript_statements_for_of
[caniuse-map-iterator]: https://caniuse.com/mdn-javascript_builtins_map_--iterator
