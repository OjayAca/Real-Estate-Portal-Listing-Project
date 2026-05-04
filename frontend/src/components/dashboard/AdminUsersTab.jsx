import { Users, Trash2, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

export default function AdminUsersTab({ adminOverview, userSearch, setUserSearch, openAdminConfirm, onPageChange }) {
  if (!adminOverview) return null;
  const usersData = Array.isArray(adminOverview.users?.data) ? adminOverview.users.data : [];
  const usersMeta = adminOverview.users?.meta || { current_page: 1, last_page: 1 };

  return (
    <section className="section-panel admin-panel animate-enter animate-delay-2">
      <div className="panel-header">
        <div className="panel-header-copy">
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <Users size={14} aria-hidden="true" /> Directory
          </p>
          <h2>System Users</h2>
        </div>
        <div className="panel-header-search">
          <input
            aria-label="Search users by name or email"
            placeholder="Search users by name or email..."
            type="text"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-stack">
        {usersData.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">
              <SearchX size={22} aria-hidden="true" />
            </span>
            <h3 className="empty-state-title">No users found</h3>
            <p className="empty-state-copy">Try adjusting your search or clearing the filter to see all users.</p>
          </div>
        )}
        {usersData.map((entry) => (
          <div className="table-row" key={entry.id}>
            <div>
              <strong>{entry.full_name}</strong>
              <span>{entry.email}</span>
            </div>
            <div className="table-actions">
              <span className="chip" style={{ background: 'var(--primary-light)', color: 'var(--primary-base)', borderColor: 'var(--primary-base)' }}>
                {entry.role}
              </span>
              <button
                className={entry.is_active ? 'ghost-button' : 'primary-button'}
                aria-label={entry.is_active ? `Suspend ${entry.full_name}` : `Restore ${entry.full_name}`}
                disabled={entry.role === 'admin' && entry.is_active}
                onClick={() => openAdminConfirm({
                  title: entry.is_active ? 'Suspend User Access' : 'Restore User Access',
                  message: `Are you sure you want to ${entry.is_active ? 'suspend' : 'restore'} access for ${entry.full_name}?`,
                  path: `/admin/users/${entry.id}`,
                  body: { is_active: !entry.is_active },
                  tone: entry.is_active ? 'danger' : 'warning',
                })}
                type="button"
              >
                {entry.is_active ? 'Suspend Access' : 'Restore Access'}
              </button>
              <button
                className="ghost-button danger-button"
                aria-label={`Delete ${entry.full_name}`}
                disabled={entry.role === 'admin'}
                onClick={() => openAdminConfirm({
                  title: 'Permanently Delete User',
                  message: `This will permanently delete ${entry.full_name}'s account. This action cannot be undone.`,
                  path: `/admin/users/${entry.id}`,
                  body: {},
                  method: 'DELETE',
                  tone: 'danger',
                  confirmText: 'Delete User',
                  showInput: true,
                  inputLabel: 'Deletion Confirmation',
                  inputPlaceholder: `DELETE ${entry.email}`,
                  requiredInputValue: `DELETE ${entry.email}`,
                })}
                type="button"
              >
                <Trash2 size={15} aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {usersMeta.last_page > 1 && (
        <div className="pager-row" style={{ marginTop: '2rem' }}>
          <button
            className="ghost-button"
            disabled={usersMeta.current_page === 1}
            onClick={() => onPageChange('users', usersMeta.current_page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{usersMeta.current_page} / {usersMeta.last_page}</span>
          <button
            className="ghost-button"
            disabled={usersMeta.current_page === usersMeta.last_page}
            onClick={() => onPageChange('users', usersMeta.current_page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
