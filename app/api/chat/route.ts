"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Copy, Bot, Plus } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "سلام! من مشاور شغلی هوشمند «هزارجاب» هستم. برای شروع، لطفاً خودت رو معرفی کن.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleNewChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "سلام! من مشاور شغلی هوشمند «هزارجاب» هستم. برای شروع، لطفاً خودت رو معرفی کن.",
      },
    ])
    setInput("")
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 1, // آی‌دی ثابت برای نسخه وب
          message: userMessage.content,
        }),
      })

      if (!res.ok) throw new Error("خطا در پاسخ سرور")

      const data = await res.json()
      const reply = data.reply || "⚠️ پاسخی از سرور دریافت نشد."

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error("API error:", err)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "⚠️ خطا در ارتباط با سرور.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  return (
    <div className="flex h-screen flex-col bg-gray-50" dir="rtl">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">مشاور شغلی هزارجاب</h1>
          <Button
            onClick={handleNewChat}
            variant="outline"
            className="flex items-center gap-2 rounded-lg border-gray-300 hover:bg-gray-50 bg-transparent"
          >
            <Plus className="h-4 w-4" />
            <span>گفتگوی جدید</span>
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-start flex-row-reverse" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}

              <div
                className={`group relative max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user" ? "bg-blue-500 text-white" : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}

                {message.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(message.content)}
                    className="absolute top-2 left-2 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="کپی پیام"
                  >
                    <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`h-11 w-11 shrink-0 rounded-full p-0 transition-all ${
              input.trim() && !isLoading
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="پیام خود را بنویسید..."
              disabled={isLoading}
              className="max-h-32 min-h-[44px] w-full resize-none rounded-3xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              rows={1}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}
