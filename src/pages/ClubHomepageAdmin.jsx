import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, Save, Upload, Loader2,
  Globe, Home, ShieldAlert, Image, Code
} from 'lucide-react';
import { toast } from "sonner";

const DEFAULT_SECTIONS = [
  { id: 'news', label: 'News', visible: true, order: 1 },
  { id: 'match_results', label: 'Recent Match Results', visible: true, order: 2 },
  { id: 'upcoming_matches', label: 'Upcoming Matches & Selection', visible: true, order: 3 },
  { id: 'league_fixtures', label: 'My League Fixtures This Week', visible: true, order: 4 },
  { id: 'todays_rinks', label: "Today's Rink Availability", visible: true, order: 5 },
  { id: 'gallery', label: 'Gallery', visible: true, order: 6 },
  { id: 'social_events', label: 'Social Events', visible: true, order: 7 },
  { id: 'members', label: 'Club Members', visible: true, order: 8 },
  { id: 'external_embed', label: 'External Content (HTML Embed)', visible: false, order: 9 },
];

export default function ClubHomepageAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [heroImage, setHeroImage] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [externalHtml, setExternalHtml] = useState('');
  const [externalHtmlTitle, setExternalHtmlTitle] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: homepage } = useQuery({
    queryKey: ['clubHomepage', clubId],
    queryFn: async () => {
      const results = await base44.entities.ClubHomepage.filter({ club_id: clubId });
      return results[0] || null;
    },
    enabled: !!clubId,
  });

  useEffect(() => {
    if (homepage) {
      setHeroImage(homepage.hero_image_url || '');
      setWelcomeText(homepage.welcome_text || '');
      setExternalHtml(homepage.external_html || '');
      setExternalHtmlTitle(homepage.external_html_title || '');
      if (homepage.sections_config?.length) {
        // Merge saved config with DEFAULT_SECTIONS so new sections always appear
        const saved = homepage.sections_config;
        const merged = DEFAULT_SECTIONS.map(def => {
          const existing = saved.find(s => s.id === def.id);
          return existing || def;
        });
        // Re-apply order from saved for sections that exist in saved
        const savedOrder = saved.map(s => s.id);
        merged.sort((a, b) => {
          const ai = savedOrder.indexOf(a.id);
          const bi = savedOrder.indexOf(b.id);
          if (ai === -1 && bi === -1) return a.order - b.order;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        setSections(merged.map((s, i) => ({ ...s, order: i + 1 })));
      }
    }
  }, [homepage]);

  const isAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setHeroImage(file_url);
    setUploadingHero(false);
    toast.success('Image uploaded');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = {
        club_id: clubId,
        hero_image_url: heroImage,
        welcome_text: welcomeText,
        external_html: externalHtml,
        external_html_title: externalHtmlTitle,
        sections_config: sections,
      };
      if (homepage?.id) {
        await base44.entities.ClubHomepage.update(homepage.id, data);
      } else {
        await base44.entities.ClubHomepage.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ['clubHomepage', clubId] });
      toast.success('Homepage saved');
    } finally {
      setSaving(false);
    }
  };

  const moveSection = (index, direction) => {
    const updated = [...sections];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= updated.length) return;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSections(reordered);
  };

  const toggleSection = (id) => {
    setSections(sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <Link to={createPageUrl('ClubHome') + `?clubId=${clubId}`}><Button>Back to Homepage</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to={createPageUrl('ClubHome') + `?clubId=${clubId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Homepage
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Homepage Editor</h1>
              <p className="text-gray-500 mt-1">{club?.name}</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Image className="w-4 h-4" /> Hero Banner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Banner Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  {heroImage && (
                    <img src={heroImage} alt="Hero" className="w-32 h-20 object-cover rounded-lg border" />
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleHeroUpload} className="hidden" />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        {uploadingHero ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {heroImage ? 'Change Image' : 'Upload Image'}
                      </span>
                    </Button>
                  </label>
                  {heroImage && (
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setHeroImage('')}>Remove</Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Welcome Message</Label>
                <Textarea
                  value={welcomeText}
                  onChange={e => setWelcomeText(e.target.value)}
                  placeholder="Welcome to our club! We're a friendly lawn bowls club..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section Order & Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="w-4 h-4" /> Sections — Order & Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections.sort((a, b) => a.order - b.order).map((section, index) => (
                  <div key={section.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${section.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                      <span className={`text-sm font-medium ${section.visible ? 'text-gray-800' : 'text-gray-400'}`}>{section.label}</span>
                      {!section.visible && <Badge variant="outline" className="text-xs text-gray-400">Hidden</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSection(section.id)}>
                        {section.visible ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* External HTML Embed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="w-4 h-4" /> External HTML Embed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">Paste HTML from external sites (e.g. league tables). Remember to enable "External Content" in the sections above.</p>
              <div>
                <Label>Section Title</Label>
                <Input value={externalHtmlTitle} onChange={e => setExternalHtmlTitle(e.target.value)} placeholder="e.g., County League Table" className="mt-1" />
              </div>
              <div>
                <Label>HTML Code</Label>
                <Textarea
                  value={externalHtml}
                  onChange={e => setExternalHtml(e.target.value)}
                  placeholder="<div>Paste your embed code here...</div>"
                  rows={6}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
}