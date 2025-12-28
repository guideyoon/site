import axios from 'axios'

const getApiUrl = () => {
    // Browser side: always use relative paths for Proxy/ngrok support
    if (typeof window !== 'undefined') {
        return '';
    }
    // Server side / Build time: 
    // Prefer Docker service name, fallback to local dev port 8001
    return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8001';
};

const API_URL = getApiUrl();

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout
})

// Add auth token to requests
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token')
                window.location.href = '/login'
            }
        } else if (error.response?.status === 403) {
            const detail = error.response.data?.detail
            if (detail && (detail.includes('expired') || detail.includes('만료'))) {
                if (typeof window !== 'undefined') {
                    alert(detail)
                    localStorage.removeItem('token')
                    window.location.href = '/login'
                }
            }
        }
        return Promise.reject(error)
    }
)

// API functions
export const itemsApi = {
    list: (params?: any) => api.get('/api/items', { params }),
    get: (id: number) => api.get(`/api/items/${id}`),
    update: (id: number, data: any) => api.patch(`/api/items/${id}`, data),
    addToQueue: (id: number) => api.post(`/api/items/${id}/queue`),
    delete: (id: number) => api.delete(`/api/items/${id}`),
    bulkDelete: (ids: number[]) => api.post('/api/items/bulk-delete', { item_ids: ids }),
    deleteAll: () => api.post('/api/items/delete-all'),
    getStats: () => api.get('/api/items/stats'),
}

export const queueApi = {
    list: () => api.get('/api/queue'),
    approve: (id: number, note?: string) =>
        api.post(`/api/queue/${id}/approve`, { note }),
    reject: (id: number, note?: string) =>
        api.post(`/api/queue/${id}/reject`, { note }),
    export: (id: number) => api.get(`/api/queue/export/${id}`),
}

export const sourcesApi = {
    list: () => api.get('/api/sources'),
    create: (data: any) => api.post('/api/sources', data),
    toggle: (id: number, enabled: boolean) =>
        api.patch(`/api/sources/${id}`, null, { params: { enabled } }),
    collect: (id: number) => api.post(`/api/sources/${id}/collect`),
    update: (id: number, data: any) => api.patch(`/api/sources/${id}/update`, data),
    delete: (id: number) => api.delete(`/api/sources/${id}`),
}

export const usersApi = {
    list: () => api.get('/api/users/'),
    update: (id: number, data: any) => api.patch(`/api/users/${id}`, data),
    delete: (id: number) => api.delete(`/api/users/${id}`),
}

export const authApi = {
    register: (data: any) => api.post('/api/auth/register', data),
    me: () => api.get('/api/auth/me'),
    updateSettings: (data: any) => api.patch('/api/auth/settings', data),
    getApiBalance: (provider: string) => api.get(`/api/auth/api-balance/${provider}`),
    googleLogin: (idToken: string) => api.post('/api/auth/google', { id_token: idToken }),
}

export const uploadApi = {
    image: (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/api/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    },
}

export const aiApi = {
    rewrite: (text: string, apiKey?: string, provider: string = 'openai', model?: string, instruction?: string) =>
        api.post('/api/ai/rewrite', { text, api_key: apiKey, provider, model, instruction }),

}



export default api
