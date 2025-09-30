// app/api/chat/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateText } from "@/lib/llm";

// پرامپت فارسی کامل (خلاصه‌شده برای بدنه)
// اگر می‌خواهی دقیقاً نسخه طولانی خودت باشد، همین‌جا جایگزین کن.
const COUNSELOR_MANIFESTO_FA = `
[هویت] تو مشاور شغلی «هزارجاب» هستی با رویکرد ترکیبی (روایی + تناسب فرد-محیط).
[قوانین] فقط یک سؤال در هر پیام. انتقال نرم بین سؤالات. پاسخ کوتاه = سؤال تکمیلی «کمی بیشتر توضیح می‌دهی؟».
[چارچوب O*NET] استخراج RIASEC، Work Values، Work Styles (۶ مورد کلیدی: جزئیات، استرس، ابتکار، سازگاری، همکاری، رهبری)، Job Zone.
[پروتکل سؤال] شروع با ۵ سؤال ساویکاس؛ سپس ۳–۵ سؤال از بانک سؤالات برای پُر کردن خلأها (اولویت دسته تجربی و هویتی).
[پایان] تحلیل روایی کوتاه؛ سپس بپرس: «اگر موافقی با نوشتن "تایید می‌کنم" ادامه می‌دهم.»
`;

function sanitizeHistory(raw: any[]): {role:"user"|"model"; parts:{text:string}[]}[] {
  const safe: any[] = [];
  for (const it of raw || []) {
    const role = it?.role;
    const parts = it?.parts || [];
    if (!["user","model"].includes(role)) continue;
    const texts: string[] = [];
    for (const p of parts) {
      if (typeof p === "string") {
        const t = p.trim(); if (t) texts.push(t);
      } else if (p && typeof p.text === "string") {
        const t = p.text.trim(); if (t) texts.push(t);
      }
    }
    if (texts.length) safe.push({ role, parts: [{ text: texts.join("\n") }]});
  }
  return safe;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, message } = body as { userId: number, message: string };
    if (!userId || !message) {
      return NextResponse.json({ error: "userId و message لازم است." }, { status: 400 });
    }

    // کاربر
    const u = await query<{id: number}>(
      `INSERT INTO public.users (telegram_user_id, first_name)
       VALUES ($1, 'web')
       ON CONFLICT (telegram_user_id) DO UPDATE SET first_name = public.users.first_name
       RETURNING id;`,
      [userId]
    );
    const id = u.rows[0].id;

    // مکالمه
    const c = await query<{conversation_history: any; career_profile: any}>(
      `SELECT conversation_history, career_profile
       FROM public.conversations WHERE user_id = $1`, [id]
    );
    let history = c.rows[0]?.conversation_history || [];

    // تاریخچه تمیز + پیام فعلی
    const contents = [
      { role: "user", parts: [{ text: COUNSELOR_MANIFESTO_FA }] },
      { role: "model", parts: [{ text: "باشه. آماده‌ام. لطفاً خودت را معرفی کن (نام، سن، جنسیت، وضعیت شغلی، رشته)." }] },
      ...sanitizeHistory(history),
      { role: "user", parts: [{ text: message }] }
    ];

    const answer = await generateText(contents);
    // آپدیت تاریخچه
    history = [
      ...sanitizeHistory(history),
      { role:"user", parts:[{text: message}]},
      { role:"model", parts:[{text: answer}]},
    ];
    await query(
      `INSERT INTO public.conversations (user_id, conversation_history)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET conversation_history = EXCLUDED.conversation_history`,
      [id, JSON.stringify(history)]
    );

    // سیگنال اتمام؟
    let analysisComplete = false;
    try {
      const sig = JSON.parse(answer);
      analysisComplete = sig?.analysis_complete === true;
    } catch {}

    return NextResponse.json({ reply: answer, analysis_complete: analysisComplete });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
