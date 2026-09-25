import { http } from "./http";
import type {
  AddClientRequest,
  AssignProgramRequest,
  AuthResponse,
  ClientProfileRequest,
  ClientProfileResponse,
  ClientWorkoutCardResponse,
  ClientWorkoutResponse,
  CreateInviteRequest,
  ExerciseCommentResponse,
  ExerciseRequest,
  ExerciseResponse,
  InviteCheckResponse,
  InviteResponse,
  LoginRequest,
  MoveDirection,
  PatentRequest,
  PatentResponse,
  ProgramAssignmentResponse,
  PublicationRequest,
  PublicationResponse,
  RefreshRequest,
  RegisterRequest,
  ScheduledWorkoutDateRequest,
  ScheduledWorkoutDocumentRequest,
  ScheduledWorkoutRequest,
  ScheduledWorkoutResponse,
  TrainerClientResponse,
  TrainerProfileRequest,
  TrainerProfileResponse,
  TrainingProgramRequest,
  TrainingProgramResponse,
  UploadResponse,
  UserSummary,
  WorkoutAttendanceResponse,
  WorkoutExerciseRequest,
  WorkoutExerciseResponse,
  WorkoutRequest,
  WorkoutResponse,
} from "./types";

// /api/auth
export const authApi = {
  register: (body: RegisterRequest) => http.post<AuthResponse>("/auth/register", body).then((r) => r.data),
  login: (body: LoginRequest) => http.post<AuthResponse>("/auth/login", body).then((r) => r.data),
  refresh: (body: RefreshRequest) => http.post<AuthResponse>("/auth/refresh", body).then((r) => r.data),
  logout: (body: RefreshRequest) => http.post<void>("/auth/logout", body).then((r) => r.data),
};

// /api/users
export const userApi = {
  me: () => http.get<UserSummary>("/users/me").then((r) => r.data),
};

// /api/trainer-profile
export const trainerProfileApi = {
  getMine: () => http.get<TrainerProfileResponse>("/trainer-profile/me").then((r) => r.data),
  update: (body: TrainerProfileRequest) =>
    http.put<TrainerProfileResponse>("/trainer-profile/me", body).then((r) => r.data),
};

// /api/client-profile
export const clientProfileApi = {
  getMine: () => http.get<ClientProfileResponse>("/client-profile/me").then((r) => r.data),
  update: (body: ClientProfileRequest) =>
    http.put<ClientProfileResponse>("/client-profile/me", body).then((r) => r.data),
  getForTrainer: (clientId: number) =>
    http.get<ClientProfileResponse>(`/client-profile/${clientId}`).then((r) => r.data),
};

// /api/trainer-clients
export const trainerClientApi = {
  invite: (body: AddClientRequest) =>
    http.post<TrainerClientResponse>("/trainer-clients", body).then((r) => r.data),
  list: () => http.get<TrainerClientResponse[]>("/trainer-clients").then((r) => r.data),
  accept: (id: number) => http.patch<TrainerClientResponse>(`/trainer-clients/${id}/accept`).then((r) => r.data),
  archive: (id: number) => http.patch<TrainerClientResponse>(`/trainer-clients/${id}/archive`).then((r) => r.data),
};

// /api/exercises
export const exerciseApi = {
  list: () => http.get<ExerciseResponse[]>("/exercises").then((r) => r.data),
  create: (body: ExerciseRequest) => http.post<ExerciseResponse>("/exercises", body).then((r) => r.data),
  update: (id: number, body: ExerciseRequest) =>
    http.put<ExerciseResponse>(`/exercises/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/exercises/${id}`).then((r) => r.data),
};

