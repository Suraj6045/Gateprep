import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authAPI, fetcher } from './api';
import api from './client';

vi.mock('./client', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  };
});

describe('API Wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetcher', () => {
    it('should call api.get and return data', async () => {
      const mockData = { message: 'success' };
      api.get.mockResolvedValueOnce({ data: mockData });
      
      const result = await fetcher('/test-url');
      
      expect(api.get).toHaveBeenCalledWith('/test-url');
      expect(result).toEqual(mockData);
    });
  });

  describe('authAPI', () => {
    it('register should call POST /auth/register', async () => {
      api.post.mockResolvedValueOnce({ data: 'registered' });
      const userData = { email: 'test@example.com', password: 'password123' };
      
      await authAPI.register(userData);
      
      expect(api.post).toHaveBeenCalledWith('/auth/register', userData);
    });

    it('login should call POST /auth/login', async () => {
      api.post.mockResolvedValueOnce({ data: 'logged_in' });
      const credentials = { email: 'test@example.com', password: 'password123' };
      
      await authAPI.login(credentials);
      
      expect(api.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    it('resetPassword should call POST /auth/reset-password', async () => {
      api.post.mockResolvedValueOnce({ data: 'reset_sent' });
      const resetData = { email: 'test@example.com' };
      
      await authAPI.resetPassword(resetData);
      
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', resetData);
    });

    it('logout should call POST /auth/logout', async () => {
      api.post.mockResolvedValueOnce({ data: 'logged_out' });
      
      await authAPI.logout();
      
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('me should call GET /auth/me', async () => {
      api.get.mockResolvedValueOnce({ data: { id: 1, name: 'Test User' } });
      
      await authAPI.me();
      
      expect(api.get).toHaveBeenCalledWith('/auth/me');
    });
  });
});
