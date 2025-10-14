
import React from 'react';
import { HiveUser } from "@/services/hiveAuth";
// ...CharityPostsEnhanced removed: NewPostsScanner now provides the unified list
import NewPostsScanner from './NewPostsScanner';

interface HiveWelcomeProps {
  user: HiveUser;
}

const HiveWelcome: React.FC<HiveWelcomeProps> = ({ user }) => {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold text-hive mb-4">
          Hive Charity Explorer
        </h1>
        <h2 className="text-xl text-gray-600">
          Finde charitative Beiträge und belohne sie durch Upvotes und Aufmerksamkeit
        </h2>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Neue Beiträge suchen Button und einheitliche Ergebnisliste (NewPostsScanner zeigt bis zu 30 Einträge, newest-first) */}
        <NewPostsScanner user={user} />
      </div>
    </div>
  );
};

export default HiveWelcome;
