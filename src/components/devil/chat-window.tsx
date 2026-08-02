import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Globe,
  Link2,
  Mic,
  Paperclip,
  RefreshCw,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  usePromptInputAttachments,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { ImageLightbox } from "@/components/devil/image-lightbox";
import { uploadAttachments } from "@/lib/attachments";
import { useDevilSettings } from "@/lib/devil-settings";
import { useI18n } from "@/lib/i18n";
import { useVoiceInput } from "@/lib/voice-recorder";
import { supabase } from "@/integrations/supabase/client";
import devilMark from "@/assets/devil-mark.png";

const LINK_STYLE =
  "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words [&_a]:decoration-current/50 hover:[&_a]:decoration-current";
const ASSISTANT_LINKS = `${LINK_STYLE} [&_a]:text-accent`;
const USER_LINKS = `${LINK_STYLE} [&_a]:text-current`;


const TOOL_META: Record<string, { label: string; icon: typeof Globe }> = {
  "tool-web_search": { label: "Searching the web", icon: Globe },
  "tool-open_url": { label: "Reading a source", icon: Link2 },
  "tool-calculate": { label: "Calculating", icon: Calculator },
};


function AttachmentStrip() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {attachments.files.map((file) => {
        const isImage = (file.mediaType ?? "").startsWith("image/");
        return (
          <div
            key={file.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2 text-xs"
          >
            {isImage && file.url ? (
              <img
                src={file.url}
                alt={file.filename ?? "attachment"}
                className="size-8 rounded object-cover"
              />
            ) : (
              <FileText className="mx-1 size-4 text-muted-foreground" />
            )}
            <span className="max-w-32 truncate">{file.filename ?? "attachment"}</span>
            <button
              type="button"
              aria-label="Remove attachment"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => attachments.remove(file.id)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AttachmentPart({ part }: { part: FileUIPart }) {
  const isImage = (part.mediaType ?? "").startsWith("image/");
  const name = part.filename ?? "attachment";

  if (isImage && part.url) {
    return (
      <ImageLightbox src={part.url} alt={name}>
        <img
          src={part.url}
          alt={name}
          loading="lazy"
          className="max-h-64 w-auto max-w-full object-cover"
        />
      </ImageLightbox>
    );
  }

  return (
    <a
      href={part.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-secondary"
    >
      <FileText className="size-4 text-muted-foreground" />
      <span className="max-w-56 truncate">{name}</span>
    </a>
  );
}


const COLLAPSE_AT = 900;

function CollapsibleText({ text, className }: { text: string; className: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > COLLAPSE_AT;

  if (!long) {
    return <MessageResponse className={className}>{text}</MessageResponse>;
  }

  return (
    <div className="min-w-0">
      <div className={expanded ? "" : "relative max-h-64 overflow-hidden"}>
        <MessageResponse className={className}>{text}</MessageResponse>
        {expanded ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={expanded ? t.showLess : t.showMore}
        className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        <span>{expanded ? t.showLess : t.showMore}</span>
      </button>
    </div>
  );
}

function AnswerActions({ text, onRegenerate }: { text: string; onRegenerate: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const iconClass =
    "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  return (
    <div className="mt-1 flex items-center gap-0.5">
      <button
        type="button"
        aria-label={copied ? t.copied : t.copy}
        title={copied ? t.copied : t.copy}
        className={iconClass}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            toast.error(t.copy);
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
      <button
        type="button"
        aria-label={t.good}
        title={t.good}
        aria-pressed={vote === "up"}
        className={`${iconClass} ${vote === "up" ? "text-accent" : ""}`}
        onClick={() => {
          setVote("up");
          toast.success(t.feedbackThanks);
        }}
      >
        <ThumbsUp className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t.bad}
        title={t.bad}
        aria-pressed={vote === "down"}
        className={`${iconClass} ${vote === "down" ? "text-accent" : ""}`}
        onClick={() => {
          setVote("down");
          toast.success(t.feedbackThanks);
        }}
      >
        <ThumbsDown className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t.regenerate}
        title={t.regenerate}
        className={iconClass}
        onClick={onRegenerate}
      >
        <RefreshCw className="size-4" />
      </button>
    </div>
  );
}



export function ChatWindow({
  threadId,
  initialMessages,
  onTitleMaybeChanged,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onTitleMaybeChanged: () => void;
}) {
  const { settings } = useDevilSettings();
  const { t, language } = useI18n();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modelRef = useRef(settings.model);
  modelRef.current = settings.model;
  const languageRef = useRef(settings.language);
  languageRef.current = settings.language;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {};
        },
        body: () => ({ threadId, model: modelRef.current, language: languageRef.current }),
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (streamError) => toast.error(streamError.message),
    onFinish: () => {
      onTitleMaybeChanged();
      textareaRef.current?.focus();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  const voice = useVoiceInput({
    language,
    onText: (text) => {
      setInput((current) => (current ? `${current.trim()} ${text}` : text));
      textareaRef.current?.focus();
    },
    onError: (code) =>
      toast.error(code === "microphone" ? t.micDenied : code === "empty" ? t.micEmpty : t.micFailed),
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);


  const submit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text && !message.files.length) return;
      if (busy) return;

      setInput("");
      try {
        const { data } = await supabase.auth.getUser();
        const files = message.files.length
          ? await uploadAttachments(message.files, data.user?.id ?? "anon", threadId)
          : [];
        await sendMessage({ text, files });
        onTitleMaybeChanged();
      } catch (uploadError) {
        toast.error((uploadError as Error).message);
      } finally {
        textareaRef.current?.focus();
      }
    },
    [busy, sendMessage, threadId, onTitleMaybeChanged],
  );

  const proseSize = settings.denseText ? "text-[0.9rem] leading-relaxed" : "text-base leading-7";

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col px-0 pb-0 sm:px-4 sm:pb-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border bg-card sm:rounded-3xl sm:border sm:shadow-panel">
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-lg py-10 text-center">
                <img
                  src={devilMark}
                  alt="Devil AI emblem"
                  width={56}
                  height={56}
                  loading="lazy"
                  className="mx-auto size-12 dark:invert"
                />
                <h2 className="font-display mt-4 text-2xl">{t.emptyTitle}</h2>
<p className="mt-2 text-sm text-muted-foreground">{t.emptyBody}</p>
                <div className="mt-6 grid gap-2 text-left">
                  {t.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setInput(suggestion);
                        textareaRef.current?.focus();
                      }}
                      className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground transition-colors hover:border-accent hover:bg-secondary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => {
              const fileParts = message.parts.filter(
                (part): part is FileUIPart => part.type === "file",
              );

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent className="group-[.is-user]:bg-chat-user group-[.is-user]:text-chat-user-foreground">
                    {fileParts.length ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {fileParts.map((part, index) => (
                          <AttachmentPart key={`${message.id}-file-${index}`} part={part} />
                        ))}
                      </div>
                    ) : null}

                    {message.parts.map((part, index) => {
                      const key = `${message.id}-${index}`;

                      if (part.type === "text") {
                        if (message.role === "user") {
                          return (
                            <MessageResponse className={proseSize} key={key}>
                              {part.text}
                            </MessageResponse>
                          );
                        }
                        return (
                          <CollapsibleText key={key} text={part.text} className={proseSize} />
                        );
                      }

                      if (part.type === "reasoning" && settings.showThinking && part.text) {
                        return (
                          <p className="my-2 text-sm italic text-muted-foreground" key={key}>
                            {part.text}
                          </p>
                        );
                      }

                      if (part.type.startsWith("tool-")) {
                        if (!settings.showThinking) return null;
                        const meta = TOOL_META[part.type];
                        const toolPart = part as unknown as {
                          state: "input-streaming" | "input-available" | "output-available" | "output-error";
                          input?: unknown;
                          output?: unknown;
                          errorText?: string;
                        };
                        return (
                          <Tool defaultOpen={false} className="my-2" key={key}>
                            <ToolHeader
                              type={(meta?.label ?? part.type.replace("tool-", "")) as never}
                              state={toolPart.state}
                            />
                            <ToolContent>
                              <ToolInput input={toolPart.input} />
                              <ToolOutput
                                output={
                                  toolPart.output ? (
                                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                                      {JSON.stringify(toolPart.output, null, 2)}
                                    </pre>
                                  ) : undefined
                                }
                                errorText={toolPart.errorText}
                              />
                            </ToolContent>
                          </Tool>
                        );
                      }

                      return null;
                    })}
                  </MessageContent>
                </Message>
              );
            })}

            {status === "submitted" ? (
              <div className="px-1 py-2">
                <Shimmer>{t.thinking}</Shimmer>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                {error.message}
              </p>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="sticky bottom-0 border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-4">
          <PromptInput
            onSubmit={submit}
            multiple
            maxFiles={6}
            maxFileSize={20 * 1024 * 1024}
            onError={(fileError) => toast.error(fileError.message)}
            className="mx-auto w-full max-w-3xl rounded-[28px] bg-surface"
          >
            <AttachmentStrip />
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t.placeholder}
              className="max-h-40 min-h-11 text-base"
            />
            <PromptInputFooter className="justify-between">
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger aria-label={t.attach} className="size-10 shrink-0 rounded-full">
                    <Paperclip className="size-[18px]" />
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments label={t.attachLabel} />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} className="size-10 shrink-0 rounded-full" />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
