'use client';

import React from 'react';
import { TechnicalCard, TechnicalLabel, SectionHeader } from '../technical';
import { DelegatedTask, HouseholdTask, LayerId, HOUSEHOLD_LAYERS } from '@/types/household-workbook';

interface DelegatedTaskListProps {
  householdTasks: HouseholdTask[];
  delegatedTasks: {
    personId: string;
    personName: string;
    tasks: DelegatedTask[];
  }[];
  onToggleHouseholdTask: (taskId: string) => void;
  onToggleDelegatedTask: (personId: string, taskId: string) => void;
  className?: string;
}

function TaskItem({
  title,
  description,
  layerId,
  isCompleted,
  onToggle,
}: {
  title: string;
  description?: string;
  layerId: LayerId;
  isCompleted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left p-3 border-2 border-slate-200 hover:border-slate-400 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          className={`
            w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5
            ${isCompleted ? 'bg-green-600 border-green-600' : 'border-slate-300'}
          `}
        >
          {isCompleted && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`
                font-mono text-sm
                ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}
              `}
            >
              {title}
            </span>
            <div
              className="px-1 py-0.5 bg-slate-100 font-mono text-[10px] text-slate-500"
              title={HOUSEHOLD_LAYERS[layerId]?.friendly}
            >
              L{layerId}
            </div>
          </div>
          {description && (
            <p className={`text-xs mt-1 ${isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function DelegatedTaskList({
  householdTasks,
  delegatedTasks,
  onToggleHouseholdTask,
  onToggleDelegatedTask,
  className = '',
}: DelegatedTaskListProps) {
  const completedHousehold = householdTasks.filter((t) => t.isCompleted).length;
  const totalHousehold = householdTasks.length;

  const getTotalDelegated = () => {
    let completed = 0;
    let total = 0;
    delegatedTasks.forEach((person) => {
      person.tasks.forEach((task) => {
        total++;
        if (task.isCompleted) completed++;
      });
    });
    return { completed, total };
  };

  const delegatedStats = getTotalDelegated();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Household tasks (hub) */}
      {householdTasks.length > 0 && (
        <TechnicalCard badge="HQ" badgeColor="amber" shadowSize="md" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-slate-800">
              HOUSEHOLD TASKS
            </h3>
            <TechnicalLabel
              variant={completedHousehold === totalHousehold ? 'filled' : 'subtle'}
              color={completedHousehold === totalHousehold ? 'green' : 'slate'}
              size="xs"
            >
              {completedHousehold} / {totalHousehold}
            </TechnicalLabel>
          </div>

          <div className="space-y-2">
            {householdTasks.map((task) => (
              <TaskItem
                key={task.taskId}
                title={task.title}
                description={task.description}
                layerId={task.layerId}
                isCompleted={task.isCompleted}
                onToggle={() => onToggleHouseholdTask(task.taskId)}
              />
            ))}
          </div>
        </TechnicalCard>
      )}

      {/* Delegated tasks (spokes) */}
      {delegatedTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              title="DELEGATED TASKS"
              subtitle="Tasks assigned to individual family members"
              cornerBrackets={false}
            />
            <TechnicalLabel
              variant={delegatedStats.completed === delegatedStats.total ? 'filled' : 'subtle'}
              color={delegatedStats.completed === delegatedStats.total ? 'green' : 'slate'}
              size="xs"
            >
              {delegatedStats.completed} / {delegatedStats.total}
            </TechnicalLabel>
          </div>

          <div className="space-y-4">
            {delegatedTasks.map((person) => {
              const personCompleted = person.tasks.filter((t) => t.isCompleted).length;
              const personTotal = person.tasks.length;

              return (
                <TechnicalCard key={person.personId} shadowSize="sm" className="p-4">
                  {/* Person header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      {/* Avatar placeholder */}
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {person.personName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {person.personName}
                      </span>
                    </div>
                    <TechnicalLabel
                      variant={personCompleted === personTotal ? 'filled' : 'outline'}
                      color={personCompleted === personTotal ? 'green' : 'slate'}
                      size="xs"
                    >
                      {personCompleted} / {personTotal}
                    </TechnicalLabel>
                  </div>

                  {/* Person's tasks */}
                  <div className="space-y-2">
                    {person.tasks.map((task) => (
                      <TaskItem
                        key={task.taskId}
                        title={task.title}
                        description={task.description}
                        layerId={task.layerId}
                        isCompleted={task.isCompleted}
                        onToggle={() => onToggleDelegatedTask(person.personId, task.taskId)}
                      />
                    ))}
                  </div>
                </TechnicalCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {householdTasks.length === 0 && delegatedTasks.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-300">
          <p className="font-mono text-sm text-slate-400">
            No tasks for this week yet.
          </p>
        </div>
      )}
    </div>
  );
}

export default DelegatedTaskList;
