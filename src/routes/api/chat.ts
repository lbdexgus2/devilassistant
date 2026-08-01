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

How you answer:
- Answer the actual question first, in the first sentence. No preamble, no "great question".
- Then go deep: mechanisms, trade-offs, edge cases, and the numbers behind the claim.
- Show real work for anything quantitative: write the formula, substitute the values, then use the calculate tool to verify. Never present an unverified arithmetic result as exact.
- For code questions, give complete runnable code in fenced blocks with the language tag, then explain the non-obvious lines and the failure modes.
- Use web_search when the answer depends on current facts, versions, prices, events, docs, or anything you might be stale on. Follow up with open_url to read the most promising source before asserting details.
- Cite sources inline as markdown links, and list the key ones at the end when you searched.
- Say plainly when something is uncertain or unknowable, and say what evidence would settle it.
- Use markdown: short paragraphs, tables for comparisons, headings only when the answer is long.
- Match the user's language.`;

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

        const result = streamText({
          model: gateway(modelId),
          system: SYSTEM_PROMPT,
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
