import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export interface SearchCriteria {
  keywords: string[];
  customKeywords: string[];
  searchInTags: boolean;
  searchInBody: boolean;
  articleCount: number;
  communities: string[];
  communityUrl?: string;
  maxAgeDays?: number;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (criteria: SearchCriteria) => void;
}

const PREDEFINED_KEYWORDS = [
  "Help",
  "Charity",
  "Donate",
  "Support",
  "Fundraising",
  "Relief",
  "Assistance",
  "Emergency"
];

const COMMUNITIES = [
  { id: "hive-149312", name: "Charity" },
  { id: "hive-176874", name: "Hive Ghana" },
  { id: "hive-150210", name: "Clean Planet" },
  { id: "trending", name: "Trending" }
];

export const SearchDialog: React.FC<SearchDialogProps> = ({ open, onOpenChange, onSearch }) => {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(["Help", "Charity"]);
  const [customKeyword1, setCustomKeyword1] = useState("");
  const [searchInTags, setSearchInTags] = useState(true);
  const [searchInBody, setSearchInBody] = useState(true);
  const [articleCount, setArticleCount] = useState(10);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [communityUrl, setCommunityUrl] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState(100);

  const handleKeywordToggle = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleCommunityToggle = (communityId: string) => {
    setSelectedCommunities(prev =>
      prev.includes(communityId)
        ? prev.filter(c => c !== communityId)
        : [...prev, communityId]
    );
  };

  const handleSearch = () => {
    const customKeywords = [customKeyword1]
      .filter(k => k.trim().length > 0);
    
    onSearch({
      keywords: selectedKeywords,
      customKeywords,
      searchInTags,
      searchInBody,
      articleCount,
      communities: selectedCommunities,
      communityUrl: communityUrl.trim() || undefined
      , maxAgeDays: maxAgeDays
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suchkriterien festlegen</DialogTitle>
          <DialogDescription>
            Wählen Sie Schlagwörter, Communities und Filter, um neue Charity-Beiträge zu finden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Predefined Keywords */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Schlagwörter</Label>
            <div className="grid grid-cols-3 gap-3">
              {PREDEFINED_KEYWORDS.map(keyword => (
                <div key={keyword} className="flex items-center space-x-2">
                  <Checkbox
                    id={keyword}
                    checked={selectedKeywords.includes(keyword)}
                    onCheckedChange={() => handleKeywordToggle(keyword)}
                  />
                  <Label htmlFor={keyword} className="cursor-pointer">
                    {keyword}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Keywords */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Eigene Suchbegriffe</Label>
            <div className="space-y-2">
              <Input
                placeholder="Suchbegriff 1"
                value={customKeyword1}
                onChange={(e) => setCustomKeyword1(e.target.value)}
              />
            </div>
          </div>

          {/* Search Location */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Suchen in</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="searchTags"
                  checked={searchInTags}
                  onCheckedChange={(checked) => setSearchInTags(checked as boolean)}
                />
                <Label htmlFor="searchTags" className="cursor-pointer">
                  Tags
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="searchBody"
                  checked={searchInBody}
                  onCheckedChange={(checked) => setSearchInBody(checked as boolean)}
                />
                <Label htmlFor="searchBody" className="cursor-pointer">
                  Freitext/Body
                </Label>
              </div>
            </div>
          </div>

          {/* Communities */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Communities durchsuchen</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Wenn keine Community ausgewählt ist, wird standardmäßig https://peakd.com/created durchsucht.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {COMMUNITIES.map(community => (
                <div key={community.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={community.id}
                    checked={selectedCommunities.includes(community.id)}
                    onCheckedChange={() => handleCommunityToggle(community.id)}
                  />
                  <Label htmlFor={community.id} className="cursor-pointer text-sm">
                    {community.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Community URL */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Community-URL durchsuchen</Label>
            <Input
              placeholder="https://peakd.com/c/hive-174578/created"
              value={communityUrl}
              onChange={(e) => setCommunityUrl(e.target.value)}
            />
          </div>

          {/* Article Count */}
          <div>
            <Label htmlFor="articleCount" className="text-base font-semibold mb-2 block">
              Anzahl der Artikel: {articleCount}
            </Label>
            <Slider
              id="articleCount"
              min={1}
              max={100}
              step={1}
              value={[articleCount]}
              onValueChange={(value) => setArticleCount(value[0])}
              className="mt-2"
            />
          </div>

          {/* Max age filter */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Max. Alter der Artikel in Tagen: {maxAgeDays === 100 ? 'kein Filter' : `${maxAgeDays} Tage`}</Label>
            <p className="text-sm text-muted-foreground mb-2">Stelle auf 100, um keinen Zeitfilter zu verwenden.</p>
            <Slider
              min={1}
              max={100}
              step={1}
              value={[maxAgeDays]}
              onValueChange={(v) => setMaxAgeDays(v[0])}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSearch} className="bg-hive hover:bg-hive/90">
            Artikel suchen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
