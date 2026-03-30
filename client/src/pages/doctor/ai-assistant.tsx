import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, Stethoscope } from "lucide-react";

type Message = { role: "user" | "ai"; content: string };

export default function DoctorAiAssistant() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello Doctor! I'm your AI Medical Assistant. Ask me about drug interactions, treatment protocols, diagnostic guidance, or patient care recommendations." }
    ]);

    const chatMutation = useMutation({
        mutationFn: async (message: string) => {
            const r = await apiRequest("POST", "/api/ai/chat", { message });
            return r.json();
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
        }
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const msg = input.trim();
        setMessages(prev => [...prev, { role: "user", content: msg }]);
        setInput("");
        chatMutation.mutate(msg);
    };

    const quickQuestions = [
        "What are common drug interactions with Metformin?",
        "Protocol for hypertensive emergency?",
        "Recommended dosage for Amoxicillin in adults?",
    ];

    return (
        <AppLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-display font-bold text-slate-900">AI Medical Assistant</h1>
                <p className="text-slate-500 mt-1">AI-powered clinical decision support for doctors</p>
            </div>

            <div className="grid lg:grid-cols-4 gap-8 h-[600px]">
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-bold text-slate-700">Quick Questions</h3>
                    {quickQuestions.map((q, i) => (
                        <button key={i} onClick={() => { setMessages(p => [...p, { role: "user", content: q }]); chatMutation.mutate(q); }}
                            className="w-full text-left p-3 bg-teal-50 hover:bg-teal-100 rounded-xl text-sm text-teal-700 font-medium transition-all border border-teal-100">
                            {q}
                        </button>
                    ))}
                </div>

                <Card className="lg:col-span-3 rounded-3xl border-0 shadow-xl flex flex-col">
                    <div className="flex items-center gap-3 p-6 border-b border-slate-100">
                        <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-2.5 rounded-xl">
                            <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">MediLink AI (Doctor Mode)</h3>
                            <p className="text-xs text-slate-500">Clinical decision support • Always verify with guidelines</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                                {msg.role === "ai" && (
                                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-teal-600" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-teal-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {chatMutation.isPending && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center"><Bot className="w-5 h-5 text-teal-600" /></div>
                                <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                                    <div className="flex gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: ".15s" }}></span><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: ".3s" }}></span></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-6 border-t border-slate-100 flex gap-3">
                        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a clinical question..." className="h-12 rounded-2xl flex-1" />
                        <Button type="submit" disabled={chatMutation.isPending || !input.trim()} className="h-12 w-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white p-0">
                            <Send className="w-5 h-5" />
                        </Button>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
