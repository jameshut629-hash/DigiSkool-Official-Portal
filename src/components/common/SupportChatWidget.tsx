import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  HelpCircle,
  Phone,
  Mail,
  UserCheck,
  CheckCircle2,
  FileText,
  Building2,
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DigiSkoolLogo } from './DigiSkoolLogo.tsx';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  actionButtons?: { label: string; action: string }[];
}

export const SupportChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'bot',
      text: `Hello ${user?.name || 'there'}! Welcome to DigiSkool Live Support Desk. Agar data add karnay ya kisi bhi feature may koi issue pesh aa raha hai, to hum yahan madad kay liye mojood hain.\n\n📧 Support for email: Please contact us on jameshut629@gmail.com related to any issue!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '📧 Contact Support (jameshut629@gmail.com)', action: 'email_support' },
        { label: '📝 How to Add Student/Admission', action: 'add_student' },
        { label: '🏛️ Lahore vs Okara Campus Data', action: 'campus_data' },
        { label: '💳 Fee Voucher & Receipt Issue', action: 'fee_issue' },
        { label: '🖨️ PDF & Print Troubleshooting', action: 'print_issue' },
        { label: '🔒 Data Deletion (Contact Owner)', action: 'delete_policy' }
      ]
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleQuickAction = (action: string) => {
    let userQuery = '';
    let botResponse = '';

    switch (action) {
      case 'email_support':
        userQuery = 'How do I contact support via email?';
        botResponse = `📧 Support for email:\nPlease contact us on jameshut629@gmail.com related to any issue.\n\n• Support Email: jameshut629@gmail.com\n• Lahore Helpline: +92 331-715-5174\n• Okara Helpline: +92 310-436-7347\n\nAap apna issue email par screenshot ya details kay sath send karein, hamari team foran issue solve karay gi!`;
        break;

      case 'add_student':
        userQuery = 'How do I add a new student or admission?';
        botResponse = `Student ya New Admission add karnay ka tareeqa:
1. Admissions tab may jayen aur "Process New Admission" ya "New Lahore / Okara Form" par click karein.
2. Form may student ka full name, CNIC/B-Form, phone, aur course select karein.
3. Lahore campus kay liye prefix "DGSL" aur Okara campus kay liye "DGSO" automatically assign hota hai.
4. Initial payment aur payment plan choose karke "Save & Issue Admission" par click karein.
5. Form submit hotay hi official Admission Form aur Fee Voucher PDF generate ho jata hai!`;
        break;

      case 'campus_data':
        userQuery = 'How is Lahore and Okara campus data separated?';
        botResponse = `Lahore aur Okara ka data mukammal tor par separate aur categorized hai:
• Lahore Campus: Code "DGSL" (First Floor 12-C, Commercial Market, NFC Society Lahore | Call: +92 331-715-5174)
• Okara Office: Code "DGSO" (185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara | Call: +92 310-436-7347)
• Har view (Dashboard, Admissions, Students, Fees, Reports) may top par Campus Filter Tabs mojood hain jahan aap sirf Lahore ya sirf Okara ka separate data aur separate summary dekh saktay hain!`;
        break;

      case 'fee_issue':
        userQuery = 'Fee voucher ya payment record may koi issue hai';
        botResponse = `Fee collection aur vouchers kay baray may rahnumai:
1. "Fee Vouchers" tab may ja kar "Generate Voucher" click karein ya admission say direct generate karein.
2. Payment record karnay kay liye "Record Payment" button press karein, voucher number select karein aur Cash ya Bank (Bank Al Habib / Bank Islami) select karein.
3. Receipt foran generate hoti hai jisay aap thermal ya A4 format may official DigiSkool logo kay sath print ya download kar saktay hain!`;
        break;

      case 'print_issue':
        userQuery = 'PDF download ya print form work nahi kar raha';
        botResponse = `Print aur PDF Download Resolution:
• Tamam vouchers, receipts, aur admission forms par DigiSkool ka official emblem aur logo crystal clear display hota hai.
• Agar browser print dialog open na ho, to "Download PDF" button click karein jahan standard A4 landscape/portrait PDF download ho jaye gi.
• Landscape mode do copies (Office Copy & Student Copy) print karta hai center folding line kay sath.`;
        break;

      case 'delete_policy':
        userQuery = 'Data delete karnay ka kya tareeqa hai?';
        botResponse = `⚠️ Data Deletion Policy Notice:
