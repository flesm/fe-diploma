import React, { useState } from 'react';
import { getDownloadUrl, uploadFileAsset } from '../fileService';
import { shortId } from '../shared/lib/user';
import { UserAvatar } from '../shared/ui/UserAvatar';

export function TaskDetail({
  currentUser,
  userMap,
  userNameMap,
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
        aria-modal="true"
        className="dashboard-card detail-panel jira-detail-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="task-detail-hero jira-task-detail-hero">
          <div className="task-detail-copy">
            <div className="jira-task-path">
              <span className="detail-badge">MD-{shortId(selectedTask.id)}</span>
              <span className="jira-task-path-separator">/</span>
              <span className="detail-badge subtle">
                {selectedTaskColumnName || 'Без статуса'}
              </span>
            </div>
            <h3>{selectedTask.title}</h3>
            <p className="auth-subtitle">
              Детальная карточка задачи с редактированием, обсуждением,
              материалами и вложениями в одном окне.
            </p>
          </div>

          <div className="task-detail-actions">
            <button className="icon-button" onClick={onClose} type="button">
              Закрыть
            </button>
            {canDeleteTask && (
              <button className="danger-button" onClick={onDeleteTask} type="button">
                Удалить
              </button>
            )}
          </div>
        </div>

        <div className="task-detail-summary jira-task-detail-summary">
          <span className="detail-badge subtle detail-user-badge">
            <UserAvatar
              size="xs"
              user={userMap?.[selectedTask.intern_id] || { id: selectedTask.intern_id }}
            />
            <span>
              {userNameMap?.[selectedTask.intern_id] || shortId(selectedTask.intern_id)}
            </span>
          </span>
        </div>

        <section className="task-detail-editor jira-detail-overview">
          <div className="section-head">
            <div>
              <p className="auth-kicker">OVERVIEW</p>
              <h4>Основная информация</h4>
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
                        {userNameMap?.[link.intern_id] || shortId(link.intern_id)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button className="primary-button" onClick={onSaveTask} type="button">
              Сохранить изменения
            </button>
          </div>
        </section>

        <div className="detail-grid task-detail-grid jira-task-detail-grid">
          <section className="subpanel jira-subpanel">
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
                Отправить
              </button>
            </form>
            <div className="item-list">
              {taskComments.map((comment) => (
                <article className="item-card detail-item-card" key={comment.id}>
                  <div className="item-card-meta">
                    <UserAvatar
                      size="xs"
                      user={userMap?.[comment.author_id] || { id: comment.author_id }}
                    />
                    <span>
                      {userNameMap?.[comment.author_id] || shortId(comment.author_id)}
                    </span>
                  </div>
                  <p>{comment.content}</p>
                  {comment.author_id === currentUser?.id && (
                    <button
                      className="text-button"
                      onClick={() => onDeleteComment(comment.id)}
                      type="button"
                    >
                      Удалить
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="subpanel jira-subpanel">
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
                <article className="item-card detail-item-card" key={link.id}>
                  <div className="item-card-meta">
                    <UserAvatar
                      size="xs"
                      user={userMap?.[link.author_id] || { id: link.author_id }}
                    />
                    <span>
                      {userNameMap?.[link.author_id] || shortId(link.author_id)}
                    </span>
                  </div>
                  <a href={link.url} rel="noreferrer" target="_blank">
                    {link.title}
                  </a>
                  {link.author_id === currentUser?.id && (
                    <button
                      className="text-button"
                      onClick={() => onDeleteLink(link.id)}
                      type="button"
                    >
                      Удалить
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="subpanel jira-subpanel">
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
                placeholder="Название файла"
                value={attachmentForm.display_name}
              />
              <input
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                type="file"
              />
              <button className="secondary-button" type="submit">
                Загрузить
              </button>
            </form>
            <div className="item-list">
              {taskAttachments.map((attachment) => (
                <article className="item-card detail-item-card" key={attachment.id}>
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
                      Удалить
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
