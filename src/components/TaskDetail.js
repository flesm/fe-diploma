import React from 'react';

export function TaskDetail({
  currentUser,
  mentorLinks,
  selectedTask,
  statuses,
  taskDraft,
  onTaskDraftChange,
  onSaveTask,
  onDeleteTask,
  commentForm,
  onCommentChange,
  onCreateComment,
  taskComments,
  onDeleteComment,
  linkForm,
  onLinkChange,
  onCreateLink,
  taskLinks,
  onDeleteLink,
  attachmentForm,
  onAttachmentChange,
  onCreateAttachment,
  taskAttachments,
  onDeleteAttachment,
}) {
  if (!selectedTask) {
    return (
      <aside className="dashboard-card detail-panel empty-detail">
        <p className="auth-kicker">TASK DETAIL</p>
        <h3>Select a task</h3>
        <p className="auth-subtitle">
          Pick a task from the board to edit it and manage related activity.
        </p>
      </aside>
    );
  }

  const canDeleteTask = currentUser?.role === 'mentor';
  const canChangeIntern = currentUser?.role === 'mentor';

  return (
    <aside className="dashboard-card detail-panel">
      <div className="section-head">
        <div>
          <p className="auth-kicker">TASK DETAIL</p>
          <h3>{selectedTask.title}</h3>
        </div>
        {canDeleteTask && (
          <button className="danger-button" onClick={onDeleteTask} type="button">
            Delete task
          </button>
        )}
      </div>

      <div className="compact-form">
        <label>
          Title
          <input name="title" onChange={onTaskDraftChange} value={taskDraft.title} />
        </label>
        <label>
          Description
          <textarea
            name="description"
            onChange={onTaskDraftChange}
            value={taskDraft.description}
          />
        </label>
        <label>
          Status
          <select
            name="status_id"
            onChange={onTaskDraftChange}
            value={taskDraft.status_id}
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </label>
        {canChangeIntern && (
          <label>
            Intern
            <select
              name="intern_id"
              onChange={onTaskDraftChange}
              value={taskDraft.intern_id}
            >
              {mentorLinks.map((link) => (
                <option key={link.id} value={link.intern_id}>
                  {link.intern_id}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="primary-button" onClick={onSaveTask} type="button">
          Save task
        </button>
      </div>

      <div className="detail-grid">
        <section className="subpanel">
          <div className="subpanel-head">
            <h4>Comments</h4>
          </div>
          <form className="compact-form" onSubmit={onCreateComment}>
            <textarea
              name="content"
              onChange={onCommentChange}
              placeholder="Add a comment"
              value={commentForm.content}
            />
            <button className="secondary-button" type="submit">
              Add comment
            </button>
          </form>
          <div className="item-list">
            {taskComments.map((comment) => (
              <article className="item-card" key={comment.id}>
                <p>{comment.content}</p>
                <span>{comment.author_id.slice(0, 8)}</span>
                {comment.author_id === currentUser?.id && (
                  <button
                    className="text-button"
                    onClick={() => onDeleteComment(comment.id)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="subpanel">
          <div className="subpanel-head">
            <h4>Links</h4>
          </div>
          <form className="compact-form" onSubmit={onCreateLink}>
            <input
              name="title"
              onChange={onLinkChange}
              placeholder="Link title"
              value={linkForm.title}
            />
            <input
              name="url"
              onChange={onLinkChange}
              placeholder="https://..."
              value={linkForm.url}
            />
            <button className="secondary-button" type="submit">
              Add link
            </button>
          </form>
          <div className="item-list">
            {taskLinks.map((link) => (
              <article className="item-card" key={link.id}>
                <a href={link.url} rel="noreferrer" target="_blank">
                  {link.title}
                </a>
                <span>{link.author_id.slice(0, 8)}</span>
                {link.author_id === currentUser?.id && (
                  <button
                    className="text-button"
                    onClick={() => onDeleteLink(link.id)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="subpanel">
          <div className="subpanel-head">
            <h4>Attachments</h4>
          </div>
          <form className="compact-form" onSubmit={onCreateAttachment}>
            <input
              name="display_name"
              onChange={onAttachmentChange}
              placeholder="Display name"
              value={attachmentForm.display_name}
            />
            <input
              name="file_ref"
              onChange={onAttachmentChange}
              placeholder="File ref or URL"
              value={attachmentForm.file_ref}
            />
            <input
              name="source_type"
              onChange={onAttachmentChange}
              placeholder="Source type"
              value={attachmentForm.source_type}
            />
            <button className="secondary-button" type="submit">
              Add metadata
            </button>
          </form>
          <div className="item-list">
            {taskAttachments.map((attachment) => (
              <article className="item-card" key={attachment.id}>
                <p>{attachment.display_name}</p>
                <span>{attachment.file_ref}</span>
                {(attachment.author_id === currentUser?.id ||
                  currentUser?.role === 'mentor') && (
                  <button
                    className="text-button"
                    onClick={() => onDeleteAttachment(attachment.id)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
