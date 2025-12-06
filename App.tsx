import React, { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import MainApp from './components/MainApp';

const App: React.FC = () => {
    // --- Licensing State ---
    const [isActivated, setIsActivated] = useState<boolean>(() => {
        // Optimistic check on mount
        return !!localStorage.getItem('beatboy_serial');
    });

    const [activationError, setActivationError] = useState<string | null>(null);

    const handleLock = (errorMsg?: string) => {
        setIsActivated(false);
        if (errorMsg) setActivationError(errorMsg);
    };

    const handleSuccess = () => {
        setIsActivated(true);
        setActivationError(null);
    };

    if (!isActivated) {
        return <LandingScreen onSuccess={handleSuccess} initialError={activationError} />;
    }

    return <MainApp onLock={handleLock} />;
}

export default App;