import React, { useState } from 'react';
import { UserAvatar } from '../shared/ui/UserAvatar';
import { shortId } from '../shared/lib/user';

export function TaskBoard({
  boardColumns,
  userMap,
  userNameMap,
  selectedTask,
  onMoveTask,
  onSelectTask,
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [hoveredStatusId, setHoveredStatusId] = useState(null);

  return (
    <section className="board-area jira-board-area">
      {boardColumns.map((column) => (
        <article
          className={`board-column jira-board-column ${
            hoveredStatusId === column.status.id ? 'board-column-active' : ''
          }`}
          key={column.status.id}
          onDragLeave={() => {
            if (hoveredStatusId === column.status.id) {
              setHoveredStatusId(null);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setHoveredStatusId(column.status.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const droppedTaskId =
              event.dataTransfer.getData('text/task-id') || draggedTaskId;
            setHoveredStatusId(null);
            setDraggedTaskId(null);
            if (droppedTaskId) {
              onMoveTask(droppedTaskId, column.status.id);
            }
          }}
        >
          <header className="board-column-head jira-board-column-head">
            <div className="board-column-copy">
              <span className="board-column-dot" />
              <h3>{column.status.name}</h3>
              <p>{column.tasks.length} задач</p>
            </div>
            <span className="column-chip jira-column-chip">
              {column.status.code || 'STATUS'}
            </span>
          </header>

          <div className="board-task-list">
            {column.tasks.map((task) => (
              <button
                className={`task-card jira-task-card ${
                  selectedTask?.id === task.id ? 'selected' : ''
                }`}
                draggable
                key={task.id}
                onClick={() => onSelectTask(task)}
                onDragEnd={() => {
                  setDraggedTaskId(null);
                  setHoveredStatusId(null);
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/task-id', task.id);
                  setDraggedTaskId(task.id);
                }}
                type="button"
              >
                <div className="task-card-assignee-top">
                  <UserAvatar
                    size="xs"
                    user={userMap?.[task.intern_id] || { id: task.intern_id }}
                  />
                  <span className="task-assignee-name">
                    {userNameMap?.[task.intern_id] || shortId(task.intern_id)}
                  </span>
                </div>

                <span className="task-key">MD-{shortId(task.id)}</span>

                <strong>{task.title}</strong>

                <p>
                  {task.description ||
                    'Описание пока не заполнено, но карточка уже в работе.'}
                </p>

                <div className="task-card-footer">
                  <span className="task-card-open">Открыть</span>
                </div>
              </button>
            ))}

            {column.tasks.length === 0 && (
              <div className="task-card empty-card jira-empty-card">
                Перетащите сюда задачу или создайте новую карточку.
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
