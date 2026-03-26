import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  });
}

function setupFetchMock() {
  global.fetch = jest.fn((input) => {
    const url = String(input);

    if (url.includes('/role')) {
      return jsonResponse([]);
    }

    if (url.includes('/auth/me') && url.includes('expired-token')) {
      return jsonResponse({ detail: 'Invalid token' }, 401);
    }

    if (url.includes('/auth/me')) {
      return jsonResponse({
        id: 'intern-1',
        first_name: 'Анна',
        last_name: 'Иванова',
        email: 'anna@example.com',
        role: 'intern',
      });
    }

    if (url.includes('/task-statuses')) {
      return jsonResponse([
        { id: 'status-1', name: 'Новая', code: 'NEW', is_default: true },
      ]);
    }

    if (url.includes('/tasks/board')) {
      return jsonResponse([
        {
          status: { id: 'status-1', name: 'Новая', code: 'NEW' },
          tasks: [
            {
              id: 'task-1',
              title: 'Подготовить отчёт',
              description: 'Описание задачи',
              status_id: 'status-1',
              intern_id: 'intern-1',
            },
          ],
        },
      ]);
    }

    if (url.includes('/profile')) {
      return jsonResponse([
        {
          id: 'intern-1',
          first_name: 'Анна',
          last_name: 'Иванова',
          email: 'anna@example.com',
          role: 'intern',
        },
        {
          id: 'mentor-1',
          first_name: 'Иван',
          last_name: 'Петров',
          email: 'ivan@example.com',
          role: 'mentor',
        },
      ]);
    }

    if (url.includes('/mentor-intern-links/my-mentor')) {
      return jsonResponse({
        id: 'link-1',
        mentor_id: 'mentor-1',
        intern_id: 'intern-1',
      });
    }

    if (url.includes('/tasks/task-1/comments')) {
      return jsonResponse([]);
    }

    if (url.includes('/tasks/task-1/links')) {
      return jsonResponse([]);
    }

    if (url.includes('/tasks/task-1/attachments')) {
      return jsonResponse([]);
    }

    if (url.includes('/tasks/task-1')) {
      return jsonResponse({
        id: 'task-1',
        title: 'Подготовить отчёт',
        description: 'Описание задачи',
        status_id: 'status-1',
        intern_id: 'intern-1',
      });
    }

    return jsonResponse([]);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/login');
  setupFetchMock();
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders auth page heading', async () => {
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: /Sign in/i })
  ).toBeInTheDocument();
});

test('logs out automatically when token expires', async () => {
  window.localStorage.setItem(
    'auth-diploma-session',
    JSON.stringify({
      access_token: 'expired-token',
      refresh_token: 'refresh-token',
    })
  );
  window.history.replaceState({}, '', '/');

  render(<App />);

  expect(
    await screen.findByText(/Сессия истекла\. Выполнен автоматический выход\./i)
  ).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /Sign in/i })).toBeInTheDocument();
  expect(window.localStorage.getItem('auth-diploma-session')).toBeNull();
});

test('shows mentor name and closes task drawer', async () => {
  window.localStorage.setItem(
    'auth-diploma-session',
    JSON.stringify({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
    })
  );
  window.history.replaceState({}, '', '/');

  render(<App />);

  expect(await screen.findByText(/Mentor: Иван Петров/i)).toBeInTheDocument();

  fireEvent.click(await screen.findByRole('button', { name: /Подготовить отчёт/i }));

  expect(await screen.findByRole('button', { name: /Закрыть/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Закрыть/i }));

  await waitFor(() => {
    expect(screen.queryByText(/DETAIL PANEL/i)).not.toBeInTheDocument();
  });
});