DigiSkool kay policy kay mutabiq student records, enrollments aur financial ledgers staff accounts say direct delete nahi kiye ja saktay.
"Data delete karnay kay liye please contact to the owner":
• Owner Email: jameshut629@gmail.com / adnanmrao@gmail.com
• Lahore Helpline: +92 331-715-5174
• Okara Helpline: +92 310-436-7347
Jab koi user deletion attempt karta hai to Owner dashboard par Pending Deletion Request notify ho jati hai!`;
        break;

      default:
        userQuery = 'Need assistance with system operations';
        botResponse = `Aap hamari helpline par foran rabta kar saktay hain: Lahore (+92 331-715-5174) ya Okara (+92 310-436-7347). Support for email: please contact us on jameshut629@gmail.com related to any issue. Hamari team foran issue solve karay gi!`;
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: `user_${Date.now()}`, sender: 'user', text: userQuery, time: now }
    ]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `bot_${Date.now()}`, sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      { id: `user_${Date.now()}`, sender: 'user', text: userText, time: now }
    ]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = userText.toLowerCase();
      let botReply = '';

      if (lower.includes('email') || lower.includes('support') || lower.includes('contact') || lower.includes('issue') || lower.includes('help') || lower.includes('rabta')) {
        botReply = `Support for email: Please contact us on jameshut629@gmail.com related to any issue.\n\n• Dedicated Email: jameshut629@gmail.com\n• Lahore Helpline: +92 331-715-5174\n• Okara Helpline: +92 310-436-7347\n\nHamari support team aap ki rehnumai aur issue fix karnay kay liye tayyar hai.`;
      } else if (lower.includes('delete') || lower.includes('remove') || lower.includes('khatam')) {
        botReply = `Data delete karnay kai liye please contact to the owner (jameshut629@gmail.com / adnanmrao@gmail.com | 0331-7155174). System records permanent audit trail kay teht secure hain.`;
      } else if (lower.includes('lahore') || lower.includes('okara') || lower.includes('campus')) {
        botReply = `Lahore aur Okara ka data aur summary dashboard aur admissions may separate tabs may available hain. Lahore students ka code DGSL aur Okara students ka code DGSO hota hai.`;
      } else if (lower.includes('print') || lower.includes('pdf') || lower.includes('logo') || lower.includes('download')) {
        botReply = `Tamam documents (Admission Form, Fee Voucher, Payment Receipt) may official DigiSkool logo embedded hai aur printable sheets browser print ya direct PDF download kay zariye tayyar hain.`;
      } else if (lower.includes('student') || lower.includes('add') || lower.includes('admission') || lower.includes('dakhla')) {
        botReply = `Data add karnay kay liye "Admissions" ya "Students" tab may "Process New Admission" par click karein. Campus (Lahore ya Okara) select karein aur form submit karein.`;
      } else {
        botReply = `Shukriya! Aap ki query note kar li gayi hai. Support for email: please contact us on jameshut629@gmail.com related to any issue, ya Administrator say 0331-7155174 par WhatsApp/call par foran rabta karein.`;
      }

      setMessages((prev) => [
        ...prev,
        { id: `bot_${Date.now()}`, sender: 'bot', text: botReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 600);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-[#6E1231] hover:bg-[#85173A] text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-[#6E1231]/40 flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer border-2 border-white/20"
          title="DigiSkool Support Chat & Data Entry Help"
          aria-label="Open support chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
          </div>
          <span className="hidden sm:inline font-bold text-xs tracking-wide">
            Support Chat & Help
          </span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[390px] h-[540px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#6E1231] text-white p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20">
                <img src="/digiskool-emblem-white.png" alt="DigiSkool" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold font-display leading-tight">DigiSkool Support Desk</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] text-rose-100">Live Assistance • Lahore & Okara</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner with Support Email */}
          <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
            <span className="truncate">Support: <strong className="font-mono text-[#6E1231]">jameshut629@gmail.com</strong></span>
            <a
              href="mailto:jameshut629@gmail.com"
              className="text-[#6E1231] font-bold underline shrink-0 ml-1.5 hover:text-[#580E27]"
            >
              Email Us
            </a>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#6E1231] text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Optional action buttons inside message */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.actionButtons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(btn.action)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-[#6E1231] hover:border-rose-200 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 transition-colors text-left cursor-pointer"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs p-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[10px] ml-1">DigiSkool Assistant is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contact Helpline Quick Bar with Direct Mailto */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 flex-wrap gap-1">
            <a href="tel:+923317155174" className="flex items-center gap-1 font-bold text-[#6E1231] hover:underline" title="Call Lahore Helpline">
              <Phone className="w-3 h-3 text-[#6E1231]" />
              <span>LHR: 0331-7155174</span>
            </a>
            <span className="text-slate-300">•</span>
            <a href="tel:+923104367347" className="flex items-center gap-1 font-bold text-emerald-800 hover:underline" title="Call Okara Helpline">
              <Phone className="w-3 h-3 text-emerald-700" />
              <span>OKR: 0310-4367347</span>
            </a>
            <span className="text-slate-300">•</span>
            <a href="mailto:jameshut629@gmail.com" className="flex items-center gap-1 font-bold text-[#6E1231] hover:underline" title="Email DigiSkool Support">
              <Mail className="w-3 h-3 text-[#6E1231]" />
              <span className="font-mono">jameshut629@gmail.com</span>
            </a>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or describe data issue..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#6E1231] focus:ring-1 focus:ring-[#6E1231]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-[#6E1231] hover:bg-[#85173A] disabled:opacity-50 text-white rounded-xl transition-all shrink-0 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
