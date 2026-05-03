import React from 'react';

function AuthField({ label, children, hint }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      {children}
      {hint ? <span className="auth-field-hint">{hint}</span> : null}
    </label>
  );
}

export function LoginScreen({
  loading,
  loginForm,
  onChange,
  onSubmit,
  onNavigateRegister,
}) {
  return (
    <>
      <div className="auth-header jira-auth-header">
        <p className="auth-kicker">WORKSPACE LOGIN</p>
        <h1>Авторизация</h1>
        <p className="auth-subtitle">
          Войдите в рабочее пространство стажировки и продолжите работу с
          задачами, материалами и чатами.
        </p>
      </div>

      <form className="auth-form jira-auth-form" onSubmit={onSubmit}>
        <AuthField label="Email">
          <input
            name="email"
            onChange={onChange}
            placeholder="you@company.by"
            required
            type="email"
            value={loginForm.email}
          />
        </AuthField>

        <AuthField label="Пароль">
          <input
            minLength="8"
            name="password"
            onChange={onChange}
            placeholder="Введите пароль"
            required
            type="password"
            value={loginForm.password}
          />
        </AuthField>

        <div className="auth-form-actions">
          <button className="primary-button auth-submit" disabled={loading} type="submit">
            Войти
          </button>
        </div>
      </form>

      <p className="auth-link-row">
        Нет аккаунта?
        <button
          className="text-button"
          onClick={onNavigateRegister}
          type="button"
        >
          Зарегистрироваться
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
      <div className="auth-header jira-auth-header">
        <p className="auth-kicker">CREATE ACCOUNT</p>
        <h1>Регистрация</h1>
        <p className="auth-subtitle">
          Создайте аккаунт, чтобы получить доступ к доске задач, рабочим
          материалам и коммуникации с наставником.
        </p>
      </div>

      <form className="auth-form jira-auth-form" onSubmit={onSubmit}>
        <div className="auth-grid-two">
          <AuthField label="Имя">
            <input
              name="first_name"
              onChange={onChange}
              placeholder="Алексей"
              required
              value={registerForm.first_name}
            />
          </AuthField>

          <AuthField label="Фамилия">
            <input
              name="last_name"
              onChange={onChange}
              placeholder="Иванов"
              required
              value={registerForm.last_name}
            />
          </AuthField>
        </div>

        <AuthField label="Email">
          <input
            name="email"
            onChange={onChange}
            placeholder="you@company.by"
            required
            type="email"
            value={registerForm.email}
          />
        </AuthField>

        <AuthField label="Пароль" hint="Минимум 8 символов">
          <input
            minLength="8"
            name="hashed_password"
            onChange={onChange}
            placeholder="Создайте пароль"
            required
            type="password"
            value={registerForm.hashed_password}
          />
        </AuthField>

        {showRoleSelect && (
          <AuthField label="Роль">
            <select
              name="role_id"
              onChange={onChange}
              required
              value={registerForm.role_id}
            >
              <option value="">Выберите роль</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </AuthField>
        )}

        <div className="auth-form-actions">
          <button
            className="primary-button auth-submit"
            disabled={loading || !registerForm.role_id}
            type="submit"
          >
            Создать аккаунт
          </button>
        </div>
      </form>

      <p className="auth-link-row">
        Уже есть аккаунт?
        <button
          className="text-button"
          onClick={onNavigateLogin}
          type="button"
        >
          Войти
        </button>
      </p>
    </>
  );
}
