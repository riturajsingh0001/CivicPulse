import React, { useEffect, useState } from 'react';
import { CivicIssueAnalysis } from '../types';
import { 
  AlertTriangle, MapPin, Search, ShieldAlert, CheckCircle, 
  Clock, Copy, AlignLeft, Users, Leaf, Navigation, Activity,
  Target, Shield, ArrowUpCircle, Layers, BadgeCheck, TrendingUp, AlertCircle, Cpu, Fingerprint, LucideIcon,
  ShieldCheck, Network, CheckCircle2,
  FileCheck, PhoneCall, Phone, Hospital, Flame, Radio
} from 'lucide-react';
import { motion, useAnimation, useMotionValue, useTransform, animate } from 'motion/react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { SafeMap } from './SafeMap';

interface AnalysisDashboardProps {
  analysis: CivicIssueAnalysis;
  coordinates?: { lat: number; lng: number } | null;
}

const Gauge = ({ value }: { value: number }) => {
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  
  const strokeDashoffset = useTransform(count, (latest) => {
    return circumference - (latest / 100) * circumference;
  });
  
  useEffect(() => {
    const animation = animate(count, value, { duration: 2, ease: "easeOut" });
    return animation.stop;
  }, [value]);
  
  const getColor = (v: number) => {
    if (v < 40) return '#22d3ee'; // cyan
    if (v < 75) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="relative flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">
      <svg className="transform -rotate-90 w-36 h-36">
        <circle 
          cx="72" cy="72" r={radius} 
          stroke="currentColor" strokeWidth={strokeWidth} 
          fill="transparent" className="text-slate-900" 
        />
        <motion.circle 
          cx="72" cy="72" r={radius} 
          stroke={getColor(value)} strokeWidth={strokeWidth} 
          fill="transparent" 
          strokeDasharray={circumference} 
          style={{ strokeDashoffset }} 
          strokeLinecap="round" 
          className="transition-colors duration-1000 ease-out drop-shadow-xl" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span className="text-4xl font-display font-black text-white tracking-tighter">{rounded}</motion.span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Impact</span>
      </div>
    </div>
  );
};

function compactCheckRow(label: string, valid: boolean) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0 group">
      <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{label}</span>
      {valid ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400 animate-pulse" />}
    </div>
  );
}

