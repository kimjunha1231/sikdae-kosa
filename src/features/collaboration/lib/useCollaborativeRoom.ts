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

  useEffect(() => {
    if (!roomId) return;

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
      } else {
        setRestaurants([]);
        setParticipants([]);
        setSpinEvent({
          status: 'idle',
          startedAt: 0,
          winner: '',
          triggerUserId: '',
        });
      }
    });

    return () => {
      unsubscribe();
      remove(userRef);
    };
  }, [roomId]);

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
  };
}
