import React, { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
  { name: 'Smileys', icon: '\u{1F600}', emojis: ['\u{1F600}','\u{1F603}','\u{1F604}','\u{1F601}','\u{1F606}','\u{1F605}','\u{1F923}','\u{1F602}','\u{1F642}','\u{1F643}','\u{1F609}','\u{1F60A}','\u{1F607}','\u{1F970}','\u{1F60D}','\u{1F929}','\u{1F618}','\u{1F617}','\u{1F61A}','\u{1F619}','\u{1F60B}','\u{1F61B}','\u{1F61C}','\u{1F92A}','\u{1F61D}','\u{1F911}','\u{1F917}','\u{1F92D}','\u{1F92B}','\u{1F914}','\u{1F910}','\u{1F928}','\u{1F610}','\u{1F611}','\u{1F636}','\u{1F60F}','\u{1F612}','\u{1F644}','\u{1F62C}','\u{1F925}','\u{1F60C}','\u{1F614}','\u{1F62A}','\u{1F924}','\u{1F634}','\u{1F637}','\u{1F912}','\u{1F915}','\u{1F922}','\u{1F92E}','\u{1F927}','\u{1F975}','\u{1F976}','\u{1F974}','\u{1F635}','\u{1F92F}','\u{1F920}','\u{1F973}','\u{1F978}','\u{1F60E}','\u{1F913}','\u{1F9D0}','\u{1F615}','\u{1F61F}','\u{1F641}','\u{1F62E}','\u{1F62F}','\u{1F632}','\u{1F633}','\u{1F97A}','\u{1F626}','\u{1F627}','\u{1F628}','\u{1F630}','\u{1F625}','\u{1F622}','\u{1F62D}','\u{1F631}','\u{1F616}','\u{1F623}','\u{1F61E}','\u{1F613}','\u{1F629}','\u{1F62B}','\u{1F971}','\u{1F624}','\u{1F621}','\u{1F620}','\u{1F92C}','\u{1F608}','\u{1F47F}','\u{1F480}','\u{1F4A9}','\u{1F921}','\u{1F479}','\u{1F47A}','\u{1F47B}','\u{1F47D}','\u{1F47E}','\u{1F916}'] },
  { name: 'Gestes', icon: '\u{1F44B}', emojis: ['\u{1F44B}','\u{1F91A}','\u{270B}','\u{1F596}','\u{1F44C}','\u{1F90C}','\u{1F90F}','\u{270C}','\u{1F91E}','\u{1F91F}','\u{1F918}','\u{1F919}','\u{1F448}','\u{1F449}','\u{1F446}','\u{1F595}','\u{1F447}','\u{261D}','\u{1F44D}','\u{1F44E}','\u{270A}','\u{1F44A}','\u{1F91B}','\u{1F91C}','\u{1F44F}','\u{1F64C}','\u{1F450}','\u{1F932}','\u{1F91D}','\u{1F64F}','\u{270D}','\u{1F485}','\u{1F933}','\u{1F4AA}','\u{1F9BE}','\u{1F9BF}','\u{1F9B5}','\u{1F9B6}','\u{1F442}','\u{1F9BB}','\u{1F443}','\u{1F9E0}','\u{1F9B7}','\u{1F9B4}','\u{1F440}','\u{1F441}','\u{1F445}','\u{1F444}','\u{1F48B}'] },
  { name: 'Coeurs', icon: '\u{2764}', emojis: ['\u{2764}','\u{1F9E1}','\u{1F49B}','\u{1F49A}','\u{1F499}','\u{1F49C}','\u{1F5A4}','\u{1F90D}','\u{1F90E}','\u{1F494}','\u{2763}','\u{1F495}','\u{1F49E}','\u{1F493}','\u{1F497}','\u{1F496}','\u{1F498}','\u{1F49D}','\u{1F49F}','\u{1F48C}','\u{1F4A4}','\u{1F4A2}','\u{1F4A3}','\u{1F4A5}','\u{1F4A6}','\u{1F4A8}','\u{1F4AB}','\u{1F4AC}','\u{1F4AD}','\u{1F525}','\u{2728}','\u{2B50}','\u{1F31F}','\u{1F4AF}','\u{1F389}','\u{1F38A}'] },
  { name: 'Animaux', icon: '\u{1F436}', emojis: ['\u{1F436}','\u{1F431}','\u{1F42D}','\u{1F439}','\u{1F430}','\u{1F98A}','\u{1F43B}','\u{1F43C}','\u{1F428}','\u{1F42F}','\u{1F981}','\u{1F42E}','\u{1F437}','\u{1F43D}','\u{1F438}','\u{1F435}','\u{1F648}','\u{1F649}','\u{1F64A}','\u{1F412}','\u{1F414}','\u{1F427}','\u{1F426}','\u{1F424}','\u{1F423}','\u{1F425}','\u{1F986}','\u{1F985}','\u{1F989}','\u{1F987}','\u{1F43A}','\u{1F417}','\u{1F434}','\u{1F984}','\u{1F41D}','\u{1F41B}','\u{1F98B}','\u{1F40C}','\u{1F41E}','\u{1F41C}','\u{1F577}','\u{1F578}','\u{1F982}','\u{1F422}','\u{1F40D}','\u{1F98E}','\u{1F419}','\u{1F991}','\u{1F990}','\u{1F99E}','\u{1F980}','\u{1F421}','\u{1F420}','\u{1F41F}','\u{1F42C}','\u{1F433}','\u{1F40B}','\u{1F988}','\u{1F40A}'] },
  { name: 'Food', icon: '\u{1F34E}', emojis: ['\u{1F34E}','\u{1F350}','\u{1F34A}','\u{1F34B}','\u{1F34C}','\u{1F349}','\u{1F347}','\u{1F353}','\u{1F348}','\u{1F352}','\u{1F351}','\u{1F96D}','\u{1F34D}','\u{1F965}','\u{1F95D}','\u{1F345}','\u{1F346}','\u{1F951}','\u{1F966}','\u{1F96C}','\u{1F952}','\u{1F336}','\u{1F33D}','\u{1F955}','\u{1F954}','\u{1F950}','\u{1F35E}','\u{1F956}','\u{1F968}','\u{1F9C0}','\u{1F95A}','\u{1F373}','\u{1F95E}','\u{1F953}','\u{1F969}','\u{1F357}','\u{1F356}','\u{1F32D}','\u{1F354}','\u{1F35F}','\u{1F355}','\u{1F32E}','\u{1F32F}','\u{1F957}','\u{1F35D}','\u{1F35C}','\u{1F372}','\u{1F35B}','\u{1F363}','\u{1F371}','\u{1F364}','\u{1F359}','\u{1F35A}','\u{1F370}','\u{1F382}','\u{1F36E}','\u{1F36D}','\u{1F36C}','\u{1F36B}','\u{1F37F}','\u{1F369}','\u{1F36A}','\u{2615}','\u{1F375}','\u{1F37A}','\u{1F37B}','\u{1F377}','\u{1F378}','\u{1F379}'] },
  { name: 'Sport', icon: '\u{26BD}', emojis: ['\u{26BD}','\u{1F3C0}','\u{1F3C8}','\u{26BE}','\u{1F94E}','\u{1F3BE}','\u{1F3D0}','\u{1F3C9}','\u{1F94F}','\u{1F3B1}','\u{1F3D3}','\u{1F3F8}','\u{1F3D2}','\u{1F3D1}','\u{1F94D}','\u{1F3CF}','\u{1F945}','\u{26F3}','\u{1F3F9}','\u{1F3A3}','\u{1F94A}','\u{1F94B}','\u{1F3BD}','\u{1F6F9}','\u{26F8}','\u{1F94C}','\u{1F3BF}','\u{26F7}','\u{1F3C2}','\u{1F3CB}','\u{1F938}','\u{26F9}','\u{1F93A}','\u{1F3C4}','\u{1F3CA}','\u{1F6A3}','\u{1F9D7}','\u{1F6B4}','\u{1F6B5}','\u{1F3C6}','\u{1F3C5}','\u{1F947}','\u{1F948}','\u{1F949}','\u{1F3AA}','\u{1F3AD}','\u{1F3A8}','\u{1F3AC}','\u{1F3A4}','\u{1F3A7}','\u{1F3B9}','\u{1F3B7}','\u{1F3BA}','\u{1F3B8}','\u{1F3BB}','\u{1F3B2}','\u{1F3AF}','\u{1F3B3}','\u{1F3AE}'] },
  { name: 'Voyage', icon: '\u{1F697}', emojis: ['\u{1F697}','\u{1F695}','\u{1F699}','\u{1F68C}','\u{1F3CE}','\u{1F693}','\u{1F691}','\u{1F692}','\u{1F690}','\u{1F69A}','\u{1F69B}','\u{1F6B2}','\u{1F3CD}','\u{1F6A8}','\u{1F694}','\u{1F683}','\u{1F684}','\u{1F685}','\u{1F688}','\u{1F682}','\u{1F686}','\u{1F687}','\u{2708}','\u{1F6EB}','\u{1F6EC}','\u{1F680}','\u{1F6F8}','\u{1F681}','\u{26F5}','\u{1F6A4}','\u{1F6A2}','\u{2693}','\u{26FD}','\u{1F5FA}','\u{1F5FF}','\u{1F5FD}','\u{1F5FC}','\u{1F3F0}','\u{1F3EF}','\u{1F3A1}','\u{1F3A2}','\u{26F2}','\u{1F3D6}','\u{1F3DD}','\u{1F3DC}','\u{1F30B}','\u{26F0}','\u{1F3D4}','\u{1F5FB}','\u{26FA}','\u{1F3E0}','\u{1F3E2}','\u{1F3E5}','\u{1F3EB}','\u{26EA}','\u{1F305}','\u{1F304}','\u{1F307}','\u{1F306}','\u{1F303}','\u{1F309}'] },
  { name: 'Objets', icon: '\u{1F4F1}', emojis: ['\u{1F4F1}','\u{1F4BB}','\u{1F5A5}','\u{1F579}','\u{1F4F7}','\u{1F4F9}','\u{1F3A5}','\u{1F4DE}','\u{1F4FA}','\u{1F4FB}','\u{23F0}','\u{231A}','\u{1F4A1}','\u{1F526}','\u{1F4B8}','\u{1F4B5}','\u{1F4B0}','\u{1F4B3}','\u{1F48E}','\u{1F527}','\u{1F528}','\u{1F529}','\u{2699}','\u{1F52B}','\u{1F4A3}','\u{1F52A}','\u{1F6E1}','\u{1F52E}','\u{1F48A}','\u{1F489}','\u{1F6BD}','\u{1F6BF}','\u{1F511}','\u{1F5DD}','\u{1F6AA}','\u{1F6CB}','\u{1F6CF}','\u{1F381}','\u{1F388}','\u{1F380}','\u{2709}','\u{1F4E6}','\u{1F4DA}','\u{1F4D6}','\u{1F517}','\u{1F4CE}','\u{2702}','\u{1F4DD}','\u{270F}','\u{1F50D}','\u{1F512}','\u{1F513}'] },
  { name: 'Symboles', icon: '\u{2764}', emojis: ['\u{2764}','\u{1F9E1}','\u{1F49B}','\u{1F49A}','\u{1F499}','\u{1F49C}','\u{1F5A4}','\u{26AB}','\u{26AA}','\u{1F534}','\u{1F7E0}','\u{1F7E1}','\u{1F7E2}','\u{1F535}','\u{1F7E3}','\u{2B1B}','\u{2B1C}','\u{2705}','\u{274C}','\u{274E}','\u{2795}','\u{2796}','\u{2797}','\u{2714}','\u{2611}','\u{1F503}','\u{1F504}','\u{25B6}','\u{23E9}','\u{25C0}','\u{23EA}','\u{1F53C}','\u{1F53D}','\u{23F8}','\u{23F9}','\u{23FA}','\u{1F505}','\u{1F506}','\u{1F4F6}','\u{2640}','\u{2642}','\u{2733}','\u{2734}','\u{2747}','\u{203C}','\u{2049}','\u{2753}','\u{2754}','\u{2755}','\u{2757}','\u{1F4F4}'] },
  { name: 'Drapeaux', icon: '\u{1F6A9}', emojis: ['\u{1F6A9}','\u{1F3F4}'] },
];

