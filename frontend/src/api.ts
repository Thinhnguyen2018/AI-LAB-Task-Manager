import { Task, TaskCreate, TaskUpdate, Comment, Note, Project, KbDoc } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const getTasks = (): Promise<Task[]> => request('/tasks')

export const createTask = (task: TaskCreate): Promise<Task> =>
  request('/tasks', { method: 'POST', body: JSON.stringify(task) })

export const updateTask = (id: number, task: TaskUpdate): Promise<Task> =>
  request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) })

export const deleteTask = (id: number): Promise<void> =>
  request(`/tasks/${id}`, { method: 'DELETE' })

export const seedTasks = (): Promise<{ message: string }> =>
  request('/seed', { method: 'POST' })

export const getNotes = (): Promise<Note[]> => request('/notes')

export const createNote = (note: { id: string; title: string; content: string; project_id?: number }): Promise<Note> =>
  request('/notes', { method: 'POST', body: JSON.stringify(note) })

export const updateNote = (id: string, data: { title?: string; content?: string; project_id?: number }): Promise<Note> =>
  request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteNote = (id: string): Promise<void> =>
  request(`/notes/${id}`, { method: 'DELETE' })

export const getComments = (taskId: number): Promise<Comment[]> =>
  request(`/tasks/${taskId}/comments`)

export const createComment = (taskId: number, author: string, content: string): Promise<Comment> =>
  request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ author, content }) })

export const deleteComment = (commentId: number): Promise<void> =>
  request(`/comments/${commentId}`, { method: 'DELETE' })

export const getKbDocs = (projectId: number): Promise<KbDoc[]> => request(`/kb?project_id=${projectId}`)
export const createKbDoc = (doc: { id: string; title: string; content: string; category: string; project_id?: number }): Promise<KbDoc> =>
  request('/kb', { method: 'POST', body: JSON.stringify(doc) })
export const updateKbDoc = (id: string, data: { title?: string; content?: string; category?: string }): Promise<KbDoc> =>
  request(`/kb/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteKbDoc = (id: string): Promise<void> =>
  request(`/kb/${id}`, { method: 'DELETE' })

export const getProjects = (): Promise<Project[]> => request('/projects')

export const createProject = (name: string, color: string): Promise<Project> =>
  request('/projects', { method: 'POST', body: JSON.stringify({ name, color }) })

export const updateProject = (id: number, data: { name?: string; color?: string }): Promise<Project> =>
  request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteProject = (id: number): Promise<void> =>
  request(`/projects/${id}`, { method: 'DELETE' })
