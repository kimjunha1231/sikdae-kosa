'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, ChevronDown, Skull, Gamepad2 } from 'lucide-react';
import { getMemberColorClass } from '@/shared/lib/utils';

interface Participant {
  id: string;
  nickname: string;
  isHost: boolean;
}



interface CrocodileGameProps {
  status: 'playing' | 'bitten';
  teeth: Record<string, 'unpressed' | 'pressed'>;
  turnUserId: string;
  loserNickname: string;
  currentUser: Participant | null;
  participants: Participant[];
  turnOrder?: string[];
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
  turnOrder,
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

  const sortedParticipants = React.useMemo(() => {
    if (turnOrder && turnOrder.length > 0) {
      const pMap = new Map(participants.map((p) => [p.id, p]));
      return turnOrder.map((id) => pMap.get(id)).filter((p): p is Participant => !!p);
    }
    return [...participants].sort((a, b) => a.id.localeCompare(b.id));
  }, [participants, turnOrder]);

  return (
    <div className="w-full h-full min-h-[500px] bg-[#1c1d24] border border-[#2c2d35] rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden select-none">
      
      {/* My Turn Banner (Floating Alert) */}
      {isMyTurn && status === 'playing' && (
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute top-16 left-6 right-6 z-30 bg-gradient-to-r from-[#3182f6] to-[#1e5ebc] text-white font-black text-center py-2.5 px-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 animate-pulse"
        >
          <Gamepad2 size={15} className="animate-bounce" />
          <span>👉 내 차례입니다! 이빨을 하나 골라 터치하세요! 🚨</span>
        </motion.div>
      )}

      {/* Upper Right Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-xs font-bold text-[#8b95a1] hover:text-[#f9fafb] px-3 py-1.5 rounded-xl bg-[#2c2d35]/40 hover:bg-[#2c2d35] transition-colors cursor-pointer z-30"
      >
        게임 종료
      </button>

      {/* Header and Turn Status */}
      <div className="text-left md:text-center mt-2 mb-2 shrink-0">
        <h2 className="text-lg font-black tracking-tight text-[#f9fafb] flex items-center gap-1.5 md:justify-center">
          🐊 악어 이빨 누르기 내기
        </h2>
        <p className="text-xs text-[#8b95a1] mt-1">이빨을 눌러 꽝에 걸리는 사람이 벌칙자입니다!</p>
      </div>

      {/* 2-Column Content Layout */}
      <div className="flex-grow flex flex-col lg:flex-row items-center lg:items-center justify-center gap-8 mt-4 min-h-0">
        
        {/* Left Column: Interactive Crocodile Dentist Area */}
        <div className={`relative w-[400px] h-[400px] md:w-[450px] md:h-[450px] flex items-center justify-center shrink-0 rounded-2xl bg-[#15161d]/40 p-4 border border-[#2c2d35]/50 transition-all duration-300 ${
          isMyTurn ? 'ring-4 ring-[#3182f6]/70 shadow-[0_0_25px_rgba(49,130,246,0.3)] bg-[#15161d]/10' : ''
        }`}>
          <div className="relative w-[320px] h-[320px] flex items-center justify-center scale-115 md:scale-130 transition-transform duration-200">
            
            {/* Upper Jaw (Snaps down when bitten) */}
            <motion.div
              animate={{
                y: status === 'bitten' ? 85 : 0,
                rotate: status === 'bitten' ? 0.5 : 0
              }}
              transition={{
                type: 'spring',
                stiffness: status === 'bitten' ? 500 : 250,
                damping: status === 'bitten' ? 18 : 25
              }}
              className="absolute top-0 left-[10px] w-[300px] h-[160px] bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-t-[100px] rounded-b-[30px] border-4 border-emerald-800 shadow-lg z-20 origin-top"
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
            <div className="absolute bottom-0 left-[10px] w-[300px] h-[180px] bg-gradient-to-t from-emerald-700 to-emerald-600 rounded-t-[40px] rounded-b-[90px] border-4 border-emerald-800 shadow-inner z-10">
              {/* Inner Crimson Red Mouth */}
              <div className="absolute top-[15px] left-[15px] w-[270px] h-[140px] bg-gradient-to-b from-rose-600 to-rose-950 rounded-t-[30px] rounded-b-[75px] overflow-hidden">
                
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
                        ${isMyTurn && !isPressed ? 'border-[#3182f6] ring-2 ring-[#3182f6]/50 shadow-[0_0_8px_rgba(49,130,246,0.6)] scale-105' : ''}
                      `}
                    >
                      <span className="absolute top-0 left-0 right-0 h-1 bg-[#ffe4e6] rounded-t-sm" />
                      {isMyTurn && !isPressed && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3182f6] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3182f6]"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Game Status, Participant List & Order (Timeline) */}
        <div className="w-full lg:w-80 bg-[#15161d] border border-[#2c2d35] rounded-2xl p-5 flex flex-col justify-between h-[400px] md:h-[450px] max-h-[450px] shadow-inner shrink-0">
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-xs font-black text-[#f9fafb] tracking-wider uppercase border-b border-[#2c2d35]/60 pb-2 mb-3 flex items-center justify-between shrink-0">
              <span>게임 진행 순서 ({sortedParticipants.length})</span>
              <span className="text-[9px] text-[#8b95a1] font-normal">순서대로 진행</span>
            </h3>

            {/* Timeline List */}
            <div className="flex-grow overflow-y-auto py-2 px-1 flex flex-col gap-1.5 no-scrollbar">
              {sortedParticipants.map((p, idx) => {
                const isCurrentTurn = p.id === turnUserId && status === 'playing';
                const isMe = currentUser && p.id === currentUser.id;
                const isLoser = status === 'bitten' && p.nickname === loserNickname;
                const userColors = getMemberColorClass(p.id);

                return (
                  <React.Fragment key={p.id}>
                    {/* Participant Card */}
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                        isCurrentTurn
                          ? 'bg-[#3182f6]/10 border-[#3182f6] text-[#3182f6] font-extrabold shadow-sm shadow-[#3182f6]/10 scale-[1.02]'
                          : isLoser
                          ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-extrabold'
                          : `${userColors.bg} ${userColors.border} ${userColors.text}`
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Status Icon */}
                        {isCurrentTurn ? (
                          <span className="w-2 h-2 rounded-full bg-[#3182f6] animate-ping shrink-0" />
                        ) : isLoser ? (
                          <Skull size={12} className="text-rose-500 animate-bounce shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                        )}
                        <span className="truncate text-xs">{p.nickname}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {p.isHost && (
                          <span title="방장">
                            <Crown size={11} className="text-amber-500 fill-amber-500" />
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[9px] bg-[#3182f6]/20 border border-[#3182f6]/40 text-[#3182f6] px-1.5 py-0.5 rounded font-black">
                            나
                          </span>
                        )}
                        {isCurrentTurn && (
                          <span className="text-[9px] bg-[#3182f6] text-white px-1.5 py-0.5 rounded font-black animate-pulse">
                            TURN
                          </span>
                        )}
                        {isLoser && (
                          <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-black">
                            벌칙자
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order Arrow Connector */}
                    {idx < sortedParticipants.length - 1 && (
                      <div className="flex justify-center text-[#2c2d35] py-0.5 shrink-0">
                        <ChevronDown size={12} className={isCurrentTurn ? 'text-[#3182f6]/50' : 'text-[#2c2d35]'} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Simple bottom turn state helper inside right panel */}
          <div className="border-t border-[#2c2d35]/60 pt-2 mt-2 shrink-0">
            <div className="text-[10px] text-[#8b95a1] flex items-center justify-between">
              <span>상태: {status === 'playing' ? '진행 중' : '게임 종료'}</span>
              {status === 'playing' && (
                <button
                  onClick={onReset}
                  className="font-bold hover:text-[#f9fafb] px-1.5 py-0.5 rounded bg-[#2c2d35]/60 transition-colors cursor-pointer"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game State Feedback / Bottom Banner */}
      <div className="w-full mt-4 shrink-0">
        {status === 'bitten' ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-rose-500/10 border border-rose-500/30 text-[#ff477e] p-3 rounded-2xl text-center font-bold text-sm flex items-center justify-center gap-2"
          >
            <Skull size={16} className="animate-spin" style={{ animationDuration: '4s' }} />
            <span>💥 앙! {loserNickname}님이 물렸습니다! 벌칙자로 당첨되셨습니다. 💥</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
