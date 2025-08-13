
import React from 'react';
import { HiveUser } from "@/services/hiveAuth";
import CharityPostsEnhanced from './CharityPostsEnhanced';
import NewPostsScanner from './NewPostsScanner';

interface HiveWelcomeProps {
  user: HiveUser;
  onLogout?: () => void; // Added onLogout as an optional prop
}

const HiveWelcome: React.FC<HiveWelcomeProps> = ({ user, onLogout }) => {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto text-center mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-hive">
            Hive Charity Explorer
          </h1>
          <button 
            onClick={onLogout}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Ausloggen
          </button>
        </div>
        <h2 className="text-xl text-gray-600">
          Finde charitative Beiträge und belohne sie durch Upvotes und Aufmerksamkeit
        </h2>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Neue Beiträge suchen Button und Ergebnisliste */}
        <NewPostsScanner />
        <CharityPostsEnhanced user={user} />
      </div>
    </div>
  );
};

export default HiveWelcome;
