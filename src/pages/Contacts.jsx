import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { contacts } from '../api/index.js';

const EMPTY = { name: '', type: 'client', email: '', phone: '', address: '', taxId: '', notes: '' };

export default function Contacts() {
  const [list, setList] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => contacts.list(typeFilter ? { type: typeFilter } : {}).then((r) => setList(r.data));

  useEffect(() => { load(); }, [typeFilter]);

  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };

  const handleSubmit = async () => {
    if (!form.name) return toast.error('Name required');
    setSaving(true);
    try {
      if (editing) { await contacts.update(editing._id, form); toast.success('Contact updated'); }
      else { await contacts.create(form); toast.success('Contact created'); }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this contact?')) return;
    await contacts.delete(id);
    toast.success('Contact deactivated');
    load();
  };

  return (
    <div>
      <div className="section-header">
        <div className="filter-bar">
          {['', 'client', 'vendor', 'both'].map((t) => (
            <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTypeFilter(t)}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Contact</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Tax ID</th><th></th></tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={6}><div className="empty"><div className="empty-icon">👥</div><p>No contacts yet</p></div></td></tr>
              )}
              {list.map((c) => (
                <tr key={c._id}>
                  <td className="fw-600">{c.name}</td>
                  <td><span className={`badge badge-${c.type === 'client' ? 'sent' : c.type === 'vendor' ? 'partial' : 'paid'}`}>{c.type}</span></td>
                  <td className="text-muted">{c.email || '—'}</td>
                  <td className="text-muted">{c.phone || '—'}</td>
                  <td className="text-muted">{c.taxId || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c._id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Contact' : 'New Contact'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name / Company" />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="client">Client</option>
                    <option value="vendor">Vendor</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tax ID / TIN</label>
                <input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
