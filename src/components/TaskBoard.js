import React from 'react';

export function TaskBoard({ boardColumns, selectedTask, onSelectTask }) {
  return (
    <section className="board-area">
      {boardColumns.map((column) => (
        <article className="board-column" key={column.status.id}>
          <header className="board-column-head">
            <div>
              <h3>{column.status.name}</h3>
              <p>{column.tasks.length} tasks</p>
            </div>
          </header>

          <div className="board-task-list">
            {column.tasks.map((task) => (
              <button
                className={`task-card ${
                  selectedTask?.id === task.id ? 'selected' : ''
                }`}
                key={task.id}
                onClick={() => onSelectTask(task)}
                type="button"
              >
                <strong>{task.title}</strong>
                <p>{task.description || 'No description yet.'}</p>
                <span>Intern: {task.intern_id.slice(0, 8)}</span>
              </button>
            ))}

            {column.tasks.length === 0 && (
              <div className="task-card empty-card">No tasks in this column.</div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
