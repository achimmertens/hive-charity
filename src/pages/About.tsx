import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import heroImage from "@/assets/hive-charity-hero.jpg";

const About: React.FC = () => {
  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-hive">
          About Hive-Charity
        </h1>
        
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Section */}
              <div className="order-2 md:order-1">
                <img 
                  src={heroImage} 
                  alt="Jemand schenkt einem anderen einen Hive-Coin" 
                  className="w-full h-full object-cover min-h-[300px]"
                />
              </div>
              
              {/* Text Section */}
              <div className="order-1 md:order-2 p-6 md:p-8 flex flex-col justify-center">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-2xl text-hive">
                    Was ist Hive-Charity?
                  </CardTitle>
                </CardHeader>
                
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Hive-Charity ist ein Tool für Kuratoren, das bei der Suche nach 
                    karitativen Inhalten auf der Hive-Blockchain hilft.
                  </p>
                  
                  <p>
                    Es ermöglicht das Auffinden von Beiträgen von Menschen, die Gutes 
                    für andere tun. Das Ziel ist es, diese Beiträge zu markieren und 
                    Unterstützern zu helfen, ihre Aufmerksamkeit gezielt an die richtigen Menschen 
                    zu vergeben.
                  </p>
                  
                  <p>
                    Mit Hive-Charity können Sie:
                  </p>
                  
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Hive Beiträge mit KI nach charitativem Inhalt analysieren</li>
                    <li>Beiträge mit dem !CHARY-Tag markieren</li>
                    <li>Favoriten für spätere Überprüfung speichern</li>
                    <li>Direkt aus der App heraus upvoten und kommentieren</li>
                    <li>Eine Historie aller analysierten Beiträge erstellen und einsehen</li>
                  </ul>
                  
                  <p className="pt-2 font-medium text-foreground">
                    Schenken wir Aufmerksamkeit gegenüber Menschen die Gutes tun!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
