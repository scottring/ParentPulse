'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { useWeeklyWorkbook } from '@/hooks/useWeeklyWorkbook';
import {
  ActivityType,
  ACTIVITY_TEMPLATES,
  EmotionCheckinResponse,
  ChoiceBoardResponse,
  DailyWinResponse,
  VisualScheduleResponse,
  ScheduleTask,
  StrengthReflectionResponse,
  CourageMomentResponse,
  AffirmationPracticeResponse,
  GrowthMindsetReflectionResponse,
  AccomplishmentTrackerResponse
} from '@/types/workbook';
import type { StoryReflectionResponse } from '@/types/child-workbook';
import { useChildWorkbook } from '@/hooks/useChildWorkbook';

export default function ActivityPage({
  params
}: {
  params: Promise<{ personId: string; activityId: string }>;
}) {
  const { personId, activityId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { workbook, loading: workbookLoading, completeActivity } = useWeeklyWorkbook(personId);
  const { workbook: childWorkbook, loading: childWorkbookLoading } = useChildWorkbook(personId);

  const [response, setResponse] = useState<any>(null);
  const [parentNotes, setParentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || personLoading || workbookLoading || childWorkbookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  if (!user || !person || !workbook) {
    return null;
  }

  const activity = workbook.dailyActivities.find(a => a.id === activityId);
  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="text-center">
          <p className="text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Activity not found
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const template = ACTIVITY_TEMPLATES[activity.type];

  const handleComplete = async () => {
    if (!response) {
      alert('Please complete the activity first!');
      return;
    }

    setSaving(true);
    try {
      await completeActivity(workbook.workbookId, activityId, response, parentNotes.trim() || undefined);
      router.push(`/people/${personId}/workbook`);
    } catch (error) {
      console.error('Error completing activity:', error);
      alert('Failed to save activity');
      setSaving(false);
    }
  };

  const renderActivity = () => {
    switch (activity.type) {
      case 'emotion-checkin':
        return <EmotionCheckinActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'choice-board':
        return <ChoiceBoardActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'daily-win':
        return <DailyWinActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'visual-schedule':
        return <VisualScheduleActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'gratitude':
        return <GratitudeActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'feeling-thermometer':
        return <FeelingThermometerActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'strength-reflection':
        return <StrengthReflectionActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'courage-moment':
        return <CourageMomentActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'affirmation-practice':
        return <AffirmationPracticeActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'growth-mindset-reflection':
        return <GrowthMindsetReflectionActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'accomplishment-tracker':
        return <AccomplishmentTrackerActivity response={response} setResponse={setResponse} personName={person.name} />;
      case 'story-reflection':
        return <StoryReflectionActivity
          response={response}
          setResponse={setResponse}
          personName={person.name}
          childWorkbook={childWorkbook}
        />;
      default:
        return <div>Unknown activity type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="relative border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-purple-600"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-purple-600"></div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="font-mono text-3xl font-bold text-slate-800 hover:text-purple-600 transition-colors"
            >
              ←
            </button>
            <div className="flex-1 text-center">
              <div className="text-6xl mb-3">{template.emoji}</div>
              <h1 className="font-mono text-3xl font-bold text-slate-900 mb-2">
                {template.title}
              </h1>
              <p className="font-mono text-sm text-slate-600">
                {template.parentInstructions}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Activity Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {renderActivity()}

        {/* Parent Notes */}
        <div className="relative bg-white border-4 border-slate-800 p-6 mt-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute -top-3 -left-3 w-10 h-10 bg-amber-600 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-800">
            📝
          </div>
          <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
            Parent Notes (Optional)
          </label>
          <textarea
            value={parentNotes}
            onChange={(e) => setParentNotes(e.target.value)}
            className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
            rows={3}
            placeholder="Any observations or thoughts?"
          />
        </div>

        {/* Complete Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleComplete}
            disabled={saving || !response}
            className="px-16 py-6 border-4 border-green-600 bg-green-600 text-white font-mono font-bold text-2xl hover:bg-green-700 hover:border-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[8px_8px_0px_0px_rgba(22,101,52,1)]"
          >
            {saving ? 'SAVING...' : 'DONE! ✓'}
          </button>
        </div>
      </main>
    </div>
  );
}

// ==================== Activity Components ====================

function EmotionCheckinActivity({
  response,
  setResponse,
  personName
}: {
  response: EmotionCheckinResponse | null;
  setResponse: (r: EmotionCheckinResponse) => void;
  personName: string;
}) {
  const emotions = [
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'excited', emoji: '🤩', label: 'Excited' },
    { value: 'calm', emoji: '😌', label: 'Calm' },
    { value: 'worried', emoji: '😟', label: 'Worried' },
    { value: 'frustrated', emoji: '😤', label: 'Frustrated' },
    { value: 'sad', emoji: '😢', label: 'Sad' },
    { value: 'angry', emoji: '😡', label: 'Angry' },
    { value: 'tired', emoji: '😴', label: 'Tired' }
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--parent-text)' }}>
        How is {personName} feeling right now?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {emotions.map((emotion) => (
          <button
            key={emotion.value}
            onClick={() => setResponse({ emotion: emotion.value as any })}
            className={`p-8 rounded-2xl border-4 transition-all ${
              response?.emotion === emotion.value
                ? 'scale-105 shadow-xl'
                : 'hover:scale-105'
            }`}
            style={{
              borderColor: response?.emotion === emotion.value ? 'var(--parent-accent)' : 'var(--parent-border)',
              backgroundColor: response?.emotion === emotion.value ? 'rgba(var(--parent-accent-rgb), 0.1)' : 'white'
            }}
          >
            <div className="text-6xl mb-3">{emotion.emoji}</div>
            <div className="text-xl font-semibold" style={{ color: 'var(--parent-text)' }}>
              {emotion.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceBoardActivity({
  response,
  setResponse,
  personName
}: {
  response: ChoiceBoardResponse | null;
  setResponse: (r: ChoiceBoardResponse) => void;
  personName: string;
}) {
  const strategies = [
    { value: 'deep-breaths', emoji: '🫁', label: 'Deep Breaths' },
    { value: 'squeeze-pillow', emoji: '🛋️', label: 'Squeeze a Pillow' },
    { value: 'drink-water', emoji: '💧', label: 'Drink Water' },
    { value: 'count-to-ten', emoji: '🔢', label: 'Count to 10' },
    { value: 'draw-picture', emoji: '🎨', label: 'Draw a Picture' },
    { value: 'hug', emoji: '🤗', label: 'Get a Hug' },
    { value: 'quiet-space', emoji: '🪑', label: 'Quiet Space' },
    { value: 'favorite-toy', emoji: '🧸', label: 'Hold Favorite Toy' }
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--parent-text)' }}>
        What would help {personName} feel better?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {strategies.map((strategy) => (
          <button
            key={strategy.value}
            onClick={() => setResponse({ chosenStrategy: strategy.label })}
            className={`p-8 rounded-2xl border-4 transition-all ${
              response?.chosenStrategy === strategy.label
                ? 'scale-105 shadow-xl'
                : 'hover:scale-105'
            }`}
            style={{
              borderColor: response?.chosenStrategy === strategy.label ? 'var(--parent-accent)' : 'var(--parent-border)',
              backgroundColor: response?.chosenStrategy === strategy.label ? 'rgba(var(--parent-accent-rgb), 0.1)' : 'white'
            }}
          >
            <div className="text-6xl mb-3">{strategy.emoji}</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--parent-text)' }}>
              {strategy.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DailyWinActivity({
  response,
  setResponse,
  personName
}: {
  response: DailyWinResponse | null;
  setResponse: (r: DailyWinResponse) => void;
  personName: string;
}) {
  const categories = [
    { value: 'creative', emoji: '🎨', label: 'Creative' },
    { value: 'helping', emoji: '🤝', label: 'Helping' },
    { value: 'learning', emoji: '📚', label: 'Learning' },
    { value: 'energy', emoji: '⚡', label: 'Energy' },
    { value: 'kindness', emoji: '💝', label: 'Kindness' },
    { value: 'brave', emoji: '🦁', label: 'Brave' }
  ];

  const [description, setDescription] = useState('');

  useEffect(() => {
    if (response?.category && description) {
      setResponse({ category: response.category as any, description });
    }
  }, [description]);

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--parent-text)' }}>
        What was good about today for {personName}?
      </h2>

      {/* Category Selection */}
      <div className="mb-8">
        <p className="text-xl mb-4 text-center" style={{ color: 'var(--parent-text-light)' }}>
          Pick a category:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setResponse({ category: category.value as any, description })}
              className={`p-6 rounded-2xl border-4 transition-all ${
                response?.category === category.value
                  ? 'scale-105 shadow-xl'
                  : 'hover:scale-105'
              }`}
              style={{
                borderColor: response?.category === category.value ? 'var(--parent-accent)' : 'var(--parent-border)',
                backgroundColor: response?.category === category.value ? 'rgba(var(--parent-accent-rgb), 0.1)' : 'white'
              }}
            >
              <div className="text-5xl mb-2">{category.emoji}</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--parent-text)' }}>
                {category.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      {response?.category && (
        <div className="parent-card p-6">
          <label className="block font-medium mb-3 text-xl" style={{ color: 'var(--parent-text)' }}>
            Tell me about it:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 rounded-lg border text-xl"
            style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
            rows={4}
            placeholder="What happened?"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

function VisualScheduleActivity({
  response,
  setResponse,
  personName
}: {
  response: VisualScheduleResponse | null;
  setResponse: (r: VisualScheduleResponse) => void;
  personName: string;
}) {
  const defaultTasks: ScheduleTask[] = [
    { id: 'wake-up', emoji: '☀️', label: 'Wake Up', time: '7:00 AM' },
    { id: 'brush-teeth', emoji: '🪥', label: 'Brush Teeth', time: '7:30 AM' },
    { id: 'breakfast', emoji: '🥣', label: 'Breakfast', time: '7:45 AM' },
    { id: 'get-dressed', emoji: '👕', label: 'Get Dressed', time: '8:00 AM' },
    { id: 'school', emoji: '🏫', label: 'School', time: '8:30 AM' },
    { id: 'homework', emoji: '📝', label: 'Homework', time: '3:30 PM' },
    { id: 'dinner', emoji: '🍽️', label: 'Dinner', time: '6:00 PM' },
    { id: 'bath', emoji: '🛁', label: 'Bath', time: '7:30 PM' },
    { id: 'bedtime', emoji: '🌙', label: 'Bedtime', time: '8:30 PM' }
  ];

  const [tasks, setTasks] = useState<ScheduleTask[]>(response?.tasks || defaultTasks);
  const [completed, setCompleted] = useState<string[]>(response?.tasksCompleted || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const updateResponse = (newTasks: ScheduleTask[], newCompleted: string[]) => {
    setResponse({
      tasks: newTasks,
      tasksCompleted: newCompleted,
      totalTasks: newTasks.length
    });
  };

  const toggleTask = (taskId: string) => {
    const newCompleted = completed.includes(taskId)
      ? completed.filter(id => id !== taskId)
      : [...completed, taskId];
    setCompleted(newCompleted);
    updateResponse(tasks, newCompleted);
  };

  const updateTask = (id: string, updates: Partial<ScheduleTask>) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    setTasks(newTasks);
    updateResponse(newTasks, completed);
    setEditingId(null);
  };

  const deleteTask = (id: string) => {
    if (!confirm('Remove this task from the schedule?')) return;
    const newTasks = tasks.filter(t => t.id !== id);
    const newCompleted = completed.filter(cId => cId !== id);
    setTasks(newTasks);
    setCompleted(newCompleted);
    updateResponse(newTasks, newCompleted);
  };

  const addTask = (task: Omit<ScheduleTask, 'id'>) => {
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      ...task
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    updateResponse(newTasks, completed);
    setShowAddForm(false);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'var(--parent-text)' }}>
        {personName}'s Schedule
      </h2>
      <p className="text-lg text-center mb-6" style={{ color: 'var(--parent-text-light)' }}>
        Tap to check off • Click time or task to edit • Click 🗑️ to remove
      </p>

      {/* Add Task Button */}
      {!showAddForm && (
        <div className="mb-6 text-center">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 rounded-lg border-2 font-semibold transition-all hover:shadow-md"
            style={{
              borderColor: 'var(--parent-accent)',
              color: 'var(--parent-accent)',
              backgroundColor: 'white'
            }}
          >
            + Add Task
          </button>
        </div>
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <AddTaskForm
          onAdd={addTask}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Schedule List */}
      <div className="grid gap-4">
        {tasks.map((task) => {
          const isCompleted = completed.includes(task.id);
          const isEditing = editingId === task.id;

          if (isEditing) {
            return (
              <EditTaskForm
                key={task.id}
                task={task}
                onSave={(updates) => updateTask(task.id, updates)}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <div
              key={task.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border-4 transition-all ${
                isCompleted ? 'opacity-75' : ''
              }`}
              style={{
                borderColor: isCompleted ? 'var(--parent-accent)' : 'var(--parent-border)',
                backgroundColor: isCompleted ? 'rgba(var(--parent-accent-rgb), 0.1)' : 'white'
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                className="flex-shrink-0 w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all hover:scale-110"
                style={{
                  borderColor: isCompleted ? 'var(--parent-accent)' : 'var(--parent-border)',
                  backgroundColor: isCompleted ? 'var(--parent-accent)' : 'transparent'
                }}
              >
                {isCompleted && <div className="text-2xl text-white">✓</div>}
              </button>

              {/* Time */}
              <button
                onClick={() => setEditingId(task.id)}
                className="flex-shrink-0 px-3 py-2 rounded-lg border-2 font-mono text-sm font-bold hover:bg-gray-50 transition-colors"
                style={{
                  borderColor: 'var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                {task.time || '—'}
              </button>

              {/* Emoji */}
              <div className="text-4xl flex-shrink-0">{task.emoji}</div>

              {/* Label */}
              <button
                onClick={() => setEditingId(task.id)}
                className="flex-1 text-left"
              >
                <div className={`text-xl font-semibold hover:text-blue-600 transition-colors ${isCompleted ? 'line-through' : ''}`} style={{ color: 'var(--parent-text)' }}>
                  {task.label}
                </div>
              </button>

              {/* Delete Button */}
              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 text-2xl hover:scale-110 transition-transform"
                style={{ color: '#dc2626' }}
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Edit Task Form Component
function EditTaskForm({
  task,
  onSave,
  onCancel
}: {
  task: ScheduleTask;
  onSave: (updates: Partial<ScheduleTask>) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState(task.emoji);
  const [label, setLabel] = useState(task.label);
  const [time, setTime] = useState(task.time || '');

  return (
    <div className="p-6 rounded-2xl border-4" style={{ borderColor: 'var(--parent-accent)', backgroundColor: '#fef3c7' }}>
      <div className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-20 px-3 py-2 rounded-lg border-2 text-3xl text-center"
            style={{ borderColor: 'var(--parent-border)' }}
            placeholder="😊"
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border-2 text-lg"
            style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
            placeholder="Task name"
          />
        </div>
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border-2 font-mono"
          style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
          placeholder="7:30 AM (optional)"
        />
        <div className="flex gap-3">
          <button
            onClick={() => onSave({ emoji, label, time: time || undefined })}
            className="flex-1 px-4 py-2 rounded-lg font-semibold text-white"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border-2 font-semibold"
            style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Task Form Component
function AddTaskForm({
  onAdd,
  onCancel
}: {
  onAdd: (task: Omit<ScheduleTask, 'id'>) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState('📌');
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('');

  return (
    <div className="p-6 rounded-2xl border-4 mb-6" style={{ borderColor: 'var(--parent-accent)', backgroundColor: '#d1fae5' }}>
      <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--parent-text)' }}>Add New Task</h3>
      <div className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-20 px-3 py-2 rounded-lg border-2 text-3xl text-center"
            style={{ borderColor: 'var(--parent-border)' }}
            placeholder="😊"
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border-2 text-lg"
            style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
            placeholder="Task name"
            autoFocus
          />
        </div>
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border-2 font-mono"
          style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
          placeholder="7:30 AM (optional)"
        />
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (!label.trim()) {
                alert('Please enter a task name');
                return;
              }
              onAdd({ emoji: emoji || '📌', label, time: time || undefined });
            }}
            disabled={!label.trim()}
            className="flex-1 px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            Add Task
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border-2 font-semibold"
            style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function GratitudeActivity({
  response,
  setResponse,
  personName
}: {
  response: { items: string[] } | null;
  setResponse: (r: { items: string[] }) => void;
  personName: string;
}) {
  const [items, setItems] = useState<string[]>(response?.items || ['', '', '']);

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
    if (newItems.some(item => item.trim())) {
      setResponse({ items: newItems });
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--parent-text)' }}>
        What is {personName} thankful for today?
      </h2>
      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={index} className="parent-card p-6">
            <label className="block font-medium mb-3 text-xl" style={{ color: 'var(--parent-text)' }}>
              {index + 1}. I'm thankful for...
            </label>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="w-full p-4 rounded-lg border text-xl"
              style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
              placeholder="Something you're grateful for"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeelingThermometerActivity({
  response,
  setResponse,
  personName
}: {
  response: EmotionCheckinResponse | null;
  setResponse: (r: EmotionCheckinResponse) => void;
  personName: string;
}) {
  const intensityLevels = [
    { value: 1, emoji: '😌', label: 'A little bit', color: '#bbf7d0' },
    { value: 2, emoji: '🙂', label: 'Some', color: '#86efac' },
    { value: 3, emoji: '😊', label: 'Medium', color: '#fde047' },
    { value: 4, emoji: '😃', label: 'A lot', color: '#fb923c' },
    { value: 5, emoji: '🤯', label: 'Very very much!', color: '#ef4444' }
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--parent-text)' }}>
        How big is {personName}'s feeling right now?
      </h2>
      <div className="space-y-4">
        {intensityLevels.map((level) => (
          <button
            key={level.value}
            onClick={() => setResponse({ emotion: 'happy', intensity: level.value as any })}
            className={`w-full flex items-center gap-6 p-8 rounded-2xl border-4 transition-all hover:scale-102 ${
              response?.intensity === level.value ? 'scale-105 shadow-xl' : ''
            }`}
            style={{
              borderColor: response?.intensity === level.value ? 'var(--parent-accent)' : 'var(--parent-border)',
              backgroundColor: response?.intensity === level.value ? level.color : 'white'
            }}
          >
            <div className="text-6xl">{level.emoji}</div>
            <div className="flex-1 text-left">
              <div className="text-3xl font-bold" style={{ color: 'var(--parent-text)' }}>
                {level.value}
              </div>
              <div className="text-xl" style={{ color: 'var(--parent-text-light)' }}>
                {level.label}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== Self-Worth Activity Components ====================

function StrengthReflectionActivity({
  response,
  setResponse,
  personName
}: {
  response: StrengthReflectionResponse | null;
  setResponse: (r: StrengthReflectionResponse) => void;
  personName: string;
}) {
  const [strengths, setStrengths] = useState<string[]>(response?.strengths || ['', '', '']);
  const [category, setCategory] = useState<'academic' | 'social' | 'creative' | 'physical' | 'other'>(
    response?.category || 'other'
  );

  const categories = [
    { value: 'academic' as const, emoji: '📚', label: 'SCHOOL/LEARNING' },
    { value: 'social' as const, emoji: '🤝', label: 'FRIENDS/SOCIAL' },
    { value: 'creative' as const, emoji: '🎨', label: 'CREATIVE/ARTS' },
    { value: 'physical' as const, emoji: '⚽', label: 'PHYSICAL/SPORTS' },
    { value: 'other' as const, emoji: '⭐', label: 'OTHER' }
  ];

  const updateStrength = (index: number, value: string) => {
    const newStrengths = [...strengths];
    newStrengths[index] = value;
    setStrengths(newStrengths);
    if (newStrengths.some(s => s.trim())) {
      setResponse({ strengths: newStrengths, category });
    }
  };

  const handleCategoryChange = (newCategory: typeof category) => {
    setCategory(newCategory);
    setResponse({ strengths, category: newCategory });
  };

  return (
    <div>
      <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-600"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-600"></div>

        <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
          SPECIFICATION: CATEGORY
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900 mb-6">
          What is {personName} good at?
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={`relative p-6 border-4 transition-all font-mono ${
                category === cat.value
                  ? 'bg-purple-50 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]'
                  : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
              }`}
            >
              <div className="text-5xl mb-2">{cat.emoji}</div>
              <div className="text-xs font-bold text-slate-900">
                {cat.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Strength Inputs */}
      <div className="space-y-6">
        {strengths.map((strength, index) => (
          <div key={index} className="relative bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
              {String(index + 1).padStart(2, '0')}
            </div>
            <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
              Strength {index + 1}:
            </label>
            <input
              type="text"
              value={strength}
              onChange={(e) => updateStrength(index, e.target.value)}
              className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
              placeholder="e.g., helping others, drawing, running fast"
              autoFocus={index === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CourageMomentActivity({
  response,
  setResponse,
  personName
}: {
  response: CourageMomentResponse | null;
  setResponse: (r: CourageMomentResponse) => void;
  personName: string;
}) {
  const [description, setDescription] = useState(response?.description || '');
  const [feeling, setFeeling] = useState<'proud' | 'nervous' | 'excited' | 'scared-but-did-it'>(
    response?.feeling || 'proud'
  );

  const feelings = [
    { value: 'proud' as const, emoji: '😊', label: 'PROUD' },
    { value: 'nervous' as const, emoji: '😬', label: 'NERVOUS' },
    { value: 'excited' as const, emoji: '🤩', label: 'EXCITED' },
    { value: 'scared-but-did-it' as const, emoji: '🦁', label: 'SCARED BUT DID IT!' }
  ];

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (value.trim()) {
      setResponse({ description: value, feeling });
    }
  };

  const handleFeelingChange = (newFeeling: typeof feeling) => {
    setFeeling(newFeeling);
    if (description.trim()) {
      setResponse({ description, feeling: newFeeling });
    }
  };

  return (
    <div>
      {/* Description */}
      <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-600"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-600"></div>

        <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
          DOCUMENTATION: BRAVE ACTION
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900 mb-6">
          Tell me about something brave {personName} did!
        </h2>

        <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
          What brave thing did they do?
        </label>
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
          rows={4}
          placeholder="e.g., Tried a new food, made a new friend, spoke up in class..."
          autoFocus
        />
      </div>

      {/* Feeling Selection */}
      {description.trim() && (
        <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-purple-600"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-purple-600"></div>

          <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
            EMOTIONAL STATE
          </div>
          <p className="font-mono text-sm text-slate-600 mb-6">
            How did they feel?
          </p>

          <div className="grid grid-cols-2 gap-4">
            {feelings.map((feel) => (
              <button
                key={feel.value}
                onClick={() => handleFeelingChange(feel.value)}
                className={`p-6 border-4 transition-all font-mono ${
                  feeling === feel.value
                    ? 'bg-purple-50 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]'
                    : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="text-5xl mb-2">{feel.emoji}</div>
                <div className="text-xs font-bold text-slate-900">
                  {feel.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AffirmationPracticeActivity({
  response,
  setResponse,
  personName
}: {
  response: AffirmationPracticeResponse | null;
  setResponse: (r: AffirmationPracticeResponse) => void;
  personName: string;
}) {
  const [affirmations, setAffirmations] = useState<string[]>(response?.affirmations || ['', '', '']);
  const [favorite, setFavorite] = useState<string | undefined>(response?.favorite);

  const updateAffirmation = (index: number, value: string) => {
    const newAffirmations = [...affirmations];
    newAffirmations[index] = value;
    setAffirmations(newAffirmations);
    if (newAffirmations.some(a => a.trim())) {
      setResponse({ affirmations: newAffirmations, favorite });
    }
  };

  const selectFavorite = (affirmation: string) => {
    setFavorite(affirmation);
    setResponse({ affirmations, favorite: affirmation });
  };

  return (
    <div>
      {/* Instructions */}
      <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-600"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-600"></div>

        <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
          AFFIRMATION PROTOCOL
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4">
          Help {personName} create positive "I am..." statements
        </h2>
        <p className="font-mono text-sm text-slate-600">
          Examples: "I am kind", "I am creative", "I am brave"
        </p>
      </div>

      {/* Affirmation Inputs */}
      <div className="space-y-6 mb-8">
        {affirmations.map((affirmation, index) => (
          <div key={index} className="relative bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
                  I AM...
                </label>
                <input
                  type="text"
                  value={affirmation}
                  onChange={(e) => updateAffirmation(index, e.target.value)}
                  className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
                  placeholder="kind, creative, strong, smart..."
                  autoFocus={index === 0}
                />
              </div>
              {affirmation.trim() && (
                <button
                  onClick={() => selectFavorite(affirmation)}
                  className={`mt-8 px-4 py-3 border-4 font-mono font-bold transition-all ${
                    favorite === affirmation
                      ? 'bg-yellow-100 border-yellow-600 shadow-[4px_4px_0px_0px_rgba(202,138,4,1)]'
                      : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  <span className="text-2xl">{favorite === affirmation ? '⭐' : '☆'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Favorite Instruction */}
      {affirmations.some(a => a.trim()) && (
        <div className="relative bg-purple-50 border-4 border-purple-600 p-6 shadow-[6px_6px_0px_0px_rgba(147,51,234,1)]">
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-purple-600"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-purple-600"></div>
          <p className="text-center font-mono text-sm text-slate-900">
            ⭐ Click the star next to your favorite one!
          </p>
        </div>
      )}
    </div>
  );
}

function GrowthMindsetReflectionActivity({
  response,
  setResponse,
  personName
}: {
  response: GrowthMindsetReflectionResponse | null;
  setResponse: (r: GrowthMindsetReflectionResponse) => void;
  personName: string;
}) {
  const [challenge, setChallenge] = useState(response?.challenge || '');
  const [whatLearned, setWhatLearned] = useState(response?.whatLearned || '');
  const [nextTime, setNextTime] = useState(response?.nextTime || '');
  const [mindsetShift, setMindsetShift] = useState<'fixed' | 'growth' | 'mixed'>(
    response?.mindsetShift || 'mixed'
  );

  const updateResponse = (updates: Partial<GrowthMindsetReflectionResponse>) => {
    const newResponse = {
      challenge: updates.challenge !== undefined ? updates.challenge : challenge,
      whatLearned: updates.whatLearned !== undefined ? updates.whatLearned : whatLearned,
      nextTime: updates.nextTime !== undefined ? updates.nextTime : nextTime,
      mindsetShift: updates.mindsetShift !== undefined ? updates.mindsetShift : mindsetShift
    };

    if (newResponse.challenge.trim() && newResponse.whatLearned.trim()) {
      setResponse(newResponse);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-600"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-600"></div>

        <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
          GROWTH MINDSET PROTOCOL
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900">
          Turn challenges into learning moments
        </h2>
      </div>

      <div className="space-y-6">
        {/* Challenge */}
        <div className="relative bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
            01
          </div>
          <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
            What was hard for {personName}?
          </label>
          <textarea
            value={challenge}
            onChange={(e) => {
              setChallenge(e.target.value);
              updateResponse({ challenge: e.target.value });
            }}
            className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
            rows={3}
            placeholder="Describe something that was difficult or frustrating..."
            autoFocus
          />
        </div>

        {/* What Learned */}
        {challenge.trim() && (
          <div className="relative bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
              02
            </div>
            <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
              What did they learn from it?
            </label>
            <textarea
              value={whatLearned}
              onChange={(e) => {
                setWhatLearned(e.target.value);
                updateResponse({ whatLearned: e.target.value });
              }}
              className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
              rows={3}
              placeholder="What did they discover or figure out?"
            />
          </div>
        )}

        {/* Next Time */}
        {challenge.trim() && whatLearned.trim() && (
          <div className="relative bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
              03
            </div>
            <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
              What will they try next time?
            </label>
            <textarea
              value={nextTime}
              onChange={(e) => {
                setNextTime(e.target.value);
                updateResponse({ nextTime: e.target.value });
              }}
              className="w-full p-4 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
              rows={2}
              placeholder="What strategy or approach will they use?"
            />
          </div>
        )}

        {/* Mindset Shift */}
        {challenge.trim() && whatLearned.trim() && (
          <div className="relative bg-white border-4 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
              04
            </div>
            <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
              MINDSET ASSESSMENT
            </div>
            <p className="font-mono text-sm text-slate-600 mb-6">
              Growth mindset level:
            </p>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setMindsetShift('fixed');
                  updateResponse({ mindsetShift: 'fixed' });
                }}
                className={`p-6 border-4 transition-all font-mono ${
                  mindsetShift === 'fixed'
                    ? 'bg-purple-50 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]'
                    : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="text-4xl mb-2">😞</div>
                <div className="text-xs font-bold text-slate-900 uppercase">
                  Still frustrated
                </div>
              </button>
              <button
                onClick={() => {
                  setMindsetShift('mixed');
                  updateResponse({ mindsetShift: 'mixed' });
                }}
                className={`p-6 border-4 transition-all font-mono ${
                  mindsetShift === 'mixed'
                    ? 'bg-purple-50 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]'
                    : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="text-4xl mb-2">🤔</div>
                <div className="text-xs font-bold text-slate-900 uppercase">
                  Learning
                </div>
              </button>
              <button
                onClick={() => {
                  setMindsetShift('growth');
                  updateResponse({ mindsetShift: 'growth' });
                }}
                className={`p-6 border-4 transition-all font-mono ${
                  mindsetShift === 'growth'
                    ? 'bg-purple-50 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]'
                    : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="text-4xl mb-2">🌱</div>
                <div className="text-xs font-bold text-slate-900 uppercase">
                  Growing!
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccomplishmentTrackerActivity({
  response,
  setResponse,
  personName
}: {
  response: AccomplishmentTrackerResponse | null;
  setResponse: (r: AccomplishmentTrackerResponse) => void;
  personName: string;
}) {
  const [accomplishments, setAccomplishments] = useState<Array<{
    description: string;
    day: string;
    category: 'academic' | 'social' | 'creative' | 'physical' | 'personal';
  }>>(response?.accomplishments || []);

  const [newItem, setNewItem] = useState('');
  const [newDay, setNewDay] = useState('monday');
  const [newCategory, setNewCategory] = useState<'academic' | 'social' | 'creative' | 'physical' | 'personal'>('personal');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const categories = [
    { value: 'academic' as const, emoji: '📚', label: 'School' },
    { value: 'social' as const, emoji: '🤝', label: 'Social' },
    { value: 'creative' as const, emoji: '🎨', label: 'Creative' },
    { value: 'physical' as const, emoji: '⚽', label: 'Physical' },
    { value: 'personal' as const, emoji: '⭐', label: 'Personal' }
  ];

  const addAccomplishment = () => {
    if (!newItem.trim()) return;

    const newAccomplishments = [
      ...accomplishments,
      { description: newItem, day: newDay, category: newCategory }
    ];

    setAccomplishments(newAccomplishments);
    setResponse({ accomplishments: newAccomplishments });
    setNewItem('');
  };

  const removeAccomplishment = (index: number) => {
    const newAccomplishments = accomplishments.filter((_, i) => i !== index);
    setAccomplishments(newAccomplishments);
    setResponse({ accomplishments: newAccomplishments });
  };

  return (
    <div>
      {/* Header */}
      <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-purple-600"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-purple-600"></div>

        <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
          ACCOMPLISHMENT TRACKER
        </div>
        <h2 className="font-mono text-2xl font-bold text-slate-900 mb-2">
          {personName}'s Weekly Wins 🏆
        </h2>
        <p className="font-mono text-sm text-slate-600">
          Track all the great things {personName} accomplished this week!
        </p>
      </div>

      {/* Add New Accomplishment */}
      <div className="relative bg-white border-4 border-slate-800 p-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute -top-3 -left-3 w-10 h-10 bg-green-600 text-white font-mono font-bold flex items-center justify-center border-2 border-green-800">
          +
        </div>
        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
              What did they accomplish?
            </label>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="w-full p-3 border-2 border-slate-300 font-mono text-lg text-slate-900 focus:outline-none focus:border-purple-600"
              placeholder="e.g., Finished homework on time, helped a friend..."
              onKeyPress={(e) => e.key === 'Enter' && addAccomplishment()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
                Day:
              </label>
              <select
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                className="w-full p-3 border-2 border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:border-purple-600"
              >
                {days.map(day => (
                  <option key={day} value={day}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
                Category:
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full p-3 border-2 border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:border-purple-600"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={addAccomplishment}
            disabled={!newItem.trim()}
            className="w-full px-6 py-3 border-4 border-green-600 bg-green-600 text-white font-mono font-bold hover:bg-green-700 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(22,101,52,1)]"
          >
            + ADD ACCOMPLISHMENT
          </button>
        </div>
      </div>

      {/* Accomplishments List */}
      {accomplishments.length > 0 && (
        <div>
          <div className="relative bg-purple-50 border-4 border-purple-600 p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(147,51,234,1)]">
            <h3 className="font-mono text-lg font-bold text-slate-900 uppercase">
              This Week's Wins:
            </h3>
          </div>
          <div className="space-y-3">
            {accomplishments.map((item, index) => {
              const categoryData = categories.find(c => c.value === item.category);
              return (
                <div
                  key={index}
                  className="relative bg-white border-4 border-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{categoryData?.emoji || '⭐'}</div>
                    <div className="flex-1">
                      <div className="font-mono font-bold text-lg text-slate-900">
                        {item.description}
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-1 uppercase">
                        {item.day.charAt(0).toUpperCase() + item.day.slice(1)} • {categoryData?.label}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAccomplishment(index)}
                      className="text-2xl font-bold hover:scale-110 transition-transform text-red-600 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Story Reflection Activity Component
 *
 * Questions about the weekly story character that prompt self-reflection
 */
function StoryReflectionActivity({
  response,
  setResponse,
  personName,
  childWorkbook
}: {
  response: StoryReflectionResponse | null;
  setResponse: (response: StoryReflectionResponse) => void;
  personName: string;
  childWorkbook: any;
}) {
  const story = childWorkbook?.weeklyStory;

  if (!story) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-lg text-slate-600">Story not found. Please complete this week's story first.</p>
      </div>
    );
  }

  const questions = story.reflectionQuestions || [];

  const handleResponseChange = (questionId: string, value: string) => {
    const currentResponse = response || {
      challengeIdentified: '',
      courageObserved: '',
      strategyNamed: '',
      personalConnection: '',
      adviceToCharacter: '',
      parentNotes: '',
    };

    // Map question IDs to response fields
    const fieldMap: Record<string, keyof StoryReflectionResponse> = {
      challenge: 'challengeIdentified',
      courage: 'courageObserved',
      strategy: 'strategyNamed',
      connection: 'personalConnection',
      compassion: 'adviceToCharacter',
    };

    // Find the field to update based on question category
    const question = questions.find((q: any) => q.id === questionId);
    if (!question) return;

    const field = fieldMap[question.category as string];
    if (!field) return;

    setResponse({
      ...currentResponse,
      [field]: value,
    });
  };

  return (
    <div>
      {/* Story Recap */}
      <div className="relative bg-white border-4 border-purple-600 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(147,51,234,1)]">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-600"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-600"></div>

        <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-4">
          THIS WEEK'S STORY
        </div>
        <h2 className="font-serif text-3xl font-bold mb-2 text-purple-900">
          {story.title}
        </h2>
        <p className="font-serif text-lg text-purple-700 mb-4">
          This week, {personName} read about {story.characterName}, {story.characterDescription}.
        </p>
        <p className="text-slate-700">
          Let's think about {story.characterName}'s journey and what we can learn from it!
        </p>
      </div>

      {/* Reflection Questions */}
      <div className="space-y-6">
        {questions.map((question: any, idx: number) => {
          const fieldMap: Record<string, keyof StoryReflectionResponse> = {
            challenge: 'challengeIdentified',
            courage: 'courageObserved',
            strategy: 'strategyNamed',
            connection: 'personalConnection',
            compassion: 'adviceToCharacter',
          };

          const field = fieldMap[question.category];
          const value = response?.[field] || '';

          return (
            <div
              key={question.id}
              className="relative bg-white border-4 border-slate-800 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-purple-600">
                {idx + 1}
              </div>

              <label className="block font-serif text-xl mb-4 text-slate-900">
                {question.questionText}
              </label>
              <textarea
                value={value}
                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                className="w-full border-2 border-slate-300 p-4 font-serif text-lg focus:outline-none focus:border-purple-600 bg-white rounded"
                rows={4}
                placeholder="Write your thoughts here..."
              />
              {question.purposeNote && (
                <p className="text-xs text-purple-600 mt-2 font-mono">
                  💡 FOR PARENT: {question.purposeNote}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Parent Notes */}
      <div className="relative bg-amber-50 border-4 border-amber-600 p-6 mt-8 shadow-[4px_4px_0px_0px_rgba(217,119,6,1)]">
        <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-4">
          PARENT OBSERVATIONS (OPTIONAL)
        </div>
        <textarea
          value={response?.parentNotes || ''}
          onChange={(e) => setResponse({ ...(response || {} as StoryReflectionResponse), parentNotes: e.target.value })}
          className="w-full border-2 border-amber-600 p-4 font-mono text-sm focus:outline-none focus:border-slate-800 bg-white"
          rows={3}
          placeholder="What did you notice about your child during this reflection?"
        />
      </div>

      {/* Encouragement */}
      <div className="mt-6 text-center">
        <p className="font-serif text-lg text-purple-600">
          Great job thinking about {story.characterName}'s story! 🌟
        </p>
      </div>
    </div>
  );
}
