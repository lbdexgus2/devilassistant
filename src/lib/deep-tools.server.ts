/**
 * Research + computation tools for Devil AI.
 * No third-party API key required by default; if BRAVE_SEARCH_API_KEY is set,
 * live Brave web search is used instead of the built-in fallback sources.
 */

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

async function braveSearch(query: string, key: string, limit: number): Promise<SearchHit[]> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
    { headers: { Accept: "application/json", "X-Subscription-Token": key } },
  );
  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);
  const json = (await res.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };
  return (json.web?.results ?? []).slice(0, limit).map((r) => ({
    title: r.title ?? r.url ?? "Untitled",
    url: r.url ?? "",
    snippet: stripHtml(r.description ?? ""),
    source: "brave",
  }));
}

async function duckDuckGoAnswer(query: string): Promise<SearchHit[]> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      Abstract?: string;
      AbstractURL?: string;
      Heading?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };
    const hits: SearchHit[] = [];
    if (json.Abstract) {
      hits.push({
        title: json.Heading || query,
        url: json.AbstractURL || "",
        snippet: json.Abstract,
        source: "duckduckgo",
      });
    }
    for (const topic of json.RelatedTopics ?? []) {
      if (hits.length >= 5) break;
      if (topic.Text && topic.FirstURL) {
        hits.push({
          title: topic.Text.slice(0, 90),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: "duckduckgo",
        });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

async function wikipediaSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query,
      )}&srlimit=${limit}&format=json&origin=*`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    };
    return (json.query?.search ?? []).map((r) => ({
      title: r.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      snippet: stripHtml(r.snippet),
      source: "wikipedia",
    }));
  } catch {
    return [];
  }
}

export async function runWebSearch(query: string, limit = 6) {
  const braveKey = process.env["BRAVE_SEARCH_API_KEY"];
  if (braveKey) {
    try {
      const hits = await braveSearch(query, braveKey, limit);
      if (hits.length) return { query, provider: "brave", results: hits };
    } catch {
      /* fall through to fallback sources */
    }
  }

  const [ddg, wiki] = await Promise.all([
    duckDuckGoAnswer(query),
    wikipediaSearch(query, limit),
  ]);
  const seen = new Set<string>();
  const results = [...ddg, ...wiki]
    .filter((hit) => hit.url && !seen.has(hit.url) && (seen.add(hit.url), true))
    .slice(0, limit);

  return {
    query,
    provider: braveKey ? "fallback" : "duckduckgo+wikipedia",
    results,
    note: results.length
      ? undefined
      : "No results from the built-in sources. Try open_url with a known address.",
  };
}

export function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function openUrl(url: string, maxChars = 14000) {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { url, error: "Invalid URL." };
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return { url, error: "Only http(s) URLs can be opened." };
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html,application/json,text/plain,*/*" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = contentType.includes("json") ? body : stripHtml(body);
    return {
      url: target.toString(),
      status: res.status,
      contentType,
      truncated: text.length > maxChars,
      text: text.slice(0, maxChars),
    };
  } catch (error) {
    return { url: target.toString(), error: (error as Error).message };
  }
}

/** Tiny, dependency-free math evaluator (shunting-yard). No eval, no globals. */
export function calculate(expression: string) {
  const constants: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };
  const fns: Record<string, (n: number) => number> = {
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    sign: Math.sign,
    fact: (n: number) => {
      if (n < 0 || !Number.isInteger(n) || n > 170) return Number.NaN;
      let out = 1;
      for (let i = 2; i <= n; i += 1) out *= i;
      return out;
    },
  };

  const tokens = expression
    .replace(/\s+/g, "")
    .replace(/\*\*/g, "^")
    .match(/(\d+\.?\d*(?:[eE][+-]?\d+)?|[a-zA-Z_][a-zA-Z_0-9]*|[+\-*/%^(),!])/g);

  if (!tokens) return { expression, error: "Could not parse the expression." };

  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 4, u: 3 };
  const rightAssoc = new Set(["^", "u"]);
  const output: Array<number | string> = [];
  const ops: string[] = [];
  let prev: string | null = null;

  for (const token of tokens) {
    if (/^\d/.test(token)) {
      output.push(Number(token));
    } else if (/^[a-zA-Z_]/.test(token)) {
      const lower = token.toLowerCase();
      if (lower in constants) output.push(constants[lower]!);
      else if (lower in fns) ops.push(`f:${lower}`);
      else return { expression, error: `Unknown name "${token}".` };
    } else if (token === ",") {
      while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop()!);
    } else if (token === "(") {
      ops.push("(");
    } else if (token === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop()!);
      if (!ops.length) return { expression, error: "Unbalanced parentheses." };
      ops.pop();
      if (ops.length && ops[ops.length - 1]!.startsWith("f:")) output.push(ops.pop()!);
    } else if (token === "!") {
      output.push("f:fact");
    } else {
      const unary: boolean = token === "-" && (prev === null || prev === "(" || prev === "," || /[+\-*/%^]/.test(prev));
      const op = unary ? "u" : token;
      while (ops.length) {
        const top = ops[ops.length - 1]!;
        if (top === "(" || top.startsWith("f:")) break;
        const higher =
          prec[top]! > prec[op]! || (prec[top] === prec[op] && !rightAssoc.has(op));
        if (!higher) break;
        output.push(ops.pop()!);
      }
      ops.push(op);
    }
    prev = token;
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return { expression, error: "Unbalanced parentheses." };
    output.push(op);
  }

  const stack: number[] = [];
  for (const token of output) {
    if (typeof token === "number") {
      stack.push(token);
      continue;
    }
    if (token.startsWith("f:")) {
      const value = stack.pop();
      if (value === undefined) return { expression, error: "Malformed expression." };
      stack.push(fns[token.slice(2)]!(value));
      continue;
    }
    if (token === "u") {
      const value = stack.pop();
      if (value === undefined) return { expression, error: "Malformed expression." };
      stack.push(-value);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return { expression, error: "Malformed expression." };
    if (token === "+") stack.push(a + b);
    else if (token === "-") stack.push(a - b);
    else if (token === "*") stack.push(a * b);
    else if (token === "/") stack.push(a / b);
    else if (token === "%") stack.push(a % b);
    else if (token === "^") stack.push(a ** b);
    else return { expression, error: `Unsupported operator "${token}".` };
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0]!)) {
    return { expression, error: "Expression did not evaluate to a finite number." };
  }
  const value = stack[0]!;
  return {
    expression,
    value,
    formatted: Number.isInteger(value) ? String(value) : value.toPrecision(12).replace(/0+$/, ""),
  };
}
