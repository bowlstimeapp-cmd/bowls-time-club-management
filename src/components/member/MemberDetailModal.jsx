import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Phone, Shield, Loader2, Save } from 'lucide-react';

const roleColors = {
  admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  selector: 'bg-amber-100 text-amber-800 border-amber-200',
  member: 'bg-gray-100 text-gray-800 border-gray-200',
};

const membershipColors = {
  'Winter Indoor Member': 'bg-blue-100 text-blue-800 border-blue-200',
  'Summer Indoor Member': 'bg-orange-100 text-orange-800 border-orange-200',
  'Outdoor Member': 'bg-green-100 text-green-800 border-green-200',
  'Social Member': 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function MemberDetailModal({ 
  open, 
  onClose, 
  member, 
  onUpdateRole,
  isUpdating,
  isAdmin = false
}) {
  const [selectedRole, setSelectedRole] = useState(member?.role || 'member');

  if (!member) return null;

  const handleSaveRole = () => {
    if (selectedRole !== member.role) {
      onUpdateRole(member.id, selectedRole, member.role);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{member.user_name}</h3>
              <p className="text-sm text-gray-500">{member.user_email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-500 text-xs">First Name</Label>
              <p className="font-medium">{member.first_name || '-'}</p>
            </div>
            <div>
              <Label className="text-gray-500 text-xs">Surname</Label>
              <p className="font-medium">{member.surname || '-'}</p>
            </div>
          </div>

          <div>
            <Label className="text-gray-500 text-xs flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </Label>
            <p className="font-medium">{member.user_email}</p>
          </div>

          <div>
            <Label className="text-gray-500 text-xs flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </Label>
            <p className="font-medium">{member.phone || '-'}</p>
          </div>

          {isAdmin && (
            <div>
              <Label className="text-gray-500 text-xs flex items-center gap-1 mb-2">
                <Shield className="w-3 h-3" /> Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="selector">Selector</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isAdmin && (
            <div>
              <Label className="text-gray-500 text-xs">Role</Label>
              <Badge className={`${roleColors[member.role]} mt-1`}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
            </div>
          )}

          <div>
            <Label className="text-gray-500 text-xs mb-2 block">Membership Groups</Label>
            <div className="flex flex-wrap gap-2">
              {member.membership_groups?.length > 0 ? (
                member.membership_groups.map(group => (
                  <Badge key={group} className={membershipColors[group] || 'bg-gray-100 text-gray-800'}>
                    {group}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">No membership groups assigned</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {isAdmin && selectedRole !== member.role && (
            <Button 
              onClick={handleSaveRole}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Role Change
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}