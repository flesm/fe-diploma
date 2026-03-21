import { useEffect, useState } from 'react';
import './App.css';
import { authRequest, coreRequest } from './api';
import { clearSession, loadSession, saveSession } from './storage';
import { LoginScreen, RegisterScreen } from './components/AuthScreen';
import { MentorToolbar } from './components/MentorToolbar';
import { TaskBoard } from './components/TaskBoard';
import { TaskDetail } from './components/TaskDetail';

const EMPTY_REGISTER_FORM = {
  email: '',
  hashed_password: '',
  first_name: '',
  last_name: '',
  role_id: '',
};

const EMPTY_LOGIN_FORM = {
  email: '',
  password: '',
};

const EMPTY_TASK_FORM = {
  title: '',
  description: '',
  intern_id: '',
  status_id: '',
};

const EMPTY_STATUS_FORM = {
  name: '',
  code: '',
  order_index: 50,
  is_default: false,
};

const EMPTY_LINK_FORM = {
  title: '',
  url: '',
};

const EMPTY_ATTACHMENT_FORM = {
  file_ref: '',
  display_name: '',
  source_type: 'link',
};

const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
};

function getPathname() {
  const { pathname } = window.location;
  if (pathname === ROUTES.login || pathname === ROUTES.register) {
    return pathname;
  }

  return ROUTES.home;
}

function getErrorMessage(error) {
  return error?.message || 'Request failed.';
}

function buildTaskDraft(task) {
  return {
    title: task?.title || '',
    description: task?.description || '',
    status_id: task?.status_id || '',
    intern_id: task?.intern_id || '',
  };
}

