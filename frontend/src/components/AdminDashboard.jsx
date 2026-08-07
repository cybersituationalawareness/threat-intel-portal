import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

function AdminDashboard() {
  const { authFetch, currentUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({ org_name: '', user_name: '', user_email: '', password: '' });
  const [addingMember, setAddingMember] = useState(false);

  // Edit Modals
  const [editOrgModal, setEditOrgModal] = useState({ show: false, org: null, name: '' });
  const [editUserModal, setEditUserModal] = useState({ show: false, user: null, name: '', email: '' });
  
  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/admin/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newMemberForm.org_name || !newMemberForm.user_name || !newMemberForm.user_email || !newMemberForm.password) {
      alert("All fields are required.");
      return;
    }
    setAddingMember(true);
    try {
      const res = await authFetch('/api/v1/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemberForm)
      });
      if (res.ok) {
        alert("Member successfully created!");
        setShowAddMemberModal(false);
        setNewMemberForm({ org_name: '', user_name: '', user_email: '', password: '' });
        fetchOrganizations();
      } else {
        const err = await res.json();
        alert("Error creating member: " + (err.detail || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to server.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/api/v1/admin/organizations/${editOrgModal.org.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editOrgModal.name })
      });
      if (res.ok) {
        setEditOrgModal({ show: false, org: null, name: '' });
        fetchOrganizations();
      } else {
        alert("Error updating organization.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/api/v1/admin/users/${editUserModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserModal.name, email: editUserModal.email })
      });
      if (res.ok) {
        setEditUserModal({ show: false, user: null, name: '', email: '' });
        fetchOrganizations();
      } else {
        alert("Error updating user.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div style={{ padding: '20px' }}>Access Denied</div>;
  }

  return (
    <div className="main-content" style={{ padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Member Administration</h2>
        <button className="submit-btn" onClick={() => setShowAddMemberModal(true)}>+ Add New Member</button>
      </div>

      {loading ? (
        <div>Loading organizations...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {organizations.map(org => (
            <div key={org.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>
                  {org.name} <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>({org.org_type})</span>
                </div>
                <button 
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setEditOrgModal({ show: true, org, name: org.name })}
                >
                  Edit Org
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {org.users && org.users.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-dim)' }}>
                        <th style={{ padding: '8px' }}>User Name</th>
                        <th style={{ padding: '8px' }}>Email</th>
                        <th style={{ padding: '8px' }}>Role</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.users.map(user => (
                        <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px' }}>{user.name}</td>
                          <td style={{ padding: '8px' }}>{user.email}</td>
                          <td style={{ padding: '8px' }}>{user.role}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <button 
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => setEditUserModal({ show: true, user, name: user.name, email: user.email })}
                            >
                              Edit User
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No users found for this organization.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="side-drawer-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="side-drawer" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '100%', padding: '20px' }}>
            <div className="side-drawer-header">
              <h2>Add New Member</h2>
              <button className="close-btn" onClick={() => setShowAddMemberModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div>
                <label className="field-label">Organization Name</label>
                <input type="text" className="field-input" placeholder="e.g. Sector Member 3" value={newMemberForm.org_name} onChange={(e) => setNewMemberForm({...newMemberForm, org_name: e.target.value})} required />
              </div>
              <div>
                <label className="field-label">Primary User Name</label>
                <input type="text" className="field-input" placeholder="e.g. MEMBER3" value={newMemberForm.user_name} onChange={(e) => setNewMemberForm({...newMemberForm, user_name: e.target.value})} required />
              </div>
              <div>
                <label className="field-label">Email Address</label>
                <input type="email" className="field-input" placeholder="e.g. member3@sector.local" value={newMemberForm.user_email} onChange={(e) => setNewMemberForm({...newMemberForm, user_email: e.target.value})} required />
              </div>
              <div>
                <label className="field-label">Initial Password</label>
                <input type="password" className="field-input" placeholder="e.g. password123" value={newMemberForm.password} onChange={(e) => setNewMemberForm({...newMemberForm, password: e.target.value})} required />
              </div>
              <button type="submit" className="submit-btn" disabled={addingMember} style={{ marginTop: '10px' }}>
                {addingMember ? 'Adding...' : 'Create Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Org Modal */}
      {editOrgModal.show && (
        <div className="side-drawer-overlay" onClick={() => setEditOrgModal({ show: false, org: null, name: '' })}>
          <div className="side-drawer" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '100%', padding: '20px' }}>
            <div className="side-drawer-header">
              <h2>Edit Organization</h2>
              <button className="close-btn" onClick={() => setEditOrgModal({ show: false, org: null, name: '' })}>✖</button>
            </div>
            <form onSubmit={handleUpdateOrg} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div>
                <label className="field-label">Organization Name</label>
                <input type="text" className="field-input" value={editOrgModal.name} onChange={(e) => setEditOrgModal({...editOrgModal, name: e.target.value})} required />
              </div>
              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUserModal.show && (
        <div className="side-drawer-overlay" onClick={() => setEditUserModal({ show: false, user: null, name: '', email: '' })}>
          <div className="side-drawer" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '100%', padding: '20px' }}>
            <div className="side-drawer-header">
              <h2>Edit User</h2>
              <button className="close-btn" onClick={() => setEditUserModal({ show: false, user: null, name: '', email: '' })}>✖</button>
            </div>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div>
                <label className="field-label">User Name</label>
                <input type="text" className="field-input" value={editUserModal.name} onChange={(e) => setEditUserModal({...editUserModal, name: e.target.value})} required />
              </div>
              <div>
                <label className="field-label">User Email</label>
                <input type="email" className="field-input" value={editUserModal.email} onChange={(e) => setEditUserModal({...editUserModal, email: e.target.value})} required />
              </div>
              <button type="submit" className="submit-btn" style={{ marginTop: '10px' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