// /api/invites
export const inviteApi = {
  create: (body: CreateInviteRequest) => http.post<InviteResponse>("/invites", body).then((r) => r.data),
  list: () => http.get<InviteResponse[]>("/invites").then((r) => r.data),
  check: (token: string) => http.get<InviteCheckResponse>(`/invites/check/${token}`).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/invites/${id}`).then((r) => r.data),
};

// /api/training-programs
export const trainingProgramApi = {
  create: (body: TrainingProgramRequest) =>
    http.post<TrainingProgramResponse>("/training-programs", body).then((r) => r.data),
  list: () => http.get<TrainingProgramResponse[]>("/training-programs").then((r) => r.data),
  get: (id: number) => http.get<TrainingProgramResponse>(`/training-programs/${id}`).then((r) => r.data),
  update: (id: number, body: TrainingProgramRequest) =>
    http.put<TrainingProgramResponse>(`/training-programs/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/training-programs/${id}`).then((r) => r.data),
};

// /api/workouts — the trainer's catalog of standalone workouts
export const workoutApi = {
  create: (body: WorkoutRequest) => http.post<WorkoutResponse>("/workouts", body).then((r) => r.data),
  list: () => http.get<WorkoutResponse[]>("/workouts").then((r) => r.data),
  get: (id: number) => http.get<WorkoutResponse>(`/workouts/${id}`).then((r) => r.data),
  update: (id: number, body: WorkoutRequest) =>
    http.put<WorkoutResponse>(`/workouts/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/workouts/${id}`).then((r) => r.data),
};

// /api/training-programs/{programId}/workouts — the days of one program.
// Same Workout rows as workoutApi serves; they just carry a program and a position in it.
export const programWorkoutApi = {
  create: (programId: number, body: WorkoutRequest) =>
    http.post<WorkoutResponse>(`/training-programs/${programId}/workouts`, body).then((r) => r.data),
  list: (programId: number) =>
    http.get<WorkoutResponse[]>(`/training-programs/${programId}/workouts`).then((r) => r.data),
  update: (programId: number, workoutId: number, body: WorkoutRequest) =>
    http.put<WorkoutResponse>(`/training-programs/${programId}/workouts/${workoutId}`, body).then((r) => r.data),
  remove: (programId: number, workoutId: number) =>
    http.delete<void>(`/training-programs/${programId}/workouts/${workoutId}`).then((r) => r.data),
};

// /api/workouts/{workoutId}/exercises — one set of endpoints for catalog workouts and program days
export const workoutExerciseApi = {
  add: (workoutId: number, body: WorkoutExerciseRequest) =>
    http.post<WorkoutExerciseResponse>(`/workouts/${workoutId}/exercises`, body).then((r) => r.data),
  list: (workoutId: number) =>
    http.get<WorkoutExerciseResponse[]>(`/workouts/${workoutId}/exercises`).then((r) => r.data),
  update: (workoutId: number, id: number, body: WorkoutExerciseRequest) =>
    http.put<WorkoutExerciseResponse>(`/workouts/${workoutId}/exercises/${id}`, body).then((r) => r.data),
  remove: (workoutId: number, id: number) =>
    http.delete<void>(`/workouts/${workoutId}/exercises/${id}`).then((r) => r.data),
};

// /api/scheduled-workouts — снимок тренировки на дате клиента
export const scheduledWorkoutApi = {
  create: (body: ScheduledWorkoutRequest) =>
    http.post<ScheduledWorkoutResponse>("/scheduled-workouts", body).then((r) => r.data),
  /** Заменяет содержимое одного дня целиком — так работает правка упражнений в дне. */
  update: (id: number, body: ScheduledWorkoutDocumentRequest) =>
    http.put<ScheduledWorkoutResponse>(`/scheduled-workouts/${id}`, body).then((r) => r.data),
  listForClient: (clientId: number) =>
    http.get<ScheduledWorkoutResponse[]>("/scheduled-workouts", { params: { clientId } }).then((r) => r.data),
  /** Все дни тренера по всем клиентам — общий календарь кабинета. */
  listForTrainer: () => http.get<ScheduledWorkoutResponse[]>("/scheduled-workouts").then((r) => r.data),
  assignProgram: (body: AssignProgramRequest) =>
    http.post<ScheduledWorkoutResponse[]>("/scheduled-workouts/assign-program", body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/scheduled-workouts/${id}`).then((r) => r.data),
  /** Переносит день на другую дату — пока тренировку не открывали. */
  move: (id: number, body: ScheduledWorkoutDateRequest) =>
    http.put<ScheduledWorkoutResponse>(`/scheduled-workouts/${id}/date`, body).then((r) => r.data),
  /** Отмечает посещение вручную: клиент был, но тренировку не открывал. */
  markAttendance: (id: number) =>
    http.post<WorkoutAttendanceResponse>(`/scheduled-workouts/${id}/attendance`).then((r) => r.data),
  /** Стирает запись о посещении. Для сегодняшнего дня это «переоткрыть». */
  resetAttendance: (id: number) =>
    http.delete<void>(`/scheduled-workouts/${id}/attendance`).then((r) => r.data),
};

