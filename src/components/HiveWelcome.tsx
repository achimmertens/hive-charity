
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HiveUser } from "@/services/hiveAuth";
import CharityPostsEnhanced from './CharityPostsEnhanced';

interface HiveWelcomeProps {
  user: HiveUser;
  onLogout: () => void;
}

const HiveWelcome: React.FC<HiveWelcomeProps> = ({ user, onLogout }) => {
  return (
    <div className="w-full">
      <Card className="w-full max-w-md mx-auto mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Willkommen bei Hive!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-xl mb-4">
            Hallo <span className="font-bold text-hive">@{user.username}</span>, Sie sind bei Hive eingeloggt.
          </p>
          <p className="text-sm text-gray-500">
            Sie können nun alle Funktionen der Anwendung nutzen.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={onLogout}
            variant="outline"
            className="border-hive text-hive hover:bg-hive hover:text-white"
          >
            Ausloggen
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8 max-w-4xl mx-auto">
        <CharityPostsEnhanced user={user} />
      </div>
    </div>
  );
};

export default HiveWelcome;
