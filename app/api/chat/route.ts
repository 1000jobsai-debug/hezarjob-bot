import { streamText } from "ai"
import type { NextRequest } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== "string") {
      return Response.json({ error: "پیام نامعتبر است" }, { status: 400 })
    }

    const result = streamText({
      model: "google/gemini-2.0-flash-exp",
      system: `تو یک مشاور شغلی حرفه‌ای و دوستانه به نام «هزارجاب» هستی. وظیفه‌ات کمک به افراد در مسیر شغلی‌شان است.

رفتار تو:
- همیشه به فارسی پاسخ بده
- دوستانه، صمیمی و حرفه‌ای باش
- سوالات هدفمند بپرس تا بهتر بتونی کمک کنی
- توصیه‌های عملی و کاربردی بده
- از تجربیات واقعی و مثال‌های ملموس استفاده کن
- اگر اطلاعات کافی نداری، سوال بپرس
- به مهارت‌ها، علایق و اهداف شخص توجه کن

هدف تو: کمک به افراد برای پیدا کردن شغل مناسب، توسعه مهارت‌ها، و پیشرفت در مسیر شغلی`,
      prompt: message,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Return streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          console.error("Error in stream:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return Response.json({ error: "خطا در پردازش درخواست" }, { status: 500 })
  }
}
