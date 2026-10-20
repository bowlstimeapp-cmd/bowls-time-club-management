import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, ChevronDown, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Opponent field with an optional club-list search (scraped Play Bowls clubs).
 *
 * Toggle OFF — plain text input, exactly like the original field.
 * Toggle ON  — searchable combobox; picking a club calls
 *              onChange(`vs ${club_name}`, club) so the caller can snapshot
 *              the club's address for the venue display.
 */
export default function OpponentClubInput({
  value,
  onChange,
  clubId,
  label = 'Opponent',
  placeholder = 'e.g., vs Springfield BC',
}) {
  const [searchMode, setSearchMode] = useState(false);
  const [pickedClub, setPickedClub] = useState(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [listEmpty, setListEmpty] = useState(false);
  const seqRef = useRef(0);
  const timerRef = useRef(null);
  const searchBoxRef = useRef(null);

  const runSearch = async (q) => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('searchOpponentClubs', { clubId, query: q });
      if (seq !== seqRef.current) return; // stale response — ignore
      const data = res?.data || {};
      if (data.empty) {
        setListEmpty(true);
        setResults([]);
      } else {
        setListEmpty(false);
        setResults(data.results || []);
      }
      setSearched(true);
    } catch (err) {
      if (seq !== seqRef.current) return;
      toast.error('Could not search clubs — switching to manual input');
      setSearchMode(false);
      setPickedClub(null);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const handleTyped = (v) => {
    setTyped(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = v.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    timerRef.current = setTimeout(() => runSearch(q), 250);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Reset the search panel each time it opens and focus the box
  useEffect(() => {
    if (open) {
      setTyped('');
      setResults([]);
      setSearched(false);
      setListEmpty(false);
      setLoading(false);
      seqRef.current++; // cancel any in-flight search
      const t = setTimeout(() => searchBoxRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const pick = (club) => {
    setPickedClub(club);
    onChange(`vs ${club.club_name}`, club);
    setOpen(false);
  };

  const clear = () => {
    setPickedClub(null);
    onChange('', null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Switch
            id="opponent-club-search"
            checked={searchMode}
            onCheckedChange={setSearchMode}
            aria-label="Search for club"
          />
          <Label htmlFor="opponent-club-search" className="text-xs font-normal text-gray-500 cursor-pointer">
            Search for club
          </Label>
        </div>
      </div>

      {!searchMode ? (
        <Input
          className="mt-1.5"
          value={value}
          onChange={(e) => {
            setPickedClub(null);
            onChange(e.target.value, null);
          }}
          placeholder={placeholder}
          aria-label={label}
        />
      ) : (
        <div className="mt-1.5 flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-label="Search for opponent club"
                className="flex-1 justify-between h-9 font-normal text-sm min-w-0"
              >
                <span className={cn('truncate', !pickedClub && 'text-gray-400')}>
                  {pickedClub ? pickedClub.club_name : 'Search for opponent club'}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[min(22rem,calc(100vw-2rem))]" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    ref={searchBoxRef}
                    placeholder="Search clubs by name, town or postcode..."
                    value={typed}
                    onChange={(e) => handleTyped(e.target.value)}
                    className="pl-7 h-8 text-xs"
                    aria-label="Search opponent clubs"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {loading && (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching…
                  </div>
                )}
                {!loading && listEmpty && (
                  <p className="px-3 py-3 text-xs text-gray-500">
                    The club list isn't available yet. Turn off 'Search for club' to type it manually.
                  </p>
                )}
                {!loading && !listEmpty && typed.trim().length < 2 && (
                  <p className="px-3 py-3 text-xs text-gray-400">Type at least 2 characters to search</p>
                )}
                {!loading && !listEmpty && searched && typed.trim().length >= 2 && results.length === 0 && (
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">
                      No clubs found. Turn off 'Search for club' to type the name manually.
                    </p>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded"
                      onClick={() => {
                        onChange(`vs ${typed.trim()}`, null);
                        setPickedClub(null);
                        setOpen(false);
                      }}
                    >
                      Use '{typed.trim()}' as the opponent
                    </button>
                  </div>
                )}
                {!loading && results.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                    onClick={() => pick(club)}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{club.club_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[club.town, club.county].filter(Boolean).join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {pickedClub && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Clear selected club"
              onClick={clear}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}