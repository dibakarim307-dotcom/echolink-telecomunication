import React, { useState } from 'react';
import { Contact } from '../types';
import { Search, Phone, Video, Send, UserPlus, X, Star, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ContactsModalProps {
  contacts: Contact[];
  onClose: () => void;
  onStartCall: (name: string, phone: string, type: 'voice' | 'video') => void;
  onSendMoney: (name: string, phone: string) => void;
  onAddContact: (contact: Contact) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  contacts,
  onClose,
  onStartCall,
  onSendMoney,
  onAddContact,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filteredContacts = contacts.filter(
    c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phoneNumber.includes(searchTerm)
  );

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const contact: Contact = {
      id: `c-${Date.now()}`,
      name: newName.trim(),
      phoneNumber: newPhone.trim().startsWith('+254') ? newPhone.trim() : `+254 ${newPhone.trim()}`,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      verifiedEchoUser: true,
      status: 'EchoLink 5G VoLTE Active',
    };

    onAddContact(contact);
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Contacts & Directory</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold">
              {contacts.length}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`p-2 rounded-xl transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400' : 'bg-slate-100 hover:bg-slate-200 text-emerald-600'
              }`}
              title="Add New Contact"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Contact Form */}
        {showAddForm && (
          <form onSubmit={handleCreateContact} className={`my-3 p-3.5 rounded-2xl border space-y-2.5 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="text-xs font-semibold uppercase text-slate-500">Add New Contact</h4>
            <input
              type="text"
              placeholder="Full Name (e.g. John Ochieng)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
              }`}
              required
            />
            <input
              type="text"
              placeholder="Kenyan Phone (e.g. 0712 345 678)"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
              }`}
              required
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
              >
                Save Contact
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="relative my-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or +254 phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
            }`}
          />
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              className={`p-2.5 rounded-2xl border flex items-center justify-between transition group ${
                isDark 
                  ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-600"
                  />
                  {contact.verifiedEchoUser && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] text-white">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`font-bold text-xs group-hover:text-emerald-500 transition ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {contact.name}
                    </span>
                    {contact.favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {contact.phoneNumber}
                  </div>
                  {contact.status && (
                    <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                      {contact.status}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    onClose();
                    onStartCall(contact.name, contact.phoneNumber, 'voice');
                  }}
                  className={`p-2 rounded-xl transition ${
                    isDark ? 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white' : 'bg-slate-200 hover:bg-emerald-600 text-slate-700 hover:text-white'
                  }`}
                  title="Voice Call (VoLTE)"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onStartCall(contact.name, contact.phoneNumber, 'video');
                  }}
                  className={`p-2 rounded-xl transition ${
                    isDark ? 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white' : 'bg-slate-200 hover:bg-indigo-600 text-slate-700 hover:text-white'
                  }`}
                  title="Video Call (1080p HD)"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onSendMoney(contact.name, contact.phoneNumber);
                  }}
                  className={`p-2 rounded-xl transition ${
                    isDark ? 'bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white' : 'bg-slate-200 hover:bg-teal-600 text-slate-700 hover:text-white'
                  }`}
                  title="Send EchoPay Money (0% < 150)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No contacts found matching &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
