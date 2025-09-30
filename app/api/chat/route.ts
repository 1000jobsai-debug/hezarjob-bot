import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "پیام نامعتبر است" }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // TODO: Replace this with actual AI API call
          // For now, simulating a streaming response
          const response = `شما گفتید: "${message}"\n\nاین یک پاسخ نمونه است. لطفاً این قسمت را با فراخوانی واقعی API هوش مصنوعی جایگزین کنید.`

          // Simulate streaming by sending word by word
          const words = response.split(" ")
          for (const word of words) {
            controller.enqueue(encoder.encode(word + " "))
            // Small delay to simulate streaming
            await new Promise((resolve) => setTimeout(resolve, 50))
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
    return NextResponse.json({ error: "خطا در پردازش درخواست" }, { status: 500 })
  }
}
