import { useDevilSettings } from "@/lib/devil-settings";

export type Language = "en" | "th";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  th: "ไทย (Thai)",
};

const STRINGS = {
  en: {
    newChat: "New chat",
    history: "History",
    conversations: "Conversations",
    settings: "Settings",
    settingsHint: "Tune the language, tone, depth and answer style.",
    language: "Language",
    languageHint: "Interface language, and the language Devil AI replies in.",
    webTone: "Web tone",
    depth: "Depth of thinking",
    showThinking: "Show working steps",
    showThinkingHint: "Live search, reading and calculation activity.",
    compact: "Compact text",
    compactHint: "Smaller type, tighter lines.",
    signOut: "Sign out",
    signedIn: "Signed in",
    loadingConversation: "Loading this conversation…",
    loadingThreads: "Loading…",
    noConversations: "No conversations yet.",
    gone: "This conversation no longer exists.",
    startNew: "Start a new chat",
    emptyTitle: "Ask something hard.",
    emptyBody: "I search, read the sources, run the numbers, then answer straight.",
    placeholder: "Ask anything — code, math, research…",
    thinking: "Thinking…",
    showMore: "Show full answer",
    showLess: "Collapse answer",
    deleteConversation: "Delete conversation",
    attach: "Attach photos or files",
    attachLabel: "Photos or files",
    yesterday: "Yesterday",
    daysAgo: (n: number) => `${n} days ago`,
    policyTitle: "Before you start",
    policyIntro: "Please read and accept how Devil AI works.",
    policyAccept: "I accept",
    policyDecline: "Sign out",
    policyPoints: [
      "Devil AI can be wrong. Verify anything important, especially money, legal, medical or security decisions.",
      "Your conversations and attachments are stored in your account so you can return to them. Do not upload passwords, ID cards or payment details.",
      "No cheating, account theft or game-ID fraud. Devil AI will refuse requests to steal, spoof or trade game accounts and will instead help you protect yours.",
      "Nothing illegal, abusive or harmful. Misuse may end your access.",
    ],
    suggestions: [
      "Explain how HTTPS certificate validation actually works, step by step.",
      "Compare Postgres row-level security with app-level checks, with code.",
      "If I invest 1,500 monthly at 7% for 25 years, what do I end with? Show the math.",
    ],
  },
  th: {
    newChat: "แชทใหม่",
    history: "ประวัติ",
    conversations: "บทสนทนา",
    settings: "ตั้งค่า",
    settingsHint: "ปรับภาษา โทนสี ความลึก และรูปแบบคำตอบ",
    language: "ภาษา",
    languageHint: "ภาษาของหน้าจอ และภาษาที่ Devil AI ใช้ตอบ",
    webTone: "โทนหน้าเว็บ",
    depth: "ระดับการคิด",
    showThinking: "แสดงขั้นตอนการทำงาน",
    showThinkingHint: "การค้นเว็บ อ่านแหล่งข้อมูล และการคำนวณ",
    compact: "ตัวหนังสือกระชับ",
    compactHint: "ตัวเล็กลง บรรทัดชิดขึ้น",
    signOut: "ออกจากระบบ",
    signedIn: "เข้าสู่ระบบแล้ว",
    loadingConversation: "กำลังโหลดบทสนทนานี้…",
    loadingThreads: "กำลังโหลด…",
    noConversations: "ยังไม่มีบทสนทนา",
    gone: "ไม่พบบทสนทนานี้แล้ว",
    startNew: "เริ่มแชทใหม่",
    emptyTitle: "ถามเรื่องยาก ๆ ได้เลย",
    emptyBody: "ผมค้นเว็บ อ่านแหล่งข้อมูล คำนวณให้ แล้วตอบตรง ๆ",
    placeholder: "ถามอะไรก็ได้ — โค้ด คณิตศาสตร์ งานค้นคว้า…",
    thinking: "กำลังคิด…",
    showMore: "ดูคำตอบเต็ม",
    showLess: "ย่อคำตอบ",
    deleteConversation: "ลบบทสนทนา",
    attach: "แนบรูปภาพหรือไฟล์",
    attachLabel: "รูปภาพหรือไฟล์",
    yesterday: "เมื่อวาน",
    daysAgo: (n: number) => `${n} วันก่อน`,
    policyTitle: "ก่อนเริ่มใช้งาน",
    policyIntro: "โปรดอ่านและยอมรับเงื่อนไขการใช้งาน Devil AI",
    policyAccept: "ยอมรับ",
    policyDecline: "ออกจากระบบ",
    policyPoints: [
      "Devil AI อาจตอบผิดได้ กรุณาตรวจสอบข้อมูลสำคัญเสมอ โดยเฉพาะเรื่องเงิน กฎหมาย สุขภาพ และความปลอดภัย",
      "บทสนทนาและไฟล์แนบถูกเก็บไว้ในบัญชีของคุณเพื่อกลับมาดูภายหลัง อย่าอัปโหลดรหัสผ่าน บัตรประชาชน หรือข้อมูลการชำระเงิน",
      "ห้ามโกง ขโมยบัญชี หรือฉ้อโกง ID เกม Devil AI จะปฏิเสธคำขอที่เกี่ยวกับการขโมยหรือสวมรอยบัญชีเกม และจะช่วยคุณป้องกันบัญชีของตัวเองแทน",
      "ห้ามใช้ทำสิ่งผิดกฎหมายหรือสร้างความเสียหายแก่ผู้อื่น การใช้ผิดวัตถุประสงค์อาจถูกระงับการใช้งาน",
    ],
    suggestions: [
      "อธิบายทีละขั้นว่าการตรวจสอบใบรับรอง HTTPS ทำงานอย่างไร",
      "เปรียบเทียบ Row-Level Security ของ Postgres กับการเช็คในแอป พร้อมโค้ด",
      "ถ้าลงทุนเดือนละ 1,500 ที่ผลตอบแทน 7% นาน 25 ปี จะได้เท่าไร? แสดงวิธีคิด",
    ],
  },
} as const;

export type Strings = (typeof STRINGS)["en"];

export function getStrings(language: Language): Strings {
  return (STRINGS[language] ?? STRINGS.en) as Strings;
}

export function useI18n() {
  const { settings } = useDevilSettings();
  const language = settings.language;
  return { language, t: getStrings(language) };
}
