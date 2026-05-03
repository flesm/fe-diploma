/* eslint-disable no-use-before-define */
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  authRequest,
  coreRequest,
  registerAuthFailureHandler,
} from './api';
import { clearSession, loadSession, saveSession } from './storage';
import { LoginScreen, RegisterScreen } from './components/AuthScreen';
import { ChatModal } from './components/ChatModal';
import { MaterialsPage } from './components/MaterialsPage';
import { TaskBoard } from './components/TaskBoard';
import { TaskDetail } from './components/TaskDetail';
import { buildUserFullName, shortId } from './shared/lib/user';

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
const EMPTY_PROFILE_FORM = {
  first_name: '',
  last_name: '',
  avatar_url: '',
};

const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  materials: '/materials',
};

const SESSION_EXPIRED_MESSAGE = 'Сессия истекла. Выполнен автоматический выход.';

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

const SESSION_EXPIRED_COPY =
  typeof SESSION_EXPIRED_MESSAGE === 'string' &&
  !SESSION_EXPIRED_MESSAGE.includes('Р')
    ? SESSION_EXPIRED_MESSAGE
    : 'Сессия истекла. Выполнен автоматический выход.';

function profileAvatarKey(userId) {
  return `mentor-desk-avatar-${userId}`;
}

function loadLocalAvatar(userId) {
  if (!userId) {
    return '';
  }

  try {
    return window.localStorage.getItem(profileAvatarKey(userId)) || '';
  } catch {
    return '';
  }
}

function saveLocalAvatar(userId, avatarUrl) {
  if (!userId) {
    return;
  }

  try {
    if (avatarUrl) {
      window.localStorage.setItem(profileAvatarKey(userId), avatarUrl);
    } else {
      window.localStorage.removeItem(profileAvatarKey(userId));
    }
  } catch {
    // ignore local storage errors
  }
}

