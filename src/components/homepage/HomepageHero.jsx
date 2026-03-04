import React from 'react';
import { Building2 } from 'lucide-react';

export default function HomepageHero({ club, homepage }) {
  const heroImage = homepage?.hero_image_url;
  const welcomeText = homepage?.welcome_text;

  return (
    <div className="relative w-full h-56 sm:h-72 overflow-hidden">
      {heroImage ? (
        <img src={heroImage} alt={club?.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-emerald-700 to-emerald-500" />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {club?.logo_url && (
          <img src={club.logo_url} alt={club.name} className="w-16 h-16 rounded-xl object-contain bg-white p-1 mb-3 shadow-lg" />
        )}
        <h1 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-md mb-2">{club?.name}</h1>
        {welcomeText && (
          <p className="text-white/90 text-sm sm:text-base max-w-xl drop-shadow">{welcomeText}</p>
        )}
      </div>
    </div>
  );
}