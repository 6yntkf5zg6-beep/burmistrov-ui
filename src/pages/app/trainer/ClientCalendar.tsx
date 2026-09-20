import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  exerciseApi,
  programWorkoutApi,
  scheduledWorkoutApi,
  trainingProgramApi,
  workoutApi,
  workoutExerciseApi,
} from "../../../api/endpoints";
import { apiErrorMessage, isConflictError } from "../../../api/http";
import type {
  ExerciseResponse,
  ScheduledWorkoutResponse,
  TrainingProgramResponse,
  WorkoutDocument,
  WorkoutResponse,
} from "../../../api/types";
import { Button } from "../../../components/Button";
import { CompactLabel } from "../../../components/CompactLabel";
import { Combobox } from "../../../components/Combobox";
import { CommentBadge } from "../../../components/CommentBadge";
import { useSortable } from "../../../hooks/useSortable";
import { useModal } from "../../../hooks/useModal";
import {
  DAYS,
  EXTENDED_CALENDAR_MONTHS,
  EXTENDED_CALENDAR_MONTHS_BACK,
  MONTHS,
  MONTH_TITLES,
  addDays,
  fromISODate,
  isSameDate,
  monthCells,
  startOfWeekMonday,
  toISODate,
  weekdayIndex,
} from "./calendarDates";
import { CalendarDayDots, MAX_DOTS } from "./CalendarDayDots";
import { WorkoutViewModal } from "./WorkoutViewModal";
import { WORKOUT_STATE_TITLE, hasAnyValue, workoutDot, workoutPill, workoutState } from "./workoutStatus";
import { DUPLICATE_EXERCISE_MESSAGE } from "./exerciseName";
import {
  emptyWorkoutExerciseForm,
  WorkoutExerciseFormModal,
  type WorkoutExerciseFormState,
} from "./WorkoutExerciseFormModal";

interface SetRow {
  reps: string;
  weight: string;
}

/**
 * Одно упражнение редактируемого дня. Это черновик снимка, а не ссылка на шаблон: строки
 * можно добавлять и убирать, и на шаблоне это никак не отражается.
 */
/** Тренировка программы и дата, на которую тренер её ставит. */
interface AssignRow {
  workout: WorkoutResponse;
  date: string | null;
}

interface DraftExercise {
  /** Идентификатор упражнения внутри дня. Носим его через черновик, иначе при сохранении
   *  сервер выдаст новый, и комментарии клиента отцепятся от упражнения. */
  uid?: string;
  exerciseId?: number;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  sets: SetRow[];
}

function emptySets(count: number): SetRow[] {
  return Array.from({ length: count }, () => ({ reps: "", weight: "" }));
}

/** Документ -> черновик. Сетка прямоугольная, поэтому подходы добиваются до самого длинного. */
function draftFromDocument(document: WorkoutDocument): DraftExercise[] {
  const recorded = Math.max(0, ...document.exercises.map((e) => e.sets.length));
  const setCount = recorded > 0 ? recorded : DEFAULT_SET_COUNT;
  return document.exercises.map((e) => ({
    uid: e.uid,
    exerciseId: e.exerciseId,
    name: e.name,
    imageUrl: e.imageUrl,
    videoUrl: e.videoUrl,
    notes: e.notes,
    sets: Array.from({ length: setCount }, (_, i) => ({
      reps: e.sets[i]?.reps != null ? String(e.sets[i].reps) : "",
      weight: e.sets[i]?.weightKg != null ? String(e.sets[i].weightKg) : "",
    })),
  }));
}

/**
 * Прочерк в весе — это ноль: короткая запись для упражнений с собственным весом, чтобы
 * подход считался заполненным, а не пропущенным. Принимаем и дефис, и оба тире.
 */
const ZERO_MARKS = ["-", "\u2013", "\u2014"];

