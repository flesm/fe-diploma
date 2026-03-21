import React from 'react';

export function MentorToolbar({
  mentorLinks,
  selectedInternId,
  onSelectIntern,
  internAssignId,
  onInternAssignChange,
  onAssignIntern,
  loading,
  taskForm,
  onTaskFormChange,
  onCreateTask,
  statuses,
  statusForm,
  onStatusFormChange,
  onCreateStatus,
}) {
  return (
    <div className="toolbar-grid">
      <section className="dashboard-card">
        <div className="section-head">
          <div>
            <p className="auth-kicker">MENTOR</p>
            <h3>My interns</h3>
          </div>
        </div>

        <div className="chip-row">
          <button
            className={`chip-button ${selectedInternId === '' ? 'active' : ''}`}
            onClick={() => onSelectIntern('')}
            type="button"
          >
            All
          </button>
          {mentorLinks.map((link) => (
            <button
              key={link.id}
              className={`chip-button ${
                selectedInternId === link.intern_id ? 'active' : ''
              }`}
              onClick={() => onSelectIntern(link.intern_id)}
              type="button"
            >
              {link.intern_id.slice(0, 8)}
            </button>
          ))}
        </div>

        <form className="compact-form" onSubmit={onAssignIntern}>
          <label>
            Assign intern UUID
            <input
              onChange={onInternAssignChange}
              placeholder="Intern UUID"
              value={internAssignId}
            />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            Assign intern
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <div className="section-head">
          <div>
            <p className="auth-kicker">TASKS</p>
            <h3>Create task</h3>
          </div>
        </div>

        <form className="compact-form" onSubmit={onCreateTask}>
          <label>
            Title
            <input name="title" onChange={onTaskFormChange} value={taskForm.title} />
          </label>
          <label>
            Description
            <textarea
              name="description"
              onChange={onTaskFormChange}
              value={taskForm.description}
            />
          </label>
          <label>
            Intern
            <select
              name="intern_id"
              onChange={onTaskFormChange}
              value={taskForm.intern_id}
            >
              <option value="">Select intern</option>
              {mentorLinks.map((link) => (
                <option key={link.id} value={link.intern_id}>
                  {link.intern_id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              name="status_id"
              onChange={onTaskFormChange}
              value={taskForm.status_id}
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            Create task
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <div className="section-head">
          <div>
            <p className="auth-kicker">STATUSES</p>
            <h3>Create column</h3>
          </div>
        </div>

        <form className="compact-form" onSubmit={onCreateStatus}>
          <label>
            Name
            <input
              name="name"
              onChange={onStatusFormChange}
              value={statusForm.name}
            />
          </label>
          <label>
            Code
            <input
              name="code"
              onChange={onStatusFormChange}
              value={statusForm.code}
            />
          </label>
          <label>
            Order
            <input
              name="order_index"
              onChange={onStatusFormChange}
              type="number"
              value={statusForm.order_index}
            />
          </label>
          <label className="checkbox-row">
            <input
              checked={statusForm.is_default}
              name="is_default"
              onChange={onStatusFormChange}
              type="checkbox"
            />
            Make default
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            Create status
          </button>
        </form>
      </section>
    </div>
  );
}
