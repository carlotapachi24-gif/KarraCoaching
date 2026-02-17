export enum UserRole {
  CLIENT = 'CLIENT',
  COACH = 'COACH'
}

export interface Client {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'active' | 'pending' | 'overdue';
  lastCheckIn?: string;
  plan: string;
  weight: number;
  goal: string;
}

export interface CheckInStats {
  weight: number;
  waist: number;
  photos: string[];
  energy: number;
  compliance: number;
  date: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rpe?: number;
  rest: string;
  videoUrl?: string;
  note?: string;
}

export interface WorkoutDay {
  id: string;
  title: string;
  exercises: Exercise[];
  duration: number; // minutes
}
