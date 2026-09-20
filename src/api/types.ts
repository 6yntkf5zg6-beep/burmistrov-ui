// Mirrors the request/response records exposed by the burmistrov Spring Boot
// backend (app.burmistrov.dto.*). Keep in sync with the backend module.

export type Role = "TRAINER" | "CLIENT" | "ADMIN";
export type Gender = "MALE" | "FEMALE";
export type TrainerClientStatus = "PENDING" | "ACTIVE" | "ARCHIVED";

// ---- auth ----

export interface RegisterRequest {
  email: string;
  password: string;
  phone?: string;
  inviteToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  email: string;
  role: Role;
}

export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

// ---- trainer / client profiles ----

export interface TrainerProfileRequest {
  bio?: string;
  specialization?: string;
  experienceYears?: number;
}

export interface TrainerProfileResponse {
  id: number;
  userId: number;
  bio?: string;
  specialization?: string;
  experienceYears?: number;
}

export interface ClientProfileRequest {
  birthDate?: string; // ISO date
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  goal?: string;
  healthNotes?: string;
}

export interface ClientProfileResponse {
  id: number;
  userId: number;
  birthDate?: string;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  goal?: string;
  healthNotes?: string;
}

export interface AddClientRequest {
  email: string;
}

export interface TrainerClientResponse {
  id: number;
  trainerId: number;
  trainerName: string;
  clientId: number;
  clientName: string;
  status: TrainerClientStatus;
  startedAt: string;
}

// ---- exercises ----

