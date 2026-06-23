import React, { useEffect, useMemo, useState } from 'react';
import s from '../styles/Dashboard.module.css';
import EmptyState from './EmptyState';
import { useTranslation } from 'react-i18next';

type TaskId = 'water' | 'fertilize' | 'harvest';

interface DailyTask {
  id: TaskId;
  title: string;
  description: string;
}

type TaskState = Record<TaskId, boolean>;

const TASKS: DailyTask[] = [
  {
    id: 'water',
    title: 'Water',
    description: 'Check soil moisture and irrigate where needed.',
  },
  {
    id: 'fertilize',
    title: 'Fertilize',
    description: 'Apply planned nutrients for today.',
  },
  {
    id: 'harvest',
    title: 'Harvest',
    description: 'Pick mature crops and record the yield.',
  },
];

const DEFAULT_TASK_STATE: TaskState = {
  water: false,
  fertilize: false,
  harvest: false,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);
const storageKeyForDate = (dateKey: string) => `agronavis:daily-tasks:${dateKey}`;

const parseStoredTaskState = (value: string | null): TaskState => {
  if (!value) return DEFAULT_TASK_STATE;

  try {
    const parsed = JSON.parse(value) as Partial<TaskState>;

    return {
      water: Boolean(parsed.water),
      fertilize: Boolean(parsed.fertilize),
      harvest: Boolean(parsed.harvest),
    };
  } catch {
    return DEFAULT_TASK_STATE;
  }
};

const DailyTaskReminders: React.FC = () => {
  const { t } = useTranslation();
  const [taskState, setTaskState] = useState<TaskState>(DEFAULT_TASK_STATE);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const todayKey = useMemo(getTodayKey, []);
  const completedCount = TASKS.filter(task => taskState[task.id]).length;
  const allComplete = completedCount === TASKS.length;

  useEffect(() => {
    setTaskState(parseStoredTaskState(window.localStorage.getItem(storageKeyForDate(todayKey))));
    setHasLoadedLocalState(true);
  }, [todayKey]);

  useEffect(() => {
    if (!hasLoadedLocalState) return;

    window.localStorage.setItem(storageKeyForDate(todayKey), JSON.stringify(taskState));
  }, [hasLoadedLocalState, taskState, todayKey]);

  const toggleTask = (taskId: TaskId) => {
    setTaskState(current => ({
      ...current,
      [taskId]: !current[taskId],
    }));
  };

  /** Reset all tasks so the farmer can use this card to mark them again */
  const resetTasks = () => {
    setTaskState(DEFAULT_TASK_STATE);
  };

  const markAllAsDone = () => {
  setTaskState({
    water: true,
    fertilize: true,
    harvest: true,
  });
};

  return (
    <div className={s.card} data-hc-target="true">
      <div className={s.cardHeader}>
        <div>
          <div className={s.cardTitle}>
            {t('dashboard.dailyTasks.title')}
          </div>
          <div className={s.taskSummary}>
            {completedCount}/{TASKS.length} {t('dashboard.dailyTasks.completeToday')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!allComplete && (
            <button
              type="button"
              className={s.taskDoneBtn}
              onClick={markAllAsDone}
            >
              {t('dashboard.dailyTasks.markAllDone')}
            </button>
          )}

          <span className={`${s.taskStatusBadge} ${allComplete ? s.taskStatusBadgeDone : ''}`}>
            {allComplete
              ? t('dashboard.dailyTasks.done')
              : t('dashboard.dailyTasks.today')}
          </span>
        </div>
      </div>

      {/* ── All-done: show a beautiful illustrated celebration state ── */}
      {allComplete ? (
        <EmptyState
          variant="tasks"
          title={t('dashboard.emptyStates.tasks.title')}
          description={t('dashboard.emptyStates.tasks.desc')}
          ctaLabel={t('dashboard.emptyStates.tasks.resetCta')}
          onCta={resetTasks}
        />
      ) : (
        <div className={s.tasksCard}>
          {TASKS.map(task => {
            const checked = taskState[task.id];

            return (
              <label
                key={task.id}
                htmlFor={`task-${task.id}`}
                className={`${s.dailyTaskItem} ${checked ? s.dailyTaskItemDone : ''}`}
              >
                <input
                  id={`task-${task.id}`}
                  className={s.dailyTaskCheckbox}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTask(task.id)}
                />
                <span className={s.dailyTaskCheckmark} aria-hidden="true">
                  {checked && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className={s.dailyTaskInfo}>
                  <span className={s.taskName}>{task.title}</span>
                  <span className={s.taskDesc}>{task.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyTaskReminders;
