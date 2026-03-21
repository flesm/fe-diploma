import React from 'react';

export function LoginScreen({
  loading,
  loginForm,
  onChange,
  onSubmit,
  onNavigateRegister,
}) {
  return (
    <>
      <div className="auth-header">
        <p className="auth-kicker">AUTH</p>
        <h1>Sign in</h1>
        <p className="auth-subtitle">Access your account.</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            name="email"
            onChange={onChange}
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
            onChange={onChange}
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
          onClick={onNavigateRegister}
          type="button"
        >
          Register
        </button>
      </p>
    </>
  );
}

export function RegisterScreen({
  loading,
  registerForm,
  roles,
  onChange,
  onSubmit,
  onNavigateLogin,
}) {
  const showRoleSelect =
    !registerForm.role_id ||
    roles.filter((role) => role.name === 'intern').length === 0;

  return (
    <>
      <div className="auth-header">
        <p className="auth-kicker">AUTH</p>
        <h1>Create account</h1>
        <p className="auth-subtitle">Register a new account.</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          First name
          <input
            name="first_name"
            onChange={onChange}
            required
            value={registerForm.first_name}
          />
        </label>

        <label>
          Last name
          <input
            name="last_name"
            onChange={onChange}
            required
            value={registerForm.last_name}
          />
        </label>

        <label>
          Email
          <input
            name="email"
            onChange={onChange}
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
            onChange={onChange}
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
              onChange={onChange}
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
          onClick={onNavigateLogin}
          type="button"
        >
          Sign in
        </button>
      </p>
    </>
  );
}
