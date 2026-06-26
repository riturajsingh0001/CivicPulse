import React, { useMemo, useEffect, useState } from 'react';
import { LineChart as LucideLineChart, MapPin, AlertTriangle, ShieldCheck, Activity, Target, Network, Clock, BarChart4, ChevronRight, AlertCircle, Crosshair, Shield, Fingerprint, RefreshCcw, CheckCircle, Filter, X, Zap, Download, LogOut } from 'lucide-react';
import { Report } from '../types';
import { motion, useAnimation, useMotionValue, useTransform, animate, AnimatePresence } from 'motion/react';
import { Marker } from '@react-google-maps/api';
import { SafeMap } from './SafeMap';
import { generateReportPDF } from '../utils/pdfGenerator';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, value, { duration: 1.5, ease: "easeOut" });
    return animation.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

export function AuthorityDashboard({ reports }: { reports: Report[] }) {
  const { signOut } = useAuth();
  const [selectedMapReportId, setSelectedMapReportId] = useState<string | null>(null);
  const [selectedWorkspaceReportId, setSelectedWorkspaceReportId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mapError, setMapError] = useState(!(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY === 'dummy');
  const [authorityNotes, setAuthorityNotes] = useState<Record<string, string>>({});
  const [citizenLetter, setCitizenLetter] = useState<any | null>(null);

  useEffect(() => {
    if (!selectedWorkspaceReportId) {
      setCitizenLetter(null);
      return;
    }

    const fetchLetter = async () => {
      try {
        const q = query(
          collection(db, 'authorityLetters'),
          where('reportId', '==', selectedWorkspaceReportId),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setCitizenLetter(snapshot.docs[0].data());
        } else {
          setCitizenLetter(null);
        }
      } catch (err) {
        console.error("Failed to fetch citizen letter", err);
      }
    };

    fetchLetter();
  }, [selectedWorkspaceReportId]);

  useEffect(() => {
    const handleMapError = () => setMapError(true);
    window.addEventListener('gmaps-error', handleMapError);
    return () => window.removeEventListener('gmaps-error', handleMapError);
  }, []);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getSeverityLevel = (severity?: string) => {
    if (!severity) return 'Low';
    const s = severity.toLowerCase();
    if (s.includes('critical')) return 'Critical';
    if (s.includes('high')) return 'High';
    if (s.includes('community') || s.includes('medium')) return 'Medium';
    return 'Low';
  };

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (severityFilter !== 'All') {
      result = result.filter(r => getSeverityLevel(r.analysis?.impactAssessment?.severityLevel) === severityFilter);
    }
    
    if (statusFilter !== 'All') {
      result = result.filter(r => {
        const s = r.status || 'Pending';
        if (statusFilter === 'Pending') return s === 'Submitted' || s === 'Pending';
        return s === statusFilter;
      });
    }

    if (issueTypeFilter !== 'All') {
      result = result.filter(r => r.analysis?.detection?.category === issueTypeFilter);
    }

    if (dateFilter !== 'All') {
      const now = new Date().getTime();
      result = result.filter(r => {
        const t = new Date(r.timestamp).getTime();
        const diffDays = (now - t) / (1000 * 3600 * 24);
        if (dateFilter === 'Today') return diffDays <= 1;
        if (dateFilter === 'Last 7 Days') return diffDays <= 7;
        if (dateFilter === 'Last 30 Days') return diffDays <= 30;
        return true;
      });
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.analysis?.citizenAssistant?.issueSummary?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query) ||
        r.analysis?.detection?.category?.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    }

    // Sort by severity 
    const severityScore = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    result.sort((a, b) => {
      const sA = severityScore[getSeverityLevel(a.analysis?.impactAssessment?.severityLevel) as keyof typeof severityScore] || 0;
      const sB = severityScore[getSeverityLevel(b.analysis?.impactAssessment?.severityLevel) as keyof typeof severityScore] || 0;
      if (sB !== sA) return sB - sA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return result;
  }, [reports, severityFilter, statusFilter, issueTypeFilter, dateFilter, searchQuery]);

  const stats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let pending = 0;
    let resolved = 0;
    let inProgress = 0;
    
    if (reports && reports.length > 0) {
      reports.forEach(r => {
        const sev = getSeverityLevel(r.analysis?.impactAssessment?.severityLevel);
        if (sev === 'Critical') critical++;
        else if (sev === 'High') high++;
        else if (sev === 'Medium') medium++;
        else low++;

        const s = r.status || 'Pending';
        if (s === 'Submitted' || s === 'Pending') pending++;
        else if (s === 'Resolved') resolved++;
        else if (s === 'In Progress') inProgress++;
      });
    }

    // Mock trend data based on reports timestamp
    const trends = (reports || []).reduce((acc: any, r) => {
      const date = new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {});
    const trendData = Object.keys(trends).length > 0 ? Object.keys(trends).map(k => ({ date: k, count: trends[k] })).slice(-7) : [];

    return {
      total: reports?.length || 0,
      critical,
      high,
      medium,
      low,
      pending,
      resolved,
      inProgress,
      avgResTime: 24, // simplified mock for UI
      trendData,
    };
  }, [reports]);

  const updateReportStatus = async (id: string, updates: Record<string, any>) => {
    try {
      await updateDoc(doc(db, 'reports', id), updates);
    } catch (error) {
      console.error("Error updating report: ", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    const s = getSeverityLevel(severity);
    if (s === 'Critical') return '#ef4444';
    if (s === 'High') return '#f97316';
    if (s === 'Medium') return '#eab308';
    return '#10b981';
  };

  const getSeverityTailwind = (severity: string) => {
    const s = getSeverityLevel(severity);
    if (s === 'Critical') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (s === 'High') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (s === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  const getMarkerIconUrl = (severity: string) => {
    const s = getSeverityLevel(severity);
    if (s === 'Critical') return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    if (s === 'High') return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';
    if (s === 'Medium') return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const selectedWorkspaceReport = reports.find(r => r.id === selectedWorkspaceReportId);

  useEffect(() => {
    if (selectedWorkspaceReport) {
      console.log("Selected Report:", selectedWorkspaceReport);
      const images = selectedWorkspaceReport.images || (selectedWorkspaceReport as any).evidenceImages || (selectedWorkspaceReport as any).evidence || ((selectedWorkspaceReport as any).imageBase64 ? [(selectedWorkspaceReport as any).imageBase64] : []);
      console.log("Images:", images);
    }
  }, [selectedWorkspaceReport]);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-16 relative">
      
      {/* Header */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/40 blur-xl rounded-full"></div>
            <div className="relative p-5 bg-indigo-500/10 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <Network className="h-8 w-8" />
            </div>
          </div>
          <div>
             <h2 className="text-4xl font-display font-black tracking-tight text-white mb-2">Civic Command Center</h2>
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                 Live Feed Active
               </div>
               <p className="text-sm text-indigo-200/60 font-medium tracking-wide">Real-time civic intelligence datalink</p>
             </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-300 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </motion.div>
      
      {/* Phase 1 & 2: Map & Incident Management Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* Map Area */}
            <div className="xl:col-span-3 glass-panel border-white/10 rounded-[2rem] overflow-hidden relative shadow-xl min-h-[500px] flex flex-col">
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none p-6 text-white font-display font-bold text-xl flex items-center gap-2">
                <MapPin className="text-cyan-400" /> Live Incident Command Center
              </div>
              
              <div className="w-full h-[50%] min-h-[400px] bg-slate-900 relative">
                  <SafeMap 
                    center={{lat: 37.7749, lng: -122.4194}} 
                    zoom={12} 
                    options={{
                      disableDefaultUI: true
                    }}
                  >
                  {reports.map((report) => {
                    if (report.coordinates?.lat && report.coordinates?.lng) {
                      return (
                        <Marker
                          key={report.id}
                          position={{lat: Number(report.coordinates.lat), lng: Number(report.coordinates.lng)}}
                          onClick={() => setSelectedMapReportId(report.id)}
                          icon={{ url: getMarkerIconUrl(report.analysis?.impactAssessment?.severityLevel) }}
                        />
                      )
                    }
                    return null;
                  })}
                  </SafeMap>

                {/* Map Selected Incident Intelligence Panel */}
                <AnimatePresence>
                  {selectedMapReportId && (() => {
                    const r = reports.find(x => x.id === selectedMapReportId);
                    if (!r) return null;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute right-4 top-24 bottom-4 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col z-20"
                      >
                         <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                           <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Incident Intel</h4>
                           <button onClick={() => setSelectedMapReportId(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                         </div>

                         <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                           <div>
                             <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded inline-block mb-2 ${getSeverityTailwind(r.analysis?.impactAssessment?.severityLevel)}`}>
                               {getSeverityLevel(r.analysis?.impactAssessment?.severityLevel)}
                             </span>
                             <h3 className="text-sm font-bold text-white leading-tight mb-1">{r.analysis.detection.category}</h3>
                             <p className="text-xs text-slate-400">{r.address || r.analysis?.locationIntelligence?.locationDescription}</p>
                           </div>

                           <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/5 pt-4">
                              <div className="bg-white/5 rounded p-2">
                                <span className="text-slate-500 block mb-0.5 uppercase">Complaint ID</span>
                                <span className="text-white">CP-{r.id.substring(0,6).toUpperCase()}</span>
                              </div>
                              <div className="bg-white/5 rounded p-2">
                                <span className="text-slate-500 block mb-0.5 uppercase">Status</span>
                                <span className="text-white">{r.status || 'Pending'}</span>
                              </div>
                              <div className="bg-white/5 rounded p-2">
                                <span className="text-slate-500 block mb-0.5 uppercase">Lat</span>
                                <span className="text-white">{r.coordinates?.lat?.toFixed(5) || 'N/A'}</span>
                              </div>
                              <div className="bg-white/5 rounded p-2">
                                <span className="text-slate-500 block mb-0.5 uppercase">Lng</span>
                                <span className="text-white">{r.coordinates?.lng?.toFixed(5) || 'N/A'}</span>
                              </div>
                           </div>

                           <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3 mt-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">Community Confidence</span>
                                <span className="text-xs font-bold text-white">{r.analysis?.communityVerification?.communityConfidencePercent}%</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <ShieldCheck size={12}/> Verified by {r.analysis?.communityVerification?.verifiedCitizensCount} citizens
                              </div>
                           </div>
                           
                           <div>
                             <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Assigned Department</span>
                             <div className="text-xs text-slate-300 font-medium bg-white/5 px-3 py-2 rounded border border-white/5">
                               {r.department || 'Unassigned'}
                             </div>
                           </div>

                           <button 
                             onClick={() => setSelectedWorkspaceReportId(r.id)}
                             className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors mt-auto uppercase tracking-wide"
                           >
                             Open Workspace
                           </button>
                         </div>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>
              </div>

              {/* Data Table */}
              <div className="w-full flex-1 bg-slate-900/50 p-6 overflow-auto">
                 <div className="min-w-max">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-400">
                         <th className="py-3 px-4 font-bold">Report ID</th>
                         <th className="py-3 px-4 font-bold">Issue Title/Classified Type</th>
                         <th className="py-3 px-4 font-bold">Location</th>
                         <th className="py-3 px-4 font-bold">Severity</th>
                         <th className="py-3 px-4 font-bold">Status</th>
                         <th className="py-3 px-4 font-bold">Submission Time</th>
                         <th className="py-3 px-4 font-bold">Reporter ID</th>
                         <th className="py-3 px-4 font-bold text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredReports.map(report => (
                         <tr key={report.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                           <td className="py-3 px-4 text-xs font-mono text-cyan-400">{report.displayId || `CP-${report.id.substring(0,6).toUpperCase()}`}</td>
                           <td className="py-3 px-4 text-sm font-medium text-white">{report.analysis.detection.category}</td>
                           <td className="py-3 px-4 text-xs text-slate-300 max-w-[200px] truncate" title={report.address || report.analysis?.locationIntelligence?.locationDescription}>
                             {report.address || report.analysis?.locationIntelligence?.locationDescription || 'N/A'}
                           </td>
                           <td className="py-3 px-4">
                             <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getSeverityTailwind(report.analysis?.impactAssessment?.severityLevel)}`}>
                               {getSeverityLevel(report.analysis?.impactAssessment?.severityLevel)}
                             </span>
                           </td>
                           <td className="py-3 px-4 text-xs text-slate-300">{report.status || 'Pending'}</td>
                           <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                             {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </td>
                           <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                             {report.reporterId || report.userId?.substring(0,8) || 'Anonymous'}
                           </td>
                           <td className="py-3 px-4 text-right">
                             <button 
                               onClick={() => setSelectedWorkspaceReportId(report.id)}
                               className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               Workspace
                             </button>
                           </td>
                         </tr>
                       ))}
                       {filteredReports.length === 0 && (
                         <tr>
                           <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">No active incidents available.</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>

            {/* Incident Management Panel */}
            <div className="xl:col-span-1 glass-panel border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-sm font-display font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2"><Activity className="text-indigo-400" size={16}/> Management Panel</h3>
              
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl">
                <span className="text-[10px] text-indigo-300 uppercase font-bold block mb-1">Total Active</span>
                <span className="text-4xl font-display font-black text-indigo-400"><AnimatedCounter value={stats.total} /></span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-red-400 uppercase font-bold block mb-2"><AlertTriangle size={12} className="inline mr-1"/> Critical</span>
                  <span className="text-2xl font-display font-black text-red-400"><AnimatedCounter value={stats.critical} /></span>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-orange-400 uppercase font-bold block mb-2"><AlertCircle size={12} className="inline mr-1"/> High</span>
                  <span className="text-2xl font-display font-black text-orange-400"><AnimatedCounter value={stats.high} /></span>
                </div>
                <div className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Pending</span>
                  <span className="text-2xl font-display font-black text-white"><AnimatedCounter value={stats.pending} /></span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-2"><CheckCircle size={12} className="inline mr-1"/> Resolved</span>
                  <span className="text-2xl font-display font-black text-emerald-400"><AnimatedCounter value={stats.resolved} /></span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mt-auto">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1 flex items-center gap-1.5"><Clock size={12}/> Avg Resolution</span>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-display font-black text-white"><AnimatedCounter value={stats.avgResTime} /></span>
                  <span className="text-xs text-slate-500 font-bold mb-1">HRS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Filter System */}
          <div className="glass-panel border-white/10 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 z-10 sticky top-4">
             <div className="flex items-center gap-2 px-2 border-r border-white/10 text-cyan-400">
               <Filter size={18} />
               <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline-block">Filters</span>
             </div>
             
             <div className="flex flex-wrap gap-3 flex-1">
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none w-full sm:w-48 placeholder-slate-500"
                />
                <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer">
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer">
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <select value={issueTypeFilter} onChange={e=>setIssueTypeFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer">
                  <option value="All">All Issue Types</option>
                  <option value="Streetlight Failure">Streetlight Failure</option>
                  <option value="Garbage Accumulation">Garbage Accumulation</option>
                  <option value="Water Logging">Water Logging</option>
                  <option value="Infrastructure Damage">Infrastructure Damage</option>
                  <option value="Gas Leakage Emergency">Gas Leakage Emergency</option>
                  <option value="Traffic Signal Failure">Traffic Signal Failure</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Other">Other</option>
                </select>
                <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer">
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
             </div>
             
             <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2">
               {filteredReports.length} results
             </div>
          </div>

          {/* Priority Incident Queue */}
          <div className="space-y-4">
            <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-2"><Crosshair className="text-cyan-400" /> Priority Incident Queue</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filteredReports.map((report) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedWorkspaceReportId(report.id)}
                    key={report.id} 
                    className="glass-panel border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 cursor-pointer group transition-all relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-16 h-16 blur-2xl rounded-full opacity-20 ${getSeverityTailwind(report.analysis?.impactAssessment?.severityLevel).split(' ')[0].replace('text', 'bg')}`}></div>
                    
                    <div className="flex gap-3 mb-3 relative z-10">
                       <div className="w-16 h-16 rounded-xl bg-slate-900 border border-white/10 shrink-0 overflow-hidden text-slate-800 flex items-center justify-center text-xs">
                          {(() => {
                            const images = report.images || (report as any).evidenceImages || (report as any).evidence || ((report as any).imageBase64 ? [(report as any).imageBase64] : []);
                            if (images.length > 0) {
                              const img = images[0].startsWith('data:') || images[0].startsWith('http') ? images[0] : `data:image/jpeg;base64,${images[0]}`;
                              return <img src={img} alt="Incident" className="w-full h-full object-cover" />;
                            }
                            return <span className="opacity-50">No Img</span>;
                          })()}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                               <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${getSeverityTailwind(report.analysis?.impactAssessment?.severityLevel)}`}>
                                 {getSeverityLevel(report.analysis?.impactAssessment?.severityLevel)}
                               </span>
                               {report.userId && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 bg-slate-800">
                                    Reporter: {report.reporterId || report.userId.substring(0,6)}
                                  </span>
                               )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{report.displayId || `CP-${report.id.substring(0,6).toUpperCase()}`}</span>
                         </div>
                         <h4 className="font-bold text-white text-sm line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">{report.analysis.detection.category}</h4>
                       </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1 mb-3 relative z-10"><MapPin size={10} className="shrink-0"/> <span className="truncate">{report.address || report.analysis?.locationIntelligence?.locationDescription}</span></p>
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10 relative z-10">
                       <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                         <ShieldCheck size={12} className="text-emerald-400" /> {report.analysis?.communityVerification?.communityConfidencePercent}% Conf
                       </div>
                       <span className={`text-[10px] font-bold tracking-widest uppercase ${report.status==='Resolved'?'text-emerald-400':report.status==='In Progress'?'text-amber-400':'text-slate-400'}`}>{report.status || 'Pending'}</span>
                    </div>
                  </motion.div>
                ))}
                {filteredReports.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                    No incidents match your current filters.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* DASHBOARD ANALYTICS */}
          <div className="mt-16 space-y-6">
             <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-2"><BarChart4 className="text-indigo-400" /> Dashboard Analytics</h3>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-panel border-white/10 rounded-[2rem] p-6 shadow-xl lg:col-span-2 min-h-[300px] flex flex-col">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Incident Trends (Last 7 Days)</h4>
                  <div className="flex-1 w-full h-full min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.trendData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '8px' }} itemStyle={{ color: '#22d3ee' }} />
                        <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel border-white/10 rounded-[2rem] p-6 shadow-xl flex flex-col">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Severity Distribution</h4>
                  <div className="flex-1 w-full h-full min-h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: stats.critical },
                            { name: 'High', value: stats.high },
                            { name: 'Medium', value: stats.medium },
                            { name: 'Low', value: stats.low },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#ef4444" />
                          <Cell fill="#f97316" />
                          <Cell fill="#eab308" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
             </div>
          </div>

      {/* INCIDENT DETAIL VIEW (Workspace Modal) */}
      <AnimatePresence>
        {selectedWorkspaceReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end overflow-hidden"
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-4xl bg-[#0a0f18] h-full border-l border-white/10 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50 sticky top-0 z-10">
                <div>
                   <h2 className="text-xl font-display font-black text-white flex items-center gap-3">
                     Incident Workspace <span className="text-slate-500 font-mono text-xs font-normal">{selectedWorkspaceReport.displayId || `CP-${selectedWorkspaceReport.id.substring(0,8).toUpperCase()}`}</span>
                     {selectedWorkspaceReport.userId && (
                        <span className="text-slate-400 font-mono text-xs font-normal bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">Reporter: {selectedWorkspaceReport.reporterId || selectedWorkspaceReport.userId.substring(0,6)}</span>
                     )}
                   </h2>
                </div>
                <button onClick={() => setSelectedWorkspaceReportId(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
                
                {selectedWorkspaceReport.analysis?.emergency?.isEmergency && (
                  <section>
                    <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-[pulse_2s_ease-in-out_infinite]">
                       <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={16}/> 🚨 RED ALERT: IMMEDIATE RESPONSE REQUIRED</h3>
                       
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                         <div>
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Issue Detected</span>
                            <span className="text-red-200 font-bold">{selectedWorkspaceReport.analysis?.emergency?.issueType}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Severity</span>
                            <span className="text-red-200 font-bold">{selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Impact Score</span>
                            <span className="text-red-200 font-bold">{selectedWorkspaceReport.analysis?.impactAssessment?.civicImpactScore ?? 0}/100</span>
                         </div>
                         <div className="col-span-2 md:col-span-1">
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Location / Affected Area</span>
                            <span className="text-red-200">{selectedWorkspaceReport.analysis?.locationIntelligence?.locationDescription?.substring(0, 50)}...</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Affected Radius</span>
                            <span className="text-red-200">{selectedWorkspaceReport.analysis?.emergency?.evacuationRadius || selectedWorkspaceReport.analysis?.locationIntelligence?.affectedRadius}</span>
                         </div>
                         <div className="col-span-2 md:col-span-1">
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Nearby Sensitive Areas</span>
                            <span className="text-red-200">Schools, Hospitals, Residential Areas</span>
                         </div>
                         <div className="col-span-2 md:col-span-3">
                            <span className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold block mb-1">Status</span>
                            <span className="text-red-200 font-bold animate-pulse">Immediate Response Required</span>
                         </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-3 mt-2">
                         <button className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 px-4 rounded shadow-lg transition-colors">
                           Assign Emergency Team
                         </button>
                         <button className="bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-500/50 text-xs font-bold py-2 px-4 rounded transition-colors">
                           Notify Authorities ({selectedWorkspaceReport.analysis?.emergency?.emergencyContacts?.length || 0})
                         </button>
                         <button className="bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/50 text-xs font-bold py-2 px-4 rounded transition-colors">
                           Mark Response Started
                         </button>
                       </div>
                    </div>
                  </section>
                )}

                {/* Admin Actions */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={14}/> Admin Actions</h3>
                  <div className="glass-panel border-white/5 bg-white/[0.02] rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-6">
                       <div>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Update Status</span>
                         <div className="flex flex-wrap gap-2">
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { status: 'Under Review' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.status === 'Under Review' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Under Review</button>
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { status: 'In Progress' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.status === 'In Progress' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>In Progress</button>
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { status: 'Resolved' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.status === 'Resolved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Resolved</button>
                         </div>
                       </div>
                       <div>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Assign Priority</span>
                         <div className="flex flex-wrap gap-2">
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { 'analysis.impactAssessment.severityLevel': 'Critical' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel === 'Critical' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Critical</button>
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { 'analysis.impactAssessment.severityLevel': 'High' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel === 'High' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>High</button>
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { 'analysis.impactAssessment.severityLevel': 'Medium' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel === 'Medium' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Medium</button>
                           <button onClick={() => updateReportStatus(selectedWorkspaceReport.id, { 'analysis.impactAssessment.severityLevel': 'Low' })} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel === 'Low' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Low</button>
                         </div>
                       </div>
                    </div>
                    <div>
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Authority Notes</span>
                       <div className="flex gap-2">
                         <input 
                           type="text" 
                           placeholder="Add internal notes..." 
                           value={authorityNotes[selectedWorkspaceReport.id] || ''}
                           onChange={(e) => setAuthorityNotes({...authorityNotes, [selectedWorkspaceReport.id]: e.target.value})}
                           className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-slate-500"
                         />
                         <button 
                           onClick={() => {
                              const note = authorityNotes[selectedWorkspaceReport.id];
                              if (note) {
                                 // We append to existing or set new
                                 const currentNotes = selectedWorkspaceReport.authorityNotes || [];
                                 updateReportStatus(selectedWorkspaceReport.id, { authorityNotes: [...currentNotes, note] });
                                 setAuthorityNotes({...authorityNotes, [selectedWorkspaceReport.id]: ''});
                              }
                           }}
                           className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors"
                         >
                           Add Note
                         </button>
                       </div>
                       
                       {selectedWorkspaceReport.authorityNotes && selectedWorkspaceReport.authorityNotes.length > 0 && (
                         <div className="mt-4 space-y-2">
                           <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Previous Notes</span>
                           {selectedWorkspaceReport.authorityNotes.map((note, idx) => (
                              <div key={idx} className="bg-white/5 border border-white/10 rounded p-2 text-sm text-slate-300">
                                {note}
                              </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                </section>

                {/* 1. Complaint Evidence & Map */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={14}/> 1. Complaint Evidence</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-900 border border-white/5 rounded-xl aspect-video flex items-center justify-center text-slate-600 relative overflow-hidden group">
                        {(() => {
                           const images = selectedWorkspaceReport.images || (selectedWorkspaceReport as any).evidenceImages || (selectedWorkspaceReport as any).evidence || ((selectedWorkspaceReport as any).imageBase64 ? [(selectedWorkspaceReport as any).imageBase64] : []);
                           if (images.length > 0) {
                              return (
                                <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                                 {images.slice(0, 2).map((rawImg: string, idx: number) => {
                                   const img = rawImg.startsWith('data:') || rawImg.startsWith('http') ? rawImg : `data:image/jpeg;base64,${rawImg}`;
                                   return (
                                     <img key={idx} src={img} alt={`Evidence ${idx+1}`} onClick={() => setPreviewImage(img)} className="w-full h-full object-cover shrink-0 snap-center cursor-pointer hover:opacity-90 transition-opacity" />
                                   )
                                 })}
                                </div>
                              );
                           }
                           return <span>No Image Attached</span>;
                        })()}
                        {(() => {
                           const images = selectedWorkspaceReport.images || (selectedWorkspaceReport as any).evidenceImages || (selectedWorkspaceReport as any).evidence || ((selectedWorkspaceReport as any).imageBase64 ? [(selectedWorkspaceReport as any).imageBase64] : []);
                           if (images.length > 1) {
                             return (
                               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none shadow-sm">
                                 {images.slice(0, 2).map((_: any, idx: number) => (
                                   <div key={idx} className="w-2 h-2 rounded-full bg-white border border-black/20" />
                                 ))}
                               </div>
                             );
                           }
                           return null;
                        })()}
                     </div>
                     <div className="bg-slate-900 border border-white/5 rounded-xl aspect-video overflow-hidden relative">
                        {selectedWorkspaceReport.coordinates ? (
                            <SafeMap options={{disableDefaultUI: true}} center={{lat: Number(selectedWorkspaceReport.coordinates.lat), lng: Number(selectedWorkspaceReport.coordinates.lng)}} zoom={15}>
                               <Marker position={{lat: Number(selectedWorkspaceReport.coordinates.lat), lng: Number(selectedWorkspaceReport.coordinates.lng)}} />
                            </SafeMap>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">No Location Data</div>
                        )}
                     </div>
                  </div>
                </section>

                {/* 2. AI Intelligence */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14}/> 2. AI Intelligence Report</h3>
                  <div className="glass-panel border-white/5 bg-white/[0.02] rounded-2xl p-5 space-y-4">
                     <div>
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Issue Classification</span>
                       <p className="text-white text-sm font-medium">{selectedWorkspaceReport.analysis?.detection?.category}</p>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                       <div>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Impact Score</span>
                         <span className="text-lg text-cyan-400 font-mono font-bold">{selectedWorkspaceReport.analysis?.impactAssessment?.civicImpactScore ?? 0}/100</span>
                       </div>
                       <div>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Severity</span>
                         <span className={`text-xs font-bold uppercase ${getSeverityTailwind(selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel || 'Local Issue').split(' ')[0]}`}>{selectedWorkspaceReport.analysis?.impactAssessment?.severityLevel}</span>
                       </div>
                       <div>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Trust Score</span>
                         <span className="text-emerald-400 font-mono font-bold">{selectedWorkspaceReport.analysis?.civicShield?.authenticityScore ?? 0}%</span>
                       </div>
                     </div>
                  </div>
                </section>

                {/* 3. Community Verification */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Network size={14}/> 3. Community Verification</h3>
                  <div className="glass-panel border-white/5 bg-white/[0.02] rounded-2xl p-5 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-display font-black text-xl">
                      {selectedWorkspaceReport.analysis?.communityVerification?.communityConfidencePercent ?? 0}%
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1">Community Confidence Level</h4>
                      <p className="text-xs text-slate-400">Verified by {selectedWorkspaceReport.analysis?.communityVerification?.verifiedCitizensCount ?? 0} local citizens in the affected area radius.</p>
                    </div>
                  </div>
                </section>

                {/* 4. Impact Prediction */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><LucideLineChart size={14}/> 4. Impact Prediction</h3>
                  <div className="glass-panel border-white/5 bg-white/[0.02] rounded-2xl p-5 space-y-4 text-sm">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Escalation Probability</span>
                      <p className="text-rose-400 font-medium">{selectedWorkspaceReport.analysis?.impactPrediction?.riskEscalation}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Consequences (7 Days)</span>
                      <ul className="space-y-1">
                        {selectedWorkspaceReport.analysis?.impactPrediction?.consequencesNext7Days?.map((c, i) => (
                           <li key={i} className="text-slate-300 flex items-start gap-2"><span className="text-rose-400 mt-1">•</span> {c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* 5. Resolution Plan */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldCheck size={14}/> 5. Resolution Plan</h3>
                  <div className="glass-panel border-white/5 bg-white/[0.02] rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 rounded-lg">
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Target Department</span>
                      <span className="text-sm font-bold text-white">{selectedWorkspaceReport.analysis?.resolution?.responsibleAuthority}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Recommended Actions</span>
                      <ul className="space-y-2">
                        {selectedWorkspaceReport.analysis?.resolution?.recommendedSteps?.map((s, i) => (
                           <li key={i} className="text-slate-300 flex items-start gap-2 text-sm bg-white/5 p-2 rounded"><span className="text-indigo-400 font-mono text-xs">{i+1}.</span> {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* 6. Official Complaint Report */}
                <section>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Download size={14}/> 6. Official Complaint Report</h3>
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative">
                     <p className="text-sm text-slate-300 whitespace-pre-wrap font-serif leading-relaxed">{selectedWorkspaceReport.analysis?.citizenAssistant?.complaintDraft}</p>
                     
                     {selectedWorkspaceReport.analysis?.emergency?.isEmergency && (
                       <div className="mt-6 pt-6 border-t border-red-500/30">
                         <h4 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                           <AlertTriangle size={14} /> EMERGENCY PROTOCOL TRIGGERED
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                           <div>
                             <span className="text-slate-500 font-bold text-[10px] uppercase block mb-1">Emergency Classification</span>
                             <span className="text-red-300">{selectedWorkspaceReport.analysis?.emergency?.issueType}</span>
                           </div>
                           {selectedWorkspaceReport.analysis?.emergency?.evacuationRadius && (
                             <div>
                               <span className="text-slate-500 font-bold text-[10px] uppercase block mb-1">Evacuation Radius</span>
                               <span className="text-red-300">{selectedWorkspaceReport.analysis?.emergency?.evacuationRadius}</span>
                             </div>
                           )}
                         </div>
                         <div className="mt-4">
                           <span className="text-slate-500 font-bold text-[10px] uppercase block mb-1">Safety Instructions Dispatched</span>
                           <ul className="list-disc pl-4 text-slate-300 space-y-1">
                             {selectedWorkspaceReport.analysis?.emergency?.safetyInstructions?.map((s, i) => (
                               <li key={i}>{s}</li>
                             ))}
                           </ul>
                         </div>
                         <div className="mt-4">
                           <span className="text-slate-500 font-bold text-[10px] uppercase block mb-1">Emergency Services Notified</span>
                           <span className="text-slate-300">{selectedWorkspaceReport.analysis?.emergency?.emergencyContacts?.join(', ')}</span>
                         </div>
                       </div>
                     )}

                     <div className="absolute top-4 right-4">
                       <button onClick={() => generateReportPDF(selectedWorkspaceReport)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors" title="Download PDF">
                         <Download size={16}/>
                       </button>
                     </div>
                  </div>
                </section>

                 {/* 7. Citizen Submitted Letter */}
                 {citizenLetter && (
                   <section>
                     <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle size={14}/> 7. Citizen Submitted Letter</h3>
                     <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 relative">
                        <div className="mb-4 pb-4 border-b border-amber-500/20 grid grid-cols-2 gap-4">
                           <div>
                             <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest block mb-1">Citizen Name</span>
                             <span className="text-amber-200 text-sm">{citizenLetter.citizenName}</span>
                           </div>
                           <div>
                             <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest block mb-1">Contact Email</span>
                             <span className="text-amber-200 text-sm">{citizenLetter.email}</span>
                           </div>
                           <div className="col-span-2">
                             <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest block mb-1">Issue Title</span>
                             <span className="text-amber-200 text-sm">{citizenLetter.issueTitle}</span>
                           </div>
                        </div>
                        <p className="text-sm text-amber-100 whitespace-pre-wrap font-serif leading-relaxed italic">{citizenLetter.letterContent}</p>
                     </div>
                   </section>
                 )}

              </div>

              {/* AUTHORITY ACTIONS (Fixed at bottom) */}
              <div className="bg-slate-950 border-t border-white/10 p-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                 <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Assign Department</label>
                      <select 
                        className="w-full bg-black/50 border border-white/20 hover:border-white/40 rounded-xl px-3 py-2 text-sm text-white outline-none cursor-pointer"
                        value={selectedWorkspaceReport.department || ''}
                        onChange={(e) => updateReportStatus(selectedWorkspaceReport.id, { department: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        <option value="Public Works">Public Works</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Municipal Sanitation">Municipal Sanitation</option>
                        <option value="Water Department">Water Department</option>
                        <option value="Electricity Department">Electricity Department</option>
                        <option value="Emergency Response">Emergency Response</option>
                        <option value="Fire Department">Fire Department</option>
                        <option value="Police Department">Police Department</option>
                        <option value="Disaster Management Authority">Disaster Management Authority</option>
                        <option value="Health Department">Health Department</option>
                        <option value="Environmental Department">Environmental Department</option>
                        <option value="Traffic Management Department">Traffic Management Department</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Update Status</label>
                      <select 
                        className="w-full bg-black/50 border border-white/20 hover:border-white/40 rounded-xl px-3 py-2 text-sm text-white outline-none cursor-pointer"
                        value={selectedWorkspaceReport.status || 'Pending'}
                        onChange={(e) => updateReportStatus(selectedWorkspaceReport.id, { status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Escalated">Escalated</option>
                      </select>
                    </div>
                 </div>
                 <div className="flex gap-3">
                   <input type="text" placeholder="Add internal authority notes..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-cyan-500" />
                   <button className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-colors shrink-0">Save Notes</button>
                   {selectedWorkspaceReport.department && (
                     <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerHTML;
                          btn.innerHTML = 'Forwarding...';
                          try {
                            const { addDoc, collection } = await import('firebase/firestore');
                            await addDoc(collection(db, 'departmentLetters'), {
                              reportId: selectedWorkspaceReport.id,
                              department: selectedWorkspaceReport.department,
                              citizenName: citizenLetter?.citizenName || 'Anonymous',
                              email: citizenLetter?.email || 'N/A',
                              issueTitle: citizenLetter?.issueTitle || selectedWorkspaceReport.analysis?.detection?.category || 'General Issue',
                              letterContent: citizenLetter?.letterContent || selectedWorkspaceReport.analysis?.citizenAssistant?.complaintDraft || '',
                              location: citizenLetter?.location || selectedWorkspaceReport.analysis?.locationIntelligence?.locationDescription || 'N/A',
                              forwardedBy: 'Authority Dashboard',
                              timestamp: new Date().toISOString()
                            });
                            btn.innerHTML = 'Forwarded';
                            btn.className = "bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-colors shrink-0";
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                              btn.className = "bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shrink-0";
                            }, 3000);
                          } catch (err) {
                            console.error('Failed to forward', err);
                            btn.innerHTML = 'Failed';
                            setTimeout(() => btn.innerHTML = originalText, 3000);
                          }
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shrink-0"
                     >
                        Forward to Department
                     </button>
                   )}
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
               <X size={32} />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={previewImage} 
              alt="Evidence Preview" 
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
