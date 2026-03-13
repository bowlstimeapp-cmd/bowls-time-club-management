import React, { useState, useEffect } from 'react';
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Phone, Shield, Loader2, Save, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const roleColors = {
  admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  selector: 'bg-amber-100 text-amber-800 border-amber-200',
  live_scorer: 'bg-teal-100 text-teal-800 border-teal-200',
  member: 'bg-gray-100 text-gray-800 border-gray-200',
};

const membershipColors = {
  'Winter Indoor Member': 'bg-blue-100 text-blue-800 border-blue-200',
  'Summer Indoor Member': 'bg-orange-100 text-orange-800 border-orange-200',
  'Outdoor Member': 'bg-green-100 text-green-800 border-green-200',
  'Social Member': 'bg-purple-100 text-purple-800 border-purple-200',
};

const DEFAULT_MEMBERSHIP_TYPES = [
  'Winter Indoor Member',
  'Summer Indoor Member',
  'Outdoor Member',
  'Social Member'
];

export default function MemberDetailModal({ 
  open, 
  onClose, 
  member, 
  onUpdateMember,
  isUpdating,
  isAdmin = false,
  membershipTypes = DEFAULT_MEMBERSHIP_TYPES
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [lockerNumber, setLockerNumber] = useState('');
  const [lockerNumber2, setLockerNumber2] = useState('');
  const [gender, setGender] = useState('');
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [selectedGroups, setSelectedGroups] = useState([]);

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '');
      setSurname(member.surname || '');
      setPhone(member.phone || '');
      setLockerNumber(member.locker_number || '');
      setLockerNumber2(member.locker_number_2 || '');
      setGender(member.gender || '');
      setMembershipStartDate(member.membership_start_date || '');
      setEmergencyContactName(member.emergency_contact_name || '');
      setEmergencyContactPhone(member.emergency_contact_phone || '');
      setSelectedRole(member.role || 'member');
      setSelectedGroups(member.membership_groups || []);
      setIsEditing(false);
    }
  }, [member]);

  if (!member) return null;

  const toggleGroup = (group) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter(g => g !== group));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleSave = () => {
    const updates = {
      first_name: firstName.trim(),
      surname: surname.trim(),
      user_name: `${firstName.trim()} ${surname.trim()}`,
      phone: phone.trim(),
      locker_number: lockerNumber.trim(),
      locker_number_2: lockerNumber2.trim(),
      gender: gender || null,
      membership_start_date: membershipStartDate || null,
      emergency_contact_name: emergencyContactName.trim() || null,
      emergency_contact_phone: emergencyContactPhone.trim() || null,
      role: selectedRole,
      membership_groups: selectedGroups
    };
    onUpdateMember(member.id, updates, member.role !== selectedRole ? member.role : null);
  };

  const hasChanges = 
    firstName !== (member.first_name || '') ||
    surname !== (member.surname || '') ||
    phone !== (member.phone || '') ||
    lockerNumber !== (member.locker_number || '') ||
    lockerNumber2 !== (member.locker_number_2 || '') ||
    gender !== (member.gender || '') ||
    membershipStartDate !== (member.membership_start_date || '') ||
    emergencyContactName !== (member.emergency_contact_name || '') ||
    emergencyContactPhone !== (member.emergency_contact_phone || '') ||
    selectedRole !== member.role ||
    JSON.stringify(selectedGroups.sort()) !== JSON.stringify((member.membership_groups || []).sort());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Member Details
            {isAdmin && !isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </DialogTitle>
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

          {isEditing && isAdmin ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label>Surname</Label>
                  <Input
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07123 456789"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Membership Start Date</Label>
                  <Input
                    type="date"
                    value={membershipStartDate}
                    onChange={(e) => setMembershipStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Locker 1</Label>
                  <Input
                    value={lockerNumber}
                    onChange={(e) => setLockerNumber(e.target.value)}
                    placeholder="e.g., 42"
                  />
                </div>
                <div>
                  <Label>Locker 2</Label>
                  <Input
                    value={lockerNumber2}
                    onChange={(e) => setLockerNumber2(e.target.value)}
                    placeholder="e.g., 43"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="07123 456789"
                  />
                </div>
              </div>

              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="live_scorer">Live Scorer</SelectItem>
                    <SelectItem value="selector">Selector</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Membership Groups</Label>
                <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {membershipTypes.map(group => (
                    <label 
                      key={group}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox 
                        checked={selectedGroups.includes(group)}
                        onCheckedChange={() => toggleGroup(group)}
                      />
                      <span className="text-sm">{group}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Gender</Label>
                  <p className="font-medium">{member.gender || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Membership Start Date</Label>
                  <p className="font-medium">{member.membership_start_date ? format(parseISO(member.membership_start_date), 'd MMM yyyy') : '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Locker 1</Label>
                  <p className="font-medium">{member.locker_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Locker 2</Label>
                  <p className="font-medium">{member.locker_number_2 || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Emergency Contact</Label>
                  <p className="font-medium">{member.emergency_contact_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Emergency Phone</Label>
                  <p className="font-medium">{member.emergency_contact_phone || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-gray-500 text-xs">Role</Label>
                <Badge className={`${roleColors[member.role]} mt-1`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>
              </div>

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
            </>
          )}
        </div>

        <DialogFooter>
          {isEditing && isAdmin ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isUpdating || !hasChanges}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}