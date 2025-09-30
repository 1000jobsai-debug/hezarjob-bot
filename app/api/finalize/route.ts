// app/api/finalize/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query, toPgVectorLiteral } from "@/lib/db";
import { generateText, embedText } from "@/lib/llm";

// پرامپت تحلیل کمی (بخش 5) — نسخه ساده و استانداردسازی‌شده برای O*NET
const QUANT_ANALYSIS_PROMPT_FA = `
تو باید از کل تاریخچه‌ی گفتگو یک پروفایل ساختاریافته O*NET تولید کنی:
- interests (RIASEC) روی مقیاس OI=1..7 (اعداد اعشاری مجاز است)
- workValues روی مقیاس VH=1..6
- workStyles روی مقیاس IJ=1..5
- job_zone یک عدد 1..5 با جمله توجیهی کوتاه فارسی
قواعد استخراج:
- شواهد مثبت/منفی را وزن‌دار کن (ذکر فعالیت مرتبط، هیجان مثبت، موفقیت چشمگیر → وزن بالاتر)
- اگر پاسخ‌ها مبهم یا کوتاه است، امتیاز میانه بده و در توجیه ذکر کن «عدم شواهد کافی»
خروجی فقط یک JSON فارسی با کلیدهای زیر باشد:
{
  "job_zone": <1..5>,
  "interests": { "Realistic": <1..7>, "Investigative": <1..7>, "Artistic": <1..7>, "Social": <1..7>, "Enterprising": <1..7>, "Conventional": <1..7> },
  "work_values": { "Achievement": <1..6>, "Independence": <1..6>, "Recognition": <1..6>, "Relationships": <1..6>, "Support": <1..6>, "Working_Conditions": <1..6> },
  "work_styles": { "Attention_to_Detail": <1..5>, "Stress_Tolerance": <1..5>, "Initiative": <1..5>, "Adaptability_Flexibility": <1..5>, "Cooperation": <1..5>, "Leadership": <1..5> },
  "rationale": "یک پاراگراف کوتاه توجیه عددها"
}
`;

const PERSONALITY_PARAGRAPH_PROMPT_FA = `
بر اساس JSON پروفایل شغلی زیر، یک پاراگراف شخصیت فارسی کوتاه (۵-۸ خط) بنویس که هسته علایق، ارزش‌های کاری، و سبک‌های کاری را منسجم و طبیعی توضیح دهد (بدون اصطلاحات فنی).
`;

const REASONS_PROMPT_FA = `
تو یک مشاور شغلی هستی. برای هر شغل از لیست زیر، یک توضیح کوتاه فارسی (حداکثر ۲ خط) بنویس که «چرا» با پروفایل فرد می‌خواند. استدلال را به علایق/ارزش‌ها/سبک‌های کاری اشاره کن. خروجی JSON آرایه‌ای از آبجکت‌ها باشد:
[{ "title": "...", "reason": "..." }, ...]
`;

export async function POST(req: Request) {
  try {
    const { userId } = await req.json() as { userId: number };
    if (!userId) return NextResponse.json({ error: "userId لازم است." }, { status: 400 });

    // کاربر و مکالمه
    const u = await query<{id:number}>(
      `SELECT id FROM public.users WHERE telegram_user_id = $1`, [userId]
    );
    if (!u.rowCount) return NextResponse.json({ error: "کاربر پیدا نشد." }, { status: 404 });
    const id = u.rows[0].id;

    const conv = await query<{conversation_history:any, career_profile:any}>(
      `SELECT conversation_history, career_profile
       FROM public.conversations WHERE user_id = $1`, [id]
    );
    const history = conv.rows[0]?.conversation_history || [];
    let careerProfile = conv.rows[0]?.career_profile;

    // 1) اگر پروفایل نداریم، بساز
    if (!careerProfile) {
      const contents = [
        { role:"user", parts:[{ text: QUANT_ANALYSIS_PROMPT_FA }]},
        { role:"model", parts:[{ text: "باشه. منتظر تاریخچه گفتگو هستم." }]},
        { role:"user", parts:[{ text: JSON.stringify(history) }]}
      ];
      const analysisText = await generateText(contents);
      try {
        careerProfile = JSON.parse(analysisText);
      } catch {
        return NextResponse.json({ error: "تحلیل نهایی نامعتبر است." }, { status: 500 });
      }
      await query(
        `UPDATE public.conversations SET career_profile = $1::jsonb WHERE user_id = $2`,
        [JSON.stringify(careerProfile), id]
      );
    }

    // 2) پاراگراف شخصیت
    const contents2 = [
      { role:"user", parts:[{ text: PERSONALITY_PARAGRAPH_PROMPT_FA }]},
      { role:"user", parts:[{ text: JSON.stringify(careerProfile) }]}
    ];
    const persona = await generateText(contents2);

    // 3) امبدینگ + match
    const vec = await embedText(persona);
    const lit = toPgVectorLiteral(vec);

    const best = await query<{title:string; similarity:number}>(
      `SELECT title, similarity FROM match_jobs(
         CAST($1 AS vector), CAST($2 AS real), CAST($3 AS integer)
       );`,
      [lit, 0.40, 30] // می‌گیریم ۳۰ تا، بعداً ۱۰ تای اول را برمی‌داریم
    );
    const top10 = best.rows
      .sort((a,b) => b.similarity - a.similarity)
      .slice(0, 10);

    // 4) دلیل کوتاه برای هر شغل (LLM)
    const contents3 = [
      { role:"user", parts:[{ text: REASONS_PROMPT_FA }]},
      { role:"user", parts:[{ text: "پروفایل شغلی:\n" + JSON.stringify(careerProfile, null, 2) }]},
      { role:"user", parts:[{ text: "مشاغل:\n" + JSON.stringify(top10.map(r => ({ title: r.title, match: r.similarity }))) }]}
    ];
    let reasonsJson: {title:string; reason:string}[] = [];
    try {
      const reasonsText = await generateText(contents3);
      reasonsJson = JSON.parse(reasonsText);
    } catch {
      // اگر JSON نشد، حداقل بدون دلیل برگردانیم
      reasonsJson = top10.map(r => ({ title: r.title, reason: "تناسب بالا با الگوی علایق/ارزش‌ها/سبک‌های کاری شما." }));
    }

    // 5) ثبت زمان گزارش و آرشیو برای اعتبارسنجی انسانی
    await query(
      `UPDATE public.conversations SET report_generated = now() WHERE user_id = $1`, [id]
    );
    await query(
      `INSERT INTO public.analysis_audit (user_id, career_profile, personality_paragraph, top_matches)
       VALUES ($1, $2::jsonb, $3, $4::jsonb)`,
      [id, JSON.stringify(careerProfile), persona, JSON.stringify(reasonsJson)]
    );

    // خروجی نهایی
    return NextResponse.json({
      ok: true,
      career_profile: careerProfile,
      personality_paragraph: persona,
      top_matches: reasonsJson
    });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
