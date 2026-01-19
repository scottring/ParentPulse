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
  ScheduleTask
} from '@/types/workbook';

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

  const [response, setResponse] = useState<any>(null);
  const [parentNotes, setParentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || personLoading || workbookLoading) {
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
      await completeActivity(workbook.workbookId, activityId, response, parentNotes || undefined);
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
      default:
        return <div>Unknown activity type</div>;
    }
  };

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-3xl transition-transform hover:scale-110"
              style={{ color: 'var(--parent-text)' }}
            >
              ←
            </button>
            <div className="flex-1 text-center">
              <div className="text-5xl mb-2">{template.emoji}</div>
              <h1 className="parent-heading text-3xl" style={{ color: 'var(--parent-accent)' }}>
                {template.title}
              </h1>
              <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
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
        <div className="mt-8 parent-card p-6">
          <label className="block font-medium mb-3 text-lg" style={{ color: 'var(--parent-text)' }}>
            Parent Notes (Optional)
          </label>
          <textarea
            value={parentNotes}
            onChange={(e) => setParentNotes(e.target.value)}
            className="w-full p-4 rounded-lg border text-lg"
            style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
            rows={3}
            placeholder="Any observations or thoughts?"
          />
        </div>

        {/* Complete Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleComplete}
            disabled={saving || !response}
            className="px-16 py-6 rounded-xl font-bold text-white text-2xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            {saving ? 'Saving...' : 'Done! ✓'}
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