function App() {
  const [route, setRoute] = useState(() => getPathname());
  const [session, setSession] = useState(() => loadSession());
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [message, setMessage] = useState('');

  const [boardLoading, setBoardLoading] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [boardColumns, setBoardColumns] = useState([]);
  const [mentorLinks, setMentorLinks] = useState([]);
  const [myMentorLink, setMyMentorLink] = useState(null);
  const [selectedInternId, setSelectedInternId] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDraft, setTaskDraft] = useState(buildTaskDraft(null));
  const [taskComments, setTaskComments] = useState([]);
  const [taskLinks, setTaskLinks] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);

  const [internAssignId, setInternAssignId] = useState('');
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [statusForm, setStatusForm] = useState(EMPTY_STATUS_FORM);
  const [commentForm, setCommentForm] = useState({ content: '' });
  const [linkForm, setLinkForm] = useState(EMPTY_LINK_FORM);
  const [attachmentForm, setAttachmentForm] = useState(EMPTY_ATTACHMENT_FORM);

  useEffect(() => {
    bootstrap();

    function handlePopState() {
      setRoute(getPathname());
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      setCurrentUser(null);
      setBoardColumns([]);
      setStatuses([]);
      setMentorLinks([]);
      setMyMentorLink(null);
      setSelectedTask(null);
      if (route === ROUTES.home) {
        window.history.replaceState({}, '', ROUTES.login);
        setRoute(ROUTES.login);
      }
      return;
    }

    let cancelled = false;

    async function syncCurrentUser() {
      try {
        const data = await authRequest('/auth/me', {
          query: { token: accessToken },
        });

        if (!cancelled) {
          setCurrentUser(data);
          if (data?.role && session?.role !== data.role) {
            updateSession({
              ...session,
              role: data.role,
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(getErrorMessage(error));
        }
      }
    }

    syncCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [route, session]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!session?.access_token || !currentUser || route !== ROUTES.home) {
      return;
    }

    loadDashboardData();
  }, [
    currentUser,
    route,
    selectedInternId,
    selectedStatusFilter,
    session?.access_token,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedTask || !session?.access_token) {
      return;
    }

    loadTaskDetails(selectedTask.id);
  }, [selectedTask?.id, session?.access_token]);

  useEffect(() => {
    setTaskDraft(buildTaskDraft(selectedTask));
  }, [selectedTask]);

  async function bootstrap() {
    setBootstrapping(true);

    try {
      const fetchedRoles = await authRequest('/role');
      const nextRoles = Array.isArray(fetchedRoles) ? fetchedRoles : [];
      setRoles(nextRoles);

      const defaultRole =
        nextRoles.find((role) => role.name === 'intern') ||
        nextRoles.find((role) => role.name === 'common');
      if (defaultRole) {
        setRegisterForm((current) => ({
          ...current,
          role_id: current.role_id || defaultRole.id,
        }));
      }
    } catch (error) {
      setMessage(`Could not load roles: ${getErrorMessage(error)}`);
    } finally {
      setBootstrapping(false);
    }
  }

  function navigateTo(nextRoute, replace = false) {
    if (nextRoute === route) {
      return;
    }

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextRoute);
    setRoute(nextRoute);
    setMessage('');
  }

  function updateSession(nextSession) {
    setSession(nextSession);

    if (nextSession) {
      saveSession(nextSession);
    } else {
      clearSession();
    }
  }

  function updateRegisterForm(event) {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  function updateLoginForm(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updateTaskForm(event) {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
  }

  function updateStatusForm(event) {
    const { name, value, checked, type } = event.target;
    setStatusForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function updateTaskDraft(event) {
    const { name, value } = event.target;
    setTaskDraft((current) => ({ ...current, [name]: value }));
  }

  function updateLinkForm(event) {
    const { name, value } = event.target;
    setLinkForm((current) => ({ ...current, [name]: value }));
  }

  function updateAttachmentForm(event) {
    const { name, value } = event.target;
    setAttachmentForm((current) => ({ ...current, [name]: value }));
  }

  async function runRequest(action, successMessage) {
    setLoading(true);
    try {
      const result = await action();
      if (successMessage) {
        setMessage(successMessage);
      }
      return result;
    } catch (error) {
      setMessage(getErrorMessage(error));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboardData() {
    setBoardLoading(true);

    try {
      const [fetchedStatuses, fetchedBoard] = await Promise.all([
        coreRequest('/task-statuses', {
          token: session.access_token,
        }),
        coreRequest('/tasks/board', {
          token: session.access_token,
          query: {
            intern_id:
              currentUser.role === 'mentor' && selectedInternId
                ? selectedInternId
                : undefined,
            status_id: selectedStatusFilter || undefined,
          },
        }),
      ]);

      const nextStatuses = Array.isArray(fetchedStatuses) ? fetchedStatuses : [];
      setStatuses(nextStatuses);
      setBoardColumns(Array.isArray(fetchedBoard) ? fetchedBoard : []);

      if (currentUser.role === 'mentor') {
        const links = await coreRequest('/mentor-intern-links', {
          token: session.access_token,
        });
        const nextLinks = Array.isArray(links) ? links : [];
        setMentorLinks(nextLinks);

        if (!selectedInternId && nextLinks[0]?.intern_id) {
          setSelectedInternId(nextLinks[0].intern_id);
        }

        setTaskForm((current) => ({
          ...current,
          intern_id:
            current.intern_id ||
            selectedInternId ||
            nextLinks[0]?.intern_id ||
            '',
          status_id:
            current.status_id ||
            nextStatuses.find((status) => status.is_default)?.id ||
            nextStatuses[0]?.id ||
            '',
        }));
      } else {
        const mentor = await coreRequest('/mentor-intern-links/my-mentor', {
          token: session.access_token,
        });
        setMyMentorLink(mentor || null);
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBoardLoading(false);
    }
  }

  async function loadTaskDetails(taskId) {
    try {
      const [task, comments, links, attachments] = await Promise.all([
        coreRequest(`/tasks/${taskId}`, {
          token: session.access_token,
        }),
        coreRequest(`/tasks/${taskId}/comments`, {
          token: session.access_token,
        }),
        coreRequest(`/tasks/${taskId}/links`, {
          token: session.access_token,
        }),
        coreRequest(`/tasks/${taskId}/attachments`, {
          token: session.access_token,
        }),
      ]);

      setSelectedTask(task);
      setTaskComments(Array.isArray(comments) ? comments : []);
      setTaskLinks(Array.isArray(links) ? links : []);
      setTaskAttachments(Array.isArray(attachments) ? attachments : []);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const data = await runRequest(
      () =>
        authRequest('/user/register', {
          method: 'POST',
          body: registerForm,
        }),
      'Account created. Check your email for verification.'
    );

    if (data) {
      setRegisterForm((current) => ({
        ...EMPTY_REGISTER_FORM,
        role_id: current.role_id,
      }));
      navigateTo(ROUTES.login);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const data = await runRequest(
      () =>
        authRequest('/auth/login', {
          method: 'POST',
          body: loginForm,
        }),
      'Signed in.'
    );

    if (data) {
      updateSession({
        ...data,
        role: null,
      });
      setLoginForm(EMPTY_LOGIN_FORM);
      navigateTo(ROUTES.home);
    }
  }

  async function handleRefreshToken() {
    if (!session?.refresh_token) {
      setMessage('Sign in first to refresh the token.');
      return;
    }

    const nextAccessToken = await runRequest(
      () =>
        authRequest('/auth/token/refresh', {
          method: 'POST',
          query: { token: session.refresh_token },
        }),
      'Access token refreshed.'
    );

    if (nextAccessToken) {
      updateSession({
        ...session,
        access_token: nextAccessToken,
      });
    }
  }

  function handleLogout() {
    updateSession(null);
    setCurrentUser(null);
    setMessage('');
    navigateTo(ROUTES.login, true);
  }

  async function handleAssignIntern(event) {
    event.preventDefault();
    if (!internAssignId) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest('/mentor-intern-links', {
          method: 'POST',
          token: session.access_token,
          body: { intern_id: internAssignId },
        }),
      'Intern assigned.'
    );

    if (data) {
      setInternAssignId('');
      await loadDashboardData();
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    const data = await runRequest(
      () =>
        coreRequest('/tasks', {
          method: 'POST',
          token: session.access_token,
          body: taskForm,
        }),
      'Task created.'
    );

    if (data) {
      setTaskForm({
        ...EMPTY_TASK_FORM,
        intern_id: selectedInternId || mentorLinks[0]?.intern_id || '',
        status_id:
          statuses.find((status) => status.is_default)?.id ||
          statuses[0]?.id ||
          '',
      });
      await loadDashboardData();
      setSelectedTask(data);
    }
  }

  async function handleCreateStatus(event) {
    event.preventDefault();

    const data = await runRequest(
      () =>
        coreRequest('/task-statuses', {
          method: 'POST',
          token: session.access_token,
          body: {
            ...statusForm,
            order_index: Number(statusForm.order_index),
          },
        }),
      'Status created.'
    );

    if (data) {
      setStatusForm(EMPTY_STATUS_FORM);
      await loadDashboardData();
    }
  }

  async function handleSaveTask() {
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          token: session.access_token,
          body: {
            title: taskDraft.title,
            description: taskDraft.description,
            status_id: taskDraft.status_id,
            intern_id:
              currentUser.role === 'mentor'
                ? taskDraft.intern_id || selectedTask.intern_id
                : selectedTask.intern_id,
          },
        }),
      'Task updated.'
    );

    if (data) {
      await loadDashboardData();
      await loadTaskDetails(selectedTask.id);
    }
  }

  async function handleDeleteTask() {
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}`, {
          method: 'DELETE',
          token: session.access_token,
        }),
      'Task deleted.'
    );

    if (data !== null) {
      setSelectedTask(null);
      setTaskComments([]);
      setTaskLinks([]);
      setTaskAttachments([]);
      await loadDashboardData();
    }
  }

  async function handleCreateComment(event) {
    event.preventDefault();
    if (!selectedTask || !commentForm.content.trim()) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/comments`, {
          method: 'POST',
          token: session.access_token,
          body: commentForm,
        }),
      'Comment added.'
    );

    if (data) {
      setCommentForm({ content: '' });
      await loadTaskDetails(selectedTask.id);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/comments/${commentId}`, {
          method: 'DELETE',
          token: session.access_token,
        }),
      'Comment deleted.'
    );

    if (data !== null) {
      await loadTaskDetails(selectedTask.id);
    }
  }

  async function handleCreateLink(event) {
    event.preventDefault();
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/links`, {
          method: 'POST',
          token: session.access_token,
          body: linkForm,
        }),
      'Link added.'
    );

    if (data) {
      setLinkForm(EMPTY_LINK_FORM);
      await loadTaskDetails(selectedTask.id);
    }
  }

  async function handleDeleteLink(linkId) {
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/links/${linkId}`, {
          method: 'DELETE',
          token: session.access_token,
        }),
      'Link deleted.'
    );

    if (data !== null) {
      await loadTaskDetails(selectedTask.id);
    }
  }

  async function handleCreateAttachment(event) {
    event.preventDefault();
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/attachments`, {
          method: 'POST',
          token: session.access_token,
          body: attachmentForm,
        }),
      'Attachment metadata added.'
    );

    if (data) {
      setAttachmentForm(EMPTY_ATTACHMENT_FORM);
      await loadTaskDetails(selectedTask.id);
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    if (!selectedTask) {
      return;
    }

    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/attachments/${attachmentId}`, {
          method: 'DELETE',
          token: session.access_token,
        }),
      'Attachment metadata deleted.'
    );

    if (data !== null) {
      await loadTaskDetails(selectedTask.id);
    }
  }

  if (route !== ROUTES.home) {
    return (
      <>
        <main className="auth-layout">
          <section className="auth-card">
            {route === ROUTES.login && (
              <LoginScreen
                loading={loading}
                loginForm={loginForm}
                onChange={updateLoginForm}
                onNavigateRegister={() => navigateTo(ROUTES.register)}
                onSubmit={handleLogin}
              />
            )}
            {route === ROUTES.register && (
              <RegisterScreen
                loading={loading}
                onChange={updateRegisterForm}
                onNavigateLogin={() => navigateTo(ROUTES.login)}
                onSubmit={handleRegister}
                registerForm={registerForm}
                roles={roles}
              />
            )}
            {message && <p className="auth-message">{message}</p>}
          </section>
        </main>

        {bootstrapping && (
          <div className="loading-overlay">
            <div className="loading-card">Loading...</div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <main className="dashboard-layout">
        <section className="dashboard-shell">
          <header className="dashboard-header">
            <div>
              <p className="auth-kicker">TASK BOARD</p>
              <h1>
                {currentUser?.first_name
                  ? `Hello, ${currentUser.first_name}`
                  : 'Task board'}
              </h1>
              <p className="auth-subtitle">
                {currentUser?.role === 'mentor'
                  ? 'Manage interns, create tasks, and move work between columns.'
                  : 'Track your assigned tasks and update progress.'}
              </p>
              {currentUser?.role === 'intern' && myMentorLink && (
                <p className="auth-subtitle">Mentor: {myMentorLink.mentor_id}</p>
              )}
            </div>

            <div className="header-actions">
              <select
                className="header-select"
                onChange={(event) => setSelectedStatusFilter(event.target.value)}
                value={selectedStatusFilter}
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
              <button className="secondary-button" onClick={handleRefreshToken} type="button">
                Refresh token
              </button>
              <button className="secondary-button" onClick={loadDashboardData} type="button">
                Reload board
              </button>
              <button className="primary-button" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          </header>

          {currentUser?.role === 'mentor' && (
            <MentorToolbar
              internAssignId={internAssignId}
              loading={loading}
              mentorLinks={mentorLinks}
              onAssignIntern={handleAssignIntern}
              onCreateStatus={handleCreateStatus}
              onCreateTask={handleCreateTask}
              onInternAssignChange={(event) => setInternAssignId(event.target.value)}
              onSelectIntern={setSelectedInternId}
              onStatusFormChange={updateStatusForm}
              onTaskFormChange={updateTaskForm}
              selectedInternId={selectedInternId}
              statusForm={statusForm}
              statuses={statuses}
              taskForm={taskForm}
            />
          )}

          <div className="dashboard-main">
            <section className="dashboard-card board-panel">
              <div className="section-head">
                <div>
                  <p className="auth-kicker">BOARD</p>
                  <h3>Tasks by status</h3>
                </div>
                {boardLoading && <span className="inline-note">Loading...</span>}
              </div>
              <TaskBoard
                boardColumns={boardColumns}
                onSelectTask={setSelectedTask}
                selectedTask={selectedTask}
              />
            </section>

            <TaskDetail
              attachmentForm={attachmentForm}
              currentUser={currentUser}
              commentForm={commentForm}
              linkForm={linkForm}
              mentorLinks={mentorLinks}
              onAttachmentChange={updateAttachmentForm}
              onCommentChange={(event) =>
                setCommentForm({ content: event.target.value })
              }
              onCreateAttachment={handleCreateAttachment}
              onCreateComment={handleCreateComment}
              onCreateLink={handleCreateLink}
              onDeleteAttachment={handleDeleteAttachment}
              onDeleteComment={handleDeleteComment}
              onDeleteLink={handleDeleteLink}
              onDeleteTask={handleDeleteTask}
              onLinkChange={updateLinkForm}
              onSaveTask={handleSaveTask}
              onTaskDraftChange={updateTaskDraft}
              selectedTask={selectedTask}
              statuses={statuses}
              taskAttachments={taskAttachments}
              taskComments={taskComments}
              taskDraft={taskDraft}
              taskLinks={taskLinks}
            />
          </div>

          {message && <p className="auth-message dashboard-message">{message}</p>}
        </section>
      </main>

      {bootstrapping && (
        <div className="loading-overlay">
          <div className="loading-card">Loading...</div>
        </div>
      )}
    </>
  );
}

export default App;
