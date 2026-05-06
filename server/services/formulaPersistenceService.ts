type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' };

const allowedExpressionPattern = /^[A-Za-z0-9_+\-*/().\s]+$/;
const maxExpressionLength = 500;
const maxTokenCount = 200;
const maxParserDepth = 32;

const tokenize = (expression: string): Token[] => {
  if (expression.length > maxExpressionLength) {
    throw new Error('Expression is too long for preview.');
  }

  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < expression.length && /[0-9.]/.test(expression[end])) end += 1;
      const value = Number(expression.slice(index, end));
      if (!Number.isFinite(value)) {
        throw new Error('Invalid numeric literal in expression.');
      }
      tokens.push({ type: 'number', value });
      index = end;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < expression.length && /[A-Za-z0-9_]/.test(expression[end])) end += 1;
      tokens.push({ type: 'identifier', value: expression.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported character "${char}" in expression.`);
  }

  if (tokens.length > maxTokenCount) {
    throw new Error('Expression is too complex for preview.');
  }

  return tokens;
};

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly values: Record<string, number>,
  ) {}

  parse(): number {
    const result = this.parseExpression();
    if (this.index !== this.tokens.length) {
      throw new Error('Unexpected token at end of expression.');
    }
    return result;
  }

  private current() {
    return this.tokens[this.index];
  }

  private consume() {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      const token = this.current();
      if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) break;
      this.consume();
      const rhs = this.parseTerm();
      value = token.value === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      const token = this.current();
      if (!token || token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) break;
      this.consume();
      const rhs = this.parseFactor();
      if (token.value === '*') {
        value *= rhs;
      } else {
        if (rhs === 0) throw new Error('Division by zero is not allowed.');
        value /= rhs;
      }
    }
    return value;
  }

  private parseFactor(): number {
    if (this.index > maxTokenCount || this.tokens.length > maxTokenCount) {
      throw new Error('Expression is too complex for preview.');
    }
    const token = this.current();
    if (!token) {
      throw new Error('Unexpected end of expression.');
    }

    if (token.type === 'operator' && token.value === '-') {
      this.consume();
      return -this.parseFactor();
    }

    if (token.type === 'number') {
      this.consume();
      return token.value;
    }

    if (token.type === 'identifier') {
      this.consume();
      if (!(token.value in this.values)) {
        throw new Error(`Unknown variable "${token.value}".`);
      }
      return this.values[token.value];
    }

    if (token.type === 'paren' && token.value === '(') {
      const currentDepth = this.tokens.slice(0, this.index).filter((item) => item.type === 'paren' && item.value === '(').length;
      if (currentDepth >= maxParserDepth) {
        throw new Error('Expression nesting is too deep.');
      }
      this.consume();
      const value = this.parseExpression();
      const closing = this.current();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error('Unclosed parenthesis in expression.');
      }
      this.consume();
      return value;
    }

    throw new Error('Invalid expression syntax.');
  }
}

export const evaluateFormulaPreview = (input: {
  expression: string;
  allowedVariables: string[];
  variables: Record<string, number>;
}) => {
  if (!input.expression.trim()) {
    throw new Error('Expression is required for preview.');
  }
  if (!allowedExpressionPattern.test(input.expression)) {
    throw new Error('Expression contains unsupported characters.');
  }

  const unknownInputVariables = Object.keys(input.variables).filter((key) => !input.allowedVariables.includes(key));
  if (unknownInputVariables.length) {
    throw new Error(`Unknown preview variables: ${unknownInputVariables.join(', ')}.`);
  }

  const tokens = tokenize(input.expression);
  const identifiers = tokens
    .filter((token): token is Extract<Token, { type: 'identifier' }> => token.type === 'identifier')
    .map((token) => token.value);
  const unknownExpressionVariables = identifiers.filter((key) => !input.allowedVariables.includes(key));
  if (unknownExpressionVariables.length) {
    throw new Error(`Expression references unknown variables: ${Array.from(new Set(unknownExpressionVariables)).join(', ')}.`);
  }

  for (const variable of input.allowedVariables) {
    if (!(variable in input.variables)) {
      throw new Error(`Missing value for variable "${variable}".`);
    }
  }

  const parser = new Parser(tokens, input.variables);
  const previewAmount = parser.parse();
  if (!Number.isFinite(previewAmount)) {
    throw new Error('Preview result is not a finite number.');
  }

  return previewAmount;
};
