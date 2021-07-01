import ParseError from './parse-error';
import { Operand } from './types';

// Tokens are an internal implementation detail, so are not in ./types.

export interface Lexer {
  peek(): Token;
  next(): Token;
  accept(kind: Keyword | Operator | Operand | SampleCategory): boolean;
}

export type Token =
  | KeywordToken
  | OperatorToken
  | OperandToken
  | PluralCategoryToken
  | SampleCategoryToken
  | ValueToken
  | EofToken;

export interface KeywordToken {
  readonly kind: Keyword;
}

export function isKeywordToken(token: Token): token is KeywordToken {
  return isKeyword(token.kind);
}

export function isOperandToken(token: Token): token is OperandToken {
  return isOperand(token.kind);
}

export type Keyword =
  | 'and'
  | 'in'
  | 'is'
  | 'mod'
  | 'not'
  | 'or'
  | 'within';

export interface OperatorToken {
  readonly kind: Operator;
}

export type Operator =
  | '!='
  | ','
  | '..'
  | '...' // also alias of '…'
  | '%'
  | ':'
  | ';'
  | '='
  | '~';

export interface OperandToken {
  readonly kind: Operand;
}

export interface PluralCategoryToken {
  readonly kind: 'PluralCategory';
  readonly name: string;
}

export interface SampleCategoryToken {
  readonly kind: SampleCategory;
}

export type SampleCategory =
  | '@integer'
  | '@decimal';

export interface ValueToken {
  readonly kind: 'Value';
  readonly source: string;
  readonly isInt: boolean;
}

export interface EofToken {
  readonly kind: 'EOF';
}

export default function lex(source: string): Lexer {
  const tokenGenerator = tokens(source);

  const readNext = (): Token => {
    const next = tokenGenerator.next();
    if (next.done) {
      return { kind: 'EOF' };
    }
    return next.value;
  };

  let peekedToken: Token | null = null;

  return {
    peek() {
      if (!peekedToken) {
        peekedToken = readNext();
      }
      return peekedToken;
    },
    next() {
      if (peekedToken) {
        const result = peekedToken;
        peekedToken = null;
        return result;
      }
      return readNext();
    },
    accept(kind) {
      const token = this.peek();
      if (token.kind === kind) {
        this.next();
        return true;
      }
      return false;
    },
  };
};

function* tokens(source: string): Generator<Token> {
  // Group 1: Keyword- or operand-like (sequence of letters), preceded by
  //          optional '@'. If the name doesn't match a known keyword and
  //          doesn't start with '@', we treat it as a plural category.
  // Group 2: Punctuation operator.
  // Group 3: Value (integer or real).
  // Group 4: Decimal points or exponent part of non-integer value.
  // Group 5: Invalid (non-white space) character.
  const tokenPattern = /(@?[a-z]+)|(!=|[%,=:;~…]|\.\.\.?)|(\d+((?:\.\d+)?(?:[ce][1-9]\d*)?))|(\S)/g;

  let m: RegExpExecArray | null;
  while ((m = tokenPattern.exec(source)) !== null) {
    if (m[1]) {
      const word = m[1];
      if (isKeyword(word) || isOperand(word) || isSampleCategory(word)) {
        yield { kind: word };
      } else if (word[0] !== '@') {
        yield { kind: 'PluralCategory', name: word };
      } else {
        throw new ParseError(`Unknown keyword token: ${word}`);
      }
    } else if (m[2]) {
      const operator = m[2];
      yield { kind: operator === '…' ? '...' : operator as Operator };
    } else if (m[3]) {
      const value = m[3];
      const isInt = !m[4];
      yield { kind: 'Value', source: value, isInt };
    } else {
      throw new ParseError(`Invalid character: ${m[5]}`);
    }
  }
}

function isKeyword(source: string): source is Keyword {
  switch (source) {
    case 'and':
    case 'in':
    case 'is':
    case 'mod':
    case 'not':
    case 'or':
    case 'within':
      return true;
    default:
      return false;
  }
}

function isOperand(source: string): source is Operand {
  switch (source) {
    case 'n':
    case 'i':
    case 'f':
    case 't':
    case 'v':
    case 'w':
    case 'c':
    case 'e':
      return true;
    default:
      return false;
  }
}

function isSampleCategory(source: string): source is SampleCategory {
  return source === '@integer' || source === '@decimal';
}
