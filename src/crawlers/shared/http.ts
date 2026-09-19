import axios, { type CreateAxiosDefaults } from 'axios';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export function createHttpClient(options: CreateAxiosDefaults = {}) {
  return axios.create({
    timeout: 30_000,
    ...options,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...options.headers,
    },
  });
}
