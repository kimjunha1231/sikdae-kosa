'use client';

import React from 'react';
import { Button } from './ui/button';
import { UtensilsCrossed, Sun, Moon } from 'lucide-react';

interface SidebarHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function SidebarHeader({ isDarkMode, onToggleDarkMode }: SidebarHeaderProps) {
  return (
    <header className="p-5 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-white">
          <UtensilsCrossed size={18} />
        </div>
        <div>
          <h1 className="text-md font-black tracking-tight flex items-center gap-1">
            식권대장 대시보드
          </h1>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Dark Mode Switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          className="rounded-xl w-9 h-9 border border-border shrink-0 cursor-pointer"
          title={isDarkMode ? '라이트 모드로 변경' : '다크 모드로 변경'}
        >
          {isDarkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  );
}
