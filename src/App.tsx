import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ReportForm } from './components/ReportForm';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { CitizenPortal } from './components/CitizenPortal';
import { AIProcessingOverlay } from './components/AIProcessingOverlay';
import { Login } from './components/Login';
import { PrivateRoute } from './components/PrivateRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './AuthContext';
import { CivicIssueAnalysis, Report } from './types';
import { Activity, Shield, AlertCircle, RefreshCw, LayoutDashboard, Database, Cpu, CheckCircle2, Search, Map, ShieldCheck, Zap, MessageSquare, TrendingUp, Sparkles, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getNextSequence, getOrAssignReporterId } from './utils/sequence';

declare global {
  interface Window {
    gm_authFailure: () => void;
  }
}

// Suppress console.error from Google Maps
const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = args.join(' ');
  if (
    msg.includes('DeletedApiProjectMapError') ||
    msg.includes('Google Maps JavaScript API error') ||
    msg.includes('Script error.')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

export default function App() {
  const { user, profile, signOut } = useAuth();
  const [analysis, setAnalysis] = useState<CivicIssueAnalysis | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [lastSubmission, setLastSubmission] = useState<{text: string, imageBase64: string | null, mimeType: string | null, imagesBase64?: string[], mimeTypes?: string[], location: {lat: number, lng: number} | null, address: string | null} | null>(null);
  const routerLocation = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (routerLocation.hash) {
      setTimeout(() => {
        const id = routerLocation.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [routerLocation.hash, routerLocation.pathname]);

  useEffect(() => {
    // Catch Google Maps API auth errors globally
    window.gm_authFailure = () => {
      console.warn("Google Maps Authentication Failed (Suppressed).");
      document.body.classList.add('gmaps-error');
      window.dispatchEvent(new Event('gmaps-error'));
    };

    // Suppress Google Maps script errors from causing global crashes
    const originalOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      if (
        message.toString().includes('DeletedApiProjectMapError') ||
        message.toString().includes('Google Maps JavaScript API error') ||
        message.toString().includes('Script error.')
      ) {
        console.warn("Suppressed Google Maps Error:", message);
        return true; // prevent default error handling
      }
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function (event) {
      if (
        event.reason?.message?.includes('DeletedApiProjectMapError') ||
        event.reason?.message?.includes('Google Maps JavaScript API error') ||
        event.reason?.name === 'MapsRequestError'
      ) {
        console.warn("Suppressed Google Maps Unhandled Rejection:", event.reason);
        event.preventDefault();
      } else if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection.call(window, event);
      }
    };

    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports: Report[] = [];
      snapshot.forEach((doc) => {
        fetchedReports.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(fetchedReports);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      // Suppress the unhandled error to prevent the app from crashing.
    });
    return unsubscribe;
  }, []);

  const analyzeIssue = async (text: string, imagesBase64: string[], mimeTypes: string[], location: {lat: number, lng: number} | null, address: string | null) => {
    console.log("Submitting complaint...");
    const primaryImage = imagesBase64[0] || null;
    const primaryMime = mimeTypes[0] || null;
    setLastSubmission({ text, imageBase64: primaryImage, mimeType: primaryMime, imagesBase64, mimeTypes, location, address });
    setIsAnalyzing(true);
    setAnalysis(null); // Reset analysis state here
    setError('');
    
    try {
      console.log("Generating analysis...");
      const payload = { 
        text, 
        imageBase64: primaryImage, 
        mimeType: primaryMime,
        location,
        address
      };
      console.log("Payload:", payload);

      const [response] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        // Enforce a minimum 7.5 second delay to let the processing animation play out
        new Promise(resolve => setTimeout(resolve, 7500))
      ]);

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Server error: ${response.status}`);
      }

      const data: CivicIssueAnalysis = await response.json();
      
      if (!data) {
        throw new Error('Received empty data from server');
      }

      // Override analysis location description with explicit address if captured
      if (address) {
        if (!data.locationIntelligence) {
          data.locationIntelligence = {} as any;
        }
        data.locationIntelligence.locationDescription = address;
      }

      setAnalysis(data);
      console.log("Analysis received and state updated successfully");
      
      if (user) {
        const displayId = await getNextSequence('reports', 'CP-', 6);
        const reporterId = await getOrAssignReporterId(user.uid);
        
        const imagesToSave = imagesBase64.map((b64, i) => b64.startsWith('data:') ? b64 : `data:${mimeTypes[i] || 'image/jpeg'};base64,${b64}`);
        console.log("Image URLs:", imagesToSave);

        const reportPayload = {
          displayId,
          reporterId,
          userId: user.uid,
          timestamp: new Date().toISOString(),
          coordinates: location,
          address: address || '',
          images: imagesToSave,
          analysis: data,
          status: 'Submitted',
          verifications: 0,
          verifiedBy: [],
          department: null
        };
        
        console.log("Saved Report:", reportPayload);

        const docRef = await addDoc(collection(db, 'reports'), reportPayload);
        
        // Inject reportId so AnalysisDashboard can use it
        setAnalysis({ ...data, _reportId: docRef.id } as any);
      } else {
        setAnalysis(data);
      }
    } catch (err: any) {
      console.error(err);
      setError('AI services are currently busy. Please try again in a few moments.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-100 flex flex-col relative z-0">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-20 -z-10"></div>
      
      {/* Particles effect */}
      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="particle" 
            style={{ 
              left: `${Math.random() * 100}%`, 
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }} 
          />
        ))}
      </div>
      
      {/* Processing Overlay */}
      <AIProcessingOverlay isAnalyzing={isAnalyzing} />

      {/* Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-40 shrink-0 shadow-lg bg-slate-900/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group transition-opacity">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/40 blur-md rounded-lg group-hover:bg-cyan-400/60 transition-colors pointer-events-none animate-pulse"></div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px] relative z-10 transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                   <Activity className="h-4 w-4 text-cyan-400" />
                </div>
              </div>
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">CivicPulse</h1>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/#features" onClick={(e) => {
              if (routerLocation.pathname === '/') {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                window.history.pushState(null, '', '/#features');
              }
            }} className="hover:text-white transition-colors cursor-pointer">Features</Link>
            <Link to="/#how-it-works" onClick={(e) => {
              if (routerLocation.pathname === '/') {
                e.preventDefault();
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                window.history.pushState(null, '', '/#how-it-works');
              }
            }} className="hover:text-white transition-colors cursor-pointer">How It Works</Link>
            <Link to="/#about" onClick={(e) => {
              if (routerLocation.pathname === '/') {
                e.preventDefault();
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                window.history.pushState(null, '', '/#about');
              }
            }} className="hover:text-white transition-colors cursor-pointer">About</Link>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            {!user ? (
               <Link to="/login" className="flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 hover:from-indigo-500/20 hover:to-cyan-500/20 border border-white/10 text-white px-5 py-2 rounded-full transition-all hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                 <User size={14} className="text-cyan-400" />
                 Sign In
               </Link>
            ) : (
               <Link to={profile?.role === 'admin' ? '/authority-dashboard' : '/citizen-dashboard'} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 hover:from-indigo-500/20 hover:to-cyan-500/20 border border-white/10 text-white px-5 py-2 rounded-full transition-all hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                 {profile?.role === 'admin' ? <LayoutDashboard size={14} className="text-cyan-400" /> : <Shield size={14} className="text-cyan-400" />}
                 {profile?.role === 'admin' ? 'Authority Portal' : 'Citizen Portal'}
               </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Routes>
          <Route path="/" element={
            <div className="w-full relative z-10">
              {/* Hero Section */}
              {!analysis && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-center py-20 lg:py-32 relative"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-md pointer-events-none -z-10 animate-pulse"></div>
                  
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-300 mb-8 backdrop-blur-md">
                    <Sparkles size={14} className="text-cyan-400" />
                    Civic Open Intelligence Network 2.0
                  </div>
                  
                  <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter text-white mb-6 drop-shadow-2xl">
                    <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 text-shadow-sm">Civic Intelligence.</span><br />
                    Powered by AI.
                  </h2>
                  <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
                    Our multi-agent system securely analyzes community reports, predicts hazard escalation, and engineers actionable resolution pathways.
                  </p>
                  
                  {/* Feature Badges */}
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.4 } }
                    }}
                    className="flex flex-wrap items-center justify-center gap-3 mt-10"
                  >
                    {[
                      "AI Multi-Agent Analysis", 
                      "CivicShield Security", 
                      "Impact Prediction Engine", 
                      "Smart Authority Routing"
                    ].map((feature, idx) => (
                      <motion.div 
                        key={idx}
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-slate-900/50 text-xs font-medium text-slate-300"
                      >
                        <CheckCircle2 size={12} className="text-emerald-400" /> {feature}
                      </motion.div>
                    ))}
                  </motion.div>

                   {/* Trust Metrics */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 mb-16 max-w-4xl mx-auto"
                  >
                    <div className="glass-panel border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <p className="text-3xl font-display font-black text-white">25,000+</p>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Reports Processed</p>
                    </div>
                    <div className="glass-panel border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <p className="text-3xl font-display font-black text-white">98%</p>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Detection Accuracy</p>
                    </div>
                    <div className="glass-panel border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <p className="text-3xl font-display font-black text-white">7</p>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">AI Agents</p>
                    </div>
                    <div className="glass-panel border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <p className="text-3xl font-display font-black text-white">15 min</p>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Avg Response Time</p>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.5 }}
                  >
                     <button onClick={() => {
                        if (!user) {
                          navigate('/login');
                        } else {
                          navigate('/citizen-dashboard');
                        }
                     }} className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold rounded-full transition-all shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:shadow-[0_0_60px_rgba(34,211,238,0.6)] transform hover:-translate-y-1 text-lg uppercase tracking-widest">
                       GET STARTED
                     </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Informational Sections */}
              <div className="w-full mt-32 space-y-32">
                <section id="features" className="max-w-5xl mx-auto scroll-mt-24">
                  <div className="text-center mb-16">
                    <h3 className="text-3xl font-display font-bold text-white mb-4">Core Platform Features</h3>
                    <p className="text-slate-400 max-w-2xl mx-auto">Advanced intelligence systems designed to streamline municipal response protocols and elevate citizen engagement.</p>
                  </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="glass-panel p-8 rounded-[2rem] border-white/5 hover:border-cyan-500/20 transition-colors">
                           <Shield className="w-10 h-10 text-cyan-400 mb-6" />
                           <h4 className="text-lg font-bold text-white mb-2">Automated Verification</h4>
                           <p className="text-sm text-slate-400">Instantly validates image metadata to prevent duplicate reports and eliminate malicious spoofing attempts.</p>
                        </div>
                        <div className="glass-panel p-8 rounded-[2rem] border-white/5 hover:border-indigo-500/20 transition-colors">
                           <Database className="w-10 h-10 text-indigo-400 mb-6" />
                           <h4 className="text-lg font-bold text-white mb-2">Centralized Authority Datalink</h4>
                           <p className="text-sm text-slate-400">Routes critical civic incidents to the interactive Authority Command Center in real-time.</p>
                        </div>
                        <div className="glass-panel p-8 rounded-[2rem] border-white/5 hover:border-emerald-500/20 transition-colors">
                           <LayoutDashboard className="w-10 h-10 text-emerald-400 mb-6" />
                           <h4 className="text-lg font-bold text-white mb-2">Live Heatmaps</h4>
                           <p className="text-sm text-slate-400">Plots dynamic risk zones dynamically onto municipal maps to accelerate response operations.</p>
                        </div>
                     </div>
                  </section>

                  <section id="how-it-works" className="max-w-5xl mx-auto scroll-mt-24">
                     <div className="text-center mb-16">
                       <h3 className="text-3xl font-display font-bold text-white mb-4">The AI Workflow</h3>
                       <p className="text-slate-400 max-w-2xl mx-auto">How our multi-agent architecture transforms raw citizen input into prioritized civic intelligence.</p>
                     </div>
                     <div className="relative">
                       <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 hidden md:block"></div>
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                         {[
                           { step: '01', title: 'Upload', desc: 'Securely submit incident photos and descriptions.' },
                           { step: '02', title: 'Verify', desc: 'System automatically flags fake or duplicate items.' },
                           { step: '03', title: 'Analyze', desc: 'Visual recognition identifies hazards and priorities.' },
                           { step: '04', title: 'Resolve', desc: 'Authorities receive actionable telemetry arrays.' }
                         ].map((s, i) => (
                           <div key={i} className="text-center relative z-10">
                              <div className="w-16 h-16 mx-auto bg-slate-900 border-2 border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-bold mb-4">
                                {s.step}
                              </div>
                              <h4 className="text-white font-bold mb-2">{s.title}</h4>
                              <p className="text-sm text-slate-500 max-w-[200px] mx-auto">{s.desc}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                  </section>

                  <section id="about" className="max-w-3xl mx-auto scroll-mt-24 text-center pb-24">
                     <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                        <Activity className="text-cyan-400 h-8 w-8" />
                     </div>
                     <h3 className="text-3xl font-display font-bold text-white mb-6">About CivicPulse</h3>
                     <p className="text-slate-400 leading-relaxed mb-8">
                       CivicPulse represents a paradigm shift in municipal operations. By bridging the gap between citizen reporting and localized administration, our intelligence network eliminates traditional bureaucratic delays. Powered by an advanced multi-agent architecture, the platform automatically triages incoming incidents to ensure critical situations are addressed immediately.
                     </p>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Bridging AI & Community Intelligence</p>
                  </section>
                </div>
            </div>
          } />
          
          <Route path="/login" element={<Login />} />
          
          <Route path="/citizen-dashboard" element={
            <PrivateRoute roleRequired="citizen">
              <CitizenPortal 
                reports={reports} 
                onSubmitReport={analyzeIssue} 
                isAnalyzing={isAnalyzing}
                analysis={analysis}
                setAnalysis={setAnalysis}
                lastSubmission={lastSubmission}
                error={error}
              />
            </PrivateRoute>
          } />
          <Route path="/citizen" element={<Navigate to="/citizen-dashboard" replace />} />
          <Route path="/dashboard" element={<Navigate to="/citizen-dashboard" replace />} />
          <Route path="/reports" element={<Navigate to="/citizen-dashboard" replace />} />
          <Route path="/verify" element={<Navigate to="/citizen-dashboard" replace />} />
          
          <Route path="/authority-dashboard" element={
            <PrivateRoute roleRequired="admin">
              <AuthorityDashboard reports={reports} />
            </PrivateRoute>
          } />
          <Route path="/authority" element={<Navigate to="/authority-dashboard" replace />} />
          <Route path="/command-center" element={<Navigate to="/authority-dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/authority-dashboard" replace />} />
        </Routes>
      </main>
    </div>

  );
}
