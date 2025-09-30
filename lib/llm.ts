// lib/llm.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_CANDIDATES = [
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
  "gemini-1.0-pro", // فقط اگر flash در دسترس نبود
];

function pickFlashName(available: string[]) {
  for (const want of MODEL_CANDIDATES) {
    const hit = available.find((x) => x.endsWith("/" + want) || x === want);
    if (hit) return hit.split("/").pop()!;
  }
  // آخرین چاره
  return "gemini-1.5-flash";
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
let selectedModel = "gemini-1.5-flash";

export async function initGemini() {
  try {
    const models = await genAI.listModels();
    const available = models.map((m: any) => m.name as string);
    selectedModel = pickFlashName(available);
  } catch {
    selectedModel = "gemini-1.5-flash";
  }
  return genAI.getGenerativeModel({
    model: selectedModel,
    // پرامپت سیستم (نسخه خلاصه—در API chat دوباره کامل می‌فرستیم)
    systemInstruction:
      "تو مشاور شغلی «هزارجاب» هستی. یک سؤال در هر نوبت. پاسخ‌های کوتاه را با سوال تکمیلی بسط بده. از پاسخ‌ها RIASEC/Values/Styles/JobZone استخراج کن و در آخر تحلیل روایی خلاصه بده.",
  });
}

export async function generateText(contents: Array<{role:"user"|"model"; parts: {text: string}[] }>) {
  const model = await initGemini();
  // رتری ساده برای 429/503
  const attempt = async () => model.generateContent({ contents });
  try {
    return (await attempt()).response.text();
  } catch (e:any) {
    await new Promise(r => setTimeout(r, 1200));
    return (await attempt()).response.text();
  }
}

/**
 * امبدینگ سازگار با SBERT: HF Inference API
 * مدل: sentence-transformers/paraphrase-multilingual-mpnet-base-v2
 */
export async function embedText(text: string): Promise<number[]> {
  const url = "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-mpnet-base-v2";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": process.env.HF_TOKEN ? `Bearer ${process.env.HF_TOKEN}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF error ${res.status}: ${body}`);
  }

  const data = await res.json();

  // پاسخ‌ها در HF گاهی 1D (بردار مستقیم) یا 2D (توکن‌ها) هستند.
  if (Array.isArray(data) && typeof data[0] === "number") {
    // 1D
    return data as number[];
  }
  if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === "number") {
    // 2D → میانگین‌گیری روی توکن‌ها
    const tokens: number[][] = data;
    const dim = tokens[0].length;
    const out = new Array(dim).fill(0);
    for (const t of tokens) {
      for (let i = 0; i < dim; i++) out[i] += t[i];
    }
    for (let i = 0; i < dim; i++) out[i] /= tokens.length;
    return out;
  }

  throw new Error("Unexpected HF embedding response");
}
