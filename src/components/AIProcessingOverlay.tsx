import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, ShieldCheck, Fingerprint, Search, Users, AlertTriangle, TrendingUp, Network, Zap, CheckCircle, Activity, Cpu } from 'lucide-react';

function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayText('');
    const interval = setInterval(() => {
      index++;
      setDisplayText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayText}<span className="inline-block w-[3px] h-[1em] bg-cyan-400 ml-[2px] animate-pulse align-middle opacity-70"></span></span>;
}

const processingSteps = [
  { id: 'upload', label: 'Uploading Evidence', icon: UploadCloud },
  { id: 'gps', label: 'Checking GPS Location', icon: Search },
  { id: 'cybershield', label: 'Running CivicShield Security Scan', icon: ShieldCheck },
  { id: 'metadata', label: 'Verifying Metadata', icon: Fingerprint },
  { id: 'duplicate', label: 'Running Duplicate Detection', icon: Users },
  { id: 'image', label: 'Analyzing Image', icon: Activity },
  { id: 'hazard', label: 'Classifying Issue', icon: AlertTriangle },
  { id: 'community', label: 'Assessing Community Impact', icon: Network },
  { id: 'prediction', label: 'Predicting Future Consequences', icon: TrendingUp },
  { id: 'resolution', label: 'Generating Resolution Plan', icon: Zap },
  { id: 'authority', label: 'Creating Authority Report', icon: ShieldCheck },
  { id: 'complete', label: 'Analysis Complete', icon: CheckCircle },
];

export function AIProcessingOverlay({ isAnalyzing }: { isAnalyzing: boolean }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const totalDuration = 7000; // 7 seconds total
  const stepDuration = totalDuration / processingSteps.length;

  useEffect(() => {
    let startTime: number;
    let animationFrameId: number;

    const animateProgress = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const currentProgress = Math.min((elapsed / totalDuration) * 100, 100);
      
      setProgress(currentProgress);

      const currentStep = Math.min(
        Math.floor((elapsed / totalDuration) * processingSteps.length),
        processingSteps.length - 1
      );
      setCurrentStepIndex(currentStep);

      if (elapsed < totalDuration) {
        animationFrameId = requestAnimationFrame(animateProgress);
      }
    };

    if (isAnalyzing) {
      setCurrentStepIndex(0);
      setProgress(0);
      animationFrameId = requestAnimationFrame(animateProgress);
    } else {
      setCurrentStepIndex(0);
      setProgress(0);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isAnalyzing]);

  return (
    <AnimatePresence>
      {isAnalyzing && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950"
        >
           {/* Background Grid and Radial Gradient */}
           <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"></div>
           <div className="absolute inset-0 bg-radial-gradient from-cyan-900/20 via-transparent to-transparent opacity-50 pointer-events-none"></div>
           
           <div className="w-full max-w-4xl relative z-10 flex flex-col items-center justify-center h-full">
              {/* AI Core Animation */}
              <div className="relative mb-16">
                 <div className="absolute inset-0 bg-cyan-500 blur-[100px] opacity-20 rounded-full animate-pulse pointer-events-none"></div>
                 <div className="relative w-48 h-48 border border-white/5 rounded-full flex items-center justify-center bg-black/40 overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.15)] group">
                    <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-b-2 border-indigo-500 rounded-full animate-[spin_2s_reverse_infinite]"></div>
                    <div className="absolute inset-4 border-r-2 border-emerald-400 rounded-full animate-[spin_3s_linear_infinite]"></div>
                    
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 animate-pulse"></div>
                    
                    <Cpu size={64} className="text-cyan-400 relative z-10 animate-pulse" />
                    
                    {/* Glowing Scan Line */}
                    <div className="absolute left-0 right-0 h-1 bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                 </div>
              </div>

              {/* Progress and Percentage */}
              <div className="w-full max-w-2xl mb-12">
                 <div className="flex items-end justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-display font-black text-white tracking-widest uppercase">
                        AI Command Center
                      </h2>
                      <p className="text-cyan-400 font-mono text-sm mt-1 animate-pulse">Processing Civic Intelligence Data...</p>
                    </div>
                    <p className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tabular-nums">
                      {Math.round(progress)}%
                    </p>
                 </div>
                 
                 <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
                   <div className="absolute inset-0 bg-cyan-500/20 w-full animate-pulse"></div>
                   <motion.div 
                     className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400 relative"
                     style={{ width: `${progress}%` }}
                     transition={{ ease: "linear" }}
                   >
                     <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shine_1s_linear_infinite]"></div>
                   </motion.div>
                 </div>
              </div>

              {/* Processing Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 w-full max-w-3xl">
                 {processingSteps.map((step, index) => {
                   const isCompleted = index < currentStepIndex;
                   const isCurrent = index === currentStepIndex;
                   const Icon = step.icon;
                   
                   return (
                     <div key={step.id} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                            : isCurrent 
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                              : 'bg-slate-900 text-slate-600 border-white/5'
                        }`}>
                           {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} className={isCurrent ? 'animate-pulse' : ''} />}
                        </div>
                        
                        <div className="flex-1">
                           <div className="flex items-center justify-between">
                              <p className={`font-mono text-xs uppercase tracking-widest transition-colors duration-300 ${
                                isCompleted ? 'text-emerald-400' : isCurrent ? 'text-cyan-400' : 'text-slate-600'
                              }`}>
                                Step 0{index + 1}
                              </p>
                              {isCurrent && (
                                <span className="text-[10px] text-cyan-400 animate-pulse font-mono uppercase tracking-widest">
                                  Running
                                </span>
                              )}
                           </div>
                           <p className={`font-bold mt-0.5 transition-colors duration-300 ${
                             isCompleted ? 'text-slate-300' : isCurrent ? 'text-white' : 'text-slate-700'
                           }`}>
                             {isCurrent ? <TypewriterText text={step.label} /> : step.label}
                           </p>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
