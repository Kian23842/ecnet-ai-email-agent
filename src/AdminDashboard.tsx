import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, Key, Plus, Trash2, Loader2, LogOut,
  Shield, Copy, CheckCircle,
  RefreshCw
} from 'lucide-react';
import { User, Organization, GCPConfig } from './types';
import {
  adminGetUsers, adminCreateUser, adminDeleteUser, adminUpdateUser,
  adminGetOrgs, adminCreateOrg, adminDeleteOrg,
  adminGetGCP, adminSaveGCP, adminDeleteGCP,
  logout
} from './api/client';

interface Props {
  user: User;
  onLogout: () => void;
}

type Tab = 'users' | 'organizations' | 'gcp';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  organization_id: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  created_at: string;
}

export default function AdminDashboard({ user, onLogout }: Props) {
  const [tab, setTab]                   = useState<Tab>('organizations');
  const [users, setUsers]               = useState<AdminUser[]>([]);
  const [orgs, setOrgs]                 = useState<Organization[]>([]);
  const [gcpConfig, setGcpConfig]       = useState<GCPConfig | null>(null);
  const [selectedOrgForGcp, setGcpOrg]  = useState('');
  const [loading, setLoading]           = useState(false);
  const [notification, setNotif]        = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Create User modal state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail]     = useState('');
  const [newUserOrgId, setNewUserOrgId]     = useState('');
  const [newUserRole, setNewUserRole]       = useState<'admin' | 'user'>('user');
  const [newUserName, setNewUserName]       = useState('');
  const [tempPassword, setTempPassword]     = useState<string | null>(null);
  const [copiedPw, setCopiedPw]             = useState(false);

  // Create Org modal state
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgId, setNewOrgId]           = useState('');
  const [newOrgName, setNewOrgName]       = useState('');

  // GCP form state
  const [gcpClientId, setGcpClientId]         = useState('');
  const [gcpClientSecret, setGcpClientSecret] = useState('');
  const [gcpRedirectUri, setGcpRedirect]       = useState('');

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    try {
      const res = await adminGetUsers();
      setUsers(res.data.data);
    } catch { /* silent */ }
  }, []);

  const loadOrgs = useCallback(async () => {
    try {
      const res = await adminGetOrgs();
      setOrgs(res.data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadOrgs();
    loadUsers();
  }, [loadOrgs, loadUsers]);

  const handleLoadGcp = async (orgId: string) => {
    setGcpOrg(orgId);
    setGcpConfig(null);
    try {
      const res = await adminGetGCP(orgId);
      const cfg: GCPConfig = res.data.data;
      setGcpConfig(cfg);
      setGcpClientId(cfg.client_id);
      setGcpRedirect(cfg.redirect_uri);
    } catch {
      setGcpClientId('');
      setGcpRedirect('');
    }
  };

  const handleSaveGcp = async () => {
    if (!selectedOrgForGcp || !gcpClientId || !gcpClientSecret) {
      notify('Organization ID, Client ID, and Client Secret are required', 'err');
      return;
    }
    setLoading(true);
    try {
      await adminSaveGCP({
        organization_id: selectedOrgForGcp,
        client_id: gcpClientId,
        client_secret: gcpClientSecret,
        redirect_uri: gcpRedirectUri,
      });
      notify('✓ GCP configuration saved');
      setGcpClientSecret('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      notify(e.response?.data?.error ?? 'Failed to save GCP config', 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserOrgId) {
      notify('Email and Organization ID are required', 'err');
      return;
    }
    setLoading(true);
    try {
      const res = await adminCreateUser({
        email: newUserEmail,
        organization_id: newUserOrgId,
        display_name: newUserName,
        role: newUserRole,
      });
      setTempPassword(res.data.data.temp_password);
      await loadUsers();
      notify('✓ User created');
      setNewUserEmail(''); setNewUserOrgId(''); setNewUserName(''); setNewUserRole('user');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      notify(e.response?.data?.error ?? 'Failed to create user', 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(id);
      await loadUsers();
      notify('✓ User deleted');
    } catch {
      notify('✗ Failed to delete user', 'err');
    }
  };

  const handleToggleStatus = async (u: AdminUser) => {
    try {
      await adminUpdateUser(u.id, { status: u.status === 'active' ? 'disabled' : 'active' });
      await loadUsers();
      notify(`✓ User ${u.status === 'active' ? 'disabled' : 'activated'}`);
    } catch {
      notify('✗ Failed to update user', 'err');
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgId || !newOrgName) {
      notify('ID and Name are required', 'err');
      return;
    }
    setLoading(true);
    try {
      await adminCreateOrg({ id: newOrgId, name: newOrgName });
      await loadOrgs();
      notify('✓ Organization created');
      setShowCreateOrg(false);
      setNewOrgId(''); setNewOrgName('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      notify(e.response?.data?.error ?? 'Failed to create org', 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm(`Delete organization "${id}" and ALL its data? This cannot be undone.`)) return;
    try {
      await adminDeleteOrg(id);
      await loadOrgs();
      await loadUsers();
      notify('✓ Organization deleted');
    } catch {
      notify('✗ Failed to delete org', 'err');
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch {/* ok */}
    onLogout();
  };

  const copyPw = () => {
    if (tempPassword) { navigator.clipboard.writeText(tempPassword); setCopiedPw(true); setTimeout(() => setCopiedPw(false), 2000); }
  };

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'organizations', label: 'Organizations', Icon: Building2 },
    { id: 'users',         label: 'Users',         Icon: Users },
    { id: 'gcp',           label: 'GCP / OAuth',   Icon: Key },
  ];

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden font-sans text-white">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl border ${
              notification.type === 'ok'
                ? 'bg-slate-800 border-white/10 text-white'
                : 'bg-rose-900/80 border-rose-500/30 text-rose-300'
            }`}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Temp Password Modal */}
      <AnimatePresence>
        {tempPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">User Created!</h3>
                  <p className="text-[10px] text-slate-400">Share this temporary password with the user</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 mb-4">
                <code className="text-sm font-mono text-emerald-400 font-bold flex-1">{tempPassword}</code>
                <button onClick={copyPw} className="text-slate-400 hover:text-white transition-colors">
                  {copiedPw ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mb-4">⚠️ The user should change this password after first login.</p>
              <button
                onClick={() => setTempPassword(null)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-tighter uppercase italic">ECNET Admin</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Control Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-3">
            <div className="w-7 h-7 bg-violet-700 rounded-full flex items-center justify-center text-xs font-black text-white">
              {user.display_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.display_name || user.email}</p>
              <p className="text-[10px] text-violet-400 font-bold">Administrator</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Organizations Tab */}
        {tab === 'organizations' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-black text-white">Organizations</h1>
                <p className="text-xs text-slate-500 mt-0.5">{orgs.length} total</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadOrgs}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  id="btn-create-org"
                  onClick={() => setShowCreateOrg(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-violet-500 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Organization
                </button>
              </div>
            </div>

            {/* Create Org Form */}
            <AnimatePresence>
              {showCreateOrg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-6"
                >
                  <h3 className="text-sm font-black text-white mb-4">Create Organization</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">ID (slug)</label>
                      <input
                        id="org-id-input"
                        value={newOrgId}
                        onChange={e => setNewOrgId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))}
                        placeholder="e.g. org_acme"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Name</label>
                      <input
                        id="org-name-input"
                        value={newOrgName}
                        onChange={e => setNewOrgName(e.target.value)}
                        placeholder="Acme Corporation"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      id="btn-save-org"
                      onClick={handleCreateOrg}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black disabled:opacity-50 hover:bg-violet-500 transition-all"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreateOrg(false)}
                      className="px-4 py-2 text-slate-400 rounded-xl text-xs font-black hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {orgs.map(org => (
                <div key={org.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-black text-white">{org.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="text-xs text-violet-400 font-mono">{org.id}</code>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {(org.user_count ?? 0)} user{(org.user_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOrg(org.id)}
                    className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {orgs.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  <Building2 className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm font-bold">No organizations yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-black text-white">Users</h1>
                <p className="text-xs text-slate-500 mt-0.5">{users.length} total</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={loadUsers} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  id="btn-create-user"
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-violet-500 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New User
                </button>
              </div>
            </div>

            {/* Create User Form */}
            <AnimatePresence>
              {showCreateUser && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-6"
                >
                  <h3 className="text-sm font-black text-white mb-4">Create User</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[
                      { id: 'user-email', label: 'Email', value: newUserEmail, setter: setNewUserEmail, type: 'email', placeholder: 'user@example.com' },
                      { id: 'user-org', label: 'Organization ID', value: newUserOrgId, setter: setNewUserOrgId, type: 'text', placeholder: 'ecnet_default' },
                      { id: 'user-name', label: 'Display Name', value: newUserName, setter: setNewUserName, type: 'text', placeholder: 'John Doe' },
                    ].map(f => (
                      <div key={f.id}>
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">{f.label}</label>
                        <input
                          id={f.id}
                          type={f.type}
                          value={f.value}
                          onChange={e => f.setter(e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Role</label>
                      <select
                        id="user-role"
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as 'admin' | 'user')}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-3">A temporary password will be auto-generated and shown after creation.</p>
                  <div className="flex items-center gap-3">
                    <button
                      id="btn-save-user"
                      onClick={handleCreateUser}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black disabled:opacity-50 hover:bg-violet-500 transition-all"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className="px-4 py-2 text-slate-400 rounded-xl text-xs font-black hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['User', 'Organization', 'Role', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-black uppercase tracking-wider text-slate-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-all">
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-white">{u.display_name || u.email}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs text-violet-400 font-mono">{u.organization_id}</code>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          u.role === 'admin' ? 'bg-violet-600/20 text-violet-400' : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase transition-all ${
                            u.status === 'active'
                              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'
                              : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/40'
                          }`}
                        >
                          {u.status}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-600">
                        <p className="text-sm font-bold">No users found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GCP Tab */}
        {tab === 'gcp' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-6">
              <h1 className="text-xl font-black text-white">GCP OAuth Credentials</h1>
              <p className="text-xs text-slate-500 mt-0.5">Store per-organization Google Cloud OAuth2 credentials</p>
            </div>

            <div className="max-w-lg space-y-6">
              {/* Org Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-2">Select Organization</label>
                <select
                  id="gcp-org-select"
                  value={selectedOrgForGcp}
                  onChange={e => handleLoadGcp(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
                >
                  <option value="">— Choose an organization —</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.id})</option>
                  ))}
                </select>
              </div>

              {selectedOrgForGcp && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-4"
                >
                  {gcpConfig && (
                    <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl mb-2">
                      <p className="text-[10px] font-black text-emerald-400 uppercase">Existing config found</p>
                      <p className="text-xs text-slate-400 mt-1">Client ID: {gcpConfig.client_id.substring(0, 30)}...</p>
                    </div>
                  )}

                  {[
                    { id: 'gcp-client-id', label: 'Client ID', value: gcpClientId, setter: setGcpClientId, placeholder: 'your-client-id.apps.googleusercontent.com', secret: false },
                    { id: 'gcp-client-secret', label: 'Client Secret (required to save)', value: gcpClientSecret, setter: setGcpClientSecret, placeholder: 'GOCSPX-...', secret: true },
                    { id: 'gcp-redirect', label: 'Redirect URI (optional)', value: gcpRedirectUri, setter: setGcpRedirect, placeholder: 'https://yourdomain.com/api/gmail/callback', secret: false },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">{f.label}</label>
                      <input
                        id={f.id}
                        type={f.secret ? 'password' : 'text'}
                        value={f.value}
                        onChange={e => f.setter(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-violet-500/50"
                      />
                    </div>
                  ))}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      id="btn-save-gcp"
                      onClick={handleSaveGcp}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black disabled:opacity-50 hover:bg-violet-500 transition-all"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                      Save GCP Config
                    </button>
                    {gcpConfig && (
                      <button
                        onClick={async () => { await adminDeleteGCP(selectedOrgForGcp); setGcpConfig(null); notify('✓ GCP config deleted'); }}
                        className="flex items-center gap-2 px-4 py-2 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black hover:bg-rose-400/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