export interface ExerciseRequest {
  name: string;
  description?: string;
  muscleGroup?: string;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export interface ExerciseResponse {
  id: number;
  name: string;
  description?: string;
  muscleGroup?: string;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
  createdBy?: number;
}

export interface UploadResponse {
  url: string;
}

// ---- содержимое главной страницы (правит тренер) ----

export interface PatentResponse {
  id: number;
  /** Остались у записей, заведённых до перехода на «патент — это скан». */
  number: string | null;
  title: string | null;
  scanUrl: string | null;
  sortOrder: number;
}

/** Патент задаётся сканом: номер и название на карточке не показываются. */
export interface PatentRequest {
  scanUrl: string;
}

export interface PublicationResponse {
  id: number;
  title: string;
  authors: string;
  annotation: string;
  sortOrder: number;
}

export interface PublicationRequest {
  title: string;
  authors: string;
  annotation: string;
}

export type MoveDirection = "UP" | "DOWN";

export interface ErrorResponse {
  message: string;
}

// ---- client invites (referral links) ----

export interface CreateInviteRequest {
  firstName: string;
  lastName: string;
}

export interface InviteResponse {
  id: number;
  token: string;
  registrationUrl: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  expiresAt: string;
}

export interface InviteCheckResponse {
  valid: boolean;
  trainerName?: string;
  firstName?: string;
  lastName?: string;
}

// ---- training programs ----

export interface TrainingProgramRequest {
  name: string;
  description?: string;
}

export interface TrainingProgramResponse {
  id: number;
  trainerId: number;
  name: string;
  description?: string;
}

// ---- workouts ----
// One table, one shape. A workout with no trainingProgramId is a standalone one from the
// trainer's catalog; with it set, it is one day of that program, ordered by orderIndex.

export interface WorkoutRequest {
  name: string;
  description?: string;
  /** Position inside the program; ignored for a catalog workout. */
  orderIndex?: number;
  /** Copy the exercises of this workout into the new one. Ignored on update. */
  sourceWorkoutId?: number;
}

export interface WorkoutResponse {
  id: number;
  trainerId: number;
  name: string;
  description?: string;
  trainingProgramId?: number;
  orderIndex?: number;
}

export interface WorkoutExerciseRequest {
  exerciseId: number;
  orderIndex?: number;
  notes?: string;
}

export interface WorkoutExerciseResponse {
  id: number;
  workoutId: number;
  exerciseId: number;
  exerciseName: string;
  exerciseDescription?: string;
  orderIndex: number;
  notes?: string;
}

// ---- scheduled workouts ----
// Запланированная тренировка — снимок, а не ссылка: правка или удаление шаблона
// не меняет то, что уже назначено клиенту, и день можно перекроить отдельно.

export interface WorkoutDocumentSet {
  reps?: number;
  weightKg?: number;
}

export interface WorkoutDocumentExercise {
  /** Устойчивый идентификатор упражнения внутри дня: к нему цепляются комментарии клиента. */
  uid?: string;
  /** Мягкая ссылка на каталог, без внешнего ключа. Имя ниже переживёт удаление упражнения. */
  exerciseId?: number;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  sets: WorkoutDocumentSet[];
}

export interface WorkoutDocument {
  version?: number;
  name: string;
  description?: string;
  exercises: WorkoutDocumentExercise[];
}

export interface ScheduledWorkoutRequest {
  clientId: number;
  scheduledDate: string; // ISO date (yyyy-MM-dd)
  /** Тренировка-источник. Без document сервер снимет с неё копию сам. */
  sourceWorkoutId?: number;
  workout?: WorkoutDocument;
}

export interface ScheduledWorkoutDocumentRequest {
  workout: WorkoutDocument;
}

export interface ScheduledWorkoutDateRequest {
  date: string; // ISO date (yyyy-MM-dd)
}

export interface ScheduledWorkoutResponse {
  id: number;
  clientId: number;
  scheduledDate: string;
  sourceWorkoutId?: number;
  name: string;
  workout: WorkoutDocument;
  /** Посещение и окно доступа; пусто, если тренировку ещё не открывали. */
  attendance?: WorkoutAttendanceResponse;
  comments: ExerciseCommentResponse[];
}

// ---- доступ клиента к тренировке ----
// Тренировка открывается один раз в свой день и живёт три часа. Посещение и окно —
// разные вещи: attendedAt это факт визита, expiresAt это текущее окно.

export type WorkoutAccessState = "LOCKED" | "AVAILABLE" | "OPEN" | "CLOSED" | "MISSED";

export interface WorkoutAttendanceResponse {
  attendedAt?: string;
  attendanceSource?: "CLIENT" | "TRAINER";
  openedAt?: string;
  expiresAt?: string;
}

export interface ExerciseCommentResponse {
  id: number;
  scheduledWorkoutId: number;
  exerciseUid: string;
  exerciseName: string;
  authorId: number;
  text: string;
  createdAt: string;
}

/** Карточка дня в кабинете клиента — намеренно без упражнений. */
export interface ClientWorkoutCardResponse {
  id: number;
  scheduledDate: string;
  name: string;
  exerciseCount: number;
  state: WorkoutAccessState;
  attendedAt?: string;
  expiresAt?: string;
  /** Вес, названный при открытии этой тренировки. */
  weightKg?: number;
}

export interface ClientWorkoutResponse {
  id: number;
  scheduledDate: string;
  name: string;
  workout: WorkoutDocument;
  expiresAt?: string;
  comments: ExerciseCommentResponse[];
}

// ---- история назначений программ ----
// Назначение хранится снимком: состав программы на тот момент, включая тренировки,
// которые тренер из назначения исключил.

export interface ProgramAssignmentWorkout {
  workoutId?: number;
  name: string;
  orderIndex?: number;
  /** Дата, если тренировка вошла в назначение. */
  date?: string;
  included: boolean;
}

export interface ProgramAssignmentResponse {
  id: number;
  clientId: number;
  sourceProgramId?: number;
  programName: string;
  assignedAt: string;
  workouts: ProgramAssignmentWorkout[];
}

export interface ProgramWorkoutPlacement {
  workoutId: number;
  date: string; // ISO date (yyyy-MM-dd)
}

export interface AssignProgramRequest {
  clientId: number;
  programId: number;
  /** Какая тренировка программы на какую дату. Покрывать всю программу не обязательно. */
  placements: ProgramWorkoutPlacement[];
}
