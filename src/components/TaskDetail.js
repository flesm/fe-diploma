import React, { useState } from 'react';
import { getDownloadUrl, uploadFileAsset } from '../fileService';

function shortId(value) {
  return value ? String(value).slice(0, 8) : 'Unknown';
}

export function TaskDetail({
  currentUser,
  internNameMap,
  mentorLinks,
  selectedTask,
  selectedTaskColumnName,
  statuses,
  taskDraft,
  onTaskDraftChange,
  onSaveTask,
  onDeleteTask,
  onClose,
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
  onAttachmentDraftChange,
  onCreateAttachment,
  taskAttachments,
  onDeleteAttachment,
  token,
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  if (!selectedTask) {
    return null;
  }

  const canDeleteTask = currentUser?.role === 'mentor';
  const canChangeIntern = currentUser?.role === 'mentor';

  async function handleAttachmentSubmit(event) {
    event.preventDefault();
    if (!selectedFile || !token) {
      return;
    }

    const uploaded = await uploadFileAsset(token, selectedFile, 'task');
    await onCreateAttachment({
      file_ref: uploaded.id,
      display_name: attachmentForm.display_name || uploaded.file_name,
      source_type: 'file-service',
    });
    setSelectedFile(null);
  }

  return (
    <div className="detail-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="dashboard-card detail-panel jira-detail-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-head detail-panel-head">
          <div>
            <p className="auth-kicker">DETAIL PANEL</p>
            <h3>{selectedTask.title}</h3>
            <div className="detail-meta-row">
              <span className="detail-badge">TASK-{shortId(selectedTask.id)}</span>
              <span className="detail-badge subtle">{selectedTaskColumnName || 'Без статуса'}</span>
              <span className="detail-badge subtle">
                Исполнитель {internNameMap?.[selectedTask.intern_id] || shortId(selectedTask.intern_id)}
              </span>
            </div>
          </div>
          <div className="detail-head-actions">
            <button className="icon-button" onClick={onClose} type="button">
              Закрыть
            </button>
            {canDeleteTask && (
              <button className="danger-button" onClick={onDeleteTask} type="button">
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="compact-form detail-form">
          <label>
            Название
            <input name="title" onChange={onTaskDraftChange} value={taskDraft.title} />
          </label>
          <label>
            Описание
            <textarea
              name="description"
              onChange={onTaskDraftChange}
              value={taskDraft.description}
            />
          </label>
          <div className="detail-fields-row">
            <label>
              Статус
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
                Исполнитель
                <select
                  name="intern_id"
                  onChange={onTaskDraftChange}
                  value={taskDraft.intern_id}
                >
                  {mentorLinks.map((link) => (
                    <option key={link.id} value={link.intern_id}>
                      {internNameMap?.[link.intern_id] || shortId(link.intern_id)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button className="primary-button" onClick={onSaveTask} type="button">
            Сохранить
          </button>
        </div>

        <div className="detail-grid">
          <section className="subpanel">
            <div className="subpanel-head">
              <h4>Комментарии</h4>
            </div>
            <form className="compact-form" onSubmit={onCreateComment}>
              <textarea
                name="content"
                onChange={onCommentChange}
                placeholder="Добавьте комментарий"
                value={commentForm.content}
              />
              <button className="secondary-button" type="submit">
                Добавить комментарий
              </button>
            </form>
            <div className="item-list">
              {taskComments.map((comment) => (
                <article className="item-card" key={comment.id}>
                  <p>{comment.content}</p>
                  <span>{shortId(comment.author_id)}</span>
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
              <h4>Ссылки</h4>
            </div>
            <form className="compact-form" onSubmit={onCreateLink}>
              <input
                name="title"
                onChange={onLinkChange}
                placeholder="Название ссылки"
                value={linkForm.title}
              />
              <input
                name="url"
                onChange={onLinkChange}
                placeholder="https://..."
                value={linkForm.url}
              />
              <button className="secondary-button" type="submit">
                Добавить ссылку
              </button>
            </form>
            <div className="item-list">
              {taskLinks.map((link) => (
                <article className="item-card" key={link.id}>
                  <a href={link.url} rel="noreferrer" target="_blank">
                    {link.title}
                  </a>
                  <span>{shortId(link.author_id)}</span>
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
              <h4>Вложения</h4>
            </div>
            <form className="compact-form" onSubmit={handleAttachmentSubmit}>
              <input
                onChange={(event) =>
                  onAttachmentDraftChange({
                    ...attachmentForm,
                    display_name: event.target.value,
                  })
                }
                placeholder="Отображаемое имя"
                value={attachmentForm.display_name}
              />
              <input
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                type="file"
              />
              <button className="secondary-button" type="submit">
                Добавить вложение
              </button>
            </form>
            <div className="item-list">
              {taskAttachments.map((attachment) => (
                <article className="item-card" key={attachment.id}>
                  <p>{attachment.display_name}</p>
                  <button
                    className="text-button"
                    onClick={async () => {
                      const response = await getDownloadUrl(token, attachment.file_ref);
                      window.open(response.download_url, '_blank', 'noopener,noreferrer');
                    }}
                    type="button"
                  >
                    Открыть файл
                  </button>
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
    </div>
  );
}
