export interface Project {
  id: number
  name: string
  color: string
  modules: string[]
  created_at: string
}

export interface Task {
  id: number
  title: string
  module: 'GreenRAG' | 'Doc-Intelli' | 'Infra' | 'Integration' | 'Milestone' | 'Release'
  status: 'pending' | 'progress' | 'done'
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  year: number
  assignee?: string
  deadline?: string
  description?: string
  month?: number
  week?: number
  note_id?: string
  project_id?: number
}

export interface Note {
  id: string
  title: string
  content: string
  project_id?: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  task_id: number
  author: string
  content: string
  created_at: string
}

export interface KbCollection {
  id: string
  name: string
  description?: string
  project_id?: number
  file_count: number
  created_at: string
  updated_at: string
}

export interface KbDoc {
  id: string
  title: string
  content: string
  category: string
  project_id?: number
  collection_id?: string
  file_url?: string
  file_public_id?: string
  file_type?: string
  file_size?: number
  created_at: string
  updated_at: string
}

export type TaskCreate = Omit<Task, 'id'>
export type TaskUpdate = Partial<TaskCreate>
