import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => '[]',
  });
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
