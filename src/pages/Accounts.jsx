import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { accounts, fmt } from '../api/index.js';

const TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];
const EMPTY = { name: '', code: '', type: 'asset', subtype: '', description: '' };

export default function Accounts() {
  const [list, setList] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => accounts.list().then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const openEdit = (a) => { setEditing(a); setForm({ ...a }); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };

  const handleSubmit = async () => {
    if (!form.name || !form.code) return toast.error('Name and code are required');
    setSaving(true);
    try {
      if (editing) { await accounts.update(editing._id, form); toast.success('Account updated'); }
      else { await accounts.create(form); toast.success('Account created'); }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this account?')) return;
    await accounts.delete(id);
    toast.success('Account deactivated');
    load();
  };

  const filtered = typeFilter ? list.filter((a) => a.type === typeFilter) : list;
  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = filtered.filter((a) => a.type === t);
    return acc;
  }, {});

  return (
    <div>
      <div className="section-header">
        <div className="filter-bar">
          <button className={`btn btn-sm ${!typeFilter ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTypeFilter('')}>All</button>
          {TYPES.map((t) => (
            <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTypeFilter(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Account</button>
      </div>

      {TYPES.map((type) => {
        const items = grouped[type];
        if (items.length === 0) return null;
        const total = items.reduce((s, a) => s + a.balance, 0);
        return (
          <div className="card" key={type} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ textTransform: 'capitalize', fontSize: 14, fontWeight: 600 }}>{type}</h3>
              <span className="fw-600">{fmt(total)}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Subtype</th><th>Description</th><th className="text-right">Balance</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a._id}>
                      <td className="fw-600">{a.code}</td>
                      <td>{a.name}</td>
                      <td className="text-muted">{a.subtype || '—'}</td>
                      <td className="text-muted">{a.description || '—'}</td>
                      <td className="text-right fw-600">{fmt(a.balance)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(a)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a._id)}>×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty card"><div className="empty-icon">🏦</div><p>No accounts yet. Create your chart of accounts to get started.</p></div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Account' : 'New Account'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Account Code *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1100" />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Account Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cash & Cash Equivalents" />
                </div>
                <div className="form-group">
                  <label>Subtype</label>
                  <input value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} placeholder="e.g. Current Asset" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
