import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAiChat } from "@/hooks/use-ai";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, User } from "lucide-react";

export default function DoctorAiAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([
    { role: 'ai', content: 'Hello Doctor. I am your medical AI assistant. I can help analyze lab results, suggest differential diagnoses, or summarize medical literature. How can I help you today?' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useAiChat();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    
    try {
      const res = await chatMutation.mutateAsync(userMsg);
      setMessages(prev => [...prev, { role: 'ai', content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error processing your request." }]);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-teal-500" />
          Clinical AI Assistant
        </h1>
        <p className="text-slate-500 mt-1">Secure, intelligent support for clinical decision making.</p>
      </div>

      <Card className="rounded-3xl border-0 shadow-xl shadow-slate-200/50 flex flex-col h-[600px] overflow-hidden bg-white">
        <CardContent className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5"/> : <Sparkles className="w-5 h-5"/>}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-sm' 
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse"/>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-100 rounded-tl-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </CardContent>
        
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a clinical question..." 
              className="flex-1 h-14 rounded-2xl bg-slate-50 border-slate-200 px-6 text-base"
              disabled={chatMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={chatMutation.isPending || !input.trim()} 
              className="h-14 w-14 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-500/20"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </Card>
    </AppLayout>
  );
}