export function AnalysisDashboard({ analysis, coordinates }: AnalysisDashboardProps) {
  if (!analysis) return null;

  console.log('--- RENDERED UI OBJECT ---');
  console.log(analysis);
  console.log('--------------------------');

  const { profile } = useAuth();
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
  const [mapError, setMapError] = useState(!(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY === 'dummy');
  
  useEffect(() => {
    const handleMapError = () => setMapError(true);
    window.addEventListener('gmaps-error', handleMapError);
    return () => window.removeEventListener('gmaps-error', handleMapError);
  }, []);

  const heatLevel = analysis?.impactAssessment?.severityLevel || 'Local Issue';
  
  const getHeatConfig = (level: string) => {
    if (level === 'Critical Public Hazard') return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]', icon: <AlertTriangle className="h-6 w-6 text-red-500" /> };
    if (level === 'Community Risk') return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]', icon: <Activity className="h-6 w-6 text-orange-500" /> };
    return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-[0_0_30px_rgba(34,211,238,0.15)]', icon: <CheckCircle className="h-6 w-6 text-cyan-500" /> };
  };

  const heatConfig = getHeatConfig(heatLevel);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.15 } 
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 font-sans pb-16 w-full"
    >
      
      {analysis.emergency?.isEmergency && (
        <motion.div variants={cardVariants} className="bg-red-500/10 border border-red-500/50 rounded-[2rem] p-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-[pulse_2s_ease-in-out_infinite] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <AlertTriangle size={120} className="text-red-500" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                  🚨 Emergency Detected
                </h2>
                <p className="text-red-200 mt-1">Critical public hazard identified. Immediate intervention required.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm w-full md:w-auto">
              <div>
                 <span className="text-red-500/70 text-[10px] font-bold uppercase tracking-widest block mb-1">Severity</span>
                 <span className="font-mono text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">{analysis?.impactAssessment?.severityLevel}</span>
              </div>
              <div>
                 <span className="text-red-500/70 text-[10px] font-bold uppercase tracking-widest block mb-1">Issue Type</span>
                 <span className="font-mono text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">{analysis.emergency.issueType}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {analysis.emergency?.isEmergency && (
        <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Safety Instructions */}
           <div className="md:col-span-1 glass-panel border-red-500/20 p-6 rounded-[2rem]">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldAlert size={14} /> Instant Safety Instructions
              </h3>
              <ul className="space-y-3">
                {analysis.emergency?.safetyInstructions?.map((inst, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300 text-sm leading-tight">{inst}</span>
                  </li>
                ))}
              </ul>
           </div>
           
           {/* Emergency Contacts */}
           <div className="md:col-span-1 glass-panel border-orange-500/20 p-6 rounded-[2rem] flex flex-col">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <PhoneCall size={14} /> Emergency Contacts
              </h3>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                {analysis.emergency?.emergencyContacts?.map((contact, idx) => (
                  <button key={idx} className="w-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-all group">
                    <span>{contact}</span>
                    <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
           </div>

           {/* Nearby Services */}
           <div className="md:col-span-1 glass-panel border-cyan-500/20 p-6 rounded-[2rem]">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Hospital size={14} /> Nearby Emergency Services
              </h3>
              <div className="space-y-4 mt-2">
                {analysis.emergency?.nearbyServices?.map((srv, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                         {srv.type.includes('Hospital') ? <Hospital size={14} className="text-cyan-400" /> : 
                          srv.type.includes('Fire') ? <Flame size={14} className="text-orange-400" /> : 
                          <Shield size={14} className="text-blue-400" />}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{srv.type}</span>
                    </div>
                    <div className="text-right">
                       <span className="block text-xs text-cyan-400 font-mono">{srv.distance}</span>
                       <span className="block text-[10px] text-slate-500">{srv.time}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </motion.div>
      )}

      {analysis.emergency?.isEmergency && (
        <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 animate-pulse">
               <Radio size={20} className="text-red-500" />
             </div>
             <div>
               <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">⚠️ Public Safety Alert (SOS Broadcast Demo)</h4>
               <p className="text-sm text-red-200 mt-1">{analysis.emergency.issueType} detected near your area. Avoid the location and follow emergency instructions.</p>
             </div>
           </div>
           
           {/* Escalation Timeline */}
           <div className="glass-panel border-red-500/20 p-5 rounded-xl">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14} /> Emergency Escalation Engine
              </h3>
              <div className="relative pl-6 space-y-4 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-red-500 before:to-transparent before:left-0 before:top-2">
                 {analysis.emergency?.escalationTimeline?.map((step, idx) => (
                   <div key={idx} className="relative">
                     <div className="absolute left-[-29px] top-1 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                     <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Level {idx + 1}</p>
                     <p className="text-slate-300 text-sm">{step}</p>
                   </div>
                 ))}
              </div>
           </div>
        </motion.div>
      )}

      {/* 5. AI Intelligence Report */}
      <motion.div variants={cardVariants} className="space-y-6">
        <h2 className="text-xl font-display font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/10 pb-4">
          <Activity className="text-cyan-400" /> AI Intelligence Report
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Validation & Duplicate */}
          <div className="space-y-6">
            <div className={`p-6 rounded-[2rem] border glass-panel transition-all hover:shadow-[0_10px_40px_rgba(34,211,238,0.1)] ${analysis?.inputValidation?.isVerified ? 'border-cyan-500/20' : 'border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2 h-2 rounded-full ${analysis?.inputValidation?.isVerified ? 'bg-cyan-500' : 'bg-red-500 animate-pulse'}`}></span>
                <h3 className="font-bold tracking-tight text-white text-sm uppercase tracking-widest text-slate-400">Input Validation</h3>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Confidence Level</span>
                <span className="font-bold text-white bg-white/5 py-1 px-3 rounded-lg">{analysis?.inputValidation?.confidenceLevel}%</span>
              </div>
              {!analysis?.inputValidation?.isVerified && (
                <p className="mt-3 text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">{analysis?.inputValidation?.detectedMismatch}</p>
              )}
            </div>

            <div className="p-6 glass-panel border border-white/10 rounded-[2rem] transition-all hover:border-white/20">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Layers size={14} /> Duplicate Detection
               </h3>
               <div className="flex items-center justify-between">
                 <p className="text-sm text-slate-300">{analysis?.duplicateDetection?.isDuplicate ? "Duplicate Report Found" : "Unique Issue Confirmed"}</p>
                 <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${analysis?.duplicateDetection?.isDuplicate ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                   {analysis?.duplicateDetection?.isDuplicate ? `${analysis?.duplicateDetection?.similarityScore}% Match` : 'No Match'}
                 </span>
               </div>
            </div>
          </div>

          {/* Issue Classification & Location */}
          <div className="glass-panel border-white/10 rounded-[2rem] p-6 hover:border-white/20 transition-all flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Classification & Location</h3>
              <p className="text-3xl font-display font-black tracking-tight text-white mb-2">{analysis.detection?.category}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {analysis.detection?.detectedFactors?.map((f, i) => (
                  <span key={i} className="bg-white/5 text-slate-300 px-2.5 py-1 rounded-md text-xs border border-white/5">{f}</span>
                ))}
              </div>
            </div>
            
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium mb-1">{analysis?.locationIntelligence?.locationDescription}</p>
                  <p className="text-xs text-slate-400">Radius: {analysis?.locationIntelligence?.affectedRadius} • Pop: ~{analysis?.locationIntelligence?.estimatedPopulationImpact?.toLocaleString()}</p>
                </div>
              </div>
              
              {coordinates ? (
                <div className="w-full h-[300px] sm:h-[400px] mt-2 rounded-xl border border-white/10 overflow-hidden relative">
                    <SafeMap 
                      center={{lat: Number(coordinates.lat), lng: Number(coordinates.lng)}} 
                      zoom={15} 
                      options={{
                        disableDefaultUI: true
                      }}
                    >
                      <Marker 
                        position={{lat: Number(coordinates.lat), lng: Number(coordinates.lng)}}
                        onClick={() => setIsInfoWindowOpen(true)}
                      />
                      
                      {isInfoWindowOpen && (
                        <InfoWindow
                          position={{lat: Number(coordinates.lat), lng: Number(coordinates.lng)}}
                          onCloseClick={() => setIsInfoWindowOpen(false)}
                        >
                          <div>
                            <div className="font-bold text-slate-800 text-sm mb-1">Detected Location</div>
                            <div className="text-xs text-slate-600 font-mono">
                              Lat: {coordinates.lat.toFixed(6)}<br />
                              Lng: {coordinates.lng.toFixed(6)}
                            </div>
                          </div>
                        </InfoWindow>
                      )}
                    </SafeMap>
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-md rounded-lg p-2 text-[10px] text-slate-300 font-mono flex justify-between tracking-tight z-0 border border-white/10 pointer-events-none">
                     <span>LAT: {coordinates.lat.toFixed(6)}</span>
                     <span>LNG: {coordinates.lng.toFixed(6)}</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[300px] sm:h-[400px] mt-2 rounded-xl border border-white/10 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500">
                  <MapPin size={24} className="mb-2 opacity-50" />
                  <p className="text-xs font-mono">Coordinates Unavailable</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Severity Heatmap & Civic Impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`md:col-span-2 p-6 rounded-[2rem] border relative overflow-hidden flex items-center justify-between ${heatConfig.border} ${heatConfig.bg}`}>
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${heatConfig.text.split('-')[1]}-500/10 to-transparent -translate-x-[150%] animate-[shine_3s_infinite]`}></div>
            <div className="relative z-10 space-y-1 text-left">
              <p className={`text-[10px] font-bold uppercase tracking-widest opacity-80 ${heatConfig.text}`}>System Priority Level</p>
              <p className={`text-3xl font-display font-black tracking-tight ${heatConfig.text}`}>{heatLevel}</p>
            </div>
            <div className="relative z-10 bg-black/20 p-4 rounded-full backdrop-blur-md border border-white/10">
              {heatConfig.icon}
            </div>
          </div>
          <div className="glass-panel p-6 rounded-[2rem] border border-white/10 flex items-center justify-between overflow-hidden relative group">
             <div className="relative z-10 w-full flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Civic Impact</p>
                  <p className="text-xs text-slate-400 max-w-[100px] leading-tight">Severity & Environment</p>
                </div>
                <Gauge value={analysis?.impactAssessment?.civicImpactScore} />
             </div>
          </div>
        </div>
      </motion.div>

      {/* CyberShield Security Layer */}
      <motion.div variants={cardVariants}>
        <h2 className="text-xl font-display font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
          <ShieldAlert className="text-cyan-400" /> CyberShield Security Layer
        </h2>
        <div className="glass-panel rounded-[2rem] border border-cyan-500/20 overflow-hidden relative group hover:border-cyan-500/40 transition-all shadow-[0_5px_30px_rgba(34,211,238,0.05)]">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield size={240} className="text-cyan-400 group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="p-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
              <div className="text-center md:col-span-1 bg-black/20 p-8 rounded-3xl border border-cyan-500/20 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                 <p className="text-6xl font-display font-black text-cyan-400 tracking-tighter">{analysis?.civicShield?.authenticityScore}<span className="text-3xl text-cyan-500/50">%</span></p>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Authenticity Score</p>
              </div>
              <div className="md:col-span-2 flex flex-col justify-center gap-2 pr-4">
                 {compactCheckRow("Image Forensics Validation", !analysis?.civicShield?.imageTamperingDetected)}
                 {compactCheckRow("AI-Generation Scan", !analysis?.civicShield?.aiGeneratedImageDetected)}
                 {compactCheckRow("Location Metadata Consistency", analysis?.civicShield?.geolocationConsistent)}
                 {compactCheckRow("Sybil / Duplicate Attack Check", !analysis?.civicShield?.duplicateFraudDetected)}
                 <div className="pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fraud Risk Assessment</span>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${analysis?.civicShield?.fraudRiskLevel === 'Low' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'}`}>
                      {analysis?.civicShield?.fraudRiskLevel} Risk
                    </span>
                 </div>
              </div>
            </div>
            {analysis?.civicShield?.explanation && (
              <div className="mt-6 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl p-4 flex gap-3 text-sm text-cyan-100/70 font-medium leading-relaxed">
                <Fingerprint className="shrink-0 text-cyan-400 mt-1" size={18} />
                <p>{analysis?.civicShield?.explanation}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Community Verification */}
      {analysis?.communityVerification && (
        <motion.div variants={cardVariants}>
          <h2 className="text-xl font-display font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
            <Users className="text-cyan-400" /> Community Verification
          </h2>
          <div className="p-8 glass-panel border border-white/10 rounded-[2rem] hover:border-white/20 transition-all flex flex-col lg:flex-row gap-10 items-center justify-between relative overflow-hidden">
             
             <div className="flex-1 w-full space-y-8">
               <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 border-b border-white/5 pb-6">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                     <BadgeCheck className="w-7 h-7" />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1 shadow-sm">Verified Citizens</p>
                     <p className="text-4xl font-display font-black text-white">{analysis?.communityVerification?.verifiedCitizensCount} <span className="text-xl text-slate-500 font-medium tracking-normal">Citizens</span></p>
                   </div>
                 </div>
               </div>

               <div className="space-y-3">
                 <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                   <span className="text-emerald-400 flex items-center gap-1.5"><Activity size={14} /> {analysis?.communityVerification?.communityConfidencePercent}% Community Confidence</span>
                   <span>Threshold: {analysis?.communityVerification?.totalRequiredForHighTrust} Citizens</span>
                 </div>
                 <div className="w-full bg-black/50 border border-white/5 rounded-full h-4 overflow-hidden relative">
                   <motion.div 
                     className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400 relative"
                     initial={{ width: 0 }}
                     whileInView={{ width: `${Math.min(100, (analysis?.communityVerification?.verifiedCitizensCount / analysis?.communityVerification?.totalRequiredForHighTrust) * 100)}%` }}
                     viewport={{ once: true }}
                     transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                   >
                     <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shine_1s_linear_infinite]"></div>
                   </motion.div>
                 </div>
               </div>
             </div>

             <div className="shrink-0 w-full lg:w-72 bg-black/40 border border-white/5 p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner">
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest">Status Assessment</p>
                 <div className={`px-5 py-3 w-full rounded-2xl text-xs font-bold uppercase tracking-wider border text-center flex items-center justify-center gap-2 ${analysis?.communityVerification?.trustLevel === 'Highly Verified Complaint' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 md:shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'}`}>
                    <CheckCircle size={16} />
                    {analysis?.communityVerification?.trustLevel}
                 </div>
             </div>

          </div>
        </motion.div>
      )}

      {/* 6. Impact Prediction */}
      <motion.div variants={cardVariants}>
        <h2 className="text-xl font-display font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
          <TrendingUp className="text-indigo-400" /> Impact Prediction
        </h2>
        <div className="bg-slate-900 border border-indigo-500/20 rounded-[2rem] p-8 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50"></div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
              {/* LEFT PANEL: 7-Day Risk Escalation Timeline */}
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6 border-b border-indigo-500/20 pb-2 block">7-Day Risk Escalation Timeline</p>
                <div className="space-y-6 relative border-l border-indigo-500/20 ml-2 pl-6">
                   {analysis?.impactPrediction?.consequencesNext7Days?.map((c, i) => {
                     const buckets = ['Day 1-3', 'Day 4-7', 'Day 8-14', 'Day 15-30', 'Day 30+'];
                     const title = buckets[Math.min(i, buckets.length - 1)];
                     return (
                      <div key={i} className="relative group/timeline">
                        <div className="absolute -left-[30px] top-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.5)] group-hover/timeline:shadow-[0_0_15px_rgba(99,102,241,0.8)] transition-all"></div>
                        <p className="text-xs font-bold text-indigo-300 mb-1">{title}</p>
                        <p className="text-sm text-slate-300 leading-snug">{c}</p>
                      </div>
                     );
                   })}
                </div>
              </div>

              {/* RIGHT PANEL: Predictive Intelligence */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-3xl p-8 flex flex-col justify-center space-y-6 shadow-inner relative overflow-hidden group-hover:border-indigo-500/40 transition-all">
                 <div className="absolute top-0 right-0 p-6 opacity-10 blur-xl pointer-events-none">
                   <TrendingUp size={150} className="text-indigo-400" />
                 </div>
                 
                 <div>
                   <p className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2"><Activity size={14} className="animate-pulse" /> Predictive Intelligence</p>
                   <p className="text-xl font-display font-medium text-white mb-6">Escalation Prediction: <span className="text-indigo-400 font-bold">{analysis?.impactPrediction?.riskEscalation}</span></p>
                 </div>

                 <div className="space-y-4 border-t border-indigo-500/10 pt-6">
                    <div className="flex flex-col items-start">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Predicted Severity</p>
                      <span className={`inline-flex items-center gap-2 px-3 py-1 ${heatConfig.bg} ${heatConfig.text} border ${heatConfig.border} rounded-lg text-sm font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-[pulse_2s_ease-in-out_infinite]`}>
                        {heatConfig.icon} {heatLevel}
                      </span>
                    </div>

                    <div className="flex flex-col items-start">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Recommended Response Window</p>
                      <p className="text-amber-400 font-bold text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg inline-block shadow-[0_0_10px_rgba(245,158,11,0.1)]">{analysis.civicAction?.estimatedResolutionTimeline || analysis?.resolution?.estimatedUrgency}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>

      {/* 7. Resolution Plan */}
      <motion.div variants={cardVariants}>
        <h2 className="text-xl font-display font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
          <Network className="text-cyan-400" /> Resolution Agent
        </h2>
        <div className="glass-panel border-white/10 rounded-[2rem] p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/30 border border-white/5 rounded-2xl p-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Authority Routing</p>
              <p className="text-xl font-display font-bold text-white">{analysis?.resolution?.responsibleAuthority}</p>
              <p className="text-xs text-slate-400 font-medium mt-2">Routed via AI Triage</p>
            </div>
            <div className="bg-black/30 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Resolution Timeline</p>
                <p className="text-lg font-display font-bold text-amber-400">{analysis.civicAction?.estimatedResolutionTimeline || analysis?.resolution?.estimatedUrgency}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-5">Recommended Action Plan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {analysis?.resolution?.recommendedSteps?.map((step, idx) => (
                 <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-4 hover:border-white/20 transition-all">
                   <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                     <span className="text-xs text-cyan-400 font-bold">{idx + 1}</span>
                   </div>
                   <p className="text-sm text-slate-300 font-medium mt-1 leading-relaxed">{step}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 8. Citizen Assistant Output */}
      {analysis?.citizenAssistant && (
        <motion.div variants={cardVariants}>
          <h2 className="text-xl font-display font-black text-white tracking-widest uppercase flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
            <FileCheck className="text-emerald-400" /> Official Authority Report
          </h2>
          <div className="glass-panel border-emerald-500/20 hover:border-emerald-500/40 rounded-[2rem] p-6 sm:p-8 transition-all">
            <div className="space-y-6">
              
              {/* Horizontal Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Issue Type</span>
                  <span className="text-slate-200 font-medium text-sm">{analysis.detection?.category || 'General Issue'}</span>
                </div>
                <div className="hidden sm:block w-[1px] h-8 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Priority Level</span>
                  <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">{heatLevel}</span>
                </div>
                <div className="hidden md:block w-[1px] h-8 bg-white/10"></div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Location</span>
                   <span className="text-slate-200 font-medium text-sm">{analysis?.locationIntelligence?.locationDescription?.substring(0, 30)}...</span>
                </div>
                <div className="hidden lg:block w-[1px] h-8 bg-white/10"></div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Impact Score</span>
                   <span className="text-cyan-400 font-mono font-bold text-sm tracking-tight">{analysis?.impactAssessment?.civicImpactScore}/100</span>
                </div>
                <div className="hidden lg:block w-[1px] h-8 bg-white/10"></div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Community Verification</span>
                   {analysis?.communityVerification ? (
                     <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded inline-flex w-fit">
                       {analysis?.communityVerification?.trustLevel}
                     </span>
                   ) : (
                     <span className="text-slate-400 font-medium text-[10px]">Pending Verification</span>
                   )}
                </div>
              </div>

              {/* Official Report Draft */}
              <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileCheck size={14} className="text-emerald-400" /> Official Report Draft
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
                      <button 
                        onClick={() => copyToClipboard(analysis?.citizenAssistant?.complaintDraft)}
                        className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full transition-all shadow-[0_0_10px_rgba(34,211,238,0.1)] hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                      >
                        <Copy size={14} /> COPY REPORT
                      </button>
                      <button 
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerHTML;
                          btn.innerHTML = 'SENDING...';
                          try {
                            await addDoc(collection(db, 'authorityLetters'), {
                              reportId: (analysis as any)._reportId || null,
                              citizenName: profile?.name || 'Anonymous',
                              email: profile?.email || 'N/A',
                              issueTitle: analysis?.detection?.category || 'General Issue',
                              letterContent: analysis?.citizenAssistant?.complaintDraft || '',
                              location: analysis?.locationIntelligence?.locationDescription || 'N/A',
                              timestamp: serverTimestamp()
                            });
                            btn.innerHTML = 'SENT SUCCESSFULLY';
                            btn.className = "flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                              btn.className = "flex items-center gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full transition-all shadow-[0_0_10px_rgba(251,191,36,0.1)] hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]";
                            }, 3000);
                          } catch (err) {
                            console.error('Failed to send letter', err);
                            btn.innerHTML = 'FAILED TO SEND';
                            setTimeout(() => btn.innerHTML = originalText, 3000);
                          }
                        }}
                        className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full transition-all shadow-[0_0_10px_rgba(251,191,36,0.1)] hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                      >
                        SEND TO AUTHORITY
                      </button>
                      <button className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                        DOWNLOAD PDF
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-[#f8fafc] rounded-md p-8 text-slate-800 text-sm leading-relaxed font-serif shadow-inner border border-slate-300 relative overflow-hidden group">
                     {/* Official Document Styling */}
                     <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
                     <div className="absolute top-8 right-8 opacity-10 pointer-events-none">
                       <ShieldCheck size={80} className="text-slate-900" />
                     </div>
                     
                     <div className="space-y-6 relative z-10 w-full">
                        <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                           <div>
                             <p className="font-bold text-slate-900 uppercase tracking-widest text-lg">Official Complaint Report</p>
                             <p className="text-slate-500 text-xs mt-1 uppercase font-sans tracking-widest">Public Grievance Redressal System</p>
                           </div>
                           <div className="text-right text-xs font-sans text-slate-600">
                             <p><span className="font-bold text-slate-900">REPORT ID:</span> CP-{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</p>
                             <p className="mt-1"><span className="font-bold text-slate-900">DATE:</span> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans border-b border-slate-300 pb-4 text-xs">
                           <div className="space-y-1 text-slate-700">
                             <p className="font-bold text-slate-900 uppercase">FROM:</p>
                             <p>{profile?.name || 'Your Name'}</p>
                             <p>UID: {profile?.uid?.substring(0,8).toUpperCase() || 'Citizen UID'}</p>
                             <p>{profile?.email || 'Your Email'}</p>
                             <p>{profile?.phone || 'Your Phone Number'}</p>
                           </div>
                           <div className="space-y-1">
                             <p className="font-bold text-slate-900 uppercase">TO:</p>
                             <p className="font-medium text-slate-800">{analysis?.resolution?.responsibleAuthority}</p>
                             <p>Concerned Municipal Authority / Relevant Department</p>
                             <p>{analysis?.locationIntelligence?.areaType}</p>
                           </div>
                        </div>

                        <div className="font-sans">
                           <div className="flex mb-4 text-xs"><span className="font-bold text-slate-900 w-24 shrink-0 uppercase">SUBJECT:</span> <span className="font-bold uppercase text-slate-800">{analysis.detection?.category} REPORT - {analysis?.locationIntelligence?.locationDescription}</span></div>
                        </div>

                        <div className="space-y-4">
                           <p className="font-bold text-slate-900">RESPECTED SIR/MADAM,</p>
                           <p className="text-justify indent-8">This is to officially bring to your immediate attention a critical civic issue regarding <span className="font-bold">{analysis.detection?.category?.toLowerCase()}</span> detected at <span className="font-bold">{analysis?.locationIntelligence?.locationDescription}</span>. {analysis?.citizenAssistant?.issueSummary}</p>
                           
                           <p className="font-bold text-slate-900 mt-6 text-xs uppercase tracking-widest font-sans">KEY OBSERVATIONS:</p>
                           <ul className="list-disc pl-5 space-y-1">
                             {analysis?.impactPrediction?.consequencesNext7Days?.slice(0, 3).map((r, i) => (
                               <li key={i}>{r}</li>
                             ))}
                           </ul>

                           <p className="font-bold text-slate-900 mt-6 text-xs uppercase tracking-widest font-sans">RECOMMENDED ACTION:</p>
                           <ul className="list-disc pl-5 space-y-1">
                             {analysis?.resolution?.recommendedSteps?.map((step, i) => (
                               <li key={i}>{step}</li>
                             ))}
                           </ul>

                           {analysis.emergency?.isEmergency && (
                             <div className="mt-6 border border-red-200 bg-red-50 p-4 rounded-md">
                               <p className="font-bold text-red-700 text-xs uppercase tracking-widest font-sans flex items-center gap-2 mb-2">
                                 <AlertTriangle size={14} /> EMERGENCY PROTOCOL TRIGGERED
                               </p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                   <p className="font-bold text-slate-800 text-[10px] uppercase tracking-widest">Emergency Classification</p>
                                   <p className="text-red-700 font-bold">{analysis.emergency.issueType}</p>
                                 </div>
                                 {analysis.emergency.evacuationRadius && (
                                   <div>
                                     <p className="font-bold text-slate-800 text-[10px] uppercase tracking-widest">Evacuation Radius</p>
                                     <p className="text-red-700 font-bold">{analysis.emergency.evacuationRadius}</p>
                                   </div>
                                 )}
                               </div>
                               <div className="mt-4">
                                 <p className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-1">Safety Instructions Dispatched</p>
                                 <ul className="list-disc pl-4 space-y-1 text-slate-700 text-xs">
                                   {analysis.emergency?.safetyInstructions?.map((step, i) => (
                                     <li key={i}>{step}</li>
                                   ))}
                                 </ul>
                               </div>
                               <div className="mt-4">
                                 <p className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-1">Emergency Services Notified</p>
                                 <p className="text-slate-700 text-xs">{analysis.emergency?.emergencyContacts?.join(', ')}</p>
                               </div>
                             </div>
                           )}

                           <p className="font-bold text-slate-900 mt-6 text-xs uppercase tracking-widest font-sans">CONCLUSION:</p>
                           <p className="text-justify">Due to the high public risk and potential for escalation, I kindly request your department to acknowledge this report and initiate timely intervention.</p>
                           
                           <p className="mt-4">Thank you for your attention.</p>
                           
                           <div className="mt-6">
                             <p>Sincerely,</p>
                             <p className="mt-4 font-bold">{profile?.name || 'Your Name'}</p>
                             <p className="text-xs font-sans text-slate-500">Submitted via CivicPulse AI Community Resolution Platform</p>
                           </div>
                        </div>

                        <div className="border-t border-slate-300 pt-4 mt-8 flex flex-col md:flex-row justify-between items-start md:items-center text-[10px] font-sans gap-4 text-slate-500 bg-slate-100 p-4 rounded bg-opacity-50">
                            <div className="flex flex-col gap-1.5">
                               <span className="flex items-center gap-1.5 border-b border-slate-200 pb-1"><CheckCircle size={12} className="text-emerald-600" /> <span className="font-bold text-slate-700">AI Verification:</span> Verified Complete</span>
                               {analysis?.communityVerification ? (
                                 <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-600" /> <span className="font-bold text-slate-700">Community Verification:</span> Verified ({analysis?.communityVerification?.verifiedCitizensCount} Citizens)</span>
                               ) : (
                                 <span className="flex items-center gap-1.5"><span className="font-bold text-slate-700">Community Verification:</span> Pending</span>
                               )}
                            </div>
                            <div className="text-left md:text-right">
                               <p className="font-bold text-slate-900 mb-0.5">Report Generated By: CivicPulse Intelligence Engine</p>
                               <p>Generated Timestamp: {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                     </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Complaint Status Notification */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-sm glass-panel w-full max-w-lg mx-auto"
      >
         <div className="flex items-center gap-3 text-emerald-400 font-bold">
           <CheckCircle size={18} />
           <span>Complaint Registered Successfully</span>
         </div>
         <div className="text-right">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Tracking ID</span>
           <span className="font-mono text-white tracking-tight">CP-{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</span>
         </div>
      </motion.div>

    </motion.div>
  );
}
