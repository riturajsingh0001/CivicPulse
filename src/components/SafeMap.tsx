import React, { useEffect, useState } from 'react';
import { GoogleMap, GoogleMapProps, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader2 } from 'lucide-react';

interface SafeMapProps extends GoogleMapProps {
  className?: string;
  fallbackClassName?: string;
}

const libraries: any = ["places"];

export function SafeMap({ className, fallbackClassName, ...props }: SafeMapProps) {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === "dummy" || apiKey === "") {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 ${fallbackClassName || ''}`}>
        <MapPin size={32} className="mb-4 opacity-50 text-amber-400" />
        <p className="text-amber-400 font-bold">Google Maps API Key Missing</p>
        <p className="text-xs text-slate-400 mt-2 text-center max-w-[80%]">Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables to enable map features.</p>
      </div>
    );
  }

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: libraries
  });

  useEffect(() => {
    console.log("API Loaded:", isLoaded);
    console.log("Load Error:", loadError);
    console.log("API Key:", (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY);
  }, [isLoaded, loadError]);

  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const handleMapError = () => {
      setMapError("Google Maps Authentication Failed (Check API Key/Billing)");
    };
    window.addEventListener('gmaps-error', handleMapError);
    return () => window.removeEventListener('gmaps-error', handleMapError);
  }, []);

  if (loadError || mapError) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 ${fallbackClassName || ''}`}>
        <MapPin size={32} className="mb-4 opacity-50 text-red-400" />
        <p className="text-red-400 font-bold">Unable to load Google Maps.</p>
        {mapError && <p className="text-xs text-red-400 mt-2">{mapError}</p>}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 ${fallbackClassName || ''}`}>
        <Loader2 size={32} className="mb-4 opacity-50 text-cyan-400 animate-spin" />
        <p className="text-cyan-400 font-bold">Loading Map...</p>
      </div>
    );
  }

  const mapOptions = { ...props.options };
  if (mapOptions && mapOptions.mapId) {
    delete mapOptions.mapId;
  }

  return (
    <div className={`w-full h-full absolute inset-0 ${className || ''}`}>
      <GoogleMap 
        mapContainerClassName="w-full h-full"
        mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, ...props.mapContainerStyle }}
        {...props}
        options={mapOptions}
        onLoad={(map) => {
          console.log("Map Loaded Successfully");
          if (props.onLoad) props.onLoad(map);
        }}
        onUnmount={(map) => {
          if (props.onUnmount) props.onUnmount(map);
        }}
      >
        {props.children}
      </GoogleMap>
    </div>
  );
}
