import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, ShieldCheck, Loader2 } from 'lucide-react';

export default function CountyMemberProfileModal({ member, open, onOpenChange, canPromote, onMakeAdmin, makingAdmin }) {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            {member.name}
            <Badge variant="outline" className="capitalize text-xs">{member.role}</Badge>
            {member.source === 'direct' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Direct</Badge>}
            {member.source === 'club' && <Badge className="bg-blue-100 text-blue-700 text-xs">Via Club</Badge>}
            {member.source === 'both' && <Badge className="bg-purple-100 text-purple-700 text-xs">Direct + Club</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline break-all">{member.email}</a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            {member.phone ? (
              <a href={`tel:${member.phone}`} className="text-blue-600 hover:underline">{member.phone}</a>
            ) : (
              <span className="text-gray-400">Not provided</span>
            )}
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            {member.clubs?.length ? (
              <div className="flex flex-wrap gap-1">
                {member.clubs.map(c => (
                  <Badge key={c.clubId} variant="outline" className="text-xs">{c.clubName}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-gray-400">No affiliated clubs</span>
            )}
          </div>
        </div>

        {canPromote && (
          member.role === 'admin' ? (
            <p className="text-xs text-center text-gray-400 pt-1">This member is already a county admin.</p>
          ) : member.countyMembershipId ? (
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={onMakeAdmin} disabled={makingAdmin}>
              {makingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Make County Admin
            </Button>
          ) : (
            <p className="text-xs text-center text-gray-400 pt-1">Club-affiliated members join the county through their club and can't be given county roles directly.</p>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}