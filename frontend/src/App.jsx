import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const QUESTION_TIME = 90;

// Multi-round config
const MULTI_ROUNDS = [
  { id: 'hr',         label: 'HR Round',          icon: '🤝', color: 'emerald', count: 3 },
  { id: 'technical',  label: 'Technical Round',    icon: '💻', color: 'indigo',  count: 4 },
  { id: 'managerial', label: 'Managerial Round',   icon: '🧠', color: 'violet',  count: 3 },
];

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, color, size = 'md' }) {
  const [display, setDisplay] = useState(0);
  const r  = size === 'sm' ? 24 : 36;
  const sw = size === 'sm' ? 5  : 8;
  const vb = size === 'sm' ? 56 : 88;
  const cx = vb / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    let cur = 0; const step = score / 30;
    const t = setInterval(() => {
      cur += step;
      if (cur >= score) { setDisplay(score); clearInterval(t); }
      else setDisplay(Math.round(cur));
    }, 30);
    return () => clearInterval(t);
  }, [score]);

  const C = { emerald:'#10b981', amber:'#f59e0b', rose:'#f43f5e', indigo:'#818cf8', violet:'#a78bfa' };
  const stroke = C[color] || C.indigo;
  const filled = (display / 10) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative ${size === 'sm' ? 'w-14 h-14' : 'w-24 h-24'}`}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${vb} ${vb}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw}/>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={stroke} strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.3s ease' }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${size === 'sm' ? 'text-base' : 'text-2xl'}`} style={{ color: stroke }}>{display}</span>
          {size !== 'sm' && <span className="text-xs text-slate-500">/10</span>}
        </div>
      </div>
      <span className={`font-semibold text-slate-400 uppercase tracking-wide ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{label}</span>
    </div>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function Timer({ seconds, total }) {
  const pct = seconds / total;
  const col = pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#f43f5e';
  const m = String(Math.floor(seconds / 60)).padStart(2,'0');
  const s = String(seconds % 60).padStart(2,'0');
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: col }}/>
      <span className="text-white font-mono font-bold text-sm tracking-widest">{m}:{s}</span>
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────
function HistoryPanel({ onClose, isDark }) {
  const history = (() => {
    try { return JSON.parse(localStorage.getItem('interviewHistory') || '[]'); }
    catch (e) { console.error("History parse error", e); return []; }
  })();
  const card = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-white/10 overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-bold text-xl">Interview History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        {history.length === 0 ? <p className="text-slate-500 text-center mt-10">No past sessions yet.</p>
          : history.slice().reverse().map((s, i) => (
            <div key={i} className={`border rounded-xl p-4 space-y-2 ${card}`}>
              <div className="flex justify-between">
                <span className="text-white font-semibold text-sm">{s.role}</span>
                <span className="text-slate-500 text-xs">{new Date(s.date).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full capitalize">{s.category || s.mode}</span>
                {s.difficulty && <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full capitalize">{s.difficulty}</span>}
              </div>
              <div className="flex gap-4 pt-1">
                {[['Content',s.avgContent,'#10b981'],['Voice',s.avgVoice,'#f59e0b'],['Face',s.avgFace,'#f43f5e']].map(([k,v,c])=>(
                  <div key={k}><div className="text-xs text-slate-500">{k}</div><div className="font-bold text-sm" style={{color:c}}>{v}/10</div></div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme]   = useState(() => localStorage.getItem('theme') || 'dark');
  const isDark = theme === 'dark';
  const toggleTheme = () => { const n = isDark ? 'light' : 'dark'; setTheme(n); localStorage.setItem('theme',n); };

  // Mode: 'standard' | 'personalized' | 'multiround'
  const [interviewMode, setInterviewMode] = useState('standard');

  // Setup state
  const [role,       setRole]       = useState('');
  const [category,   setCategory]   = useState('technical');
  const [difficulty, setDifficulty] = useState('medium');
  const [practiceMode, setPracticeMode] = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);

  // Personalized mode
  const [resumeFile, setResumeFile] = useState(null);
  const [jdText,     setJdText]     = useState('');
  const [isPersonalized, setIsPersonalized] = useState(false);

  // Multi-round state
  const [multiRoundIndex, setMultiRoundIndex] = useState(0); // which round 0=HR,1=Tech,2=Mgr
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [roundResults, setRoundResults] = useState([]); // [{round, results:[]}]

  // Interview state
  const [stage,    setStage]    = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [qIndex,   setQIndex]   = useState(0);
  const [skippedSet, setSkippedSet] = useState(new Set());
  const [isLoadingQs, setIsLoadingQs] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl,    setVideoUrl]    = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(QUESTION_TIME);
  const [timerActive, setTimerActive] = useState(false);

  // Result state
  const [currentResult, setCurrentResult] = useState(null);
  const [allResults,    setAllResults]     = useState([]);
  const [showModel,     setShowModel]      = useState(false);

  const videoRef          = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const chunksRef         = useRef([]);
  const timerRef          = useRef(null);
  const summaryRef        = useRef(null);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
    } catch { alert('Could not access camera and microphone.'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    if (stage === 'interview') startCamera();
    return () => { if (stage === 'interview') stopCamera(); };
  }, [stage]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerActive && !practiceMode && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t-1), 1000);
    } else if (timerActive && !practiceMode && timeLeft === 0) {
      handleStopRecording();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timeLeft, practiceMode]);

  // Confetti effect for summary
  useEffect(() => {
    if (stage === 'summary' && interviewMode !== 'multiround') {
      const answered = allResults.filter(r => !r.skipped);
      if (answered.length > 0) {
        const avg = k => answered.reduce((s, r) => s + (r[k] || 0), 0) / answered.length;
        const overall = (avg('contentScore') + avg('voiceScore') + avg('faceScore') + avg('confidenceScore')) / 4;
        if (overall >= 8) {
          setTimeout(() => confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } }), 300);
        }
      }
    }
  }, [stage, interviewMode, allResults]);

  // ── Fetch Questions ───────────────────────────────────────────────────────
  const fetchStandardQuestions = async () => {
    if (!role.trim()) { alert('Please enter a job role.'); return; }
    setIsLoadingQs(true);
    try {
      const res  = await fetch(`http://localhost:5000/questions?role=${encodeURIComponent(role)}&category=${category}&difficulty=${difficulty}`);
      const data = await res.json();
      return data.questions || [];
    } catch { alert('Failed to fetch questions.'); return []; }
    finally { setIsLoadingQs(false); }
  };

  const fetchPersonalizedQuestions = async () => {
    if (!resumeFile && !jdText.trim()) { alert('Please upload a resume or paste a job description.'); return; }
    setIsLoadingQs(true);
    const fd = new FormData();
    if (resumeFile) fd.append('resume', resumeFile);
    fd.append('jd', jdText);
    fd.append('difficulty', difficulty);
    try {
      const res  = await fetch('http://localhost:5000/questions-from-resume', { method: 'POST', body: fd });
      const data = await res.json();
      setIsPersonalized(data.personalized ?? true);
      return data.questions || [];
    } catch { alert('Failed to generate personalized questions.'); return []; }
    finally { setIsLoadingQs(false); }
  };

  const fetchRoundQuestions = async (roundId) => {
    setIsLoadingQs(true);
    try {
      const res  = await fetch(`http://localhost:5000/questions?role=${encodeURIComponent(role)}&difficulty=${difficulty}&round=${roundId}`);
      const data = await res.json();
      return data.questions || [];
    } catch { return []; }
    finally { setIsLoadingQs(false); }
  };

  // ── Start Interview ───────────────────────────────────────────────────────
  const startInterview = async () => {
    if (!role.trim()) { alert('Please enter a job role.'); return; }
    let qs = [];
    if (interviewMode === 'personalized') {
      qs = await fetchPersonalizedQuestions();
    } else if (interviewMode === 'multiround') {
      setMultiRoundIndex(0);
      setRoundResults([]);
      qs = await fetchRoundQuestions(MULTI_ROUNDS[0].id);
    } else {
      qs = await fetchStandardQuestions();
    }
    if (!qs.length) return;
    setQuestions(qs); setQIndex(0); setAllResults([]); setSkippedSet(new Set());
    setStage('interview');
  };

  // ── Recording ─────────────────────────────────────────────────────────────
  const handleStartRecording = () => {
    setCurrentResult(null); setVideoUrl(null); chunksRef.current = [];
    const stream = videoRef.current?.srcObject;
    if (!stream) { alert('Camera not ready.'); return; }
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = handleStopEvent;
    rec.start(100);
    mediaRecorderRef.current = rec;
    setIsRecording(true); setTimeLeft(QUESTION_TIME); setTimerActive(true);
  };

  const handleStopRecording = () => {
    setTimerActive(false); clearTimeout(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop(); setIsRecording(false);
    }
    stopCamera();
  };

  const handleStopEvent = async () => {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    setVideoUrl(URL.createObjectURL(blob));
    await uploadVideo(blob);
  };

  const uploadVideo = async (blob) => {
    setIsUploading(true);
    const fd = new FormData();
    fd.append('video', blob, 'recording.webm');
    fd.append('question', questions[qIndex] || '');
    try {
      const res    = await fetch('http://localhost:5000/analyze', { method: 'POST', body: fd });
      const result = await res.json();
      setCurrentResult(result);
      setAllResults(prev => [...prev, { question: questions[qIndex], skipped: false, ...result }]);
      setStage('results'); setShowModel(false);
      const avg = Math.round(((result.contentScore||0) + (result.voiceScore||0) + (result.faceScore||0)) / 3);
      if (avg >= 8) confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#818cf8','#a78bfa','#10b981','#f59e0b'] });
    } catch { alert('Analysis failed. Check backend.'); }
    finally { setIsUploading(false); }
  };

  // ── Skip ─────────────────────────────────────────────────────────────────
  const handleSkip = () => {
    setSkippedSet(prev => new Set([...prev, qIndex]));
    setAllResults(prev => [...prev, { question: questions[qIndex], skipped: true, contentScore:0, voiceScore:0, faceScore:0, confidenceScore:0, feedback:'Skipped', strengths:[], improvements:[] }]);
    goNextQuestion();
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNextQuestion = () => {
    const next = qIndex + 1;
    if (next < questions.length) {
      setQIndex(next); setCurrentResult(null); setVideoUrl(null);
      setStage('interview'); setTimeout(startCamera, 300);
    } else {
      // End of current question set
      if (interviewMode === 'multiround') {
        // Save this round's results
        const currentRound = MULTI_ROUNDS[multiRoundIndex];
        setRoundResults(prev => [...prev, { round: currentRound, results: [...allResults, ...[] ] }]);
        const nextRoundIdx = multiRoundIndex + 1;
        if (nextRoundIdx < MULTI_ROUNDS.length) {
          setShowRoundComplete(true); // show round complete screen
        } else {
          saveToHistory(); setStage('summary');
        }
      } else {
        saveToHistory(); setStage('summary');
      }
    }
  };

  const proceedToNextRound = async () => {
    // Save current round results before moving on
    const currentRound = MULTI_ROUNDS[multiRoundIndex];
    setRoundResults(prev => {
      const updated = [...prev];
      // Update with actual allResults
      const idx = updated.findIndex(r => r.round.id === currentRound.id);
      if (idx >= 0) updated[idx] = { round: currentRound, results: allResults };
      else updated.push({ round: currentRound, results: allResults });
      return updated;
    });

    const nextRoundIdx = multiRoundIndex + 1;
    setMultiRoundIndex(nextRoundIdx);
    setShowRoundComplete(false);
    setAllResults([]); setQIndex(0); setCurrentResult(null); setVideoUrl(null);

    const nextRound = MULTI_ROUNDS[nextRoundIdx];
    const qs = await fetchRoundQuestions(nextRound.id);
    if (!qs.length) return;
    setQuestions(qs);
    setStage('interview'); setTimeout(startCamera, 300);
  };

  const saveToHistory = () => {
    const answered = allResults.filter(r => !r.skipped);
    if (!answered.length) return;
    const avg = k => Math.round(answered.reduce((s,r)=>s+(r[k]||0),0)/answered.length);
    const session = { role, category, difficulty, mode: interviewMode, date: Date.now(), avgContent: avg('contentScore'), avgVoice: avg('voiceScore'), avgFace: avg('faceScore') };
    
    try {
      const history = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
      history.push(session);
      localStorage.setItem('interviewHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history", e);
      localStorage.setItem('interviewHistory', JSON.stringify([session]));
    }
  };

  const resetAll = () => {
    stopCamera(); setStage('setup'); setQuestions([]); setQIndex(0); setAllResults([]);
    setCurrentResult(null); setVideoUrl(null); setIsRecording(false); setTimerActive(false);
    setSkippedSet(new Set()); setMultiRoundIndex(0); setRoundResults([]); setShowRoundComplete(false);
    setResumeFile(null); setJdText(''); setIsPersonalized(false);
  };

  const downloadPDF = async () => {
    if (!summaryRef.current) return;
    const canvas = await html2canvas(summaryRef.current, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgH = pw * (canvas.height / canvas.width);
    let posY = 0;
    while (posY < imgH) { pdf.addImage(img,'PNG',0,-posY,pw,imgH); posY+=ph; if(posY<imgH) pdf.addPage(); }
    pdf.save(`${role.replace(/\s+/g,'-')}-interview-report.pdf`);
  };

  // ── Theme helpers ─────────────────────────────────────────────────────────
  const bg   = isDark ? 'bg-[#0f172a]'               : 'bg-slate-100';
  const card = isDark ? 'bg-white/5 border-white/10'  : 'bg-white border-slate-200';
  const txt  = isDark ? 'text-white'                  : 'text-slate-900';
  const sub  = isDark ? 'text-slate-400'              : 'text-slate-500';
  const hdr  = isDark ? 'bg-white/5 border-white/10'  : 'bg-white border-slate-200';
  const inp  = isDark ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:bg-white/10' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  // Current round info for multi-round
  const currentRoundInfo = MULTI_ROUNDS[multiRoundIndex];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bg}`}>
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} isDark={isDark}/>}

      {/* Header */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${hdr}`}>
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
            <div>
              <h1 className={`font-bold text-base leading-none ${txt}`}>AI Interview Coach</h1>
              <p className="text-indigo-400 text-xs">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stage !== 'setup' && <button onClick={resetAll} className={`text-xs border px-3 py-1.5 rounded-lg transition-all ${isDark?'text-slate-400 border-white/10 hover:text-white':'text-slate-600 border-slate-200'}`}>← New Interview</button>}
            <button onClick={()=>setShowHistory(true)} className={`text-xs border px-3 py-1.5 rounded-lg ${isDark?'text-slate-400 border-white/10 hover:text-white':'text-slate-600 border-slate-200'}`}>📋 History</button>
            <button onClick={toggleTheme} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isDark?'border-white/10 text-slate-300':'border-slate-200 text-slate-600'}`}>{isDark?'☀️':'🌙'}</button>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-emerald-400 text-xs font-medium">System Ready</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* ── SETUP ── */}
        {stage === 'setup' && (
          <div className="flex flex-col items-center min-h-[70vh] gap-8 animate-fade-in">
            <div className="text-center space-y-3 pt-6">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-1.5 rounded-full">
                <span className="text-indigo-300 text-sm font-medium">🎯 AI-Powered Interview Practice</span>
              </div>
              <h2 className={`text-5xl font-bold leading-tight ${txt}`}>Ace Your Next<br/><span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Interview</span></h2>
              <p className={`text-lg max-w-md mx-auto ${sub}`}>Real-time AI feedback on content, voice, and presence.</p>
            </div>

            <div className="w-full max-w-lg space-y-5">
              {/* Interview Mode Tabs */}
              <div className={`border rounded-2xl p-1 grid grid-cols-3 gap-1 ${card}`}>
                {[['standard','⚡','Standard'],['personalized','📄','Resume + JD'],['multiround','🏆','Multi-Round']].map(([id,icon,label])=>(
                  <button key={id} onClick={()=>setInterviewMode(id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 ${interviewMode===id ? 'bg-indigo-500 text-white shadow-lg' : isDark?'text-slate-400 hover:text-white':'text-slate-500 hover:text-slate-900'}`}>
                    <span className="text-base">{icon}</span>{label}
                  </button>
                ))}
              </div>

              {/* Job Role */}
              <div className="space-y-1.5">
                <label className={`text-sm font-medium block ${sub}`}>Job Role</label>
                <input type="text" placeholder="e.g. React Developer, Product Manager…"
                  value={role} onChange={e=>setRole(e.target.value)} onKeyDown={e=>e.key==='Enter'&&startInterview()}
                  className={`w-full border px-4 py-3.5 rounded-xl focus:outline-none focus:border-indigo-500 transition-all ${inp}`}/>
              </div>

              {/* Standard / Multi-round: Category + Difficulty */}
              {interviewMode !== 'multiround' && (
                <div className="space-y-1.5">
                  <label className={`text-sm font-medium block ${sub}`}>Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['technical','💻','Technical'],['hr','🤝','HR'],['behavioral','🧠','Behavioral']].map(([id,icon,label])=>(
                      <button key={id} onClick={()=>setCategory(id)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${category===id?'bg-indigo-500 border-indigo-400 text-white':isDark?'bg-white/5 border-white/10 text-slate-400 hover:text-white':'bg-white border-slate-200 text-slate-600'}`}>
                        <span className="text-base">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {interviewMode === 'multiround' && (
                <div className={`border rounded-xl p-4 space-y-3 ${card}`}>
                  <p className={`text-sm font-semibold ${txt}`}>🏆 Multi-Round Interview Flow</p>
                  <div className="flex gap-2 flex-wrap">
                    {MULTI_ROUNDS.map((r,i)=>(
                      <div key={r.id} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className={`w-6 h-6 rounded-full bg-${r.color}-500/20 border border-${r.color}-500/40 flex items-center justify-center`}>{r.icon}</div>
                        <span>{r.label} ({r.count} Qs)</span>
                        {i < MULTI_ROUNDS.length-1 && <span className="text-slate-600">→</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Total: 10 questions across 3 rounds</p>
                </div>
              )}

              {/* Personalized: Resume + JD */}
              {interviewMode === 'personalized' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className={`text-sm font-medium block ${sub}`}>Upload Resume (PDF)</label>
                    <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-all ${resumeFile ? 'border-emerald-500/50 bg-emerald-500/5' : isDark?'border-white/10 hover:border-indigo-500/50':'border-slate-300 hover:border-indigo-400'}`}>
                      <input type="file" accept=".pdf" className="hidden" onChange={e=>setResumeFile(e.target.files[0])}/>
                      <span className="text-2xl">{resumeFile ? '✅' : '📄'}</span>
                      <div>
                        <p className={`text-sm font-medium ${txt}`}>{resumeFile ? resumeFile.name : 'Click to upload your resume'}</p>
                        <p className={`text-xs ${sub}`}>{resumeFile ? 'Resume ready' : 'PDF format supported'}</p>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-sm font-medium block ${sub}`}>Paste Job Description</label>
                    <textarea placeholder="Paste the full job description here…" value={jdText} onChange={e=>setJdText(e.target.value)} rows={5}
                      className={`w-full border px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition-all resize-none text-sm ${inp}`}/>
                  </div>
                </div>
              )}

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className={`text-sm font-medium block ${sub}`}>Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['easy','🟢','Easy'],['medium','🟡','Medium'],['hard','🔴','Hard']].map(([id,icon,label])=>(
                    <button key={id} onClick={()=>setDifficulty(id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${difficulty===id?'bg-violet-500 border-violet-400 text-white shadow-lg':isDark?'bg-white/5 border-white/10 text-slate-400 hover:text-white':'bg-white border-slate-200 text-slate-600'}`}>
                      <span className="text-base">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Practice mode (not for multi-round) */}
              {interviewMode !== 'multiround' && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${card}`}>
                  <div>
                    <p className={`text-sm font-medium ${txt}`}>Practice Mode</p>
                    <p className={`text-xs ${sub}`}>No timer — answer at your own pace</p>
                  </div>
                  <button onClick={()=>setPracticeMode(p=>!p)} className={`w-12 h-6 rounded-full relative transition-all ${practiceMode?'bg-indigo-500':isDark?'bg-white/10':'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${practiceMode?'left-[26px]':'left-0.5'}`}/>
                  </button>
                </div>
              )}

              <button onClick={startInterview} disabled={isLoadingQs||!role.trim()}
                className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg"
                style={{background:'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
                {isLoadingQs
                  ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating Questions…</>)
                  : (<>Start Interview →</>)}
              </button>
            </div>
          </div>
        )}

        {/* ── INTERVIEW ── */}
        {stage === 'interview' && (
          <div className="space-y-5 animate-fade-in">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className={`flex justify-between text-sm ${sub}`}>
                <span>
                  {interviewMode === 'multiround'
                    ? `${currentRoundInfo.icon} ${currentRoundInfo.label} — Q${qIndex+1} of ${questions.length}`
                    : `Question ${qIndex+1} of ${questions.length}`}
                </span>
                <span className="capitalize">{role} · {difficulty}</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark?'bg-white/10':'bg-slate-200'}`}>
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{width:`${(qIndex/questions.length)*100}%`}}/>
              </div>
              {interviewMode === 'multiround' && (
                <div className="flex gap-2 mt-1">
                  {MULTI_ROUNDS.map((r,i)=>(
                    <div key={r.id} className={`flex-1 h-1 rounded-full ${i<multiRoundIndex?'bg-emerald-500':i===multiRoundIndex?'bg-indigo-500':'bg-white/10'}`}/>
                  ))}
                </div>
              )}
            </div>

            {/* Question card */}
            <div className={`border rounded-2xl p-5 ${card}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 font-bold text-xs">Q{qIndex+1}</span>
                </div>
                <div>
                  <p className={`text-lg font-medium leading-relaxed ${txt}`}>{questions[qIndex]}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {isPersonalized && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">📎 Personalized from your resume</span>}
                    {interviewMode === 'multiround' && <span className={`text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full`}>{currentRoundInfo.icon} {currentRoundInfo.label}</span>}
                    {practiceMode && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">🟢 Practice Mode</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Camera + Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`border rounded-2xl p-4 flex flex-col items-center gap-4 ${card}`}>
                <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden">
                  {videoUrl ? <video src={videoUrl} controls className="w-full h-full object-cover" autoPlay/>
                    : <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]"/>}
                  {isRecording && (
                    <div className="absolute top-3 left-3 right-3 flex justify-between z-10">
                      <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                        <span className="text-white text-xs font-bold tracking-wider">REC</span>
                      </div>
                      {!practiceMode && <Timer seconds={timeLeft} total={QUESTION_TIME}/>}
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>
                      <p className="text-white text-sm font-medium">Analyzing your answer…</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 w-full">
                  {!isRecording && !videoUrl && !isUploading && (
                    <>
                      <button onClick={handleStartRecording} className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 active:scale-95" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>● Start Recording</button>
                      {qIndex < questions.length-1 && (
                        <button onClick={handleSkip} className={`px-4 py-3 rounded-xl text-sm font-medium border ${isDark?'border-white/10 text-slate-400 hover:text-white':'border-slate-200 text-slate-500'}`}>Skip →</button>
                      )}
                    </>
                  )}
                  {isRecording && (
                    <button onClick={handleStopRecording} className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95">■ Stop & Analyze</button>
                  )}
                </div>
              </div>

              <div className={`border rounded-2xl p-5 flex flex-col justify-center gap-3 ${card}`}>
                <h3 className={`font-semibold text-base ${txt}`}>💡 Tips for This Question</h3>
                <ul className="space-y-2.5">
                  {['Take 2–3 seconds to think before speaking','Use STAR method: Situation, Task, Action, Result','Maintain eye contact with the camera','Speak at a steady pace','Be specific with concrete examples'].map((tip,i)=>(
                    <li key={i} className={`flex items-start gap-2.5 text-sm ${sub}`}>
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-400 text-xs font-bold mt-0.5">{i+1}</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── ROUND COMPLETE (multi-round) ── */}
        {showRoundComplete && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
            <div className="text-6xl">{MULTI_ROUNDS[multiRoundIndex].icon}</div>
            <div className="text-center space-y-2">
              <h2 className={`text-3xl font-bold ${txt}`}>{MULTI_ROUNDS[multiRoundIndex].label} Complete!</h2>
              <p className={sub}>Great job! Get ready for the next round.</p>
            </div>
            {(() => {
              const answered = allResults.filter(r=>!r.skipped);
              if (!answered.length) return null;
              const avg = k => Math.round(answered.reduce((s,r)=>s+(r[k]||0),0)/answered.length);
              return (
                <div className={`border rounded-2xl p-6 w-full max-w-md ${card}`}>
                  <p className={`text-center text-sm font-semibold mb-4 ${sub}`}>Round Averages</p>
                  <div className="flex justify-around">
                    <ScoreRing score={avg('contentScore')} label="Content" color="emerald"/>
                    <ScoreRing score={avg('voiceScore')}   label="Voice"   color="amber"/>
                    <ScoreRing score={avg('faceScore')}    label="Face"    color="rose"/>
                  </div>
                </div>
              );
            })()}
            <div className={`border rounded-xl p-4 w-full max-w-md text-center ${card}`}>
              <p className={`text-sm font-semibold ${txt}`}>Up Next: {MULTI_ROUNDS[multiRoundIndex+1]?.icon} {MULTI_ROUNDS[multiRoundIndex+1]?.label}</p>
              <p className={`text-xs mt-1 ${sub}`}>{MULTI_ROUNDS[multiRoundIndex+1]?.count} questions</p>
            </div>
            <button onClick={proceedToNextRound} disabled={isLoadingQs}
              className="py-4 px-10 rounded-xl font-semibold text-white active:scale-95 shadow-lg flex items-center gap-2"
              style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
              {isLoadingQs ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Loading next round…</> : <>Start Next Round →</>}
            </button>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === 'results' && currentResult && (
          <div className="space-y-5 animate-fade-in">
            <div className={`border rounded-2xl p-4 flex items-start gap-3 ${card}`}>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-400 font-bold text-xs">Q{qIndex+1}</span>
              </div>
              <p className={`text-sm leading-relaxed ${sub}`}>{questions[qIndex]}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`border rounded-2xl p-6 space-y-5 ${card}`}>
                <h3 className={`font-semibold ${txt}`}>📊 Your Scores</h3>
                <div className="flex justify-around">
                  <ScoreRing score={currentResult.contentScore||0}    label="Content"    color="emerald"/>
                  <ScoreRing score={currentResult.voiceScore||0}      label="Voice"      color="amber"/>
                  <ScoreRing score={currentResult.faceScore||0}       label="Face"       color="rose"/>
                  <ScoreRing score={currentResult.confidenceScore||0} label="Confidence" color="violet"/>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                  <p className="text-indigo-300 text-sm italic">"{currentResult.feedback}"</p>
                </div>
                {currentResult.followUpQuestion && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">🎯 Possible Follow-up</p>
                    <p className={`text-sm ${isDark?'text-slate-200':'text-slate-700'}`}>{currentResult.followUpQuestion}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {currentResult.text && (
                  <div className={`border rounded-2xl p-4 ${card}`}>
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${sub}`}>Your Answer (Transcribed)</p>
                    <p className={`text-sm leading-relaxed ${isDark?'text-slate-200':'text-slate-700'}`}>"{currentResult.text}"</p>
                  </div>
                )}
                <div className={`border rounded-2xl p-4 space-y-2 ${card}`}>
                  <p className="text-emerald-400 font-semibold text-sm">✅ Strengths</p>
                  {(currentResult.strengths||[]).map((s,i)=><p key={i} className={`text-sm flex gap-2 ${sub}`}><span className="text-emerald-400">•</span>{s}</p>)}
                </div>
                <div className={`border rounded-2xl p-4 space-y-2 ${card}`}>
                  <p className="text-amber-400 font-semibold text-sm">⚡ Improvements</p>
                  {(currentResult.improvements||[]).map((s,i)=><p key={i} className={`text-sm flex gap-2 ${sub}`}><span className="text-amber-400">•</span>{s}</p>)}
                </div>
                {currentResult.modelAnswer && (
                  <div className={`border rounded-2xl p-4 ${card}`}>
                    <button onClick={()=>setShowModel(m=>!m)} className={`flex items-center justify-between w-full text-sm font-semibold ${txt}`}>
                      <span>📖 Model Answer</span>
                      <span className={`text-xs ${sub}`}>{showModel?'Hide ▲':'Show ▼'}</span>
                    </button>
                    {showModel && <p className={`text-sm leading-relaxed mt-3 ${isDark?'text-slate-200':'text-slate-700'}`}>{currentResult.modelAnswer}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {qIndex+1 < questions.length ? (
                <button onClick={goNextQuestion} className="py-3 px-8 rounded-xl font-semibold text-white active:scale-95 shadow-lg" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                  {interviewMode==='multiround' ? 'Next Question →' : 'Next Question →'}
                </button>
              ) : (
                <button onClick={()=>{ if(interviewMode==='multiround'){ setRoundResults(prev=>{const u=[...prev];const idx=u.findIndex(r=>r.round.id===currentRoundInfo.id);if(idx>=0)u[idx]={round:currentRoundInfo,results:allResults};else u.push({round:currentRoundInfo,results:allResults});return u;}); if(multiRoundIndex+1<MULTI_ROUNDS.length)setShowRoundComplete(true); else{saveToHistory();setStage('summary');} }else{saveToHistory();setStage('summary');} }}
                  className="py-3 px-8 rounded-xl font-semibold text-white active:scale-95 shadow-lg" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                  {interviewMode==='multiround'&&multiRoundIndex+1<MULTI_ROUNDS.length ? `Complete Round ${multiRoundIndex+1} →` : 'View Summary →'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── SUMMARY ── */}
        {stage === 'summary' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className={`text-3xl font-bold ${txt}`}>Interview Complete!</h2>
              <p className={sub}>
                Full breakdown for <span className="text-indigo-400 font-medium">{role}</span>
                {interviewMode==='multiround' && ' · All 3 Rounds'}
                {isPersonalized && ' · 📎 Personalized'}
              </p>
            </div>

            <div ref={summaryRef} className="space-y-5">
              {/* Multi-round: show each round */}
              {interviewMode === 'multiround' && roundResults.length > 0 ? (
                <>
                  {roundResults.map((rr,i)=>{
                    const answered = rr.results.filter(r=>!r.skipped);
                    if (!answered.length) return null;
                    const avg = k => Math.round(answered.reduce((s,r)=>s+(r[k]||0),0)/answered.length);
                    return (
                      <div key={i} className={`border rounded-2xl p-6 ${card}`}>
                        <h3 className={`font-semibold mb-4 text-center ${txt}`}>{rr.round.icon} {rr.round.label}</h3>
                        <div className="flex justify-around flex-wrap gap-4">
                          <ScoreRing score={avg('contentScore')}    label="Content"    color="emerald"/>
                          <ScoreRing score={avg('voiceScore')}      label="Voice"      color="amber"/>
                          <ScoreRing score={avg('faceScore')}       label="Face"       color="rose"/>
                          <ScoreRing score={avg('confidenceScore')} label="Confidence" color="violet"/>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                /* Standard / Personalized overall averages */
                (() => {
                  const answered = allResults.filter(r=>!r.skipped);
                  if (!answered.length) return null;
                  const avg = k => Math.round(answered.reduce((s,r)=>s+(r[k]||0),0)/answered.length);
                  const overall = Math.round((avg('contentScore')+avg('voiceScore')+avg('faceScore')+avg('confidenceScore'))/4);
                  return (
                    <div className={`border rounded-2xl p-6 ${card}`}>
                      <h3 className={`font-semibold text-center mb-5 ${txt}`}>Overall Averages</h3>
                      <div className="flex justify-around flex-wrap gap-4">
                        <ScoreRing score={avg('contentScore')}    label="Content"    color="emerald"/>
                        <ScoreRing score={avg('voiceScore')}      label="Voice"      color="amber"/>
                        <ScoreRing score={avg('faceScore')}       label="Face"       color="rose"/>
                        <ScoreRing score={avg('confidenceScore')} label="Confidence" color="violet"/>
                        <ScoreRing score={overall}                label="Overall"    color="indigo"/>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Per-question breakdown */}
              <h3 className={`font-semibold text-lg ${txt}`}>Question Breakdown</h3>
              {allResults.map((r,i)=>(
                <div key={i} className={`border rounded-2xl p-4 space-y-2 ${card}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-400 font-bold text-xs">Q{i+1}</span>
                    </div>
                    <p className={`text-sm leading-relaxed flex-1 ${sub}`}>{r.question}</p>
                    {r.skipped && <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full flex-shrink-0">Skipped</span>}
                  </div>
                  {!r.skipped && (
                    <div className="flex gap-4 pl-10 flex-wrap">
                      {[['Content',r.contentScore,'#10b981'],['Voice',r.voiceScore,'#f59e0b'],['Face',r.faceScore,'#f43f5e'],['Confidence',r.confidenceScore,'#a78bfa']].map(([k,v,c])=>(
                        <div key={k} className="flex items-center gap-1.5">
                          <span className={`text-xs ${sub}`}>{k}</span>
                          <span className="font-bold text-sm" style={{color:c}}>{v}/10</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.feedback && !r.skipped && <p className={`text-xs italic pl-10 ${sub}`}>"{r.feedback}"</p>}
                </div>
              ))}
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <button onClick={downloadPDF} className={`py-3 px-8 rounded-xl font-semibold flex items-center gap-2 border transition-all ${isDark?'border-white/10 text-white hover:border-white/30':'border-slate-200 text-slate-700'}`}>
                📄 Download PDF Report
              </button>
              <button onClick={resetAll} className="py-3 px-8 rounded-xl font-semibold text-white active:scale-95 shadow-lg" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                🔄 Start New Interview
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