function withLocalAvatar(user) {
  if (!user) {
    return user;
  }

  const avatarUrl = loadLocalAvatar(user.id);

  if (!avatarUrl) {
    return user;
  }

  return {
    ...user,
    avatar_url: avatarUrl,
  };
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
  const [userDirectory, setUserDirectory] = useState([]);
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);

  const selectedTaskColumnName = useMemo(
    () =>
      statuses.find((status) => status.id === selectedTask?.status_id)?.name || '',
    [selectedTask?.status_id, statuses]
  );

  const userMap = useMemo(
    () =>
      userDirectory.reduce((accumulator, user) => {
        accumulator[user.id] = user;
        return accumulator;
      }, {}),
    [userDirectory]
  );

  const userNameMap = useMemo(
    () =>
      userDirectory.reduce((accumulator, user) => {
        accumulator[user.id] = buildUserFullName(user);
        return accumulator;
      }, {}),
    [userDirectory]
  );

  const internDirectory = useMemo(
    () => userDirectory.filter((user) => user.role === 'intern'),
    [userDirectory]
  );

  const visibleInternOptions = useMemo(() => {
    if (currentUser?.role !== 'mentor') {
      return [];
    }

    return mentorLinks.map((link) => ({
      id: link.id,
      value: link.intern_id,
      label: userNameMap[link.intern_id] || shortId(link.intern_id),
      user: userMap[link.intern_id] || { id: link.intern_id },
    }));
  }, [currentUser?.role, mentorLinks, userMap, userNameMap]);

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

  const mentorDisplayName = useMemo(() => {
    if (!myMentorLink?.mentor_id) {
      return '';
    }

    return userNameMap[myMentorLink.mentor_id] || shortId(myMentorLink.mentor_id);
  }, [myMentorLink?.mentor_id, userNameMap]);

  const totalTasks = useMemo(
    () => boardColumns.reduce((total, column) => total + column.tasks.length, 0),
    [boardColumns]
  );

  const allBoardTasks = useMemo(
    () => boardColumns.flatMap((column) => column.tasks || []),
    [boardColumns]
  );

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

  function navigateTo(nextRoute, replace = false, preserveMessage = false) {
    if (nextRoute === route) {
      return;
    }

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextRoute);
    setRoute(nextRoute);
    if (!preserveMessage) {
      setMessage('');
    }
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
        const fetchedUsers = await authRequest('/profile', {
          token: session.access_token,
          query: { limit: 200 },
        });
        setUserDirectory(
          Array.isArray(fetchedUsers)
            ? fetchedUsers.map((user) => withLocalAvatar(user))
            : []
        );
      } catch {
        setUserDirectory([]);
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
        coreRequest(`/tasks/${taskId}`, { token: session.access_token }),
        coreRequest(`/tasks/${taskId}/comments`, { token: session.access_token }),
        coreRequest(`/tasks/${taskId}/links`, { token: session.access_token }),
        coreRequest(`/tasks/${taskId}/attachments`, { token: session.access_token }),
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
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      setCurrentUser(null);
      setBoardColumns([]);
      setStatuses([]);
      setMentorLinks([]);
      setUserDirectory([]);
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
          setCurrentUser(withLocalAvatar(data));
          if (data?.role && session?.role !== data.role) {
            updateSession({
              ...session,
              role: data.role,
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (error?.status === 401 || error?.status === 403) {
            handleLogout(SESSION_EXPIRED_COPY);
            return;
          }

          setMessage(getErrorMessage(error));
        }
      }
    }

    syncCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [route, session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return registerAuthFailureHandler(() => {
      handleLogout(SESSION_EXPIRED_COPY);
    });
  }, [route, session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session?.access_token) {
      return undefined;
    }

    function handleTabClose() {
      clearSession();
    }

    window.addEventListener('beforeunload', handleTabClose);
    window.addEventListener('pagehide', handleTabClose);
    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      window.removeEventListener('pagehide', handleTabClose);
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !currentUser || route !== ROUTES.home) {
      return;
    }

    loadDashboardData();
  }, [currentUser, loadDashboardData, route, session?.access_token]);

  useEffect(() => {
    if (!selectedTask?.id || !session?.access_token) {
      return;
    }

    loadTaskDetails(selectedTask.id);
  }, [loadTaskDetails, selectedTask?.id, session?.access_token]);

  useEffect(() => {
    setTaskDraft(buildTaskDraft(selectedTask));
  }, [selectedTask]);

  useEffect(() => {
    if (!currentUser) {
      setProfileForm(EMPTY_PROFILE_FORM);
      return;
    }

    setProfileForm({
      first_name: currentUser.first_name || '',
      last_name: currentUser.last_name || '',
      avatar_url: currentUser.avatar_url || '',
    });
  }, [currentUser]);

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

  function resetSelectedTask() {
    setSelectedTask(null);
    setTaskComments([]);
    setTaskLinks([]);
    setTaskAttachments([]);
    setTaskDraft(buildTaskDraft(null));
  }

  function updateProfileForm(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
      reader.readAsDataURL(file);
    });

    setProfileForm((current) => ({
      ...current,
      avatar_url: typeof dataUrl === 'string' ? dataUrl : '',
    }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!currentUser?.id) {
      return;
    }

    const updatedUser = await runRequest(
      () =>
        authRequest('/profile', {
          method: 'PATCH',
          token: session.access_token,
          query: { user_id: currentUser.id },
          body: {
            first_name: profileForm.first_name,
            last_name: profileForm.last_name,
          },
        }),
      'Профиль обновлён.'
    );

    if (!updatedUser) {
      return;
    }

    saveLocalAvatar(currentUser.id, profileForm.avatar_url);

    const nextUser = withLocalAvatar({
      ...currentUser,
      ...updatedUser,
      avatar_url: profileForm.avatar_url,
    });

    setCurrentUser(nextUser);
    setUserDirectory((current) =>
      current.map((user) => (user.id === nextUser.id ? nextUser : user))
    );
    setIsProfileModalOpen(false);
  }

  function handleOpenTaskFromChat(taskId) {
    if (!taskId) {
      return;
    }

    setIsChatOpen(false);
    setSelectedTask((current) => (current?.id === taskId ? current : { id: taskId }));
  }

  function handleLogout(nextMessage = '') {
    updateSession(null);
    setCurrentUser(null);
    setUserDirectory([]);
    setMentorLinks([]);
    setMyMentorLink(null);
    resetSelectedTask();
    setIsChatOpen(false);
    setIsTaskModalOpen(false);
    setIsStatusModalOpen(false);
    setMessage(nextMessage);
    navigateTo(ROUTES.login, true, Boolean(nextMessage));
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
          tasks: [{ ...task, status_id: nextStatusId }, ...column.tasks],
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
      resetSelectedTask();
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
          <section className="auth-shell">
            <aside className="auth-showcase">
              <div className="auth-showcase-mark">Mentor Desk</div>
              <p className="auth-kicker">РАБОЧЕЕ ПРОСТРАНСТВО</p>
              <h2>Управление стажировкой в одном рабочем окне.</h2>
              <p className="auth-subtitle">
                Доска задач, чат, материалы и контроль прогресса собраны в
                единой рабочей среде в духе Jira.
              </p>
              <div className="auth-showcase-grid">
                <article className="auth-showcase-card">
                  <strong>Канбан-доска</strong>
                  <span>Статусы, drag-and-drop и правая detail-панель.</span>
                </article>
                <article className="auth-showcase-card">
                  <strong>Чаты</strong>
                  <span>Личные и групповые диалоги с мгновенной доставкой.</span>
                </article>
                <article className="auth-showcase-card">
                  <strong>Материалы</strong>
                  <span>Файлы, вложения и материалы для стажёров.</span>
                </article>
              </div>
            </aside>

            <section className="auth-card auth-panel">
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
        <section className="workspace-frame">
          <aside className="workspace-rail">
            <div className="workspace-brand">
              <span className="workspace-brand-mark">M</span>
              <div>
                <strong>Mentor Desk</strong>
                <span>Рабочее пространство</span>
              </div>
            </div>

            <div className="workspace-nav">
              <button className="workspace-nav-item active" type="button">
                Доска
              </button>
              <button
                className="workspace-nav-item"
                onClick={() => navigateTo(ROUTES.materials)}
                type="button"
              >
                Материалы
              </button>
              <button
                className="workspace-nav-item"
                onClick={() => setIsChatOpen(true)}
                type="button"
              >
                Чаты
              </button>
            </div>

            <div className="workspace-user-card">
              <span className="workspace-user-role">
                {currentUser?.role === 'mentor' ? 'Наставник' : 'Стажёр'}
              </span>
              <strong>{buildUserFullName(currentUser || {})}</strong>
              <span>{currentUser?.email || 'Нет почты'}</span>
              <button
                className="secondary-button workspace-profile-button"
                onClick={() => setIsProfileModalOpen(true)}
                type="button"
              >
                Профиль
              </button>
              <button className="ghost-button workspace-logout" onClick={handleLogout} type="button">
                Выйти
              </button>
            </div>
          </aside>

          <section className="dashboard-shell jira-shell">
            <header className="workspace-topbar">
              <div className="workspace-topbar-copy">
                <p className="auth-kicker">ДОСКА ЗАДАЧ</p>
                <h1>
                  {currentUser?.first_name
                    ? `${currentUser.first_name}, фокус на текущих задачах`
                    : 'Доска задач'}
                </h1>
                <p className="auth-subtitle">
                  {currentUser?.role === 'mentor'
                    ? 'Управляйте выполнением, перемещайте карточки между статусами и держите стажёров в едином рабочем процессе.'
                    : 'Следите за своими задачами, открывайте детали справа и оставайтесь на связи с наставником.'}
                </p>
              </div>

              <div className="workspace-topbar-actions">
                {currentUser?.role === 'mentor' && (
                  <>
                    <button
                      className="primary-button"
                      onClick={() => setIsTaskModalOpen(true)}
                      type="button"
                    >
                      Создать задачу
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => setIsStatusModalOpen(true)}
                      type="button"
                    >
                      Новый статус
                    </button>
                  </>
                )}
                <button className="secondary-button" onClick={loadDashboardData} type="button">
                  Обновить
                </button>
              </div>
            </header>

            <section className="workspace-content-grid">
              <div className="workspace-main-column">
                <section className="workspace-toolbar dashboard-card">
                  <div className="workspace-toolbar-group">
                    <span className="workspace-toolbar-label">Фильтры</span>
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
                        <option value="">Все стажёры</option>
                        {visibleInternOptions.map((intern) => (
                          <option key={intern.id} value={intern.value}>
                            {intern.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="workspace-toolbar-group workspace-toolbar-meta">
                    <span className="detail-badge">{totalTasks} задач</span>
                    <span className="detail-badge subtle">{boardColumns.length} колонок</span>
                  </div>
                </section>

                <section className="dashboard-card board-panel jira-board-panel board-shell-card">
                  <div className="section-head">
                    <div>
                      <p className="auth-kicker">ТЕКУЩИЙ ПРОЦЕСС</p>
                      <h3>Доска выполнения</h3>
                    </div>
                    {boardLoading ? (
                      <span className="inline-note">Загрузка доски...</span>
                    ) : (
                      <span className="inline-note">
                        Перетаскивайте задачи между колонками, чтобы обновлять прогресс
                      </span>
                    )}
                  </div>
                  <TaskBoard
                    boardColumns={boardColumns}
                    userMap={userMap}
                    userNameMap={userNameMap}
                    onMoveTask={handleMoveTask}
                    onSelectTask={setSelectedTask}
                    selectedTask={selectedTask}
                  />
                </section>

                {message && <p className="auth-message dashboard-message">{message}</p>}
              </div>

              <aside className="workspace-side-column">
                <section className="workspace-summary workspace-summary-card">
                  <div className="workspace-sidecard-head">
                    <p className="auth-kicker">ОБЗОР</p>
                    <h3>Сводка по доске</h3>
                  </div>
                  <div className="workspace-kpis workspace-kpis-compact">
                    <article className="workspace-kpi-card">
                      <span>Всего задач</span>
                      <strong>{totalTasks}</strong>
                    </article>
                    <article className="workspace-kpi-card">
                      <span>Колонок</span>
                      <strong>{statuses.length}</strong>
                    </article>
                    <article className="workspace-kpi-card">
                      <span>Ваша роль</span>
                      <strong>{currentUser?.role === 'mentor' ? 'Наставник' : 'Стажёр'}</strong>
                    </article>
                    {currentUser?.role === 'mentor' && (
                      <article className="workspace-kpi-card">
                        <span>Назначено стажёров</span>
                        <strong>{mentorLinks.length}</strong>
                      </article>
                    )}
                    {currentUser?.role === 'intern' && myMentorLink && (
                      <article className="workspace-kpi-card">
                        <span>Наставник</span>
                        <strong>{mentorDisplayName}</strong>
                      </article>
                    )}
                  </div>
                </section>

                {currentUser?.role === 'mentor' && (
                  <section className="workspace-sidecard">
                    <div className="workspace-sidecard-head">
                      <p className="auth-kicker">ПРИВЯЗКА КОМАНДЫ</p>
                      <h3>Назначить стажёра</h3>
                    </div>
                    <form className="workspace-sideform" onSubmit={handleAssignIntern}>
                      <div className="search-select">
                        <input
                          onChange={(event) => setInternSearch(event.target.value)}
                          placeholder="Найти стажёра"
                          value={internSearch}
                        />
                        <div className="search-results search-results-compact">
                          {filteredInternDirectory.slice(0, 6).map((intern) => (
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
                        Назначить
                      </button>
                    </form>
                  </section>
                )}

                <section className="workspace-sidecard workspace-guide-card">
                  <div className="workspace-sidecard-head">
                    <p className="auth-kicker">ПРОЦЕСС</p>
                    <h3>Как работать с доской</h3>
                  </div>
                  <div className="workspace-guide-list">
                    <span>Откройте задачу, чтобы редактировать детали, ссылки и вложения.</span>
                    <span>Перемещайте карточки между статусами, чтобы обновлять прогресс.</span>
                    <span>Используйте чаты и материалы через левую навигацию.</span>
                  </div>
                </section>
              </aside>
            </section>
          </section>
        </section>
      </main>

      <TaskDetail
        attachmentForm={attachmentForm}
        commentForm={commentForm}
        currentUser={currentUser}
        linkForm={linkForm}
        mentorLinks={mentorLinks}
        userMap={userMap}
        userNameMap={userNameMap}
        onAttachmentDraftChange={updateAttachmentDraft}
        onClose={resetSelectedTask}
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
        myMentorId={myMentorLink?.mentor_id || ''}
        userMap={userMap}
        userNameMap={userNameMap}
        mentorInternOptions={visibleInternOptions}
        onOpenTask={handleOpenTaskFromChat}
        onClose={() => setIsChatOpen(false)}
        open={isChatOpen}
        taskOptions={allBoardTasks}
        token={session?.access_token}
      />

      {isProfileModalOpen && (
        <Modal
          onClose={() => setIsProfileModalOpen(false)}
          subtitle="Измените отображаемое имя и фотографию профиля."
          title="Profile settings"
        >
          <form className="compact-form" onSubmit={handleSaveProfile}>
            <label>
              Имя
              <input
                name="first_name"
                onChange={updateProfileForm}
                value={profileForm.first_name}
              />
            </label>
            <label>
              Фамилия
              <input
                name="last_name"
                onChange={updateProfileForm}
                value={profileForm.last_name}
              />
            </label>
            <label>
              Фото профиля
              <input onChange={handleProfileAvatarChange} type="file" />
            </label>
            {profileForm.avatar_url && (
              <div className="profile-preview">
                <img alt="Profile preview" src={profileForm.avatar_url} />
              </div>
            )}
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setIsProfileModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" disabled={loading} type="submit">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isTaskModalOpen && (
        <Modal
          onClose={() => setIsTaskModalOpen(false)}
          subtitle="Создание новой задачи открывается поверх рабочей доски."
          title="Create task"
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
                Cancel
              </button>
              <button className="primary-button" disabled={loading} type="submit">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isStatusModalOpen && (
        <Modal
          onClose={() => setIsStatusModalOpen(false)}
          subtitle="Новый статус сразу появится отдельной колонкой на доске."
          title="Create status"
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
                Cancel
              </button>
              <button className="primary-button" disabled={loading} type="submit">
                Create
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
