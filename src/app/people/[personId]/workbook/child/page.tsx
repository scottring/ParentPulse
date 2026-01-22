'use client';

/**
 * Child Workbook (Storybook) Page
 *
 * Child-facing weekly storybook with:
 * - Serialized 7-day story with illustrations
 * - Daily story fragments
 * - Story-integrated activities
 * - Progress tracking
 *
 * Completely different aesthetic - children's book style
 */

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { useChildWorkbook } from '@/hooks/useChildWorkbook';

export default function ChildWorkbookPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const {
    workbook,
    loading: workbookLoading,
    error: workbookError,
    markDayAsRead,
    updateCurrentDay,
  } = useChildWorkbook(personId);

  const [bedtimeMode, setBedtimeMode] = useState(false);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  const loading = authLoading || personLoading || workbookLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-8xl mb-4">📖</div>
          <p className="font-serif text-xl text-purple-600">Loading your story...</p>
        </div>
      </div>
    );
  }

  if (!person || !workbook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="font-serif text-xl text-slate-600 mb-6">{workbookError || 'Storybook not found'}</p>
          <Link
            href={`/people/${personId}/workbook`}
            className="inline-block px-6 py-3 bg-purple-600 text-white font-serif font-bold rounded-full shadow-lg hover:bg-purple-700 transition"
          >
            ← Back to Hub
          </Link>
        </div>
      </div>
    );
  }

  const story = workbook.weeklyStory;
  const currentFragment = story.dailyFragments[workbook.storyProgress.currentDay - 1];
  const isCurrentDayRead = workbook.storyProgress.daysRead[workbook.storyProgress.currentDay - 1];

  const handleMarkAsRead = async () => {
    try {
      await markDayAsRead(workbook.storyProgress.currentDay);

      // Auto-advance to next day if not at end
      if (workbook.storyProgress.currentDay < 7) {
        setTimeout(() => {
          updateCurrentDay(workbook.storyProgress.currentDay + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Error marking day as read:', error);
      alert('Failed to mark story as read');
    }
  };

  const handlePreviousDay = () => {
    if (workbook.storyProgress.currentDay > 1) {
      updateCurrentDay(workbook.storyProgress.currentDay - 1);
    }
  };

  const handleNextDay = () => {
    if (workbook.storyProgress.currentDay < 7) {
      updateCurrentDay(workbook.storyProgress.currentDay + 1);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        bedtimeMode
          ? 'bg-gradient-to-br from-indigo-900 to-purple-900'
          : 'bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50'
      }`}
    >
      {/* Header */}
      <header
        className={`border-b-4 shadow-lg py-6 transition-colors duration-500 ${
          bedtimeMode ? 'bg-indigo-800 border-indigo-600' : 'bg-white border-purple-600'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/people/${personId}/workbook`}
              className={`font-serif text-2xl font-bold transition-colors ${
                bedtimeMode ? 'text-purple-300 hover:text-purple-100' : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              ← Back
            </Link>
            <button
              onClick={() => setBedtimeMode(!bedtimeMode)}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all ${
                bedtimeMode ? 'bg-amber-500 hover:bg-amber-400' : 'bg-indigo-900 hover:bg-indigo-800'
              }`}
            >
              {bedtimeMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`font-serif text-4xl font-bold mb-1 transition-colors ${
                  bedtimeMode ? 'text-purple-100' : 'text-purple-900'
                }`}
              >
                {story.title}
              </h1>
              <p
                className={`font-serif text-lg transition-colors ${
                  bedtimeMode ? 'text-purple-300' : 'text-purple-600'
                }`}
              >
                starring {story.characterName}, {story.characterDescription}
              </p>
            </div>
            <div className="text-right">
              <div
                className={`font-serif text-sm mb-1 transition-colors ${
                  bedtimeMode ? 'text-purple-300' : 'text-purple-600'
                }`}
              >
                Day {currentFragment.dayNumber} of 7
              </div>
              <div className="flex gap-1">
                {story.dailyFragments.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateCurrentDay(i + 1)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      workbook.storyProgress.daysRead[i]
                        ? bedtimeMode
                          ? 'bg-amber-500'
                          : 'bg-purple-600'
                        : i === currentFragment.dayNumber - 1
                        ? bedtimeMode
                          ? 'bg-purple-300 animate-pulse'
                          : 'bg-purple-300 animate-pulse'
                        : bedtimeMode
                        ? 'bg-purple-700'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Today's Story Fragment */}
        <div
          className={`rounded-3xl shadow-2xl overflow-hidden mb-12 transition-colors duration-500 ${
            bedtimeMode ? 'bg-indigo-800' : 'bg-white'
          }`}
        >
          {/* Illustration */}
          {currentFragment.illustrationStatus === 'complete' && currentFragment.illustrationUrl && (
            <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-pink-100">
              <img
                src={currentFragment.illustrationUrl}
                alt={currentFragment.illustrationPrompt}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {currentFragment.illustrationStatus === 'generating' && (
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin text-6xl mb-4">🎨</div>
                <p className="font-serif text-purple-600">Drawing the picture...</p>
              </div>
            </div>
          )}

          {currentFragment.illustrationStatus === 'failed' && (
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🖼️</div>
                <p className="font-serif text-purple-600">Picture coming soon!</p>
              </div>
            </div>
          )}

          {/* Story Text */}
          <div className="p-12">
            <div
              className={`font-serif leading-relaxed mb-8 transition-colors ${
                bedtimeMode ? 'text-3xl text-purple-100' : 'text-2xl text-slate-800'
              }`}
            >
              {currentFragment.fragmentText}
            </div>

            <div
              className={`flex justify-between items-center pt-8 border-t-2 transition-colors ${
                bedtimeMode ? 'border-purple-600' : 'border-purple-200'
              }`}
            >
              <div
                className={`font-serif text-sm transition-colors ${
                  bedtimeMode ? 'text-purple-300' : 'text-purple-600'
                }`}
              >
                📚 {currentFragment.estimatedReadTime} minute read
              </div>

              {!isCurrentDayRead && (
                <button
                  onClick={handleMarkAsRead}
                  className="px-8 py-4 bg-purple-600 text-white font-serif text-lg font-bold rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-105"
                >
                  ✓ I Read This! →
                </button>
              )}

              {isCurrentDayRead && (
                <div className="px-8 py-4 bg-emerald-100 text-emerald-700 font-serif text-lg font-bold rounded-full border-2 border-emerald-600">
                  ✓ Story Complete!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Story Navigation */}
        <div className="flex justify-between mb-12">
          {workbook.storyProgress.currentDay > 1 && (
            <button
              onClick={handlePreviousDay}
              className={`px-6 py-3 border-2 font-serif font-bold rounded-full transition-all ${
                bedtimeMode
                  ? 'border-purple-400 text-purple-200 hover:bg-purple-800'
                  : 'border-purple-600 text-purple-600 hover:bg-purple-50'
              }`}
            >
              ← Previous Day
            </button>
          )}

          {workbook.storyProgress.currentDay < 7 && isCurrentDayRead && (
            <button
              onClick={handleNextDay}
              className="ml-auto px-6 py-3 bg-purple-600 text-white font-serif font-bold rounded-full hover:bg-purple-700 transition-all hover:scale-105"
            >
              Next Day →
            </button>
          )}
        </div>

        {/* Story Complete Message */}
        {workbook.storyProgress.daysRead.every((day) => day) && (
          <div
            className={`rounded-3xl p-12 text-center shadow-2xl transition-colors ${
              bedtimeMode ? 'bg-indigo-800' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-4 border-emerald-600'
            }`}
          >
            <div className="text-8xl mb-6">🎉</div>
            <h2
              className={`font-serif text-4xl font-bold mb-4 transition-colors ${
                bedtimeMode ? 'text-purple-100' : 'text-emerald-900'
              }`}
            >
              You finished the whole story!
            </h2>
            <p
              className={`font-serif text-xl mb-8 transition-colors ${
                bedtimeMode ? 'text-purple-300' : 'text-emerald-700'
              }`}
            >
              Great job reading every day this week! {story.characterName} is proud of you.
            </p>
            <Link
              href={`/people/${personId}/workbook`}
              className="inline-block px-8 py-4 bg-emerald-600 text-white font-serif text-lg font-bold rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105"
            >
              Back to Workbooks
            </Link>
          </div>
        )}

        {/* Reading Progress */}
        <div
          className={`rounded-3xl p-8 transition-colors ${bedtimeMode ? 'bg-indigo-800' : 'bg-white border-2 border-purple-200'}`}
        >
          <h3
            className={`font-serif text-2xl font-bold mb-6 transition-colors ${
              bedtimeMode ? 'text-purple-100' : 'text-purple-900'
            }`}
          >
            Your Reading Progress
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {story.dailyFragments.map((fragment, index) => (
              <button
                key={fragment.dayNumber}
                onClick={() => updateCurrentDay(fragment.dayNumber)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all ${
                  workbook.storyProgress.daysRead[index]
                    ? bedtimeMode
                      ? 'bg-amber-500 text-indigo-900'
                      : 'bg-emerald-500 text-white'
                    : index === workbook.storyProgress.currentDay - 1
                    ? bedtimeMode
                      ? 'bg-purple-600 text-purple-100 ring-2 ring-amber-500'
                      : 'bg-purple-500 text-white ring-2 ring-purple-600'
                    : bedtimeMode
                    ? 'bg-purple-700 text-purple-300'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <div className="text-2xl mb-1">{workbook.storyProgress.daysRead[index] ? '✓' : '📖'}</div>
                <div className="font-serif text-xs font-bold uppercase">{fragment.day.substring(0, 3)}</div>
              </button>
            ))}
          </div>
          <div
            className={`mt-4 text-center font-serif transition-colors ${
              bedtimeMode ? 'text-purple-300' : 'text-purple-600'
            }`}
          >
            {workbook.storyProgress.daysRead.filter(Boolean).length} of 7 days completed
          </div>
        </div>

        {/* Daily Activities */}
        {workbook.dailyActivities && workbook.dailyActivities.length > 0 && (
          <div
            className={`rounded-3xl p-8 transition-colors mt-12 ${bedtimeMode ? 'bg-indigo-800' : 'bg-white border-2 border-purple-200'}`}
          >
            <h3
              className={`font-serif text-2xl font-bold mb-6 transition-colors ${
                bedtimeMode ? 'text-purple-100' : 'text-purple-900'
              }`}
            >
              🎮 Fun Activities This Week
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workbook.dailyActivities.map((activity: any, index: number) => {
                const isCompleted = workbook.storyProgress.activitiesCompleted?.includes(activity.id);
                const activityNames: { [key: string]: string } = {
                  'emotion-checkin': '😊 Emotion Check-In',
                  'choice-board': '🎯 Choice Board',
                  'daily-win': '🌟 Daily Win',
                  'visual-schedule': '📅 Visual Schedule',
                  'gratitude': '🙏 Gratitude',
                  'feeling-thermometer': '🌡️ Feeling Thermometer',
                  'strength-reflection': '💪 Strength Reflection',
                  'courage-moment': '🦁 Courage Moment',
                  'affirmation-practice': '✨ Affirmations',
                  'growth-mindset-reflection': '🌱 Growth Mindset',
                  'accomplishment-tracker': '🏆 Accomplishment Tracker',
                  'story-reflection': '📖 Story Reflection',
                  'worry-box': '📦 Worry Box',
                  'emotion-wheel': '🎨 Emotion Wheel',
                  'calm-down-toolbox': '🧰 Calm Down Toolbox',
                  'body-signals': '🚦 Body Signals',
                  'safe-person-map': '🗺️ Safe Person Map',
                  'time-captain': '⏰ Time Captain',
                  'priority-picker': '📝 Priority Picker',
                  'energy-tracker': '⚡ Energy Tracker',
                  'transition-timer': '⏳ Transition Timer',
                  'friendship-builder': '🤝 Friendship Builder',
                  'conflict-detective': '🔍 Conflict Detective',
                  'kindness-catcher': '💝 Kindness Catcher',
                  'share-or-boundaries': '🛡️ Share or Boundaries',
                  'value-compass': '🧭 Value Compass',
                  'inner-voice-check': '💭 Inner Voice Check',
                  'compare-and-care': '🌈 Compare and Care',
                  'mood-journal': '📔 Mood Journal',
                  'mistake-magic': '✨ Mistake Magic',
                  'hard-thing-hero': '🦸 Hard Thing Hero',
                  'yet-power': '💫 Yet Power'
                };

                return (
                  <Link
                    key={activity.id}
                    href={`/people/${personId}/workbook/activities/${activity.id}`}
                    className={`relative p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                      isCompleted
                        ? bedtimeMode
                          ? 'bg-amber-500 border-amber-400 text-indigo-900'
                          : 'bg-emerald-100 border-emerald-400'
                        : bedtimeMode
                        ? 'bg-purple-700 border-purple-500 text-purple-100 hover:bg-purple-600'
                        : 'bg-purple-50 border-purple-300 hover:bg-purple-100'
                    }`}
                  >
                    {isCompleted && (
                      <div className="absolute top-2 right-2 text-2xl">✓</div>
                    )}
                    <div className={`font-serif text-lg font-bold mb-2 ${
                      isCompleted
                        ? bedtimeMode
                          ? 'text-indigo-900'
                          : 'text-emerald-900'
                        : bedtimeMode
                        ? 'text-purple-100'
                        : 'text-purple-900'
                    }`}>
                      {activityNames[activity.type] || activity.type}
                    </div>
                    {activity.customization && (
                      <div className={`font-serif text-sm ${
                        isCompleted
                          ? bedtimeMode
                            ? 'text-indigo-800'
                            : 'text-emerald-700'
                          : bedtimeMode
                          ? 'text-purple-200'
                          : 'text-purple-600'
                      }`}>
                        {activity.customization}
                      </div>
                    )}
                    {activity.suggestedTime && (
                      <div className={`font-mono text-xs mt-2 ${
                        isCompleted
                          ? bedtimeMode
                            ? 'text-indigo-700'
                            : 'text-emerald-600'
                          : bedtimeMode
                          ? 'text-purple-300'
                          : 'text-purple-500'
                      }`}>
                        Best time: {activity.suggestedTime}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
            <div
              className={`mt-6 text-center font-serif text-sm transition-colors ${
                bedtimeMode ? 'text-purple-300' : 'text-purple-600'
              }`}
            >
              {workbook.storyProgress.activitiesCompleted?.length || 0} of {workbook.dailyActivities.length} activities completed
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
