import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from 'lucide-react';

const DEFAULT_MEMBERSHIP_TYPES = [
  'Winter Indoor Member',
  'Summer Indoor Member', 
  'Outdoor Member',
  'Social Member'
];

const EMPTY_FORM = {
  firstName: '',
  surname: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  membershipStartDate: '',
  lockerNumber: '',
  lockerNumber2: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  role: 'member',
  selectedGroups: [],
};

export default function AddMemberModal({ 
  open, 
  onClose, 
  onSubmit,
  isLoading,
  membershipTypes = DEFAULT_MEMBERSHIP_TYPES
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setVal = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const toggleGroup = (group) => {
    setForm(f => ({
      ...f,
      selectedGroups: f.selectedGroups.includes(group)
        ? f.selectedGroups.filter(g => g !== group)
        : [...f.selectedGroups, group]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      first_name: form.firstName.trim(),
      surname: form.surname.trim(),
      user_email: form.email.trim(),
      user_name: `${form.firstName.trim()} ${form.surname.trim()}`,
      phone: form.phone.trim() || null,
      date_of_birth: form.dateOfBirth || null,
      gender: form.gender || null,
      membership_start_date: form.membershipStartDate || null,
      locker_number: form.lockerNumber.trim() || null,
      locker_number_2: form.lockerNumber2.trim() || null,
      emergency_contact_name: form.emergencyContactName.trim() || null,
      emergency_contact_phone: form.emergencyContactPhone.trim() || null,
      role: form.role,
      membership_groups: form.selectedGroups,
      status: 'approved'
    });
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={set('firstName')} placeholder="John" required />
            </div>
            <div>
              <Label>Surname *</Label>
              <Input value={form.surname} onChange={set('surname')} placeholder="Smith" required />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label>Email Address *</Label>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="john.smith@example.com" required />
          </div>

          {/* Phone */}
          <div>
            <Label>Phone Number</Label>
            <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="07123 456789" />
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={setVal('gender')}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Membership Start Date */}
          <div>
            <Label>Membership Start Date</Label>
            <Input type="date" value={form.membershipStartDate} onChange={set('membershipStartDate')} />
          </div>

          {/* Locker Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Locker 1</Label>
              <Input value={form.lockerNumber} onChange={set('lockerNumber')} placeholder="e.g. 42" />
            </div>
            <div>
              <Label>Locker 2</Label>
              <Input value={form.lockerNumber2} onChange={set('lockerNumber2')} placeholder="e.g. 43" />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyContactName} onChange={set('emergencyContactName')} placeholder="Jane Smith" />
            </div>
            <div>
              <Label>Emergency Contact Phone</Label>
              <Input type="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} placeholder="07123 456789" />
            </div>
          </div>

          {/* Role */}
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={setVal('role')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="live_scorer">Live Scorer</SelectItem>
                <SelectItem value="selector">Selector</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Membership Groups */}
          <div>
            <Label className="mb-2 block">Membership Groups</Label>
            <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
              {membershipTypes.map(group => (
                <label key={group} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.selectedGroups.includes(group)}
                    onCheckedChange={() => toggleGroup(group)}
                  />
                  <span className="text-sm">{group}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}