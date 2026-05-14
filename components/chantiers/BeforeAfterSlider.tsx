'use client'

import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { ImageIcon } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export default function BeforeAfterSlider({ beforeUrl, afterUrl }: BeforeAfterSliderProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Comparaison Avant / Après</h3>
        </div>
        <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
          <span className="text-gray-400">Avant</span>
          <span className="text-blue-600">Après</span>
        </div>
      </div>
      <div className="relative h-[300px] md:h-[400px] w-full bg-gray-100">
        <ReactCompareSlider
          itemOne={<ReactCompareSliderImage src={beforeUrl} alt="Avant" className="object-cover h-full" />}
          itemTwo={<ReactCompareSliderImage src={afterUrl} alt="Après" className="object-cover h-full" />}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="p-3 bg-gray-50 text-center">
        <p className="text-[10px] text-gray-500 font-medium italic">Faites glisser le curseur pour comparer</p>
      </div>
    </div>
  );
}
