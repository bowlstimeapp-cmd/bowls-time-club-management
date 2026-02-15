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

export default function AddMemberModal({ 
  open, 
  onClose, 
  onSubmit,
  isLoading,
  membershipTypes = DEFAULT_MEMBERSHIP_TYPES
}) {
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('member');
  const [selectedGroups, setSelectedGroups] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      first_name: firstName.trim(),
      surname: surname.trim(),
      user_email: email.trim(),
      user_name: `${firstName.trim()} ${surname.trim()}`,
      phone: phone.trim(),
      role,
      membership_groups: selectedGroups,
      status: 'approved'
    });
  };

  const toggleGroup = (group) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter(g => g !== group));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleClose = () => {
    setFirstName('');
    setSurname('');
    setEmail('');
    setPhone('');
    setRole('member');
    setSelectedGroups([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label>Surname *</Label>
              <Input
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Smith"
                required
              />
            </div>
          </div>
          
          <div>
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.smith@example.com"
              required
            />
          </div>

          <div>
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07123 456789"
            />
          </div>

          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
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

          <div>
            <Label className="mb-2 block">Membership Groups</Label>
            <div className="space-y-2 border rounded-lg p-3">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}