import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  Phone, 
  Mail,
  ShieldAlert,
  Pencil,
  Trash2,
  Search
} from 'lucide-react';
import { toast } from "sonner";
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const statusOptions = [
  { value: 'not_contacted', label: 'Not Contacted', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'not_entering', label: 'Not Entering', color: 'bg-red-100 text-red-800' },
  { value: 'entered_team', label: 'Entered Team', color: 'bg-emerald-100 text-emerald-800' }
];

export default function OpenCompetitions() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    team_name: '',
    contact_name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: myMembership } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['openCompetitionContacts', clubId],
    queryFn: () => base44.entities.OpenCompetitionContact.filter({ club_id: clubId }, '-created_date'),
    enabled: !!clubId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OpenCompetitionContact.create({ ...data, club_id: clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openCompetitionContacts'] });
      toast.success('Contact added successfully');
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OpenCompetitionContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openCompetitionContacts'] });
      toast.success('Contact updated successfully');
      setDialogOpen(false);
      setEditingContact(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OpenCompetitionContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openCompetitionContacts'] });
      toast.success('Contact deleted');
    },
  });

  const isClubAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';

  if (!clubId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No club selected</p>
      </div>
    );
  }

  if (user && !isClubAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need club admin privileges to access this page.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Bookings
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      team_name: '',
      contact_name: '',
      email: '',
      phone: '',
      notes: ''
    });
  };

  const handleOpenDialog = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        team_name: contact.team_name || '',
        contact_name: contact.contact_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || ''
      });
    } else {
      setEditingContact(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.team_name.trim() || !formData.contact_name.trim()) {
      toast.error('Team name and contact name are required');
      return;
    }

    if (editingContact) {
      updateMutation.mutate({ 
        id: editingContact.id, 
        data: formData 
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusChange = (contactId, newStatus) => {
    updateMutation.mutate({ 
      id: contactId, 
      data: { status: newStatus } 
    });
  };

  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.team_name?.toLowerCase().includes(query) ||
      contact.contact_name?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: contacts.length,
    contacted: contacts.filter(c => c.status === 'contacted').length,
    entered: contacts.filter(c => c.status === 'entered_team').length,
    notEntering: contacts.filter(c => c.status === 'not_entering').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Open Competitions CRM</h1>
            <p className="text-gray-600">{club?.name || 'Club'}</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Contacts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-blue-600">{stats.contacted}</p>
              <p className="text-sm text-gray-500">Contacted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-600">{stats.entered}</p>
              <p className="text-sm text-gray-500">Entered Team</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600">{stats.notEntering}</p>
              <p className="text-sm text-gray-500">Not Entering</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Contacts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Loading...</p>
              </CardContent>
            </Card>
          ) : filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">
                  {searchQuery ? 'No contacts found' : 'No contacts yet. Add your first contact!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredContacts.map(contact => (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-lg">{contact.team_name}</h3>
                        <Badge className={statusOptions.find(s => s.value === contact.status)?.color || statusOptions[0].color}>
                          {statusOptions.find(s => s.value === contact.status)?.label || 'Not Contacted'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{contact.contact_name}</p>
                      <div className="flex flex-col sm:flex-row gap-2 text-sm text-gray-500">
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">{contact.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Select
                        value={contact.status || 'not_contacted'}
                        onValueChange={(value) => handleStatusChange(contact.id, value)}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(contact)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Delete this contact?')) {
                              deleteMutation.mutate(contact.id);
                            }
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </motion.div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Team Name *</Label>
                <Input
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  placeholder="e.g., Riverside Bowls Club"
                />
              </div>
              <div>
                <Label>Contact Name *</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01234 567890"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}