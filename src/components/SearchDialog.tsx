import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SearchCriteria {
  keywords: string[];
  customKeywords: string[];
  searchInTags: boolean;
  searchInBody: boolean;
  articleCount: number;
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

export const SearchDialog: React.FC<SearchDialogProps> = ({ open, onOpenChange, onSearch }) => {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(["Help", "Charity"]);
  const [customKeyword1, setCustomKeyword1] = useState("");
  const [customKeyword2, setCustomKeyword2] = useState("");
  const [customKeyword3, setCustomKeyword3] = useState("");
  const [searchInTags, setSearchInTags] = useState(true);
  const [searchInBody, setSearchInBody] = useState(true);
  const [articleCount, setArticleCount] = useState(10);

  const handleKeywordToggle = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleSearch = () => {
    const customKeywords = [customKeyword1, customKeyword2, customKeyword3]
      .filter(k => k.trim().length > 0);
    
    onSearch({
      keywords: selectedKeywords,
      customKeywords,
      searchInTags,
      searchInBody,
      articleCount
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suchkriterien festlegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Predefined Keywords */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Schlagwörter</Label>
            <div className="grid grid-cols-2 gap-3">
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
            <Label className="text-base font-semibold mb-3 block">Eigene Suchbegriffe</Label>
            <div className="space-y-2">
              <Input
                placeholder="Suchbegriff 1"
                value={customKeyword1}
                onChange={(e) => setCustomKeyword1(e.target.value)}
              />
              <Input
                placeholder="Suchbegriff 2"
                value={customKeyword2}
                onChange={(e) => setCustomKeyword2(e.target.value)}
              />
              <Input
                placeholder="Suchbegriff 3"
                value={customKeyword3}
                onChange={(e) => setCustomKeyword3(e.target.value)}
              />
            </div>
          </div>

          {/* Search Location */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Suchen in</Label>
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

          {/* Article Count */}
          <div>
            <Label htmlFor="articleCount" className="text-base font-semibold mb-3 block">
              Anzahl der Artikel: {articleCount}
            </Label>
            <Input
              id="articleCount"
              type="number"
              min={1}
              max={30}
              value={articleCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= 30) {
                  setArticleCount(val);
                }
              }}
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
