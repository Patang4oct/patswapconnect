import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import SafetyFeatures from './components/SafetyFeatures';
import Connections from './components/Connections';
import Login from './components/Login';
import PersonaGuide from './components/PersonaGuide';
import Afterparty from './components/Afterparty';
import { Profile, PersonaType, User } from './types';
import { generatePersonaProfile, searchPublicProfile } from './services/geminiService';
import * as authService from './services/authService';

type AppView = 'live' | 'afterparty';

const personaDescriptions: Record<PersonaType, string> = {
    [PersonaType.SOCIALITE]: "The life of the party, always meeting new people.",
    [PersonaType.ARTIST]: "A creative soul, here for the music and inspiration.",
    [PersonaType.TECHIE]: "Networking and talking about the latest cool tech.",
    [PersonaType.ORGANIZER]: "The one making sure everything runs smoothly.",
    [PersonaType.CELEBRITY]: "A public figure spotted at the fest."
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [isAddingConnection, setIsAddingConnection] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>('live');

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsInitialLoading(false);
  }, []);

  const fetchUserProfile = useCallback(async (persona: PersonaType, user: User) => {
    setIsProfileLoading(true);
    const profile = await generatePersonaProfile(persona);
    const updatedUser = { ...user, profile, selectedPersona: persona };
    authService.updateCurrentUser(updatedUser);
    setCurrentUser(updatedUser);
    setIsProfileLoading(false);
  }, []);

  const addSimulatedConnection = useCallback(async () => {
    if (!currentUser) return;
    setIsAddingConnection(true);

    const tempId = `temp_${Date.now()}`;
    const placeholderProfile: Profile = {
        id: tempId,
        isLoading: true,
        name: 'Connecting...',
        bio: 'Receiving profile via NFC tap.',
        socials: { instagram: '', linkedin: '' },
        persona: PersonaType.SOCIALITE, // Placeholder
    };
    
    const userWithPlaceholder = { ...currentUser, connections: [placeholderProfile, ...currentUser.connections] };
    setCurrentUser(userWithPlaceholder);

    const personaTypes = Object.values(PersonaType).filter(p => p !== PersonaType.CELEBRITY);
    const randomPersona = personaTypes[Math.floor(Math.random() * personaTypes.length)];
    const newConnectionProfile = await generatePersonaProfile(randomPersona);
    
    const finalUser = { 
        ...currentUser, 
        connections: userWithPlaceholder.connections.map(c => 
            c.id === tempId ? { ...newConnectionProfile, id: tempId } : c
        ) 
    };
    authService.updateCurrentUser(finalUser);
    setCurrentUser(finalUser);
    setIsAddingConnection(false);
  }, [currentUser]);
  
  const searchAndAddConnection = useCallback(async (query: string): Promise<boolean> => {
    if (!currentUser) return false;
    const newConnectionProfile = await searchPublicProfile(query);
    if (newConnectionProfile) {
      const updatedUser = { ...currentUser, connections: [{...newConnectionProfile, id: `search_${Date.now()}`}, ...currentUser.connections] };
      authService.updateCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
      return true;
    } else {
        return false;
    }
  }, [currentUser]);
  
  const handlePersonaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentUser) return;
    const newPersona = event.target.value as PersonaType;
    setCurrentUser(prev => prev ? { ...prev, selectedPersona: newPersona } : null);
    fetchUserProfile(newPersona, currentUser);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (isInitialLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }
  
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const personaTypes = Object.values(PersonaType).filter(p => p !== PersonaType.CELEBRITY);

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Header 
        isLoggedIn={!!currentUser} 
        onLogout={handleLogout} 
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <main className="container mx-auto p-4 md:p-6">
        
        {currentView === 'live' && (
          <>
            {!currentUser.profile && !isProfileLoading && <PersonaGuide username={currentUser.username} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700">
                    <label htmlFor="persona-select" className="block text-sm font-medium text-gray-300 mb-1">
                        Your Fest Persona
                    </label>
                     <p className="text-xs text-gray-500 mb-2">{personaDescriptions[currentUser.selectedPersona]}</p>
                    <select
                        id="persona-select"
                        value={currentUser.selectedPersona}
                        onChange={handlePersonaChange}
                        disabled={isProfileLoading}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:opacity-50"
                    >
                        {personaTypes.map((persona) => (
                            <option key={persona} value={persona}>
                                {persona}
                            </option>
                        ))}
                    </select>
                </div>

                <ProfileCard profile={currentUser.profile} isLoading={isProfileLoading} />
                <SafetyFeatures />
              </div>

              <div className="lg:col-span-2">
                <Connections 
                    connections={currentUser.connections} 
                    onAddSimulatedConnection={addSimulatedConnection}
                    onSearchConnection={searchAndAddConnection}
                    isAdding={isAddingConnection}
                />
              </div>

            </div>
          </>
        )}

        {currentView === 'afterparty' && (
            <Afterparty user={currentUser} />
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
           @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
        `}</style>
        <footer className="text-center text-gray-600 mt-8 py-4 border-t border-gray-800">
          <p className="text-xs">&copy; {new Date().getFullYear()} PatSwap Technologies. A concept for safer university fests.</p>
           <p className="text-xs mt-1">This is a demonstration application. All profiles are AI-generated.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