// /api/my/workouts — тренировки глазами клиента.
// Содержимое приходит только в ответ на открытие: список отдаёт карточки без упражнений.
export const clientWorkoutApi = {
  list: () => http.get<ClientWorkoutCardResponse[]>("/my/workouts").then((r) => r.data),
  /** Вес обязателен: без него сервер тренировку не откроет. */
  open: (id: number, weightKg: number) =>
    http.post<ClientWorkoutResponse>(`/my/workouts/${id}/open`, { weightKg }).then((r) => r.data),
  read: (id: number) => http.get<ClientWorkoutResponse>(`/my/workouts/${id}`).then((r) => r.data),
  /** Пустой текст удаляет комментарий — тогда в ответе нет тела и приходит null. */
  comment: (id: number, exerciseUid: string, text: string) =>
    http.post<ExerciseCommentResponse | "">(`/my/workouts/${id}/exercises/${exerciseUid}/comments`, { text }).then((r) => r.data || null),
};

// /api/program-assignments — история назначений программ клиенту
export const programAssignmentApi = {
  listForClient: (clientId: number, months = 3) =>
    http.get<ProgramAssignmentResponse[]>("/program-assignments", { params: { clientId, months } }).then((r) => r.data),
};

// /api/uploads
export const uploadApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return http.post<UploadResponse>("/uploads", formData).then((r) => r.data);
  },
};

// /api/site — содержимое блоков «Патенты» и «Публикации» на главной.
// Чтение открыто всем: страница публичная. Запись сервер пускает только тренеру.
export const siteContentApi = {
  listPatents: () => http.get<PatentResponse[]>("/site/patents").then((r) => r.data),
  createPatent: (body: PatentRequest) => http.post<PatentResponse>("/site/patents", body).then((r) => r.data),
  updatePatent: (id: number, body: PatentRequest) =>
    http.put<PatentResponse>(`/site/patents/${id}`, body).then((r) => r.data),
  deletePatent: (id: number) => http.delete<void>(`/site/patents/${id}`).then((r) => r.data),
  movePatent: (id: number, direction: MoveDirection) =>
    http.post<PatentResponse[]>(`/site/patents/${id}/move`, null, { params: { direction } }).then((r) => r.data),

  listPublications: () => http.get<PublicationResponse[]>("/site/publications").then((r) => r.data),
  createPublication: (body: PublicationRequest) =>
    http.post<PublicationResponse>("/site/publications", body).then((r) => r.data),
  updatePublication: (id: number, body: PublicationRequest) =>
    http.put<PublicationResponse>(`/site/publications/${id}`, body).then((r) => r.data),
  deletePublication: (id: number) => http.delete<void>(`/site/publications/${id}`).then((r) => r.data),
  movePublication: (id: number, direction: MoveDirection) =>
    http.post<PublicationResponse[]>(`/site/publications/${id}/move`, null, { params: { direction } }).then((r) => r.data),
};
