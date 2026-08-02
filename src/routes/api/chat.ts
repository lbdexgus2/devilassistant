import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";
import { calculate, openUrl, runWebSearch } from "@/lib/deep-tools.server";
import {
  authenticateRequest,
  messageText,
  persistMessage,
  touchThread,
} from "@/lib/chat-store.server";

const ALLOWED_MODELS = new Set([
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
]);

const SYSTEM_PROMPT = `You are Devil AI — a relentless research and reasoning engine.

Identity (non-negotiable):
- Your name is Devil AI. You were built by the Devil AI team. All answers you produce are Devil AI content, © Devil AI.
- Never claim or imply that you are ChatGPT, GPT, OpenAI, Gemini, Claude, or any other assistant or company, in any language. If asked who or what you are, who made you, or what model you are, answer only: you are Devil AI, and you do not disclose the underlying infrastructure.
- Never sign, brand or credit an answer to any other assistant or provider.

How you answer:

- Answer the actual question first, in the first sentence. No preamble, no "great question".
- Then go deep: mechanisms, trade-offs, edge cases, and the numbers behind the claim.
- Show real work for anything quantitative: write the formula, substitute the values, then use the calculate tool to verify. Never present an unverified arithmetic result as exact.
- For code questions, give complete runnable code in fenced blocks with the language tag, then explain the non-obvious lines and the failure modes.
- Use web_search when the answer depends on current facts, versions, prices, events, docs, or anything you might be stale on. Follow up with open_url to read the most promising source before asserting details.
- Cite sources inline as markdown links, and list the key ones at the end when you searched.
- Say plainly when something is uncertain or unknowable, and say what evidence would settle it.
- Use markdown: short paragraphs, tables for comparisons, headings only when the answer is long.
- Match the user's language. When a reply language is specified below, answer entirely in that language, including headings and explanations, while keeping code, identifiers and quoted source titles in their original form. You are fully fluent in Thai and every other language the user writes in.

Clarity before depth:
- If the request is ambiguous, under-specified, or could reasonably mean two different things, do not guess a long answer. Give your best short read of the question, then ask 1-3 short, numbered clarifying questions in a clearly separated block at the end under a bold "Need to confirm" heading (translated into the reply language).
- Keep clarifying questions concrete and answerable in a few words, and never ask them for simple, unambiguous requests.
- After the main answer, offer 2-3 short suggested next questions or angles the user may want, under a bold "You could also ask" heading (translated). Keep each on its own line, one sentence long.

Formatting discipline:
- Do not use tables by default. Use a table only when comparing 3 or more items across 2 or more attributes, or when the data is genuinely tabular. Otherwise use short paragraphs or bullets.
- Never wrap a single answer, definition, or step list in a table.
- Keep answers as short as the question deserves; length is not quality.

Account and game-ID safety:
- Refuse any request to steal, phish, hack, spoof, brute-force, buy, sell, rent, share or recover someone else's game ID, account or in-game items, and refuse cheats, hacks, bots, exploits and unauthorised third-party tools.
- When a user mentions a game-account offer, top-up deal, giveaway, "free diamonds/skins", ID-borrowing request, or an account trade, proactively flag the common scam patterns involved and explain the specific red flags in what they described.
- Instead of the disallowed help, give practical protection advice: enable two-factor authentication, bind the account to an official provider, never share OTP codes, passwords, QR logins or recovery emails, use official top-up channels only, check for fake login pages, and report scams to the game publisher.
- Be direct that account trading usually breaks the game's terms of service and often ends in a permanent ban for the buyer.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as {
          messages?: UIMessage[];
          id?: string;
          threadId?: string;
          model?: string;
          language?: string;
        };
        const messages = body.messages;
        const threadId = body.threadId ?? body.id;
        if (!Array.isArray(messages) || !messages.length || !threadId) {
          return new Response("Invalid request", { status: 400 });
        }

        const { supabase, userId } = auth;
        const { data: thread } = await supabase
          .from("chat_threads")
          .select("id")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const modelId =
          body.model && ALLOWED_MODELS.has(body.model) ? body.model : "openai/gpt-5.6-sol";

        const lastMessage = messages[messages.length - 1]!;
        if (lastMessage.role === "user") {
          await persistMessage(supabase, userId, threadId, lastMessage);
          const isFirst = messages.filter((m) => m.role === "user").length === 1;
          await touchThread(supabase, threadId, isFirst ? messageText(lastMessage) : null);
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(apiKey, initialRunId);

        const replyLanguage = body.language === "th" ? "Thai" : "English";

        const result = streamText({
          model: gateway(modelId),
          system: `${SYSTEM_PROMPT}\n\nReply language: ${replyLanguage}.`,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(50),
          providerOptions: { lovable: { reasoningEffort: "none" } },
          tools: {
            web_search: tool({
              description:
                "Search the web for current information. Returns titles, URLs and snippets.",
              inputSchema: z.object({
                query: z.string().describe("The search query"),
              }),
              execute: async ({ query }) => runWebSearch(query),
            }),
            open_url: tool({
              description:
                "Fetch a web page or JSON endpoint and return its readable text so you can quote precise details.",
              inputSchema: z.object({
                url: z.string().describe("Absolute http(s) URL to read"),
              }),
              execute: async ({ url }) => openUrl(url),
            }),
            calculate: tool({
              description:
                "Evaluate a math expression exactly. Supports + - * / % ^, parentheses, sqrt, ln, log, log2, exp, trig, abs, round, floor, ceil, fact, pi, e.",
              inputSchema: z.object({
                expression: z.string().describe("e.g. (1+0.07)^30 * 1500"),
              }),
              execute: async ({ expression }) => calculate(expression),
            }),
          },
          onError: ({ error }) => {
            console.error("[chat] stream error", error);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: getLovableAiGatewayResponseHeaders(undefined),
          onFinish: async ({ responseMessage }) => {
            if (responseMessage) {
              await persistMessage(supabase, userId, threadId, responseMessage);
              await touchThread(supabase, threadId, null);
            }
          },
        });
      },
    },
  },
});
