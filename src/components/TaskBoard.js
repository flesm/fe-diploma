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
    <section className="board-area">
      {boardColumns.map((column) => (
        <article
          className={`board-column ${
            hoveredStatusId === column.status.id ? 'board-column-active' : ''
          }`}
          key={column.status.id}
          onDragOver={(event) => {
            event.preventDefault();
            setHoveredStatusId(column.status.id);
          }}
          onDragLeave={() => {
            if (hoveredStatusId === column.status.id) {
              setHoveredStatusId(null);
            }
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
          <header className="board-column-head">
            <div>
              <h3>{column.status.name}</h3>
              <p>{column.tasks.length} tasks</p>
            </div>
            <span className="column-chip">{column.status.code || 'STATUS'}</span>
          </header>

          <div className="board-task-list">
            {column.tasks.map((task) => (
              <button
                className={`task-card ${
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
                <div className="task-card-topline">
                  <span className="task-key">TASK-{shortId(task.id)}</span>
                  <span className="task-assignee">
                    <UserAvatar size="xs" user={userMap?.[task.intern_id] || { id: task.intern_id }} />
                    <span>{userNameMap?.[task.intern_id] || shortId(task.intern_id)}</span>
                  </span>
                </div>
                <strong>{task.title}</strong>
                <p>{task.description || 'Нет описания.'}</p>
              </button>
            ))}

            {column.tasks.length === 0 && (
              <div className="task-card empty-card">
                Перетащите сюда задачу или создайте новую.
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