interface Props {
  onEmojiSelect: (emoji: string) => void;
  onClose?: () => void;
}

const RECENT_KEY = 'liberchat_recent_emojis';
const MAX_RECENT = 14;

const SimpleEmojiPicker: React.FC<Props> = ({ onEmojiSelect, onClose }) => {
  const [catIndex, setCatIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch { return []; }
  });
  const gridRef = useRef<HTMLDivElement>(null);

  const handleSelect = (emoji: string) => {
    const newRecent = [emoji, ...recent.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecent(newRecent);
    localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    onEmojiSelect(emoji);
  };

  return (
    <div 
      className="bg-black border-2 border-red-700 rounded-lg shadow-xl w-[300px] overflow-hidden font-mono"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-red-700 bg-black">
        <span className="text-red-500 font-bold text-sm tracking-wide">EMOJIS</span>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-red-500 hover:bg-red-700/20 rounded w-6 h-6 flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Récents */}
      {recent.length > 0 && (
        <div className="px-2 pt-2 pb-1 border-b border-red-700/50">
          <div className="text-[10px] text-red-500/70 uppercase tracking-wider mb-1 px-1">Récents</div>
          <div className="flex flex-wrap gap-0.5">
            {recent.map((e, i) => (
              <button 
                key={i} 
                onClick={() => handleSelect(e)}
                className="text-xl hover:bg-red-700/30 rounded w-8 h-8 flex items-center justify-center transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Catégories */}
      <div className="flex px-1 py-1.5 bg-black border-b border-red-700/50 overflow-x-auto scrollbar-none gap-0.5">
        {CATEGORIES.map((cat, i) => (
          <button 
            key={i} 
            onClick={() => {
              setCatIndex(i);
              gridRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title={cat.name}
            className={`text-base min-w-[32px] h-8 rounded transition-all flex items-center justify-center ${
              catIndex === i 
                ? 'bg-red-700 border border-white' 
                : 'hover:bg-red-700/30 opacity-70 hover:opacity-100'
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Nom catégorie */}
      <div className="px-3 py-1 text-xs text-red-500 bg-black border-b border-red-700/30">
        {CATEGORIES[catIndex].name}
      </div>

      {/* Grille */}
      <div 
        ref={gridRef}
        className="grid grid-cols-7 gap-0.5 p-2 max-h-[180px] overflow-y-auto bg-black"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#b91c1c transparent' }}
      >
        {CATEGORIES[catIndex].emojis.map((e, i) => (
          <button 
            key={i} 
            onClick={() => handleSelect(e)}
            className="text-xl hover:bg-red-700/40 rounded w-9 h-9 flex items-center justify-center transition-colors active:scale-90"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimpleEmojiPicker;
