import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const BASE = import.meta.env.VITE_API_URL || '/api';

const ROLE_LABELS = { admin: '🔴 Admin', manager: '🟡 Manager', viewer: '🟢 Viewer' };
const ROLE_DESC = {
  admin: 'Full access — can manage users',
  manager: 'Can create/edit all records',
  viewer: 'Read-only access',
};

const blank = { name: '', email: '', password: '', role: 'viewer' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | 'edit' | 'password'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await axios.get(`${BASE}/auth/users`);
      setUsers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function openNew() {
    setForm(blank);
    setEditing(null);
    setModal('new');
  }

  function openEdit(u) {
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setEditing(u);
    setModal('edit');
  }

  function openPassword() {
    setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    setModal('password');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'new') {
        await axios.post(`${BASE}/auth/users`, form);
        toast.success('User created');
      } else {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await axios.put(`${BASE}/auth/users/${editing._id}`, payload);
        toast.success('User updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(u) {
    try {
      await axios.put(`${BASE}/auth/users/${u._id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${BASE}/auth/users/${u._id}`);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await axios.put(`${BASE}/auth/me/password`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully');
      setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>User Management</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            Manage who can access the system
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={openPassword}>🔑 Change My Password</button>
          {me?.role === 'admin' && (
            <button className="btn btn-primary" onClick={openNew}>+ New User</button>
          )}
        </div>
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(ROLE_DESC).map(([role, desc]) => (
          <div key={role} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{ROLE_LABELS[role]}</span>
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{desc}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                {me?.role === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {u.name}
                      {u._id === me?._id && (
                        <span style={{ marginLeft: 8, fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4 }}>
                          you
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: u.isActive ? '#dcfce7' : '#fee2e2',
                      color: u.isActive ? '#16a34a' : '#dc2626',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  {me?.role === 'admin' && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        {u._id !== me?._id && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                              onClick={() => handleDelete(u)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New / Edit User Modal */}
      {(modal === 'new' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>{modal === 'new' ? 'New User' : 'Edit User'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rahim Uddin" />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="form-group">
                  <label>{modal === 'new' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
                  <input
                    type="password"
                    required={modal === 'new'}
                    minLength={modal === 'new' ? 6 : undefined}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                    <option value="viewer">Viewer — read only</option>
                    <option value="manager">Manager — create &amp; edit</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal === 'new' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {modal === 'password' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Change My Password</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    required
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
