import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useEntityList } from '@/lib/dataHooks';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Send, Loader2, BookOpen, Target, Lightbulb, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { calcIAProgress } from '@/lib/iaProgress';

const PROMPT_TEMPLATES = [
  { id: 'diagnose',  icon: Target,     label: 'Diagnose weak areas', prompt: 'Based on my subjects and grades, which areas need the most attention and why?' },
  { id: 'strategy',  icon: TrendingUp, label: 'Grade improvement plan', prompt: 'Create a specific, actionable week-by-week study strategy to improve my lowest subjects.' },
  { id: 'ia_tips',   icon: BookOpen,   label: 'IA writing tips', prompt: 'Give me subject-specific IA writing tips for my HL subjects, including common mistakes to avoid and how to hit top marks.' },
  { id: 'tok',       icon: Lightbulb,  label: 'TOK essay ideas', prompt: 'Suggest three strong TOK essay titles and outline an argument structure for each, with examples from my subjects.' },
  { id: 'uni',       icon: Sparkles,   label: 'University readiness', prompt: 'Based on my projected grades, how competitive am I for top universities? What should I do now to strengthen my application?' },
];

function MessageBubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
        {isUser ? (
          <p className="leading-relaxed">{content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:font-semibold [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3">
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AIGradeCoach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('all');

  const { data: subjects } = useEntityList('Subject');
  const { data: ias } = useEntityList('IA');
  const { data: tasks } = useEntityList('Task');
  const { data: topics } = useEntityList('TopicMastery');

  const hasData = subjects?.length > 0 || ias?.length > 0 || tasks?.length > 0 || topics?.length > 0;

  const buildContext = () => {
    const filteredSubjects = selectedSubject === 'all' ? subjects : subjects.filter(s => s.id === selectedSubject);
    const lines = [
      `Student IB profile:`,
      `Subjects: ${filteredSubjects.map(s => `${s.name} ${s.level} (current grade: ${s.current_grade || '?'}/7, target: ${s.target_grade || '?'}/7)`).join(', ')}`,
      `IAs: ${ias.filter(i => filteredSubjects.some(s => s.id === i.subject_id)).map(i => `${i.title} — stage: ${i.stage}, progress: ${calcIAProgress(i)}%`).join('; ')}`,
      `Open tasks: ${tasks.filter(t => t.status !== 'done').length} pending`,
      `Topic mastery issues: ${topics.filter(t => t.status === 'struggling').map(t => t.topic).join(', ') || 'none flagged'}`,
    ];
    return lines.join('\n');
  };

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    setInput('');
    const userMsg = { role: 'user', content: userText };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    const context = buildContext();
    const history = [...messages, userMsg].map(m => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`).join('\n\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert IB Grade Coach — knowledgeable about IB curriculum, assessment criteria, university admissions, and study strategies. Be specific, actionable, and encouraging. Use the student's actual data to personalize your advice.

Student context:
${context}

Conversation so far:
${history}

Respond as the coach with specific, practical IB-focused advice. Use markdown for structure when helpful.`,
      model: 'claude_sonnet_4_6',
    });

    setMessages(m => [...m, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  if (!hasData) {
    return (
      <div>
        <PageHeader
          eyebrow="AI-powered"
          title="Grade Coach"
          description="Your personal IB tutor — analyzes your profile and gives targeted advice on grades, IAs, TOK, and university applications."
        />
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4" style={{ minHeight: '520px' }}>
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2 max-w-md">
            <p className="font-serif text-xl text-foreground">Welcome to Grade Coach</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To get started, add your IB subjects, grades, and IAs to your profile. Once you've added your information, your AI coach will be able to give you personalized advice.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="AI-powered"
        title="Grade Coach"
        description="Your personal IB tutor — analyzes your profile and gives targeted advice on grades, IAs, TOK, and university applications."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left panel: quick prompts */}
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Quick prompts</p>
          {PROMPT_TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => send(t.prompt)} disabled={loading} className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0 transition-colors" />
                  <span className="text-sm font-medium leading-snug">{t.label}</span>
                </div>
              </button>
            );
          })}

          <div className="pt-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Focus on subject</p>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="text-[10px] text-muted-foreground bg-amber-50 text-amber-700 rounded-lg p-3 leading-relaxed">
            ⚡ Uses a premium AI model — costs more integration credits.
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-subtle">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <p className="font-serif text-xl text-foreground">Your IB Grade Coach</p>
                  <p className="text-sm text-muted-foreground max-w-sm">Ask anything about your IB journey — grades, IA strategy, TOK, uni applications, or just what to study next.</p>
                </div>
              )}
              {messages.map((m, i) => <MessageBubble key={i} role={m.role} content={m.content} />)}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Ask your coach anything…"
                rows={2}
                className="flex-1 resize-none"
              />
              <Button onClick={() => send()} disabled={!input.trim() || loading} size="icon" className="h-auto">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
