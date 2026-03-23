/* eslint-disable no-use-before-define */
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { authRequest, coreRequest } from './api';
import { clearSession, loadSession, saveSession } from './storage';
import { LoginScreen, RegisterScreen } from './components/AuthScreen';
import { ChatModal } from './components/ChatModal';
import { MaterialsPage } from './components/MaterialsPage';
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

const EMPTY_INTERN_SEARCH = '';

const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  materials: '/materials',
};

function getPathname() {
  const { pathname } = window.location;
  if (
    pathname === ROUTES.login ||
    pathname === ROUTES.register ||
    pathname === ROUTES.materials
  ) {
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

function shortId(value) {
  return value ? String(value).slice(0, 8) : 'Unknown';
}

function buildUserFullName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return fullName || shortId(user?.id);
}

function Modal({ title, subtitle, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-head">
          <div>
            <p className="auth-kicker">QUICK ACTION</p>
            <h3>{title}</h3>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
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
  const [internDirectory, setInternDirectory] = useState([]);
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
  const [internSearch, setInternSearch] = useState(EMPTY_INTERN_SEARCH);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const selectedTaskColumnName = useMemo(
    () =>
      statuses.find((status) => status.id === selectedTask?.status_id)?.name || '',
    [selectedTask?.status_id, statuses]
  );

  const visibleInternOptions = useMemo(() => {
    if (currentUser?.role !== 'mentor') {
      return [];
    }

    return mentorLinks.map((link) => ({
      id: link.id,
      value: link.intern_id,
      label:
        buildUserFullName(
          internDirectory.find((user) => user.id === link.intern_id)
        ) || shortId(link.intern_id),
    }));
  }, [currentUser?.role, internDirectory, mentorLinks]);

  const filteredInternDirectory = useMemo(() => {
    const query = internSearch.trim().toLowerCase();
    const assignedInternIds = new Set(mentorLinks.map((link) => link.intern_id));

    return internDirectory
      .filter((user) => !assignedInternIds.has(user.id))
      .filter((user) => {
        if (!query) {
          return true;
        }

        const haystack = `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''}`.toLowerCase();
        return haystack.includes(query);
      });
  }, [internDirectory, internSearch, mentorLinks]);

  const internNameMap = useMemo(() => {
    return internDirectory.reduce((accumulator, user) => {
      accumulator[user.id] = buildUserFullName(user);
      return accumulator;
    }, {});
  }, [internDirectory]);

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

  function updateAttachmentDraft(nextForm) {
    setAttachmentForm(nextForm);
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

  const loadDashboardData = useCallback(async () => {
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

      try {
        const fetchedInterns = await authRequest('/profile', {
          token: session.access_token,
          query: {
            filter_role: 'intern',
            limit: 200,
          },
        });
        setInternDirectory(Array.isArray(fetchedInterns) ? fetchedInterns : []);
      } catch {
        setInternDirectory([]);
      }

      if (currentUser.role === 'mentor') {
        const links = await coreRequest('/mentor-intern-links', {
          token: session.access_token,
        });
        const nextLinks = Array.isArray(links) ? links : [];
        setMentorLinks(nextLinks);

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
  }, [
    currentUser?.role,
    selectedInternId,
    selectedStatusFilter,
    session?.access_token,
  ]);

  const loadTaskDetails = useCallback(async (taskId) => {
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
  }, [session?.access_token]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!session?.access_token || !currentUser || route !== ROUTES.home) {
      return;
    }

    loadDashboardData();
  }, [currentUser, loadDashboardData, route, session?.access_token]);

  useEffect(() => {
    if (!selectedTask || !session?.access_token) {
      return;
    }

    loadTaskDetails(selectedTask.id);
  }, [loadTaskDetails, selectedTask, session?.access_token]);

  useEffect(() => {
    setTaskDraft(buildTaskDraft(selectedTask));
  }, [selectedTask]);

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
      setInternSearch(EMPTY_INTERN_SEARCH);
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
      setIsTaskModalOpen(false);
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
      setIsStatusModalOpen(false);
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

  async function handleMoveTask(taskId, nextStatusId) {
    const task = boardColumns
      .flatMap((column) => column.tasks)
      .find((item) => item.id === taskId);

    if (!task || task.status_id === nextStatusId) {
      return;
    }

    const previousColumns = boardColumns;
    const nextColumns = boardColumns.map((column) => {
      if (column.status.id === task.status_id) {
        return {
          ...column,
          tasks: column.tasks.filter((item) => item.id !== taskId),
        };
      }

      if (column.status.id === nextStatusId) {
        return {
          ...column,
          tasks: [
            {
              ...task,
              status_id: nextStatusId,
            },
            ...column.tasks,
          ],
        };
      }

      return column;
    });

    setBoardColumns(nextColumns);
    if (selectedTask?.id === taskId) {
      setSelectedTask((current) =>
        current ? { ...current, status_id: nextStatusId } : current
      );
      setTaskDraft((current) => ({ ...current, status_id: nextStatusId }));
    }

    const response = await runRequest(
      () =>
        coreRequest(`/tasks/${taskId}`, {
          method: 'PATCH',
          token: session.access_token,
          body: {
            title: task.title,
            description: task.description,
            status_id: nextStatusId,
            intern_id: task.intern_id,
          },
        }),
      'Task moved.'
    );

    if (!response) {
      setBoardColumns(previousColumns);
      if (selectedTask?.id === taskId) {
        setSelectedTask((current) =>
          current ? { ...current, status_id: task.status_id } : current
        );
        setTaskDraft((current) => ({ ...current, status_id: task.status_id }));
      }
      return;
    }

    await loadDashboardData();
    if (selectedTask?.id === taskId) {
      await loadTaskDetails(taskId);
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

  async function handleCreateAttachment(customAttachment = null) {
    if (!selectedTask) {
      return;
    }

    const payload = customAttachment || attachmentForm;
    const data = await runRequest(
      () =>
        coreRequest(`/tasks/${selectedTask.id}/attachments`, {
          method: 'POST',
          token: session.access_token,
          body: payload,
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

  if (route === ROUTES.materials) {
    return (
      <MaterialsPage
        currentUser={currentUser}
        mentorInternOptions={visibleInternOptions}
        onBack={() => navigateTo(ROUTES.home)}
        token={session?.access_token}
      />
    );
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
        <section className="dashboard-shell jira-shell">
          <header className="dashboard-header jira-header">
            <div className="header-copy">
              <p className="auth-kicker">WORK ITEMS</p>
              <h1>
                {currentUser?.first_name
                  ? `Здравствуйте, ${currentUser.first_name}`
                  : 'Task board'}
              </h1>
              <p className="auth-subtitle">
                {currentUser?.role === 'mentor'
                  ? 'Колонки работают как в Jira: открывайте карточку справа и перетаскивайте задачи между статусами.'
                  : 'Следите за задачами по статусам и открывайте детали в боковой панели.'}
              </p>
              {currentUser?.role === 'intern' && myMentorLink && (
                <p className="auth-subtitle">Mentor: {shortId(myMentorLink.mentor_id)}</p>
              )}
            </div>

            <div className="header-actions jira-actions">
              <button
                className="secondary-button"
                onClick={() => navigateTo(ROUTES.materials)}
                type="button"
              >
                МАТЕРИАЛЫ
              </button>
              {currentUser?.role === 'mentor' && (
                <>
                  <button
                    className="primary-button"
                    onClick={() => setIsTaskModalOpen(true)}
                    type="button"
                  >
                    Создание задачи
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setIsStatusModalOpen(true)}
                    type="button"
                  >
                    Добавление статуса
                  </button>
                </>
              )}
              <select
                className="header-select"
                onChange={(event) => setSelectedStatusFilter(event.target.value)}
                value={selectedStatusFilter}
              >
                <option value="">Все статусы</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
              {currentUser?.role === 'mentor' && (
                <select
                  className="header-select"
                  onChange={(event) => setSelectedInternId(event.target.value)}
                  value={selectedInternId}
                >
                  <option value="">Все исполнители</option>
                  {visibleInternOptions.map((intern) => (
                    <option key={intern.id} value={intern.value}>
                      {intern.label}
                    </option>
                  ))}
                </select>
              )}
              <button className="secondary-button" onClick={loadDashboardData} type="button">
                Обновить
              </button>
              <button className="secondary-button" onClick={() => setIsChatOpen(true)} type="button">
                ЧАТ
              </button>
              <button className="secondary-button" onClick={handleRefreshToken} type="button">
                Refresh token
              </button>
              <button className="ghost-button" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          </header>

          {currentUser?.role === 'mentor' && (
            <section className="dashboard-card helper-bar">
              <div className="helper-grid">
                <div>
                  <p className="auth-kicker">MENTOR ACCESS</p>
                  <h3>Привязка стажёра</h3>
                  <p className="auth-subtitle">
                    Найдите стажёра по имени или фамилии и привяжите его к ментору.
                  </p>
                </div>
                <form className="inline-form" onSubmit={handleAssignIntern}>
                  <div className="search-select">
                    <input
                      onChange={(event) => setInternSearch(event.target.value)}
                      placeholder="Поиск стажёра"
                      value={internSearch}
                    />
                    <div className="search-results">
                      {filteredInternDirectory.slice(0, 8).map((intern) => (
                        <button
                          className={`search-result-item ${
                            internAssignId === intern.id ? 'active' : ''
                          }`}
                          key={intern.id}
                          onClick={() => setInternAssignId(intern.id)}
                          type="button"
                        >
                          <strong>{buildUserFullName(intern)}</strong>
                          <span>{intern.email || shortId(intern.id)}</span>
                        </button>
                      ))}
                      {filteredInternDirectory.length === 0 && (
                        <div className="search-result-empty">Ничего не найдено</div>
                      )}
                    </div>
                  </div>
                  <button className="primary-button" disabled={loading} type="submit">
                    Assign intern
                  </button>
                </form>
              </div>
            </section>
          )}

          <div className={`dashboard-main jira-main ${selectedTask ? 'with-detail' : 'without-detail'}`}>
            <section className="dashboard-card board-panel jira-board-panel">
              <div className="section-head">
                <div>
                  <p className="auth-kicker">BOARD</p>
                  <h3>Таблица задач по статусам</h3>
                </div>
                {boardLoading ? (
                  <span className="inline-note">Загрузка...</span>
                ) : (
                  <span className="inline-note">{boardColumns.length} columns</span>
                )}
              </div>
              <TaskBoard
                boardColumns={boardColumns}
                internNameMap={internNameMap}
                onMoveTask={handleMoveTask}
                onSelectTask={setSelectedTask}
                selectedTask={selectedTask}
              />
            </section>
          </div>

          {message && <p className="auth-message dashboard-message">{message}</p>}
        </section>
      </main>

      <TaskDetail
        attachmentForm={attachmentForm}
        commentForm={commentForm}
        currentUser={currentUser}
        linkForm={linkForm}
        mentorLinks={mentorLinks}
        internNameMap={internNameMap}
        onAttachmentDraftChange={updateAttachmentDraft}
        onClose={() => setSelectedTask(null)}
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
        selectedTaskColumnName={selectedTaskColumnName}
        statuses={statuses}
        taskAttachments={taskAttachments}
        taskComments={taskComments}
        taskDraft={taskDraft}
        taskLinks={taskLinks}
        token={session?.access_token}
      />

      <ChatModal
        currentUser={currentUser}
        internNameMap={internNameMap}
        mentorInternOptions={visibleInternOptions}
        onClose={() => setIsChatOpen(false)}
        open={isChatOpen}
        token={session?.access_token}
      />

      {isTaskModalOpen && (
        <Modal
          onClose={() => setIsTaskModalOpen(false)}
          subtitle="Форма создания новой задачи открывается поверх доски."
          title="Создание задачи"
        >
          <form className="compact-form" onSubmit={handleCreateTask}>
            <label>
              Название
              <input name="title" onChange={updateTaskForm} value={taskForm.title} />
            </label>
            <label>
              Описание
              <textarea
                name="description"
                onChange={updateTaskForm}
                value={taskForm.description}
              />
            </label>
            {currentUser?.role === 'mentor' && (
              <label>
                Исполнитель
                <select
                  name="intern_id"
                  onChange={updateTaskForm}
                  value={taskForm.intern_id}
                >
                  <option value="">Выберите стажёра</option>
                  {visibleInternOptions.map((intern) => (
                    <option key={intern.id} value={intern.value}>
                      {intern.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Статус
              <select
                name="status_id"
                onChange={updateTaskForm}
                value={taskForm.status_id}
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setIsTaskModalOpen(false)}
                type="button"
              >
                Отмена
              </button>
              <button className="primary-button" disabled={loading} type="submit">
                Создать задачу
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isStatusModalOpen && (
        <Modal
          onClose={() => setIsStatusModalOpen(false)}
          subtitle="Новый статус сразу появится отдельной колонкой на доске."
          title="Добавление статуса"
        >
          <form className="compact-form" onSubmit={handleCreateStatus}>
            <label>
              Название
              <input name="name" onChange={updateStatusForm} value={statusForm.name} />
            </label>
            <label>
              Код
              <input name="code" onChange={updateStatusForm} value={statusForm.code} />
            </label>
            <label>
              Порядок
              <input
                name="order_index"
                onChange={updateStatusForm}
                type="number"
                value={statusForm.order_index}
              />
            </label>
            <label className="checkbox-row">
              <input
                checked={statusForm.is_default}
                name="is_default"
                onChange={updateStatusForm}
                type="checkbox"
              />
              Сделать статусом по умолчанию
            </label>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setIsStatusModalOpen(false)}
                type="button"
              >
                Отмена
              </button>
              <button className="primary-button" disabled={loading} type="submit">
                Добавить статус
              </button>
            </div>
          </form>
        </Modal>
      )}

      {bootstrapping && (
        <div className="loading-overlay">
          <div className="loading-card">Loading...</div>
        </div>
      )}
    </>
  );
}

export default App;
