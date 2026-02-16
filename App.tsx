import React, { useState, useEffect } from 'react';
import { Gate } from './components/Gate';
import { Sanctuary } from './components/Sanctuary';
import { IntroSequence } from './components/IntroSequence';
import { FarewellFlow } from './components/FarewellFlow';
import { UserMode } from './types';
import { fetchLogs } from './utils/logger';

const ALIYA_KEY = "Bunnylovesme";
const ADMIN_KEY = "Aliyalovesme";
const SESSION_KEY = "sanctuary_session_v1";

type AppStage = 'GATE' | 'INTRO' | 'SANCTUARY' | 'FAREWELL';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>('GATE');
  const [userMode, setUserMode] = useState<UserMode>('Aliya');
  const [checkingSession, setCheckingSession] = useState(true);
  const [heartCount, setHeartCount] = useState(0);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.mode) {
          setUserMode(parsed.mode);
          setStage('SANCTUARY');
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setCheckingSession(false);
  }, []);

  const getHeartCount = async () => {
    const data = await fetchLogs();
    const today = new Date().toLocaleDateString();
    const count = data.filter((log: any) => {
      const isHeart = log['Type'] === 'Heart Sent';
      const logDate = new Date(log['Timestamp']).toLocaleDateString();
      return isHeart && logDate === today;
    }).length;
    setHeartCount(count);
  };

  const handleUnlock = async (password: string) => {
    let mode: UserMode | null = null;

    if (password.toLowerCase() === ALIYA_KEY.toLowerCase()) {
      mode = 'Aliya';
    } else if (password.toLowerCase() === ADMIN_KEY.toLowerCase()) {
      mode = 'Admin';
    }

    if (mode) {
      setUserMode(mode);
      if (mode === 'Aliya') {
        await getHeartCount();
        setStage('INTRO');
      } else {
        setStage('SANCTUARY');
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ mode }));
    }
  };

  if (checkingSession) return null;

  return (
    <>
      {stage === 'GATE' && <Gate onUnlock={handleUnlock} />}
      {stage === 'INTRO' && (
        <IntroSequence 
          heartCount={heartCount} 
          onComplete={() => setStage('SANCTUARY')} 
        />
      )}
      {stage === 'SANCTUARY' && (
        <Sanctuary 
          userMode={userMode} 
          onStartFarewell={() => setStage('FAREWELL')}
        />
      )}
      {stage === 'FAREWELL' && (
        <FarewellFlow onCancel={() => setStage('SANCTUARY')} />
      )}
    </>
  );
};

export default App;