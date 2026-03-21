import { useEffect, useState } from 'react';
import './App.css';
import { apiRequest } from './api';
import { clearSession, loadSession, saveSession } from './storage';

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
      if (route === ROUTES.home) {
        window.history.replaceState({}, '', ROUTES.login);
        setRoute(ROUTES.login);
      }
      return;
    }

    let cancelled = false;

    async function syncCurrentUser() {
      try {
        const data = await apiRequest('/auth/me', {
          query: { token: accessToken },
        });

        if (!cancelled) {
          setCurrentUser(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message);
        }
      }
    }

    syncCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, route]);

  async function bootstrap() {
    setBootstrapping(true);

    try {
      const fetchedRoles = await apiRequest('/role');
      const nextRoles = Array.isArray(fetchedRoles) ? fetchedRoles : [];
      setRoles(nextRoles);

      const commonRole = nextRoles.find((role) => role.name === 'common');
      if (commonRole) {
        setRegisterForm((current) => ({
          ...current,
          role_id: current.role_id || commonRole.id,
        }));
      }
    } catch (error) {
      setMessage(`Could not load roles: ${error.message}`);
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

  function updateRegisterForm(event) {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  function updateLoginForm(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updateSession(nextSession) {
    setSession(nextSession);

    if (nextSession) {
      saveSession(nextSession);
    } else {
      clearSession();
    }
  }

  async function runRequest(action, successMessage) {
    setLoading(true);

    try {
      const result = await action();
      setMessage(successMessage);
      return result;
    } catch (error) {
      setMessage(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const data = await runRequest(
      () =>
        apiRequest('/user/register', {
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
        apiRequest('/auth/login', {
          method: 'POST',
          body: loginForm,
        }),
      'Signed in.'
    );

    if (data) {
      updateSession(data);
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
        apiRequest('/auth/token/refresh', {
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

  const showRoleSelect =
    !registerForm.role_id ||
    roles.filter((role) => role.name === 'common').length === 0;

  function renderLogin() {
    return (
      <>
        <div className="auth-header">
          <p className="auth-kicker">AUTH</p>
          <h1>Sign in</h1>
          <p className="auth-subtitle">Access your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Email
            <input
              name="email"
              onChange={updateLoginForm}
              required
              type="email"
              value={loginForm.email}
            />
          </label>

          <label>
            Password
            <input
              minLength="8"
              name="password"
              onChange={updateLoginForm}
              required
              type="password"
              value={loginForm.password}
            />
          </label>

          <button className="primary-button" disabled={loading} type="submit">
            Sign in
          </button>
        </form>

        <p className="auth-link-row">
          No account?
          <button
            className="text-button"
            onClick={() => navigateTo(ROUTES.register)}
            type="button"
          >
            Register
          </button>
        </p>
      </>
    );
  }

  function renderRegister() {
    return (
      <>
        <div className="auth-header">
          <p className="auth-kicker">AUTH</p>
          <h1>Create account</h1>
          <p className="auth-subtitle">Register a new account.</p>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          <label>
            First name
            <input
              name="first_name"
              onChange={updateRegisterForm}
              required
              value={registerForm.first_name}
            />
          </label>

          <label>
            Last name
            <input
              name="last_name"
              onChange={updateRegisterForm}
              required
              value={registerForm.last_name}
            />
          </label>

          <label>
            Email
            <input
              name="email"
              onChange={updateRegisterForm}
              required
              type="email"
              value={registerForm.email}
            />
          </label>

          <label>
            Password
            <input
              minLength="8"
              name="hashed_password"
              onChange={updateRegisterForm}
              required
              type="password"
              value={registerForm.hashed_password}
            />
          </label>

          {showRoleSelect && (
            <label>
              Role
              <select
                name="role_id"
                onChange={updateRegisterForm}
                required
                value={registerForm.role_id}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            className="primary-button"
            disabled={loading || !registerForm.role_id}
            type="submit"
          >
            Register
          </button>
        </form>

        <p className="auth-link-row">
          Already have an account?
          <button
            className="text-button"
            onClick={() => navigateTo(ROUTES.login)}
            type="button"
          >
            Sign in
          </button>
        </p>
      </>
    );
  }

  function renderHome() {
    return (
      <>
        <div className="auth-header">
          <p className="auth-kicker">HOME</p>
          <h1>Welcome</h1>
          <p className="auth-subtitle">
            {currentUser?.first_name
              ? `Hello, ${currentUser.first_name}.`
              : 'You are authenticated.'}
          </p>
        </div>

        <div className="session-panel">
          <button className="primary-button" onClick={handleRefreshToken} type="button">
            Refresh token
          </button>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </>
    );
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        {route === ROUTES.register && renderRegister()}
        {route === ROUTES.login && renderLogin()}
        {route === ROUTES.home && renderHome()}

        {message && <p className="auth-message">{message}</p>}
      </section>

      {bootstrapping && (
        <div className="loading-overlay">
          <div className="loading-card">Loading...</div>
        </div>
      )}
    </main>
  );
}

export default App;
