import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, HeartPulse, Sparkles } from "lucide-react";

type Message = { role: "user" | "ai"; content: string };

export default function PatientAiChat() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I'm your MediLink Health Intelligence Assistant 🩺\nI've synchronized with your medical records and prescriptions. Ask me anything about your health journey!\n\nNote: This analysis is based on your local data. Always consult your doctor for medical decisions." }
    ]);

    const chatMutation = useMutation({
        mutationFn: async (message: string) => {
            const r = await apiRequest("POST", "/api/ai/chat", { message });
            return r.json();
        },
        onSuccess: (data) => setMessages(prev => [...prev, { role: "ai", content: data.reply }]),
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const msg = input.trim();
        setMessages(prev => [...prev, { role: "user", content: msg }]);
        setInput("");
        chatMutation.mutate(msg);
    };

    const quickTopics = [
        "What do my medical records say?", 
        "Show my active prescriptions", 
        "Check my emergency blood group", 
        "Summarize my health profile"
    ];

    return (
        <AppLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-display font-bold text-slate-900">AI Health Assistant</h1>
                <p className="text-slate-500 mt-1">Get instant answers to your health questions</p>
            </div>

            <div className="grid lg:grid-cols-4 gap-8" style={{ height: "580px" }}>
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Sparkles className="w-4 h-4 text-teal-600" />Quick Topics</h3>
                    {quickTopics.map((q, i) => (
                        <button key={i} onClick={() => { setMessages(p => [...p, { role: "user", content: q }]); chatMutation.mutate(q); }}
                            className="w-full text-left p-3 bg-slate-50 hover:bg-teal-50 rounded-xl text-sm text-slate-700 hover:text-teal-700 transition-all border border-slate-100 hover:border-teal-200">
                            {q}
                        </button>
                    ))}
                </div>

                <Card className="lg:col-span-3 rounded-3xl border-0 shadow-xl flex flex-col overflow-hidden">
                    <div className="flex items-center gap-3 p-6 bg-gradient-to-r from-teal-500 to-blue-600">
                        <div className="bg-white/20 p-2.5 rounded-xl"><HeartPulse className="w-5 h-5 text-white" /></div>
                        <div>
                            <h3 className="font-bold text-white">MediLink Health AI</h3>
                            <p className="text-xs text-teal-100">Available 24/7 for health guidance</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-white text-xs">Online</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                                {msg.role === "ai" && (
                                    <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === "user" ? "bg-teal-600 text-white rounded-tr-sm" : "bg-white text-slate-800 rounded-tl-sm"}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {chatMutation.isPending && (
                            <div className="flex gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                                    <div className="flex gap-1 items-center">
                                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: ".15s" }}></span>
                                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: ".3s" }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3">
                        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your health..." className="h-12 rounded-2xl flex-1 border-slate-200" />
                        <Button type="submit" disabled={chatMutation.isPending || !input.trim()} className="h-12 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                            <Send className="w-5 h-5" />
                        </Button>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
