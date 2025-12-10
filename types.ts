import { Session } from "@supabase/supabase-js";

export enum EducationLevel {
  CLASS_10 = "Class 10",
  CLASS_12 = "Class 12",
  UNIVERSITY = "University",
  COMPETITIVE = "Competitive Exams",
  CODING = "Coding/Bootcamp",
}

export enum Subject {
  MATH = "Mathematics",
  PHYSICS = "Physics",
  CHEMISTRY = "Chemistry",
  BIOLOGY = "Biology",
  CS = "Computer Science",
  HISTORY = "History",
  LITERATURE = "Literature",
}

export interface TopicPerformance {
  totalScore: number;
  attempts: number;
}

export interface UserProfile {
  id?: string; // Supabase ID
  name: string;
  email?: string;
  avatarUrl?: string;
  level: EducationLevel;
  subjects: Subject[];
  weakTopics: string[];
  strongTopics: string[];
  streak: number;
  studyHoursPerDay: number;
  autoPlayAudio: boolean;
  performanceHistory: Record<string, TopicPerformance>;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  nextReview: string;
  difficulty: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  score?: number;
  completedAt?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: "pdf" | "image" | "note";
  content: string;
  data?: string;
  mimeType?: string;
  uploadDate: string;
  storagePath?: string; // Supabase Path
  publicUrl?: string; // Signed URL
}

export interface StudyPlanDay {
  day: string;
  tasks: string[];
  focusTopic: string;
}

export interface AppState {
  session: Session | null;
  user: UserProfile | null;
  files: UploadedFile[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
  plans: StudyPlanDay[];
  onboardingComplete: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AgentResponse {
  text: string;
  sources?: GroundingSource[];
}

export interface TTSResponse {
  text: string;
  audio_base64: string | null;
  audio_mime: string;
  transcript: string;
  blob?: Blob;
  url?: string;
}

export interface TestReport {
  summary: string;
  results: TestResult[];
  metrics: any;
  logs_url_or_blob?: string;
  artifacts?: any[];
}

export interface TestResult {
  test: string;
  status: "pass" | "fail" | "warn";
  details: any;
}

export interface Diagnostics {
  agent_pipeline: any[];
  metrics: any;
  logs: string[];
}
