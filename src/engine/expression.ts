type Scope = Record<string, string | number | boolean>;

const TOKEN_RE = /\s*([A-Za-z_]\w*|\d+(?:\.\d+)?|[()+\-*/%])\s*/gy;

export function evaluateArithmetic(expression: string, scope: Scope): number {
  const tokens: string[] = [];
  let index = 0;
  while (index < expression.length) {
    TOKEN_RE.lastIndex = index;
    const match = TOKEN_RE.exec(expression);
    if (!match || match.index !== index) {
      throw new Error(`Unsupported formula token at position ${index}`);
    }
    tokens.push(match[1]);
    index = TOKEN_RE.lastIndex;
  }

  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];

  const parsePrimary = (): number => {
    const token = take();
    if (token === "(") {
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    if (token === "+") return parsePrimary();
    if (token === "-") return -parsePrimary();
    if (/^\d/.test(token ?? "")) return Number(token);
    if (/^[A-Za-z_]/.test(token ?? "")) {
      const value = Number(scope[token]);
      if (Number.isNaN(value)) throw new Error(`Variable "${token}" is not numeric`);
      return value;
    }
    throw new Error(`Unexpected token "${token ?? "end"}"`);
  };

  const parseProduct = (): number => {
    let value = parsePrimary();
    while (["*", "/", "%"].includes(peek())) {
      const operator = take();
      const right = parsePrimary();
      if (operator === "*") value *= right;
      else if (operator === "/") value /= right;
      else value %= right;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseProduct();
    while (["+", "-"].includes(peek())) {
      const operator = take();
      const right = parseProduct();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (cursor !== tokens.length) throw new Error(`Unexpected token "${peek()}"`);
  if (!Number.isFinite(result)) throw new Error("Formula result is not finite");
  return result;
}
