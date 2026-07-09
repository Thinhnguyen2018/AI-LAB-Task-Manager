import { Task, TaskCreate, TaskUpdate, Comment, Note, Project, KbDoc, KbCollection, Board, ReleaseNote, ProjectMilestone } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──
export interface AuthUser { id: number; email: string; name: string; created_at: string }
export interface AuthToken { access_token: string; token_type: string; user: AuthUser }

export const authRegister = (email: string, name: string, password: string): Promise<AuthToken> =>
  request('/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password }) })

export const authLogin = (email: string, password: string): Promise<AuthToken> =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const authMe = (): Promise<AuthUser> => request('/auth/me')

export const updateMe = (data: { name?: string; current_password?: string; new_password?: string }): Promise<AuthUser> =>
  request('/auth/me', { method: 'PATCH', body: JSON.stringify(data) })

// ── Members ──
export interface Member { id: number; user_id: number; project_id: number; role: string; email: string; name: string; created_at: string }

export const getMembers = (projectId: number): Promise<Member[]> => request(`/projects/${projectId}/members`)
export const inviteMember = (projectId: number, email: string, role: string): Promise<Member> =>
  request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ email, role }) })
export const updateMember = (projectId: number, userId: number, role: string): Promise<Member> =>
  request(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) })
export const removeMember = (projectId: number, userId: number): Promise<void> =>
  request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' })

// ── Tasks ──
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

// KB Collections
export const getKbCollections = (projectId: number): Promise<KbCollection[]> =>
  request(`/kb-collections?project_id=${projectId}`)
export const createKbCollection = (data: { name: string; description?: string; project_id?: number }): Promise<KbCollection> =>
  request('/kb-collections', { method: 'POST', body: JSON.stringify(data) })
export const updateKbCollection = (id: string, data: { name?: string; description?: string }): Promise<KbCollection> =>
  request(`/kb-collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteKbCollection = (id: string): Promise<void> =>
  request(`/kb-collections/${id}`, { method: 'DELETE' })

// KB Docs
export const getKbDocs = (collectionId: string): Promise<KbDoc[]> =>
  request(`/kb?collection_id=${collectionId}`)
export const updateKbDoc = (id: string, data: { title?: string; content?: string; category?: string }): Promise<KbDoc> =>
  request(`/kb/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteKbDoc = (id: string): Promise<void> =>
  request(`/kb/${id}`, { method: 'DELETE' })

// Boards
export const getBoards = (projectId: number): Promise<Board[]> => request(`/boards?project_id=${projectId}`)
export const createBoard = (name: string, project_id: number): Promise<Board> =>
  request('/boards', { method: 'POST', body: JSON.stringify({ name, project_id }) })
export const updateBoard = (id: number, name: string): Promise<Board> =>
  request(`/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
export const deleteBoard = (id: number): Promise<void> =>
  request(`/boards/${id}`, { method: 'DELETE' })

// AI Parse
export const aiParseRelease = (text: string): Promise<{
  releases: Array<{ version: string; title: string; date: string; description: string; changes: string[] }>;
  milestones: Array<{ name: string; target_date: string; description: string; goals: string[]; status: string }>;
}> =>
  request('/ai/parse-release', { method: 'POST', body: JSON.stringify({ text }) })

// Release Notes
export const getReleaseNotes = (projectId: number, boardId?: number): Promise<ReleaseNote[]> =>
  request(`/release-notes?project_id=${projectId}${boardId ? `&board_id=${boardId}` : ''}`)
export const createReleaseNote = (data: Omit<ReleaseNote, 'id' | 'created_at' | 'updated_at'>): Promise<ReleaseNote> =>
  request('/release-notes', { method: 'POST', body: JSON.stringify(data) })
export const updateReleaseNote = (id: number, data: Partial<ReleaseNote>): Promise<ReleaseNote> =>
  request(`/release-notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteReleaseNote = (id: number): Promise<void> =>
  request(`/release-notes/${id}`, { method: 'DELETE' })

// Project Milestones
export const getProjectMilestones = (projectId: number, boardId?: number): Promise<ProjectMilestone[]> =>
  request(`/project-milestones?project_id=${projectId}${boardId ? `&board_id=${boardId}` : ''}`)
export const createProjectMilestone = (data: Omit<ProjectMilestone, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectMilestone> =>
  request('/project-milestones', { method: 'POST', body: JSON.stringify(data) })
export const updateProjectMilestone = (id: number, data: Partial<ProjectMilestone>): Promise<ProjectMilestone> =>
  request(`/project-milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteProjectMilestone = (id: number): Promise<void> =>
  request(`/project-milestones/${id}`, { method: 'DELETE' })

export const getProjects = (): Promise<Project[]> => request('/projects')

export const createProject = (name: string, color: string, modules: string[] = []): Promise<Project> =>
  request('/projects', { method: 'POST', body: JSON.stringify({ name, color, modules }) })

export const updateProject = (id: number, data: { name?: string; color?: string; modules?: string[] }): Promise<Project> =>
  request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteProject = (id: number): Promise<void> =>
  request(`/projects/${id}`, { method: 'DELETE' })
