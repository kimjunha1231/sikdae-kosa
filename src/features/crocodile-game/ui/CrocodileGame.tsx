'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Participant } from '@/features/collaboration/lib/useCollaborativeRoom';

interface CrocodileGameProps {
  status: 'playing' | 'bitten';
  teeth: Record<string, 'unpressed' | 'pressed'>;
  turnUserId: string;
  loserNickname: string;
  currentUser: Participant | null;
  participants: Participant[];
  onPressTooth: (index: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function CrocodileGame({
  status,
  teeth,
  turnUserId,
  loserNickname,
  currentUser,
  participants,
  onPressTooth,
  onReset,
  onClose,
}: CrocodileGameProps) {
  const isMyTurn = currentUser && turnUserId === currentUser.id && status === 'playing';
  const currentTurnUser = participants.find(p => p.id === turnUserId);

  // Teeth layout configurations (positioned along a curve inside the lower jaw)
  const teethConfig = [
    { left: '20px', top: '15px', rotate: '50deg' },
    { left: '45px', top: '45px', rotate: '35deg' },
    { left: '75px', top: '70px', rotate: '20deg' },
    { left: '110px', top: '85px', rotate: '5deg' },
    { left: '146px', top: '85px', rotate: '-5deg' },
    { left: '182px', top: '70px', rotate: '-20deg' },
    { left: '212px', top: '45px', rotate: '-35deg' },
    { left: '236px', top: '15px', rotate: '-50deg' },
  ];

  return (
    <div className="w-full h-full min-h-[450px] bg-[#1c1d24] border border-[#2c2d35] rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between relative overflow-hidden select-none">
      
      {/* Upper Right Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-xs font-bold text-[#8b95a1] hover:text-[#f9fafb] px-3 py-1.5 rounded-xl bg-[#2c2d35]/40 hover:bg-[#2c2d35] transition-colors cursor-pointer"
      >
        게임 종료
      </button>

      {/* Header and Turn Status */}
      <div className="text-center mt-2">
        <h2 className="text-lg font-black tracking-tight text-[#f9fafb] flex items-center justify-center gap-1.5">
          🐊 악어 이빨 누르기 내기
        </h2>
        <p className="text-xs text-[#8b95a1] mt-1">이빨을 눌러 꽝에 걸리는 사람이 벌칙자입니다!</p>
      </div>

      {/* Interactive Crocodile Dentist Area */}
      <div className="relative w-[320px] h-[300px] flex items-center justify-center">
        
        {/* Upper Jaw (Snaps down when bitten) */}
        <motion.div
          animate={{
            y: status === 'bitten' ? 82 : 0,
            rotate: status === 'bitten' ? 0.5 : 0
          }}
          transition={{
            type: 'spring',
            stiffness: status === 'bitten' ? 500 : 250,
            damping: status === 'bitten' ? 18 : 25
          }}
          className="absolute top-8 left-[10px] w-[300px] h-[160px] bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-t-[100px] rounded-b-[30px] border-4 border-emerald-800 shadow-lg z-20 origin-top"
        >
          {/* Nostrils */}
          <div className="absolute bottom-5 left-[120px] w-[60px] flex justify-between">
            <div className="w-2.5 h-2.5 bg-emerald-950 rounded-full" />
            <div className="w-2.5 h-2.5 bg-emerald-950 rounded-full" />
          </div>

          {/* Crocodile Eyes */}
          <div className="absolute -top-6 left-[40px] w-[220px] flex justify-between">
            {/* Left Eye */}
            <div className="w-[60px] h-[50px] bg-emerald-600 border-4 border-emerald-800 border-b-0 rounded-t-full flex items-center justify-center">
              <div className={`w-[42px] h-[42px] rounded-full border-2 border-emerald-800 flex items-center justify-center transition-colors duration-200 ${status === 'bitten' ? 'bg-rose-500' : 'bg-yellow-400'}`}>
                <div className={`bg-black rounded-full transition-all duration-200 ${status === 'bitten' ? 'w-8 h-8' : 'w-2.5 h-7'}`} />
              </div>
            </div>
            {/* Right Eye */}
            <div className="w-[60px] h-[50px] bg-emerald-600 border-4 border-emerald-800 border-b-0 rounded-t-full flex items-center justify-center">
              <div className={`w-[42px] h-[42px] rounded-full border-2 border-emerald-800 flex items-center justify-center transition-colors duration-200 ${status === 'bitten' ? 'bg-rose-500' : 'bg-yellow-400'}`}>
                <div className={`bg-black rounded-full transition-all duration-200 ${status === 'bitten' ? 'w-8 h-8' : 'w-2.5 h-7'}`} />
              </div>
            </div>
          </div>

          {/* Upper Teeth hanging down */}
          <div className="absolute bottom-[-13px] left-[20px] right-[20px] flex justify-between pointer-events-none">
            {[...Array(9)].map((_, idx) => (
              <div key={idx} className="w-4 h-6 bg-slate-100 border border-slate-300 rounded-b-md shadow" />
            ))}
          </div>
        </motion.div>

        {/* Lower Jaw and Mouth Cavity */}
        <div className="absolute bottom-4 left-[10px] w-[300px] h-[180px] bg-gradient-to-t from-emerald-700 to-emerald-600 rounded-t-[40px] rounded-b-[90px] border-4 border-emerald-800 shadow-inner z-10">
          {/* Inner Crimson Red Mouth */}
          <div className="absolute top-[12px] left-[12px] w-[268px] h-[146px] bg-gradient-to-b from-rose-600 to-rose-950 rounded-t-[30px] rounded-b-[75px] overflow-hidden">
            
            {/* 8 Clickable Lower Teeth */}
            {teethConfig.map((style, idx) => {
              const toothKey = idx.toString();
              const isPressed = teeth[toothKey] === 'pressed';
              return (
                <button
                  key={idx}
                  disabled={!isMyTurn || isPressed}
                  style={{
                    left: style.left,
                    top: style.top,
                    transform: style.rotate,
                  }}
                  onClick={() => onPressTooth(idx)}
                  className={`absolute w-6 h-8 bg-slate-50 border-2 border-slate-200 border-t-0 rounded-b-lg shadow-md cursor-pointer transition-all duration-150 origin-top
                    ${isPressed ? 'opacity-10 translate-y-3 cursor-not-allowed border-rose-950 bg-rose-900 shadow-none' : 'hover:bg-white hover:translate-y-0.5 hover:scale-105 active:scale-95'}
                    ${isMyTurn && !isPressed ? 'border-[#3182f6] ring-2 ring-[#3182f6]/40' : ''}
                  `}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Game State Feedback / Bottom Banner */}
      <div className="w-full mt-2">
        {status === 'bitten' ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-rose-500/10 border border-rose-500/30 text-[#ff477e] p-3 rounded-2xl text-center font-bold text-sm"
          >
            💥 앙! {loserNickname}님이 물렸습니다! 벌칙자로 당첨되셨습니다.
          </motion.div>
        ) : (
          <div className="flex items-center justify-between bg-[#15161d] border border-[#2c2d35] p-3 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              {isMyTurn ? (
                <>
                  <span className="w-2.5 h-2.5 bg-[#3182f6] rounded-full animate-ping" />
                  <span className="font-extrabold text-[#3182f6]">나의 턴 - 벌칙 이빨을 피해 아무 이빨이나 누르세요!</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 bg-[#8b95a1] rounded-full" />
                  <span className="text-[#8b95a1]">
                    차례 대기 중: <b>{currentTurnUser?.nickname || '참여자'}</b>님의 턴
                  </span>
                </>
              )}
            </div>
            {status === 'playing' && (
              <button
                onClick={onReset}
                className="text-[10px] font-bold text-[#8b95a1] hover:text-[#f9fafb] px-2 py-1 rounded bg-[#2c2d35]/60 transition-colors cursor-pointer"
              >
                게임 초기화
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
