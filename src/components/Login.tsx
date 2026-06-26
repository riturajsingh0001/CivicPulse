import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Shield, Lock, Mail, Activity, ArrowRight, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';

export function Login() {
  const { user, profile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'citizen' | 'admin'>('citizen');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') {
        navigate('/authority-dashboard', { replace: true, state: { fromLogin: true } });
      } else {
        navigate('/citizen-dashboard', { replace: true, state: { fromLogin: true } });
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Navigation will be handled by useEffect
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user doc
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          name,
          phone,
          role,
          trustScore: role === 'admin' ? 1000 : 100,
        });
        // Navigation will be handled by useEffect
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center -mt-8 relative z-10 w-full max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full max-w-md shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
           <Shield size={180} className="text-cyan-400" />
        </div>
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
            <Activity className="h-8 w-8 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-display font-black text-white mb-2">{isLogin ? 'Access Gateway' : 'Citizen Registration'}</h2>
          <p className="text-sm text-slate-400 font-medium">Verify your identity to access the Civic Intelligence Network.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {!isLogin && (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                    placeholder="John Doe"
                    required
                  />
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                    placeholder="+1 234 567 8900"
                    required
                  />
                  <Activity size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Security Clearance (Email)</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                placeholder="citizen@city.gov"
                required
              />
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Passcode</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                placeholder="••••••••"
                required
              />
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {!isLogin && (
            <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Select Role</label>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                   type="button"
                   onClick={() => setRole('citizen')}
                   className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors ${role === 'citizen' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                 >
                    <User size={20} />
                    <span className="text-sm font-bold">Citizen</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => setRole('admin')}
                   className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors ${role === 'admin' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                 >
                    <Shield size={20} />
                    <span className="text-sm font-bold">Authority</span>
                 </button>
               </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 mt-4"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Initialize Session' : 'Register Profile'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-cyan-400 transition-colors font-medium"
          >
            {isLogin ? "Don't have an access identity? Register" : "Already have clearance? Initialize Session"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
