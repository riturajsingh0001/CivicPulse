import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Send, Image as ImageIcon, MapPin, ShieldCheck, Camera, Edit2, Loader2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Marker } from '@react-google-maps/api';
import { SafeMap } from './SafeMap';

interface LocationData {
  lat: number;
  lng: number;
}

interface ReportFormProps {
  onSubmit: (text: string, imagesBase64: string[], mimeTypes: string[], location: LocationData | null, address: string | null) => void;
  isAnalyzing: boolean;
}

interface ImageData {
  preview: string;
  base64: string;
  mimeType: string;
}

export function ReportForm({ onSubmit, isAnalyzing }: ReportFormProps) {
  const [description, setDescription] = useState('');
  const [slot1Image, setSlot1Image] = useState<ImageData | null>(null);
  const [slot2Image, setSlot2Image] = useState<ImageData | null>(null);
  const [activeSlot, setActiveSlot] = useState<1 | 2 | null>(null);
  
  const [isFocused, setIsFocused] = useState(false);
  const [isDragActive1, setIsDragActive1] = useState(false);
  const [isDragActive2, setIsDragActive2] = useState(false);
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const cameraInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const cameraInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch (e) {
             setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          const defaultLat = 37.7749;
          const defaultLng = -122.4194;
          setLocation({ lat: defaultLat, lng: defaultLng });
          setAddress('San Francisco, CA (Fallback Location)');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      const defaultLat = 37.7749;
      const defaultLng = -122.4194;
      setLocation({ lat: defaultLat, lng: defaultLng });
      setAddress('San Francisco, CA (Fallback Location)');
      setLocationLoading(false);
    }
  };

  const processFile = (file: File, slot: 1 | 2) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64Match = result.match(/data:(.*?);base64,(.*)/);
      if (base64Match) {
        const imgData = {
          preview: result,
          mimeType: base64Match[1],
          base64: base64Match[2]
        };
        if (slot === 1) setSlot1Image(imgData);
        else setSlot2Image(imgData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, slot);
  };

  const clearImage = (slot: 1 | 2) => {
    if (slot === 1) {
      setSlot1Image(null);
      if (fileInputRef1.current) fileInputRef1.current.value = '';
      if (cameraInputRef1.current) cameraInputRef1.current.value = '';
    } else {
      setSlot2Image(null);
      if (fileInputRef2.current) fileInputRef2.current.value = '';
      if (cameraInputRef2.current) cameraInputRef2.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !slot1Image && !slot2Image) return;
    
    const images = [];
    const mimes = [];
    if (slot1Image) {
      images.push(slot1Image.base64);
      mimes.push(slot1Image.mimeType);
    }
    if (slot2Image) {
      images.push(slot2Image.base64);
      mimes.push(slot2Image.mimeType);
    }
    
    onSubmit(description, images, mimes, location, address);
  };

  const handleDragOver = (e: React.DragEvent, slot: 1 | 2) => {
    e.preventDefault();
    if (slot === 1) setIsDragActive1(true);
    else setIsDragActive2(true);
  };

  const handleDragLeave = (slot: 1 | 2) => {
    if (slot === 1) setIsDragActive1(false);
    else setIsDragActive2(false);
  };

  const handleDrop = (e: React.DragEvent, slot: 1 | 2) => {
    e.preventDefault();
    if (slot === 1) setIsDragActive1(false);
    else setIsDragActive2(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, slot);
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      onSubmit={handleSubmit} 
      className={`glass-panel rounded-[2rem] overflow-hidden transition-all duration-500 relative ${isFocused ? 'shadow-[0_0_50px_rgba(34,211,238,0.15)] border-cyan-500/50' : 'border-white/10 hover:border-white/20'}`}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
      
      <div className="p-6 md:p-10">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex flex-col gap-1.5">
            Submit Civic Intelligence
            <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] uppercase font-bold tracking-widest text-cyan-400">
               <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
               AI Ready
            </div>
          </h2>
          
          <div className="flex flex-col items-start sm:items-end gap-2 text-xs font-medium shrink-0">
             <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
               {locationLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
               GPS Verified
             </div>
             {locationLoading ? (
               <div className="text-slate-500">Acquiring satellite lock...</div>
             ) : address ? (
               <div className="flex flex-col items-start sm:items-end w-full">
                  {isEditingAddress ? (
                    <div className="flex items-center gap-2 mt-2">
                       <input 
                         type="text" 
                         value={address} 
                         onChange={(e) => setAddress(e.target.value)}
                         className="bg-slate-900 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs min-w-[200px]"
                       />
                       <button type="button" onClick={() => setIsEditingAddress(false)} className="text-cyan-400 hover:text-white"><ShieldCheck size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2 mt-1 w-full max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 max-w-[250px] truncate" title={address}>{address}</span>
                        <button type="button" onClick={() => setIsEditingAddress(true)} className="text-slate-500 hover:text-cyan-400 transition-colors"><Edit2 size={12} /></button>
                      </div>
                      {location && (
                        <div className="w-full h-32 rounded-lg overflow-hidden border border-white/10 mt-2 relative">
                          <SafeMap 
                            options={{
                              disableDefaultUI: true,
                              gestureHandling: "none"
                            }}
                            center={{lat: Number(location.lat), lng: Number(location.lng)}} 
                            zoom={15} 
                          >
                             <Marker position={{lat: Number(location.lat), lng: Number(location.lng)}} />
                          </SafeMap>
                          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-lg"></div>
                        </div>
                      )}
                    </div>
                  )}
               </div>
             ) : (
               <button type="button" onClick={fetchLocation} className="text-cyan-400 flex items-center gap-1 hover:underline"><Navigation size={12}/> Request Location Permission</button>
             )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="relative group">
            <textarea
              className={`w-full rounded-2xl bg-slate-950/50 p-6 text-slate-100 placeholder-slate-500 transition-all resize-none min-h-[160px] border outline-none ${isFocused ? 'border-cyan-500/50 ring-4 ring-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.05)]' : 'border-white/10 group-hover:border-white/20'}`}
              placeholder="Describe the issue, priority, and any relevant context for the AI agents to analyze..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isAnalyzing}
            />
            <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-500 bg-slate-900/80 px-2 py-1 rounded-md">
              {description.length} / 500
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slot 1: Primary Evidence */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Slot 1: Problem Evidence Image *</div>
              {!slot1Image ? (
                <div 
                  className={`w-full border border-dashed rounded-[1.5rem] p-6 text-center transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group min-h-[200px] ${isDragActive1 ? 'border-cyan-400 bg-cyan-900/20' : 'border-white/10 hover:border-cyan-500/40 hover:bg-white/5'}`}
                  onDragOver={(e) => handleDragOver(e, 1)}
                  onDragLeave={() => handleDragLeave(1)}
                  onDrop={(e) => handleDrop(e, 1)}
                >
                  <div className="flex gap-3 mb-4 relative z-10">
                     <button type="button" onClick={() => fileInputRef1.current?.click()} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all shadow-lg">
                        <ImageIcon className="h-4 w-4 text-slate-400 hover:text-cyan-300" />
                     </button>
                     <button type="button" onClick={() => cameraInputRef1.current?.click()} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all shadow-lg">
                        <Camera className="h-4 w-4 text-slate-400 hover:text-cyan-300" />
                     </button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Upload Evidence</p>
                </div>
              ) : (
                <div className="relative rounded-[1.5rem] overflow-hidden border border-white/10 group shadow-xl h-[200px]">
                  <img src={slot1Image.preview} alt="Preview 1" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => clearImage(1)}
                      disabled={isAnalyzing}
                      className="bg-red-500/20 text-red-100 rounded-full p-3 hover:bg-red-500 hover:text-white transition-all border border-red-500/50"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
              <input type="file" ref={fileInputRef1} onChange={(e) => handleImageChange(e, 1)} accept="image/*" className="hidden" />
              <input type="file" ref={cameraInputRef1} onChange={(e) => handleImageChange(e, 1)} accept="image/*" capture="environment" className="hidden" />
            </div>

            {/* Slot 2: Supporting Evidence */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Slot 2: Additional Supporting Image (Optional)</div>
              {!slot2Image ? (
                <div 
                  className={`w-full border border-dashed rounded-[1.5rem] p-6 text-center transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group min-h-[200px] ${isDragActive2 ? 'border-cyan-400 bg-cyan-900/20' : 'border-white/10 hover:border-cyan-500/40 hover:bg-white/5'}`}
                  onDragOver={(e) => handleDragOver(e, 2)}
                  onDragLeave={() => handleDragLeave(2)}
                  onDrop={(e) => handleDrop(e, 2)}
                >
                  <div className="flex gap-3 mb-4 relative z-10">
                     <button type="button" onClick={() => fileInputRef2.current?.click()} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all shadow-lg">
                        <ImageIcon className="h-4 w-4 text-slate-400 hover:text-cyan-300" />
                     </button>
                     <button type="button" onClick={() => cameraInputRef2.current?.click()} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all shadow-lg">
                        <Camera className="h-4 w-4 text-slate-400 hover:text-cyan-300" />
                     </button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Add Context (Optional)</p>
                </div>
              ) : (
                <div className="relative rounded-[1.5rem] overflow-hidden border border-white/10 group shadow-xl h-[200px]">
                  <img src={slot2Image.preview} alt="Preview 2" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => clearImage(2)}
                      disabled={isAnalyzing}
                      className="bg-red-500/20 text-red-100 rounded-full p-3 hover:bg-red-500 hover:text-white transition-all border border-red-500/50"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
              <input type="file" ref={fileInputRef2} onChange={(e) => handleImageChange(e, 2)} accept="image/*" className="hidden" />
              <input type="file" ref={cameraInputRef2} onChange={(e) => handleImageChange(e, 2)} accept="image/*" capture="environment" className="hidden" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-950/80 p-6 md:p-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck size={14} className="text-slate-400" />
          End-to-end encrypted analysis
        </div>
        <motion.button
          whileHover={(!isAnalyzing && (description.trim() || slot1Image || slot2Image)) ? { scale: 1.02 } : {}}
          whileTap={(!isAnalyzing && (description.trim() || slot1Image || slot2Image)) ? { scale: 0.98 } : {}}
          type="submit"
          disabled={isAnalyzing || (!description.trim() && !slot1Image && !slot2Image)}
          className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all relative overflow-hidden ${(!description.trim() && !slot1Image && !slot2Image) || isAnalyzing ? 'bg-slate-900 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] border border-cyan-400/50 hover:border-cyan-300'}`}
        >
          {(!isAnalyzing && (description.trim() || slot1Image || slot2Image)) && (
             <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent"></div>
          )}
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-100 rounded-full animate-spin" />
              Initializing AI Core...
            </>
          ) : (
            <>
              Deploy AI Agents <Send size={18} className="ml-1" />
            </>
          )}
        </motion.button>
      </div>
    </motion.form>
  );
}
