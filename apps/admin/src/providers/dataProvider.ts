/**
 * Custom Refine data provider that wraps simple-rest
 * and injects X-Admin-Secret header into all requests.
 */
import simpleRestDataProvider from '@refinedev/simple-rest';
import type { DataProvider } from '@refinedev/core';

const API_URL = '/admin';
const ADMIN_SECRET = localStorage.getItem('makontv_admin_secret') || '';

// Custom fetch that adds auth header
const customFetch: typeof fetch = (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('X-Admin-Secret', ADMIN_SECRET);
  headers.set('Content-Type', 'application/json');
  return fetch(url, { ...options, headers });
};

export const dataProvider: DataProvider = {
  ...simpleRestDataProvider(API_URL, customFetch),

  // Override getList to handle x-total-count header
  getList: async ({ resource, pagination, sorters, filters }) => {
    const { current = 1, pageSize = 25 } = pagination || {};
    const params = new URLSearchParams();
    params.set('_page', String(current));
    params.set('_limit', String(pageSize));

    if (sorters && sorters.length > 0) {
      params.set('_sort', sorters[0].field);
      params.set('_order', sorters[0].order);
    }

    // Filters
    if (filters) {
      for (const f of filters) {
        if ('field' in f && f.value !== undefined && f.value !== '') {
          params.set(f.field, String(f.value));
        }
      }
    }

    const url = `${API_URL}/${resource}?${params.toString()}`;
    const response = await customFetch(url);
    const data = await response.json();
    const total = parseInt(response.headers.get('x-total-count') || '0');

    return { data, total };
  },

  // Override getOne
  getOne: async ({ resource, id }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await customFetch(url);
    const data = await response.json();
    return { data };
  },

  // Override create
  create: async ({ resource, variables }) => {
    const url = `${API_URL}/${resource}`;
    const response = await customFetch(url, {
      method: 'POST',
      body: JSON.stringify(variables),
    });
    const data = await response.json();
    return { data };
  },

  // Override update
  update: async ({ resource, id, variables }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await customFetch(url, {
      method: 'PUT',
      body: JSON.stringify(variables),
    });
    const data = await response.json();
    return { data };
  },

  // Override deleteOne
  deleteOne: async ({ resource, id }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await customFetch(url, { method: 'DELETE' });
    const data = await response.json();
    return { data };
  },

  getApiUrl: () => API_URL,
};

export function setAdminSecret(secret: string) {
  localStorage.setItem('makontv_admin_secret', secret);
  window.location.reload();
}

export function getAdminSecret(): string {
  return localStorage.getItem('makontv_admin_secret') || '';
}
