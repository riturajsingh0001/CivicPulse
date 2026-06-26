import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Activity, FileText, CheckCircle, Users, Navigation, ShieldCheck, Star, Cpu, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ReportForm } from './ReportForm';
import { AnalysisDashboard } from './AnalysisDashboard';
import { ErrorBoundary } from './ErrorBoundary';
import { Report, CivicIssueAnalysis } from '../types';

interface CitizenPortalProps {
  reports: Report[];
  onSubmitReport: any;
  isAnalyzing: boolean;
  analysis?: CivicIssueAnalysis | null;
  setAnalysis?: React.Dispatch<React.SetStateAction<CivicIssueAnalysis | null>>;
  lastSubmission?: { text: string; imageBase64: string | null; mimeType: string | null; imagesBase64?: string[]; mimeTypes?: string[]; location: any | null; address: string | null } | null;
  error?: string;
}

export function CitizenPortal({ reports, onSubmitReport, isAnalyzing, analysis, setAnalysis, lastSubmission, error }: CitizenPortalProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'my-reports' | 'verify'>(() => {
    if (location.state?.fromLogin) return 'dashboard';
    return (localStorage.getItem('citizen_active_tab') as any) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('citizen_active_tab', activeTab);
  }, [activeTab]);

  const getTrustLevel = (score: number) => {
    if (score > 800) return { label: 'Civic Champion', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' };
    if (score > 500) return { label: 'Civic Contributor', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
    if (score > 200) return { label: 'Trusted Citizen', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' };
    return { label: 'New Citizen', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' };
  };

  const trustLevel = getTrustLevel(profile?.trustScore || 0);
  const myReports = reports.filter(r => r.userId === profile?.uid);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 relative z-10 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
            <Users className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-4xl font-display font-black tracking-tight text-white mb-2">Citizen Portal</h2>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-widest uppercase ${trustLevel.bg} ${trustLevel.color} ${trustLevel.border}`}>
                <Star size={12} className={trustLevel.color} />
                {trustLevel.label}
              </div>
              <p className="text-sm text-slate-400 font-medium">Reputation Score: <span className="text-white font-bold">{profile?.trustScore || 0}</span></p>
            </div>
          </div>
        </div>
        <button onClick={signOut} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white px-4 py-2 border border-white/10 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          Disconnect Session
        </button>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'report', label: 'File Report', icon: FileText },
          { id: 'my-reports', label: 'My Reports', icon: CheckCircle },
          { id: 'verify', label: 'Community Verify', icon: ShieldCheck }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 border shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                : 'glass-panel text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="glass-panel border-white/10 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
               <h3 className="text-2xl font-display font-bold text-white mb-2 relative z-10">Welcome back, {profile?.name}</h3>
               <p className="text-slate-400 relative z-10 max-w-2xl">Your active participation strengthens the Civic Intelligence Network. Keep submitting accurate reports and validating community issues to improve your trust score.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-cyan-500/20 transition-colors flex flex-col justify-between">
                 <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                   <FileText size={24} />
                 </div>
                 <p className="text-4xl font-display font-black text-white">{myReports.length}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Reports Submitted</p>
               </div>
               <div className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-emerald-500/20 transition-colors flex flex-col justify-between">
                 <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                   <CheckCircle size={24} />
                 </div>
                 <p className="text-4xl font-display font-black text-emerald-400">{myReports.filter(r => r.status === 'Resolved').length}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Reports Resolved</p>
               </div>
               <div className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-amber-500/20 transition-colors flex flex-col justify-between">
                 <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
                   <ShieldCheck size={24} />
                 </div>
                 <p className="text-4xl font-display font-black text-amber-400">12</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Verification Contributions</p>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'report' && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            <div className={analysis ? "max-w-4xl mx-auto transition-all w-full" : "max-w-3xl mx-auto transition-all w-full"}>
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-6 p-5 rounded-2xl glass-panel border-red-500/30 flex flex-col items-start gap-4 text-red-200"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
                      <p className="text-sm font-medium leading-relaxed">{error}</p>
                    </div>
                    {lastSubmission && (
                      <button 
                        onClick={() => onSubmitReport(lastSubmission.text, lastSubmission.imageBase64, lastSubmission.mimeType, lastSubmission.location, lastSubmission.address)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 px-5 py-2.5 rounded-full font-bold text-sm transition-colors border border-red-500/30 disabled:opacity-50 shadow-sm ml-8"
                      >
                        <RefreshCw size={16} />
                        Retry Analysis
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <ReportForm onSubmit={onSubmitReport} isAnalyzing={isAnalyzing} />
            </div>

            {analysis && !isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-full"
              >
                 <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10">
                          <Cpu className="text-cyan-400 w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-display font-bold tracking-tight text-white">Intelligence Report</h2>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          onClick={() => {
                            if (setAnalysis) setAnalysis(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-sm font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-full transition-colors border border-white/10 w-full sm:w-auto flex-1 sm:flex-none text-center"
                        >
                          Clear Report
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('my-reports');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-sm font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-6 py-2.5 rounded-full transition-colors border border-cyan-500/20 w-full sm:w-auto flex-1 sm:flex-none text-center"
                        >
                          View in My Reports
                        </button>
                      </div>
                    </div>
                    <ErrorBoundary>
                      <AnalysisDashboard analysis={analysis} coordinates={lastSubmission?.location} />
                    </ErrorBoundary>
                 </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'my-reports' && (
          <motion.div key="my-reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
             {myReports.length === 0 ? (
               <div className="glass-panel p-16 rounded-[2.5rem] text-center border-white/5 border border-dashed">
                 <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-white mb-2">No Reports Found</h3>
                 <p className="text-slate-400">You haven't filed any civic issue reports yet.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {myReports.map((report) => (
                   <div key={report.id} className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-white/10 transition-colors relative group">
                      <div className="absolute top-6 right-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          report.status === 'Resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          report.status === 'In Progress' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                          'bg-slate-500/10 border-slate-500/20 text-slate-400'
                         }`}>
                           {report.status || 'Submitted'}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1 pr-24 line-clamp-1">{report.analysis?.detection?.category}</h4>
                      <p className="text-xs text-slate-400 mb-4">{new Date(report.timestamp).toLocaleDateString()}</p>
                      <p className="text-sm font-medium text-slate-300 line-clamp-2">{report.analysis?.impactAssessment?.communityImpact}</p>
                   </div>
                 ))}
               </div>
             )}
          </motion.div>
        )}

        {activeTab === 'verify' && (
          <motion.div key="verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <div className="glass-panel p-16 rounded-[2.5rem] text-center border-white/5 border border-dashed">
                 <Navigation className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-bounce" />
                 <h3 className="text-xl font-bold text-white mb-2">Community Verification</h3>
                 <p className="text-slate-400 max-w-md mx-auto mb-6">Review nearby incidents reported by others. Your trusted verifications help confirm authenticity and prioritize civic responses.</p>
                 <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-6 py-3 rounded-full text-sm font-bold">
                    Scanning Local Area...
                 </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
