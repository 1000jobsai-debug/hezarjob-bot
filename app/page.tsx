"use client"

import type React from "react"

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
  const [streamingContent, setStreamingContent] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const handleNewChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "سلام! من مشاور شغلی هوشمند «هزارجاب» هستم. برای شروع، لطفاً خودت رو معرفی کن.",
      },
    ])
    setInput("")
    setStreamingContent("")
  }

  const simulateStreaming = async (text: string) => {
    setStreamingContent("")
    const words = text.split(" ")

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      setStreamingContent((prev) => prev + (i === 0 ? "" : " ") + words[i])
    }

    return text
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

    // Simulate AI response
    const responses = [
      "عالیه! خوشحالم که با شما آشنا شدم. **چند سوال دارم:**\n\n• چه تحصیلاتی دارید؟\n• چند سال سابقه کاری دارید؟\n• چه مهارت‌هایی دارید؟\n\nلطفاً به این سوالات پاسخ دهید تا بتوانم بهتر کمکتان کنم.",
      "ممنون از اطلاعاتی که دادید. بر اساس پروفایل شما، **چند پیشنهاد شغلی** دارم:\n\n• **توسعه‌دهنده نرم‌افزار**: با توجه به مهارت‌های فنی شما\n• **مدیر پروژه**: با توجه به تجربه کاری شما\n• **مشاور فناوری**: ترکیبی از مهارت‌های فنی و ارتباطی\n\nکدام یک برایتان جذاب‌تر است؟",
      "بسیار خوب! برای این مسیر شغلی، **توصیه‌های من:**\n\n1. **آموزش مداوم**: دوره‌های آنلاین را دنبال کنید\n2. **شبکه‌سازی**: در رویدادهای صنعتی شرکت کنید\n3. **پروژه‌های شخصی**: نمونه کارهای خود را بسازید\n\nآیا سوال دیگری دارید؟",
    ]

    const randomResponse = responses[Math.floor(Math.random() * responses.length)]

    await simulateStreaming(randomResponse)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: randomResponse,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setStreamingContent("")
    setIsLoading(false)
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
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        ul: ({ children }) => <ul className="mr-4 list-disc space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="mr-4 list-decimal space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
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

          {/* Streaming Message */}
          {isLoading && streamingContent && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="max-w-[80%] rounded-2xl bg-white px-4 py-3 text-gray-800 shadow-sm">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      ul: ({ children }) => <ul className="mr-4 list-disc space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="mr-4 list-decimal space-y-1">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {streamingContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isLoading && !streamingContent && (
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
