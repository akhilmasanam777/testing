"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";

const BACKEND_API_URL =
  "https://querydatainsight-wnz6ited7a-uc.a.run.app";

type Message = {
  sender: "user" | "bot";
  content: string;
  isHtml?: boolean;
};

export default function ChartBotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = (
    content: string,
    sender: "user" | "bot",
    isHtml = false
  ) => {
    setMessages((prev) => [
      ...prev,
      { content, sender, isHtml },
    ]);
  };

  useEffect(() => {
    appendMessage(
      "Hello, Welcome to Traxion AI!",
      "bot"
    );

    appendMessage(
      "Ask me about Work completed, user productivity, active work Blocks, or survey entries on a specific date.",
      "bot"
    );

    appendMessage(
      "You can also ask me to give you data in the form of Charts (line/bar) or Tables.",
      "bot"
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend() {
    if (!query.trim() || loading) return;

    const userQuery = query;

    appendMessage(userQuery, "user");

    setQuery("");
    setLoading(true);

    try {
      const response = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      renderInsight(data.insight);
    } catch (error: any) {
      appendMessage(
        `Something went wrong: ${error.message}`,
        "bot"
      );
    } finally {
      setLoading(false);
    }
  }

  function renderInsight(insight: any) {
    if (
      typeof insight === "object" &&
      insight.result_type === "data_table"
    ) {
      renderTable(insight);
      return;
    }

    const insightStr = String(insight);

    const chartMatch = insightStr.match(
      /^\[CHART\]\s*(.+?)\s*\|\s*(.+)$/
    );

    if (chartMatch) {
      const description = chartMatch[1];
      const imageUrl = chartMatch[2];

      appendMessage(
        `
          <div class="space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              ${description}
            </p>

            <img
              src="${imageUrl}"
              alt="${description}"
              class="rounded-xl border"
            />
          </div>
        `,
        "bot",
        true
      );

      return;
    }

    appendMessage(insightStr, "bot");
  }

  function renderTable(tableData: any) {
    let tableHtml = `
      <div class="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table class="w-full text-sm">
      <thead class="bg-gray-100 dark:bg-gray-800">
      <tr>
    `;

    tableData.columns.forEach((col: string) => {
      tableHtml += `
        <th class="px-4 py-3 text-left whitespace-nowrap">
          ${col}
        </th>
      `;
    });

    tableHtml += `</tr></thead><tbody>`;

    tableData.rows.forEach((row: any) => {
      tableHtml += `<tr class="border-t dark:border-gray-700">`;

      tableData.columns.forEach((col: string) => {
        tableHtml += `
          <td class="px-4 py-3 whitespace-nowrap">
            ${row[col] ?? ""}
          </td>
        `;
      });

      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></div>`;

    appendMessage(tableHtml, "bot", true);
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] h-[85vh] flex flex-col">

          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Traxion Data Insight Chatbot
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                AI-powered analytics assistant
              </p>
            </div>

            <div className="h-10 w-10 rounded-full bg-brand-500 flex items-center justify-center text-white">
              <Bot size={20} />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-[#0f172a]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-brand-500 text-white"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {msg.sender === "user" ? (
                        <User size={18} />
                      ) : (
                        <Bot size={18} />
                      )}
                    </div>

                    <div className="overflow-auto">
                      {msg.isHtml ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: msg.content,
                          }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-7">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm">
                  Processing query...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend();
                  }
                }}
                placeholder="Ask anything about productivity, reports, work progress..."
                className="h-12 flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />

              <button
                onClick={handleSend}
                disabled={loading}
                className="h-12 w-24 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition"
              >
               Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}