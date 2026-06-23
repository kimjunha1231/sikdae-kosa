import { useState, useEffect } from 'react';
import { ref, onValue, set, remove, update, onDisconnect } from 'firebase/database';
import { db } from '@/shared/lib/firebase';

export interface Participant {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
}

export interface SpinEvent {
  status: 'idle' | 'spinning' | 'completed';
  startedAt: number;
  winner: string;
  triggerUserId: string;
}

export interface CrocodileGameState {
  status: 'idle' | 'playing' | 'bitten';
  teeth: Record<string, 'unpressed' | 'pressed'>;
  dangerIndex: number;
  turnUserId: string;
  loserNickname: string;
  turnOrder?: string[];
}

const NICKNAMES = [
  '배고픈 토끼', '행복한 쿼카', '맛있는 피자', '신선한 샐러드', 
  '달콤한 와플', '바삭한 치킨', '매콤한 떡볶이', '따뜻한 우동'
];

export function useCollaborativeRoom(roomId: string) {
  const [restaurants, setRestaurants] = useState<string[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [spinEvent, setSpinEvent] = useState<SpinEvent>({
    status: 'idle',
    startedAt: 0,
    winner: '',
    triggerUserId: '',
  });
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [crocodileGame, setCrocodileGame] = useState<CrocodileGameState>({
    status: 'idle',
    teeth: {},
    dangerIndex: -1,
    turnUserId: '',
    loserNickname: '',
  });

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    let userId = localStorage.getItem('kosa_user_id');
    let nickname = localStorage.getItem('kosa_user_nickname');
    if (!userId) {
      userId = 'usr_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('kosa_user_id', userId);
    }
    if (!nickname) {
      nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
      localStorage.setItem('kosa_user_nickname', nickname);
    }

    const userRef = ref(db, `rooms/${roomId}/users/${userId}`);
    const roomRef = ref(db, `rooms/${roomId}`);
    const hostCheckRef = ref(db, `rooms/${roomId}/users`);
    
    let isHost = false;
    onValue(hostCheckRef, (snapshot) => {
      if (!isMounted) return;

      const usersData = snapshot.val();
      if (!usersData || Object.keys(usersData).length === 0) {
        isHost = true;
      } else if (usersData[userId!] && usersData[userId!].isHost) {
        isHost = true;
      }
      
      const me: Participant = {
        id: userId!,
        nickname: nickname!,
        isHost,
        joinedAt: Date.now(),
      };
      
      setCurrentUser(me);
      set(userRef, me);
      onDisconnect(userRef).remove();
    }, { onlyOnce: true });

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!isMounted) return;

      const data = snapshot.val();
      if (data) {
        if (data.restaurants) {
          setRestaurants(Object.keys(data.restaurants));
        } else {
          setRestaurants([]);
        }
        
        if (data.users) {
          setParticipants(Object.values(data.users));
        } else {
          setParticipants([]);
        }
        
        if (data.spinEvent) {
          setSpinEvent(data.spinEvent);
        } else {
          setSpinEvent({
            status: 'idle',
            startedAt: 0,
            winner: '',
            triggerUserId: '',
          });
        }

        if (data.crocodileGame) {
          setCrocodileGame(data.crocodileGame);
        } else {
          setCrocodileGame({
            status: 'idle',
            teeth: {},
            dangerIndex: -1,
            turnUserId: '',
            loserNickname: '',
          });
        }
      } else {
        setRestaurants([]);
        setParticipants([]);
        setSpinEvent({
          status: 'idle',
          startedAt: 0,
          winner: '',
          triggerUserId: '',
        });
        setCrocodileGame({
          status: 'idle',
          teeth: {},
          dangerIndex: -1,
          turnUserId: '',
          loserNickname: '',
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      remove(userRef);
    };
  }, [roomId]);

  useEffect(() => {
    if (!currentUser?.isHost || !crocodileGame || crocodileGame.status !== 'playing') return;
    
    const turnUserExists = participants.some(p => p.id === crocodileGame.turnUserId);
    if (!turnUserExists && participants.length > 0) {
      const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
      const newTurnUserId = sorted[0].id;
      
      update(ref(db, `rooms/${roomId}/crocodileGame`), {
        turnUserId: newTurnUserId
      });
    }
  }, [participants, crocodileGame, currentUser, roomId]);

  const toggleRouletteSelection = async (name: string) => {
    const isAdding = !restaurants.includes(name);
    await update(ref(db, `rooms/${roomId}/restaurants`), {
      [name]: isAdding ? true : null
    });
  };

  const triggerSpin = (winnerName: string) => {
    if (!currentUser) return;
    const spinRef = ref(db, `rooms/${roomId}/spinEvent`);
    set(spinRef, {
      status: 'spinning',
      startedAt: Date.now(),
      winner: winnerName,
      triggerUserId: currentUser.id,
    });
  };

  const completeSpin = () => {
    const spinRef = ref(db, `rooms/${roomId}/spinEvent`);
    update(spinRef, { status: 'completed' });
  };

  const resetSpin = () => {
    const spinRef = ref(db, `rooms/${roomId}/spinEvent`);
    set(spinRef, {
      status: 'idle',
      startedAt: 0,
      winner: '',
      triggerUserId: '',
    });
  };

  const updateNickname = (newNickname: string) => {
    if (!currentUser) return;
    localStorage.setItem('kosa_user_nickname', newNickname);
    const updatedUser = { ...currentUser, nickname: newNickname };
    setCurrentUser(updatedUser);
    set(ref(db, `rooms/${roomId}/users/${currentUser.id}`), updatedUser);
  };

  const startCrocodileGame = (activeParticipants: Participant[]) => {
    if (activeParticipants.length === 0) return;
    
    // 피셔-예이츠 셔플 알고리즘으로 참여자 순서 랜덤화
    const shuffled = [...activeParticipants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const turnOrder = shuffled.map(p => p.id);
    
    const randomDanger = Math.floor(Math.random() * 8);
    const initialTeeth: Record<string, 'unpressed' | 'pressed'> = {};
    for (let i = 0; i < 8; i++) {
      initialTeeth[i.toString()] = 'unpressed';
    }

    set(ref(db, `rooms/${roomId}/crocodileGame`), {
      status: 'playing',
      teeth: initialTeeth,
      dangerIndex: randomDanger,
      turnUserId: turnOrder[0],
      turnOrder: turnOrder,
      loserNickname: '',
    });
  };

  const pressCrocodileTooth = async (toothIndex: number, activeParticipants: Participant[]) => {
    if (!crocodileGame || crocodileGame.status !== 'playing' || !currentUser) return;
    
    const isDanger = toothIndex === crocodileGame.dangerIndex;
    const gameRef = ref(db, `rooms/${roomId}/crocodileGame`);

    if (isDanger) {
      await update(gameRef, {
        status: 'bitten',
        loserNickname: currentUser.nickname,
        [`teeth/${toothIndex}`]: 'pressed'
      });
    } else {
      // 저장된 turnOrder 기반으로 다음 턴 계산, 없을 시 fallback으로 ID 정렬
      const order = crocodileGame.turnOrder || activeParticipants.map(p => p.id).sort((a, b) => a.localeCompare(b));
      const myIdx = order.indexOf(currentUser.id);
      if (myIdx !== -1 && order.length > 0) {
        const nextIdx = (myIdx + 1) % order.length;
        await update(gameRef, {
          turnUserId: order[nextIdx],
          [`teeth/${toothIndex}`]: 'pressed'
        });
      }
    }
  };

  const resetCrocodileGame = () => {
    remove(ref(db, `rooms/${roomId}/crocodileGame`));
  };

  return {
    roulettePool: restaurants,
    participants,
    spinEvent,
    currentUser,
    toggleRouletteSelection,
    triggerSpin,
    completeSpin,
    resetSpin,
    updateNickname,
    crocodileGame,
    startCrocodileGame,
    pressCrocodileTooth,
    resetCrocodileGame,
  };
}
