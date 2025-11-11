import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/charity-heroes-header.png";
import callToActionImage from "@/assets/call-to-action.png";
import whatsAboutImage from "@/assets/whats-about.png";
import { parseOpenAIResponse } from "@/lib/openaiResponse";
import { postReportToHive } from "@/services/hiveReport";
import { Loader2 } from "lucide-react";

interface CharityHero {
  id: string;
  charity_score: number;
  author_name: string;
  author_reputation: number | null;
  article_url: string;
  image_url: string | null;
  title: string | null;
  openai_response: string | null;
}

const Report: React.FC = () => {
  const [heroes, setHeroes] = useState<CharityHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCharityHeroes = async () => {
      try {
        const { data, error } = await supabase
          .from('charity_analysis_results')
          .select('*')
          .eq('chary_marked', true)
          .order('charity_score', { ascending: false });

        if (error) throw error;
        setHeroes(data || []);
      } catch (error) {
        console.error('Error fetching charity heroes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharityHeroes();
  }, []);

  const handleMakePublic = () => {
    // Get user from localStorage
    const userStr = localStorage.getItem('hiveUser');
    if (!userStr) {
      toast({
        title: "Nicht eingeloggt",
        description: "Bitte loggen Sie sich zuerst mit Hive Keychain ein.",
        variant: "destructive"
      });
      return;
    }

    const user = JSON.parse(userStr);
    if (!user.loggedIn) {
      toast({
        title: "Nicht eingeloggt",
        description: "Bitte loggen Sie sich zuerst mit Hive Keychain ein.",
        variant: "destructive"
      });
      return;
    }

    if (heroes.length === 0) {
      toast({
        title: "Keine Heroes",
        description: "Es gibt keine Charity Heroes zum Veröffentlichen.",
        variant: "destructive"
      });
      return;
    }

    setPublishing(true);
    
    postReportToHive(
      { ...user, authType: 'keychain' as const },
      heroes,
      (success, message, url) => {
        setPublishing(false);
        
        if (success && url) {
          toast({
            title: "Erfolgreich veröffentlicht!",
            description: (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Klicken Sie hier, um den Post zu sehen
              </a>
            ),
          });
        } else {
          toast({
            title: success ? "Erfolg" : "Fehler",
            description: message,
            variant: success ? "default" : "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <CardTitle className="text-4xl font-bold text-center">
              Charity Heroes Report
            </CardTitle>
            <Button 
              onClick={handleMakePublic}
              disabled={publishing || heroes.length === 0}
              size="lg"
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {publishing ? "Veröffentliche..." : "Make Public"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Intro Text */}
          <div className="text-center space-y-4">
            <p className="text-lg">Hello everyone,</p>
            <p className="text-lg">Here are the charity heroes:</p>
          </div>

          {/* Hero Image */}
          <div className="flex justify-center">
            <img 
              src={heroImage} 
              alt="Charity Heroes of the Week" 
              className="w-full max-w-3xl rounded-lg shadow-lg"
            />
          </div>

          {/* Charity Heroes Table */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Charity Heroes:</h2>
            
            {loading ? (
              <p className="text-center">Lade Charity Heroes...</p>
            ) : heroes.length === 0 ? (
              <p className="text-center">Keine Charity Heroes gefunden.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Nr.</TableHead>
                      <TableHead className="text-center">Chary Score</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead className="text-center">Reputation</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="text-center">Image</TableHead>
                      <TableHead>Analyse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {heroes.map((hero, index) => {
                      const parsed = parseOpenAIResponse(hero.openai_response);
                      return (
                        <TableRow key={hero.id}>
                          <TableCell className="text-center font-medium">{index + 1}</TableCell>
                          <TableCell className="text-center font-bold text-primary">
                            {hero.charity_score}
                          </TableCell>
                          <TableCell>
                            <a 
                              href={hero.article_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {hero.author_name}
                            </a>
                          </TableCell>
                          <TableCell className="text-center">
                            {hero.author_reputation?.toFixed(0) || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <a 
                              href={hero.article_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Link
                            </a>
                          </TableCell>
                          <TableCell className="text-center">
                            {hero.image_url && (
                              <img 
                                src={hero.image_url} 
                                alt={hero.title || 'Post image'} 
                                className="w-16 h-16 object-cover rounded mx-auto"
                              />
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm">{parsed.reason || parsed.summary || 'Keine Analyse verfügbar'}</p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Call to Action Section */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Call To Action</h2>
            <div className="flex justify-center">
              <img 
                src={callToActionImage} 
                alt="Call to Action" 
                className="w-full max-w-2xl rounded-lg"
              />
            </div>
          </div>

          {/* What's about this report */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">What's about this report?</h2>
            <div className="flex justify-center">
              <img 
                src={whatsAboutImage} 
                alt="What's about this report" 
                className="w-full max-w-2xl rounded-lg"
              />
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Links to follow:</h2>
            <ul className="space-y-2 text-center">
              <li>
                <a href="https://peakd.com/@achimmertens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Achim Mertens
                </a>
              </li>
              <li>
                <a href="https://peakd.com/@charitychecker" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  CharityChecker
                </a>
              </li>
              <li>
                <a href="https://peakd.com/hive-149312/@charitychecker/charitychecker-my-introducemyself-deutschenglish" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  About Charitychecker
                </a>
              </li>
              <li>
                <a href="https://peakd.com/c/hive-154303/trending" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Hive Marketing
                </a>
              </li>
              <li>
                <a href="https://peakd.com/@advertisingbot2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Advertisingbot2
                </a>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-center space-y-2 pt-6 border-t">
            <p className="text-lg font-semibold">Let's make the world a little bit better.</p>
            <p>Regards,</p>
            <p>CharityChecker (alias <a href="https://peakd.com/@achimmertens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@achimmertens</a>)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;