function parseWeight(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (ZERO_MARKS.includes(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseReps(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Черновик -> документ. Пустые подходы не сохраняются. */
function documentFromDraft(name: string, description: string, exercises: DraftExercise[]): WorkoutDocument {
  return {
    name,
    description: description || undefined,
    exercises: exercises.map((e) => ({
      uid: e.uid,
      exerciseId: e.exerciseId,
      name: e.name,
      imageUrl: e.imageUrl,
      videoUrl: e.videoUrl,
      notes: e.notes,
      sets: e.sets
        .map((row) => ({
          reps: parseReps(row.reps),
          weightKg: parseWeight(row.weight),
        }))
        .filter((set) => set.reps !== undefined || set.weightKg !== undefined),
    })),
  };
}

/** Where the caret currently sits in the sets grid of the "schedule a workout" modal. */
interface SetCellAddress {
  rowIndex: number;
  setIndex: number;
  field: keyof SetRow;
}

const DEFAULT_SET_COUNT = 3;

const timeOnly = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

/** Живо ли окно доступа прямо сейчас. Срок присылает сервер, здесь только сравнение. */
function windowIsLive(sw: ScheduledWorkoutResponse | undefined): boolean {
  const expiresAt = sw?.attendance?.expiresAt;
  return expiresAt != null && Date.now() < new Date(expiresAt).getTime();
}

const fieldClass =
  "w-full rounded-full border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";
const textareaClass =
  "w-full resize-none rounded-2xl border border-line bg-offwhite px-4 py-3 text-sm outline-none focus:border-primary";

function pillButtonClass(active: boolean): string {
  return `flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wide transition ${
    active ? "bg-primary text-white" : "text-ink/50 hover:text-ink"
  }`;
}

/** Сколько месяцев вперёд листается календарь выбора даты. */
const DATE_PICKER_MONTHS = 12;
/** Высота окна календаря — примерно один месяц; прокрутка при этом свободная. */
const DATE_PICKER_VIEWPORT_HEIGHT = "19.5rem";

/**
 * @param onScheduleChange вызывается после любого изменения расписания — блок истории живёт
 *        рядом и пересобирается по этому сигналу, без перезагрузки страницы.
 * @param editRequest просьба открыть правку дня, пришедшая снаружи — из истории. Номер
 *        меняется на каждый клик, поэтому одну и ту же тренировку можно открыть повторно.
 */
export function ClientCalendar({
  clientId,
  onScheduleChange,
  editRequest,
}: {
  clientId: number;
  onScheduleChange?: () => void;
  editRequest?: { id: number; nonce: number } | null;
}) {
  const [scheduled, setScheduled] = useState<ScheduledWorkoutResponse[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutResponse[]>([]);
  const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgramResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openDate, setOpenDate] = useState<string | null>(null);
  const [sourceWorkoutId, setSourceWorkoutId] = useState("");
  /** Взять готовый шаблон из каталога или собрать тренировку с нуля. */
  const [pickMode, setPickMode] = useState<"template" | "blank">("template");
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"pick" | "table">("pick");
  const [loadingExercises, setLoadingExercises] = useState(false);
  /** Заполнен — правим уже назначенный день, а не создаём новый. */
  const [editingScheduledId, setEditingScheduledId] = useState<number | null>(null);
  /** Просмотр дня без правки — то же окно, что и в истории. */
  const [viewWorkout, setViewWorkout] = useState<ScheduledWorkoutResponse | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseResponse[]>([]);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [addExerciseForm, setAddExerciseForm] = useState<WorkoutExerciseFormState>(emptyWorkoutExerciseForm());
  const [addingExercise, setAddingExercise] = useState(false);
  // Every weight/reps input of the sets grid, addressed by its position, so that a press of
  // the space bar can hand the caret to the next one (right, then wrapping to the next row).
  const setInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [moreCalendarOpen, setMoreCalendarOpen] = useState(false);
  // На узком экране вместо сетки с плашками — сетка из чисел; состав дня показан ниже.
  const [pickedISO, setPickedISO] = useState<string | null>(null);
  // В окне «См. больше» свой выбранный день: он может быть в другом месяце.
  const [morePickedISO, setMorePickedISO] = useState<string | null>(null);
  const monthsScrollRef = useRef<HTMLDivElement | null>(null);
  const currentMonthRef = useRef<HTMLElement | null>(null);
  const [assignProgramOpen, setAssignProgramOpen] = useState(false);
  const [assignProgramId, setAssignProgramId] = useState("");
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  /** Индекс строки, для которой открыт календарь выбора даты. */
  /** Календарь выбора даты обслуживает два случая: дата тренировки в назначении и перенос дня. */
  type DatePickerTarget =
    | { kind: "assign"; rowIndex: number }
    | { kind: "move"; workout: ScheduledWorkoutResponse };
  const [datePicker, setDatePicker] = useState<DatePickerTarget | null>(null);
  /** Смещение месяца, на который открывается календарь. */
  const [pickerMonthOffset, setPickerMonthOffset] = useState(0);
  const pickerScrollRef = useRef<HTMLDivElement | null>(null);
  const pickerMonthRef = useRef<HTMLElement | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [assigningProgram, setAssigningProgram] = useState(false);

  function reload() {
    scheduledWorkoutApi
      .listForClient(clientId)
      .then(setScheduled)
      .catch((e) => setError(apiErrorMessage(e, "Не удалось загрузить календарь")));
  }

  useEffect(() => {
    reload();
    workoutApi.list().then(setWorkouts).catch((e) => setError(apiErrorMessage(e)));
    trainingProgramApi.list().then(setTrainingPrograms).catch((e) => setError(apiErrorMessage(e)));
    exerciseApi.list().then(setExerciseCatalog).catch((e) => setError(apiErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const setColumnCount = draft.length > 0 ? Math.max(0, ...draft.map((ex) => ex.sets.length)) : DEFAULT_SET_COUNT;
  const draftSortable = useSortable(draft.length, moveExerciseTo);

  const today = new Date();
  const todayISO = toISODate(today);
  const weekStart = startOfWeekMonday(today);
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

  const byDate: Record<string, ScheduledWorkoutResponse[]> = {};
  for (const sw of scheduled) {
    (byDate[sw.scheduledDate] ??= []).push(sw);
  }

  // Календарь выбора открывается на месяце уже выбранной даты, а не на первом в списке.
  useEffect(() => {
    if (datePicker === null) return;
    const container = pickerScrollRef.current;
    const target = pickerMonthRef.current;
    if (!container || !target) return;
    container.scrollTop = target.offsetTop - container.offsetTop;
  }, [datePicker, pickerMonthOffset]);

  // The list starts two months in the past, so jump to the current month when the modal opens.
  useEffect(() => {
    if (!moreCalendarOpen) return;
    setMorePickedISO(null);
    const container = monthsScrollRef.current;
    const current = currentMonthRef.current;
    if (!container || !current) return;
    container.scrollTop = current.offsetTop - container.offsetTop;
  }, [moreCalendarOpen]);

  function closeScheduleModal() {
    setOpenDate(null);
    setSourceWorkoutId("");
    setPickMode("template");
    setStep("pick");
    setEditingScheduledId(null);
    setDraft([]);
    setDraftName("");
    setDraftDescription("");
    setAddExerciseOpen(false);
  }

  // Esc закрывает то окно, которое открыли последним: превью и выбор даты уходят
  // раньше, чем окно под ними.
  useModal(openDate ? closeScheduleModal : null);
  useModal(moreCalendarOpen ? () => setMoreCalendarOpen(false) : null);
  useModal(assignProgramOpen ? () => setAssignProgramOpen(false) : null);
  useModal(datePicker ? () => setDatePicker(null) : null);

  async function handlePickSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // С нуля — тот же редактор, просто без заготовленных упражнений.
    if (pickMode === "blank") {
      setSourceWorkoutId("");
      setDraft([]);
      setStep("table");
      return;
    }

    setLoadingExercises(true);
    try {
      const workout = workouts.find((w) => String(w.id) === sourceWorkoutId);
      const exercises = await workoutExerciseApi.list(Number(sourceWorkoutId));
      setDraftName(workout?.name ?? "");
      setDraftDescription(workout?.description ?? "");
      setDraft(
        exercises.map((ex) => {
          const catalogEntry = exerciseCatalog.find((c) => c.id === ex.exerciseId);
          return {
            exerciseId: ex.exerciseId,
            name: ex.exerciseName,
            imageUrl: catalogEntry?.imageUrl,
            videoUrl: catalogEntry?.videoUrl,
            notes: ex.notes ?? undefined,
            sets: emptySets(DEFAULT_SET_COUNT),
          };
        }),
      );
      setStep("table");
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось загрузить упражнения тренировки"));
    } finally {
      setLoadingExercises(false);
    }
  }

  /** Открывает уже назначенный день на правку — тот же редактор, что и при создании. */
  function openScheduledForEdit(sw: ScheduledWorkoutResponse) {
    setError(null);
    setEditingScheduledId(sw.id);
    setOpenDate(sw.scheduledDate);
    setSourceWorkoutId(sw.sourceWorkoutId ? String(sw.sourceWorkoutId) : "");
    setDraftName(sw.workout.name);
    setDraftDescription(sw.workout.description ?? "");
    setDraft(draftFromDocument(sw.workout));
    setAddExerciseOpen(false);
    setStep("table");
  }

  async function handleTableSubmit(e: FormEvent) {
    e.preventDefault();
    if (!openDate) return;
    setCreating(true);
    setError(null);
    try {
      const document = documentFromDraft(draftName, draftDescription, draft);
      if (editingScheduledId !== null) {
        const updated = await scheduledWorkoutApi.update(editingScheduledId, { workout: document });
        setScheduled((prev) => prev.map((sw) => (sw.id === updated.id ? updated : sw)));
        onScheduleChange?.();
      } else {
        const created = await scheduledWorkoutApi.create({
          clientId,
          scheduledDate: openDate,
          sourceWorkoutId: sourceWorkoutId ? Number(sourceWorkoutId) : undefined,
          workout: document,
        });
        setScheduled((prev) => [...prev, created]);
        onScheduleChange?.();
      }
      closeScheduleModal();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сохранить тренировку"));
    } finally {
      setCreating(false);
    }
  }

  function updateSetCell(rowIndex: number, setIndex: number, field: keyof SetRow, value: string) {
    setDraft((prev) =>
      prev.map((ex, i) =>
        i !== rowIndex
          ? ex
          : { ...ex, sets: ex.sets.map((row, j) => (j === setIndex ? { ...row, [field]: value } : row)) },
      ),
    );
  }

  function openAddExercise() {
    setError(null);
    setAddExerciseForm(emptyWorkoutExerciseForm());
    setAddExerciseOpen(true);
  }

  /**
   * Новое упражнение сохраняется в общий каталог — сущность упражнения в системе одна,
   * временных не бывает. В день попадает её снимок: id, имя и медиа.
   */
  async function submitAddExercise(e: FormEvent) {
    e.preventDefault();
    setAddingExercise(true);
    setError(null);
    try {
      let exercise: ExerciseResponse | undefined;

      if (addExerciseForm.mode === "existing") {
        exercise = exerciseCatalog.find((c) => String(c.id) === addExerciseForm.exerciseId);
        if (!exercise) throw new Error("Упражнение не найдено");
      } else {
        exercise = await exerciseApi.create({
          name: addExerciseForm.newExerciseName,
          description: addExerciseForm.newExerciseDescription || undefined,
          imageUrl: addExerciseForm.newExerciseImageUrl || undefined,
          videoUrl: addExerciseForm.newExerciseVideoUrl || undefined,
        });
        const created = exercise;
        setExerciseCatalog((prev) => [created, ...prev]);
      }

      const picked = exercise;
      setDraft((prev) => [
        ...prev,
        {
          exerciseId: picked.id,
          name: picked.name,
          imageUrl: picked.imageUrl,
          videoUrl: picked.videoUrl,
          notes: addExerciseForm.notes || undefined,
          sets: emptySets(setColumnCount),
        },
      ]);
      setAddExerciseOpen(false);
    } catch (err) {
      setError(isConflictError(err) ? DUPLICATE_EXERCISE_MESSAGE : apiErrorMessage(err, "Не удалось добавить упражнение"));
    } finally {
      setAddingExercise(false);
    }
  }

  function removeExerciseRow(rowIndex: number) {
    setDraft((prev) => prev.filter((_, i) => i !== rowIndex));
  }

  function moveExerciseTo(from: number, to: number) {
    setDraft((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function setInputKey(rowIndex: number, setIndex: number, field: keyof SetRow): string {
    return `${rowIndex}:${setIndex}:${field}`;
  }

  function neighbourSetInput(
    { rowIndex, setIndex, field }: SetCellAddress,
    setCount: number,
    direction: "next" | "prev" | "up" | "down",
  ): SetCellAddress | null {
    switch (direction) {
      case "up":
        return rowIndex > 0 ? { rowIndex: rowIndex - 1, setIndex, field } : null;
      case "down":
        return rowIndex + 1 < draft.length ? { rowIndex: rowIndex + 1, setIndex, field } : null;
      case "next":
        if (field === "weight") return { rowIndex, setIndex, field: "reps" };
        if (setIndex + 1 < setCount) return { rowIndex, setIndex: setIndex + 1, field: "weight" };
        return rowIndex + 1 < draft.length ? { rowIndex: rowIndex + 1, setIndex: 0, field: "weight" } : null;
      case "prev":
        if (field === "reps") return { rowIndex, setIndex, field: "weight" };
        if (setIndex > 0) return { rowIndex, setIndex: setIndex - 1, field: "reps" };
        return rowIndex > 0 ? { rowIndex: rowIndex - 1, setIndex: setCount - 1, field: "reps" } : null;
    }
  }

  /** Hands the caret to the neighbouring input; false when there is none in that direction. */
  function moveSetFocus(from: SetCellAddress, setCount: number, direction: "next" | "prev" | "up" | "down"): boolean {
    const target = neighbourSetInput(from, setCount, direction);
    if (!target) return false;
    const input = setInputRefs.current[setInputKey(target.rowIndex, target.setIndex, target.field)];
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  }

  /**
   * Keyboard navigation across the grid:
   *  - space walks forward (weight -> reps -> next set -> next row), dropping the caret at the very end;
   *  - up/down keep the column and change the row;
   *  - left/right leave the field only once the caret is already at its edge, so arrows still move
   *    the caret inside a value that is being edited.
   */
  // Просьбу из истории выполняем, когда расписание уже загружено, и ровно один раз.
  const handledEditNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!editRequest || handledEditNonce.current === editRequest.nonce) return;
    const target = scheduled.find((sw) => sw.id === editRequest.id);
    if (!target) return;
    handledEditNonce.current = editRequest.nonce;
    openScheduledForEdit(target);
  }, [editRequest, scheduled]);

  function handleSetInputKeyDown(
    e: ReactKeyboardEvent<HTMLInputElement>,
    from: SetCellAddress,
    setCount: number,
  ) {
    if (e.key === " ") {
      e.preventDefault();
      if (!moveSetFocus(from, setCount, "next")) e.currentTarget.blur();
      return;
    }
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (moveSetFocus(from, setCount, e.key === "ArrowUp" ? "up" : "down")) e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const input = e.currentTarget;
      const atEdge =
        e.key === "ArrowLeft" ? input.selectionStart === 0 : input.selectionEnd === input.value.length;
      if (atEdge && moveSetFocus(from, setCount, e.key === "ArrowLeft" ? "prev" : "next")) e.preventDefault();
    }
  }

  function addSetColumn() {
    setDraft((prev) => prev.map((ex) => ({ ...ex, sets: [...ex.sets, { reps: "", weight: "" }] })));
  }

  function removeSetColumn(setIndex: number) {
    setDraft((prev) => prev.map((ex) => ({ ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) })));
  }

  /** Выбрали программу — тянем её тренировки, даты тренер проставит сам. */
  async function selectProgram(programId: string) {
    setAssignProgramId(programId);
    setAssignRows([]);
    if (!programId) return;

    setLoadingProgram(true);
    setError(null);
    try {
      const programWorkouts = await programWorkoutApi.list(Number(programId));
      setAssignRows(programWorkouts.map((workout) => ({ workout, date: null })));
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось загрузить тренировки комплекса"));
    } finally {
      setLoadingProgram(false);
    }
  }

  function openDatePicker(rowIndex: number) {
    const chosen = assignRows[rowIndex]?.date;
    showPickerFrom(chosen);
    setDatePicker({ kind: "assign", rowIndex });
  }

  /** Перенос дня: календарь открывается на месяце текущей даты тренировки. */
  function openMovePicker(workout: ScheduledWorkoutResponse) {
    showPickerFrom(workout.scheduledDate);
    setDatePicker({ kind: "move", workout });
  }

  function showPickerFrom(iso: string | null | undefined) {
    const base = iso ? fromISODate(iso) : today;
    const offset = (base.getFullYear() - today.getFullYear()) * 12 + (base.getMonth() - today.getMonth());
    setPickerMonthOffset(Math.min(Math.max(offset, 0), DATE_PICKER_MONTHS - 1));
  }

  /** Переносит день на другую дату. Окно дня закрываем: тренировки на этой дате больше нет. */
  async function moveWorkoutTo(workout: ScheduledWorkoutResponse, iso: string) {
    setError(null);
    try {
      const moved = await scheduledWorkoutApi.move(workout.id, { date: iso });
      setScheduled((prev) => prev.map((sw) => (sw.id === moved.id ? moved : sw)));
      setDatePicker(null);
      closeScheduleModal();
      onScheduleChange?.();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось перенести тренировку"));
      setDatePicker(null);
    }
  }

  function pickAssignDate(rowIndex: number, iso: string) {
    setAssignRows((prev) => prev.map((row, i) => (i === rowIndex ? { ...row, date: iso } : row)));
    setDatePicker(null);
  }

  /** Убирает тренировку только из этого назначения — сама программа не меняется. */
  function removeAssignRow(rowIndex: number) {
    setAssignRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setDatePicker(null);
  }

  function openAssignProgram() {
    setError(null);
    setAssignProgramId("");
    setAssignRows([]);
    setDatePicker(null);
    setAssignProgramOpen(true);
  }

  async function assignProgram(e: FormEvent) {
    e.preventDefault();
    setAssigningProgram(true);
    setError(null);
    try {
      const created = await scheduledWorkoutApi.assignProgram({
        clientId,
        programId: Number(assignProgramId),
        placements: assignRows.map((row) => ({ workoutId: row.workout.id, date: row.date! })),
      });
      setScheduled((prev) => [...prev, ...created]);
      onScheduleChange?.();
      setAssignProgramOpen(false);
      setAssignProgramId("");
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось назначить комплекс"));
    } finally {
      setAssigningProgram(false);
    }
  }

  /** Клиент был, но тренировку не открывал: отмечаем посещение руками. */
  async function markAttendance(id: number) {
    setError(null);
    try {
      const attendance = await scheduledWorkoutApi.markAttendance(id);
      setScheduled((prev) => prev.map((sw) => (sw.id === id ? { ...sw, attendance } : sw)));
      onScheduleChange?.();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось отметить посещение"));
    }
  }

  /**
   * Стирает запись о посещении целиком. Для сегодняшнего дня это «переоткрыть»: тренировка
   * снова становится доступной, и три часа пойдут с того момента, когда её откроет клиент,
   * а не с нажатия тренера.
   */
  async function resetAttendance(id: number) {
    setError(null);
    try {
      await scheduledWorkoutApi.resetAttendance(id);
      // Вместе с посещением сервер стирает и комментарии клиента к этому дню.
      setScheduled((prev) =>
        prev.map((sw) => (sw.id === id ? { ...sw, attendance: undefined, comments: [] } : sw)),
      );
      onScheduleChange?.();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось сбросить посещение"));
    }
  }

  async function removeScheduledWorkout(id: number) {
    setError(null);
    try {
      await scheduledWorkoutApi.remove(id);
      setScheduled((prev) => prev.filter((sw) => sw.id !== id));
      onScheduleChange?.();
    } catch (err) {
      setError(apiErrorMessage(err, "Не удалось убрать тренировку"));
    }
  }

  function openScheduleModal(iso: string) {
    setError(null);
    setSourceWorkoutId("");
    setPickMode("template");
    setStep("pick");
    setEditingScheduledId(null);
    setDraft([]);
    setDraftName("");
    setDraftDescription("");
    setAddExerciseOpen(false);
    setOpenDate(iso);
  }

  /** Клетка календаря выбора даты: компактная, кликом ставит дату строке назначения. */
  function renderPickerDay(day: Date, target: DatePickerTarget) {
    const iso = toISODate(day);
    const isPast = iso < todayISO;
    const chosenHere =
      target.kind === "assign"
        ? assignRows[target.rowIndex]?.date === iso
        : target.workout.scheduledDate === iso;
    const chosenElsewhere =
      target.kind === "assign" && assignRows.some((row, j) => j !== target.rowIndex && row.date === iso);
    const alreadyScheduled = (byDate[iso] ?? []).length > 0;
    const isToday = isSameDate(day, today);

    const tone = isPast
      ? "text-ink/25"
      : chosenHere
        ? "bg-primary text-white"
        : chosenElsewhere
          ? "bg-mint/60 text-ink"
          : isToday
            ? "border border-primary text-primary"
            : "text-ink hover:bg-offwhite";

    return (
      <button
        key={iso}
        type="button"
        disabled={isPast}
        onClick={() =>
          target.kind === "assign" ? pickAssignDate(target.rowIndex, iso) : moveWorkoutTo(target.workout, iso)
        }
        title={
          isPast
            ? "Назначить тренировку в прошлое нельзя"
            : alreadyScheduled
              ? "В этот день у клиента уже есть тренировка"
              : undefined
        }
        className={`relative grid h-10 place-items-center rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed ${tone}`}
      >
        {day.getDate()}
        {alreadyScheduled && !chosenHere && (
          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-ink/30" />
        )}
      </button>
    );
  }

  /**
   * Плашка тренировки в календаре.
   *
   * @param roomy в клетке сетки места мало, а в списке под сеткой по плашке и по крестику
   *        рядом с ней нужно попадать пальцем.
   */
  function renderWorkoutPill(sw: ScheduledWorkoutResponse, roomy = false) {
    const state = workoutState(sw);
    // Название дня и так в ячейке — статус в календаре передаётся видом плашки.
    const pill = workoutPill(sw);
    const solid = pill.solid;
    return (
      <div
        key={sw.id}
        title={WORKOUT_STATE_TITLE[state]}
        className={`group flex items-center justify-between gap-1 rounded-full border px-2 text-xs ${
          roomy ? "py-2" : "py-1"
        } ${pill.className}`}
      >
        <button
          type="button"
          // Пустую тренировку открываем сразу на правку: смотреть в ней нечего,
          // тренер пришёл проставлять веса. Всё остальное сначала показываем.
          onClick={() => (hasAnyValue(sw.workout) ? setViewWorkout(sw) : openScheduledForEdit(sw))}
          className={`min-w-0 flex-1 truncate text-left ${roomy ? "-my-2 py-2" : ""} ${
            solid ? "hover:underline" : "hover:text-primary"
          }`}
        >
          {sw.name}
        </button>
        <CommentBadge count={sw.comments.length} />
        <button
          type="button"
          onClick={() => removeScheduledWorkout(sw.id)}
          aria-label="Убрать тренировку"
          // В списке под сеткой крестик растянут на всю высоту плашки: 16 пикселей
          // на телефоне не нажать, а отрицательный отступ не даёт плашке подрасти.
          className={`shrink-0 ${roomy ? "-my-2 px-3.5 py-2" : ""} ${
            solid ? "text-white/60 hover:text-white" : "text-ink/30 hover:text-coral"
          }`}
        >
          ✕
        </button>
      </div>
    );
  }

  /**
   * Клетка месяца на узком экране: число и точки по числу тренировок. Плашки с названиями
   * в сорок пикселей ширины не помещаются, поэтому состав дня показан в панели ниже.
   */
  function renderCompactCell(day: Date, selectedISO: string, onPick: (iso: string) => void) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    const isPast = iso < todayISO;
    const dayWorkouts = byDate[iso] ?? [];
    const picked = iso === selectedISO;

    const dots = dayWorkouts.slice(0, MAX_DOTS).map(workoutDot);
    if (dayWorkouts.some((sw) => sw.comments.length > 0) && dots.length < MAX_DOTS) {
      dots.push("bg-amber");
    }

    return (
      <button
        key={iso}
        type="button"
        onClick={() => onPick(iso)}
        className={`flex aspect-square flex-col items-center justify-center rounded-xl border transition ${
          picked ? "border-2 border-primary bg-mint/30" : isToday ? "border-primary" : "border-line"
        }`}
      >
        <span
          className={`text-[15px] font-bold leading-none ${
            picked || isToday ? "text-primary" : isPast ? "text-ink/35" : "text-ink"
          }`}
        >
          {day.getDate()}
        </span>
        <CalendarDayDots dots={dots} more={Math.max(0, dayWorkouts.length - MAX_DOTS)} />
      </button>
    );
  }

  /** Состав выбранного дня под компактной сеткой: плашки крупнее и кнопка «запланировать». */
  function renderDayPanel(iso: string) {
    const dayWorkouts = byDate[iso] ?? [];
    const day = fromISODate(iso);
    const isPast = iso < todayISO;
    return (
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
            {day.getDate()} {MONTHS[day.getMonth()]}
            {isSameDate(day, today) ? " · сегодня" : ""}
          </p>
          {!isPast && (
            <button
              type="button"
              onClick={() => openScheduleModal(iso)}
              className="shrink-0 py-2 text-xs font-semibold text-primary hover:underline sm:py-1"
            >
              + Запланировать
            </button>
          )}
        </div>
        <div className="mt-2 space-y-1.5">
          {dayWorkouts.length === 0 ? (
            <p className="text-xs text-ink/45">В этот день тренировок нет.</p>
          ) : (
            dayWorkouts.map((sw) => renderWorkoutPill(sw, true))
          )}
        </div>
      </div>
    );
  }

  /** One day of the calendar — shared by the two-week grid on the page and the 3-month modal. */
  function renderDayCell(day: Date) {
    const iso = toISODate(day);
    const isToday = isSameDate(day, today);
    // Прошедший день можно дозаполнить весами, но назначить на него новую тренировку — нет.
    const isPast = iso < todayISO;
    const dayWorkouts = byDate[iso] ?? [];
    return (
      <div
        key={iso}
        className={`min-h-[92px] rounded-2xl border p-2 ${isToday ? "border-primary bg-mint/20" : "border-line"}`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${
              isToday ? "text-primary" : isPast ? "text-ink/30" : "text-ink/60"
            }`}
          >
            {day.getDate()} {MONTHS[day.getMonth()]}
          </span>
          {!isPast && (
            <button
              type="button"
              onClick={() => openScheduleModal(iso)}
              aria-label="Запланировать тренировку"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-ink/35 hover:bg-offwhite hover:text-ink/60"
            >
              +
            </button>
          )}
        </div>
        <div className="mt-1.5 space-y-1">{dayWorkouts.map((sw) => renderWorkoutPill(sw))}</div>
      </div>
    );
  }

  // Parsed from the ISO string rather than looked up in `days`, so a day picked in the
  // three-month modal (outside the two-week strip) still resolves.
  const openDateObj = openDate ? fromISODate(openDate) : null;
  const editingScheduled =
    editingScheduledId != null ? scheduled.find((sw) => sw.id === editingScheduledId) : undefined;
  const accessWindowLive = windowIsLive(editingScheduled);

  return (
    <div className="rounded-card bg-white p-5 shadow-card sm:p-6">
      {/* Узкий экран: кнопка уезжала за край карточки — на телефоне она встаёт
          под заголовком, своей шириной, а не во всю строку. */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-ink">Календарь</h2>
        <Button
          variant="neutral"
          onClick={openAssignProgram}
          className="!px-5 !py-2.5 !text-xs shrink-0"
        >
          Назначить комплекс
        </Button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Тренировки, назначенные клиенту на текущую и следующую неделю.
      </p>

      {error && <p className="mt-2 text-sm text-coral">{error}</p>}

      {/* Узкий экран: в клетку 7×2 плашки с названиями не помещаются, там числа и точки. */}
      <div className="lg:hidden">
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-ink/40">
          {DAYS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1">
          {days.map((day) => renderCompactCell(day, pickedISO ?? todayISO, setPickedISO))}
        </div>
        {renderDayPanel(pickedISO ?? todayISO)}
      </div>

      <div className="hidden lg:block">
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-ink/40">
          {DAYS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        {[0, 1].map((week) => (
          <div key={week} className="mt-2 grid grid-cols-7 gap-2">
            {days.slice(week * 7, week * 7 + 7).map(renderDayCell)}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setMoreCalendarOpen(true)}
        className="mt-3 py-2 text-xs font-semibold text-primary hover:underline sm:py-0"
      >
        См. больше
      </button>

      {openDate && openDateObj && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-3 py-6 sm:px-4"
          onClick={closeScheduleModal}
        >
          <div
            className={`relative w-full rounded-card bg-white p-5 shadow-card sm:p-8 ${
              step === "table" ? "max-w-3xl" : "max-w-md"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeScheduleModal}
              aria-label="Закрыть"
              className="absolute right-3 top-3 p-2 text-ink/60 hover:text-ink sm:right-6 sm:top-6 sm:p-0"
            >
              ✕
            </button>

            <h2 className="pr-8 text-lg font-bold text-ink sm:text-xl">
              {step === "table" && draftName ? draftName : "Тренировка"} на {openDateObj.getDate()}{" "}
              {MONTHS[openDateObj.getMonth()]}
            </h2>

            {step === "pick" ? (
              <form onSubmit={handlePickSubmit} className="mt-6 space-y-3">
                <div className="flex rounded-full border border-line bg-offwhite p-1">
                  <button
                    type="button"
                    onClick={() => setPickMode("template")}
                    className={pillButtonClass(pickMode === "template")}
                  >
                    <CompactLabel short="Готовая" full="Готовая тренировка" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickMode("blank")}
                    className={pillButtonClass(pickMode === "blank")}
                  >
                    <CompactLabel short="Новая" full="Новая тренировка" />
                  </button>
                </div>

                {pickMode === "template" ? (
                  <>
                    <Combobox
                      required
                      placeholder="Тренировка"
                      value={sourceWorkoutId}
                      onChange={setSourceWorkoutId}
                      options={workouts.map((w) => ({ value: String(w.id), label: w.name }))}
                    />

                    {workouts.length === 0 && (
                      <p className="text-xs text-ink/50">
                        В каталоге ещё нет тренировок — создайте их в разделе «Тренировки» или соберите
                        тренировку с нуля.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      required
                      placeholder="Название тренировки"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className={fieldClass}
                    />
                    <textarea
                      placeholder="Описание"
                      rows={2}
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      className={textareaClass}
                    />
                    <p className="text-xs text-ink/50">
                      Тренировка составляется только для этого дня и в каталог не попадает.
                    </p>
                  </>
                )}

                {error && <p className="text-sm text-coral">{error}</p>}

                <Button
                  type="submit"
                  disabled={
                    loadingExercises ||
                    creating ||
                    (pickMode === "template" ? workouts.length === 0 || !sourceWorkoutId : !draftName.trim())
                  }
                  className="w-full !normal-case !text-base disabled:!bg-ink/10 disabled:!text-ink/40 disabled:!opacity-100"
                >
                  {loadingExercises ? "Загружаем..." : "Перейти к упражнениям"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleTableSubmit} className="mt-6 space-y-3">
                {draft.length === 0 ? (
                  <p className="text-xs text-ink/50">
                    В тренировке пока нет упражнений — добавьте их списком ниже.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-line bg-offwhite px-3 py-2 text-left align-middle text-xs font-bold uppercase text-ink/40">
                            Упражнение
                          </th>
                          {Array.from({ length: setColumnCount }, (_, setIndex) => (
                            <th key={setIndex} className="border border-line bg-offwhite px-2 py-2 text-center align-bottom">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-xs font-bold uppercase text-ink/40 whitespace-nowrap">
                                  Подход {setIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeSetColumn(setIndex)}
                                  aria-label="Убрать подход"
                                  className="shrink-0 text-ink/30 hover:text-coral"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="mt-0.5 text-[10px] font-medium normal-case tracking-normal text-ink/35 whitespace-nowrap">
                                Вес × Повт
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {draft.map((ex, rowIndex) => {
                          const rows = ex.sets;
                          return (
                            <tr
                              key={`${ex.exerciseId ?? "ad-hoc"}-${rowIndex}`}
                              ref={draftSortable.setItemRef(rowIndex)}
                              style={draftSortable.itemStyle(rowIndex)}
                              className="group/row bg-white"
                            >
                              <td className="border border-line px-2 py-1.5 whitespace-nowrap text-sm font-semibold text-ink">
                                <div className="flex items-center gap-2">
                                  <span
                                    {...draftSortable.handleProps(rowIndex)}
                                    title="Перетащите, чтобы изменить порядок упражнений"
                                    aria-label="Изменить порядок"
                                    className="grid h-6 w-6 shrink-0 cursor-grab select-none place-items-center rounded-full text-ink/30 hover:bg-offwhite hover:text-ink/60 active:cursor-grabbing"
                                  >
                                    ≡
                                  </span>
                                  <span className="flex-1">{ex.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeExerciseRow(rowIndex)}
                                    aria-label="Убрать упражнение"
                                    className="shrink-0 px-1 text-ink/30 opacity-0 transition hover:text-coral focus:opacity-100 group-hover/row:opacity-100"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                              {rows.map((row, setIndex) => (
                                <td
                                  key={setIndex}
                                  className="border border-line p-0"
                                  onMouseDown={(e) => {
                                    // The pair reads as one field: clicking anywhere left of the "×" puts the
                                    // caret in the weight half, anywhere right of it in the reps half.
                                    if ((e.target as HTMLElement).tagName === "INPUT") return;
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const field = e.clientX < rect.left + rect.width / 2 ? "weight" : "reps";
                                    setInputRefs.current[setInputKey(rowIndex, setIndex, field)]?.focus();
                                  }}
                                >
                                  <div className="flex items-center focus-within:bg-mint/25">
                                    {(["weight", "reps"] as const).map((field, fieldIndex) => (
                                      <div key={field} className="contents">
                                        {fieldIndex === 1 && (
                                          <span className="pointer-events-none shrink-0 text-xs text-ink/25">×</span>
                                        )}
                                        {/* Поле ширины «по содержимому», чтобы «кг» стояло вплотную к числу,
                                            а пара «число + кг» оставалась по центру своей половины. */}
                                        <div className="flex min-w-0 flex-1 items-center justify-center">
                                          <input
                                            ref={(el) => {
                                              setInputRefs.current[setInputKey(rowIndex, setIndex, field)] = el;
                                            }}
                                            inputMode={field === "weight" ? "decimal" : "numeric"}
                                            aria-label={`${field === "weight" ? "Вес" : "Повторений"}, подход ${setIndex + 1}`}
                                            size={Math.max(row[field].length, 1)}
                                            value={row[field]}
                                            onChange={(e) => updateSetCell(rowIndex, setIndex, field, e.target.value)}
                                            onKeyDown={(e) => handleSetInputKeyDown(e, { rowIndex, setIndex, field }, rows.length)}
                                            className="min-w-0 max-w-full bg-transparent px-0 py-2 text-center text-xs outline-none"
                                          />
                                          {field === "weight" && (
                                            <span className="pointer-events-none shrink-0 text-xs">кг</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Две кнопки рядом не помещаются в ширину телефона — там они в столбик. */}
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={openAddExercise}
                    className="shrink-0 !px-5 !py-2 !text-xs"
                  >
                    Добавить упражнение
                  </Button>
                  <button
                    type="button"
                    onClick={addSetColumn}
                    className="shrink-0 whitespace-nowrap py-2 text-xs font-semibold text-primary sm:py-0"
                  >
                    + Добавить подход
                  </button>
                </div>

                {editingScheduled && (
                  <div className="rounded-2xl border border-line px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-ink/70">
                        {editingScheduled.attendance?.attendedAt
                          ? `Клиент был в ${timeOnly.format(new Date(editingScheduled.attendance.attendedAt))}`
                          : "Клиент тренировку не открывал"}
                        {editingScheduled.attendance?.attendanceSource === "TRAINER" && " · отметили вручную"}
                        {accessWindowLive &&
                          ` · открыта до ${timeOnly.format(new Date(editingScheduled.attendance!.expiresAt!))}`}
                      </p>

                      <div className="flex gap-4 text-xs font-semibold">
                        {editingScheduled.attendance ? (
                          <button
                            type="button"
                            onClick={() => resetAttendance(editingScheduled.id)}
                            className="text-primary hover:underline"
                            title={
                              editingScheduled.scheduledDate === todayISO
                                ? "Клиент сможет открыть тренировку заново — три часа пойдут с этого момента"
                                : "Стирает запись о посещении. Доступ этим не вернуть: открыть можно только в свой день"
                            }
                          >
                            {editingScheduled.scheduledDate === todayISO ? "Переоткрыть" : "Сбросить посещение"}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => markAttendance(editingScheduled.id)}
                              className="text-primary hover:underline"
                            >
                              Отметить посещение
                            </button>
                            <button
                              type="button"
                              onClick={() => openMovePicker(editingScheduled)}
                              className="text-primary hover:underline"
                            >
                              Перенести
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {accessWindowLive && (
                      <p className="mt-1 text-xs text-coral">
                        Клиент сейчас на тренировке — правки не сохранятся. Чтобы закрыть окно
                        досрочно, нажмите «Переоткрыть».
                      </p>
                    )}

                    {editingScheduled.comments.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                          Комментарии клиента
                        </p>
                        {editingScheduled.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="flex items-start gap-2 rounded-xl border border-amber/60 bg-amber/10 px-3 py-2"
                          >
                            <CommentBadge count={1} className="mt-0.5" />
                            <p className="min-w-0 text-xs text-ink/80">
                              <span className="font-semibold text-ink">{comment.exerciseName}:</span> {comment.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-coral">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => (editingScheduledId !== null ? closeScheduleModal() : setStep("pick"))}
                    className="!normal-case !text-base"
                  >
                    {editingScheduledId !== null ? "Отмена" : "Назад"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || accessWindowLive}
                    className="w-full !normal-case !text-base disabled:!bg-ink/10 disabled:!text-ink/40 disabled:!opacity-100"
                  >
                    {creating ? "Сохраняем..." : editingScheduledId !== null ? "Сохранить" : "Назначить тренировку"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {addExerciseOpen && (
        <WorkoutExerciseFormModal
          title="Упражнение в тренировке"
          catalog={exerciseCatalog}
          form={addExerciseForm}
          onChange={setAddExerciseForm}
          submitLabel="Добавить упражнение"
          submitting={addingExercise}
          error={error}
          onUploadError={setError}
          onSubmit={submitAddExercise}
          onClose={() => setAddExerciseOpen(false)}
        />
      )}

      {moreCalendarOpen && (
        <div
          // На телефоне окно занимает половину экрана — прижатое к верху, оно висело бы
          // в пустоте. На широком экране оно и так почти во весь экран, там верх привычнее.
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4 sm:py-8 lg:items-start"
          onClick={() => setMoreCalendarOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-4xl flex-col rounded-card bg-white p-5 shadow-card sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMoreCalendarOpen(false)}
              aria-label="Закрыть"
              className="absolute right-2 top-2 px-3 py-2 text-ink/60 hover:text-ink sm:right-6 sm:top-6 sm:p-0"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-ink sm:text-xl">Календарь</h2>
            <p className="mt-1 pr-8 text-xs text-ink/60 sm:pr-0 sm:text-sm">
              Текущий месяц, два предыдущих и два следующих — прокрутите, чтобы увидеть остальные.
            </p>

            {error && <p className="mt-2 text-sm text-coral">{error}</p>}

            {/* На телефоне высота подобрана так, чтобы в окно попадал ровно один месяц,
                даже самый длинный, шестинедельный. На широком экране список занимает всё,
                что осталось от окна. */}
            <div
              ref={monthsScrollRef}
              className="mt-4 h-[300px] overflow-y-auto overscroll-contain sm:pr-2 lg:h-auto lg:min-h-0 lg:flex-1"
            >
              {Array.from({ length: EXTENDED_CALENDAR_MONTHS }, (_, offset) => {
                const monthStart = new Date(
                  today.getFullYear(),
                  today.getMonth() + offset - EXTENDED_CALENDAR_MONTHS_BACK,
                  1,
                );
                const year = monthStart.getFullYear();
                const month = monthStart.getMonth();
                const isCurrentMonth = offset === EXTENDED_CALENDAR_MONTHS_BACK;
                return (
                  <section
                    key={`${year}-${month}`}
                    ref={isCurrentMonth ? currentMonthRef : undefined}
                    className={offset === 0 ? "" : "mt-8"}
                  >
                    <h3 className="text-sm font-bold text-ink">
                      {MONTH_TITLES[month]} {year}
                    </h3>
                    <div className="lg:hidden">
                      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-ink/40">
                        {DAYS.map((label) => (
                          <div key={label}>{label}</div>
                        ))}
                      </div>
                      <div className="mt-1.5 grid grid-cols-7 gap-1">
                        {monthCells(year, month).map((day, index) =>
                          day ? (
                            renderCompactCell(day, morePickedISO ?? todayISO, setMorePickedISO)
                          ) : (
                            <div key={`pad-${index}`} />
                          ),
                        )}
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-ink/40">
                        {DAYS.map((label) => (
                          <div key={label}>{label}</div>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-2">
                        {monthCells(year, month).map((day, index) =>
                          day ? renderDayCell(day) : <div key={`pad-${index}`} />,
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Состав выбранного дня: на узком экране он не помещается в клетку. */}
            <div className="shrink-0 lg:hidden">{renderDayPanel(morePickedISO ?? todayISO)}</div>
          </div>
        </div>
      )}

      {viewWorkout && (
        <WorkoutViewModal
          workout={viewWorkout}
          onEdit={() => {
            openScheduledForEdit(viewWorkout);
            setViewWorkout(null);
          }}
          onClose={() => setViewWorkout(null)}
          layer="base"
        />
      )}

      {datePicker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4 sm:py-8 lg:items-start"
          onClick={() => setDatePicker(null)}
        >
          <div
            className="relative flex max-h-full w-full max-w-md flex-col rounded-card bg-white p-5 shadow-card sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDatePicker(null)}
              aria-label="Закрыть"
              className="absolute right-3 top-3 p-2 text-ink/60 hover:text-ink sm:right-6 sm:top-6 sm:p-0"
            >
              ✕
            </button>

            <h2 className="pr-8 text-lg font-bold text-ink sm:text-xl">
              {datePicker.kind === "assign" ? "Дата тренировки" : "Перенести тренировку"}
            </h2>
            <p className="mt-1 truncate text-sm text-ink/60">
              {datePicker.kind === "assign"
                ? assignRows[datePicker.rowIndex]?.workout.name
                : datePicker.workout.name}
            </p>

            <div
              ref={pickerScrollRef}
              style={{ height: DATE_PICKER_VIEWPORT_HEIGHT }}
              className="mt-4 overflow-y-auto pr-2"
            >
              {Array.from({ length: DATE_PICKER_MONTHS }, (_, offset) => {
                const monthStart = new Date(today.getFullYear(), today.getMonth() + offset, 1);
                const year = monthStart.getFullYear();
                const month = monthStart.getMonth();
                return (
                  <section
                    key={`${year}-${month}`}
                    ref={offset === pickerMonthOffset ? pickerMonthRef : undefined}
                    className={offset === 0 ? "" : "mt-5"}
                  >
                    <h3 className="text-sm font-bold text-ink">
                      {MONTH_TITLES[month]} {year}
                    </h3>
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-ink/40">
                      {DAYS.map((label) => (
                        <div key={label}>{label}</div>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {monthCells(year, month).map((day, index) =>
                        day ? renderPickerDay(day, datePicker) : <div key={`pad-${index}`} />,
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            <p className="mt-4 shrink-0 text-xs text-ink/50">
              Точкой отмечены дни, на которые клиенту уже что-то назначено.
            </p>
          </div>
        </div>
      )}

      {assignProgramOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6 sm:px-4"
          onClick={() => setAssignProgramOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-lg flex-col rounded-card bg-white p-5 shadow-card sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAssignProgramOpen(false)}
              aria-label="Закрыть"
              className="absolute right-3 top-3 p-2 text-ink/60 hover:text-ink sm:right-6 sm:top-6 sm:p-0"
            >
              ✕
            </button>

            <h2 className="pr-8 text-lg font-bold text-ink sm:text-xl">Назначить комплекс</h2>

            <form onSubmit={assignProgram} className="mt-6 flex min-h-0 flex-col gap-3">
              <Combobox
                required
                placeholder="Комплекс"
                value={assignProgramId}
                onChange={selectProgram}
                options={trainingPrograms.map((p) => ({ value: String(p.id), label: p.name }))}
              />

              {trainingPrograms.length === 0 && (
                <p className="text-xs text-ink/50">
                  Пока нет ни одного комплекса — сначала создайте его в разделе «Комплексы».
                </p>
              )}

              {loadingProgram && <p className="text-xs text-ink/50">Загружаем тренировки комплекса...</p>}

              {!loadingProgram && assignProgramId && assignRows.length === 0 && (
                <p className="text-xs text-ink/50">
                  В этом назначении не осталось тренировок — выберите комплекс заново.
                </p>
              )}

              {assignRows.length > 0 && (
                <>
                  <p className="text-xs text-ink/50">
                    Поставьте дату каждой тренировке. Ненужную можно убрать — из самого комплекса она
                    не пропадёт. Веса задаются позже, по клику на день в календаре.
                  </p>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                    {assignRows.map((row, i) => (
                      <div
                        key={row.workout.id}
                        className="group/row flex items-center gap-2 rounded-2xl bg-offwhite px-3 py-1.5"
                      >
                        <span className="w-4 shrink-0 text-xs font-semibold text-ink/35 tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{row.workout.name}</span>

                        <button
                          type="button"
                          onClick={() => openDatePicker(i)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            row.date
                              ? "bg-white text-primary hover:bg-mint/40"
                              : "border border-dashed border-ink/30 text-ink/45 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {row.date
                            ? `${fromISODate(row.date).getDate()} ${MONTHS[fromISODate(row.date).getMonth()]}, ${
                                DAYS[weekdayIndex(fromISODate(row.date))]
                              }`
                            : "Указать дату"}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeAssignRow(i)}
                          aria-label="Убрать тренировку из назначения"
                          className="shrink-0 px-1 text-ink/30 opacity-0 transition hover:text-coral focus:opacity-100 group-hover/row:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {error && <p className="text-sm text-coral">{error}</p>}

              <Button
                type="submit"
                disabled={assigningProgram || assignRows.length === 0 || assignRows.some((row) => !row.date)}
                className="w-full shrink-0 !normal-case !text-base disabled:!bg-ink/10 disabled:!text-ink/40 disabled:!opacity-100"
              >
                {assigningProgram
                  ? "Назначаем..."
                  : assignRows.length > 0
                    ? `Назначить ${assignRows.length} тренировок`
                    : "Назначить"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
