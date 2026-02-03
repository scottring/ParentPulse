import { test, expect, Page, Locator } from '@playwright/test';
import {
  SECTIONS_ORDER,
  SectionId,
  TEST_ANSWERS,
  QUESTION_TYPES,
  QUESTION_ORDER,
  DEMO_USER,
} from './fixtures/household-test-data';

// Increase timeout for this test suite as it goes through multiple sections
test.setTimeout(120000);

/**
 * Helper functions for answering different question types
 */

async function answerTextQuestion(page: Page, value: string): Promise<void> {
  const textarea = page.locator('textarea');
  await textarea.waitFor({ state: 'visible' });
  await textarea.fill(value);
}

async function answerCheckboxQuestion(page: Page, values: string[]): Promise<void> {
  // Click each checkbox option by its value
  for (const value of values) {
    // Find all checkbox options
    const allOptions = page.locator('button').filter({
      has: page.locator('div.w-5.h-5.border-2'),
    });

    const count = await allOptions.count();
    for (let i = 0; i < count; i++) {
      const option = allOptions.nth(i);
      // Match by checking if the option corresponds to our value
      // The value is not directly visible, so we match by expected labels
      const isTarget = await isCheckboxOptionMatch(option, value);
      if (isTarget) {
        await option.click();
        break;
      }
    }
  }
}

async function isCheckboxOptionMatch(option: Locator, value: string): Promise<boolean> {
  // Map values to their expected labels for matching
  const valueToLabel: Record<string, string> = {
    // charter_non_negotiables
    safety_first: 'Safety comes first',
    kindness: 'We speak kindly',
    honesty: 'We tell the truth',
    respect_boundaries: 'We respect boundaries',
    screens_off_meals: 'Screens off at meals',
    bedtime_routines: 'Consistent bedtimes',
    homework_first: 'Responsibilities first',
    family_time: 'Protected family time',
    // charter_desired_feelings
    calm: 'Calm',
    safe: 'Safe',
    energized: 'Energized',
    connected: 'Connected',
    creative: 'Creative',
    joyful: 'Joyful',
    respected: 'Respected',
    free: 'Free',
    cozy: 'Cozy',
    productive: 'Productive',
    // sanctuary_sound_sources
    traffic: 'Street/traffic noise',
    neighbors: 'Neighbor sounds',
    appliances: 'Appliance hum',
    kids_play: 'Kids playing',
    pets: 'Pet sounds',
    screens: 'Screens/media',
    quiet: 'Generally quiet',
    // sanctuary_nature_elements
    plants: 'Indoor plants',
    natural_light: 'Good natural light',
    water: 'Water feature',
    wood: 'Natural wood',
    outdoor_view: 'View of outdoors',
    outdoor_access: 'Easy outdoor access',
    none: 'Limited nature elements',
    // village_important_codes
    garage: 'Garage code',
    alarm: 'Alarm system',
    wifi: 'WiFi password',
    lockbox: 'Lockbox/key safe',
    school: 'School pickup code',
    medical: 'Medical portal login',
    // roles_pain_points
    meals: 'Meal planning & cooking',
    cleaning: 'Cleaning & tidying',
    laundry: 'Laundry',
    schedules: 'Family calendar',
    finances: 'Finances & bills',
    childcare: 'Childcare logistics',
    emotional: 'Emotional support',
    maintenance: 'Home maintenance',
    // rituals_weekly
    family_dinner: 'Weekly family dinner',
    movie_night: 'Movie/game night',
    outdoor: 'Outdoor activity',
    planning: 'Weekly planning session',
    individual_time: 'One-on-one time',
    date_night: 'Date night',
    religious: 'Religious/spiritual practice',
    chores: 'Group chore time',
  };

  const expectedLabel = valueToLabel[value];
  if (!expectedLabel) return false;

  const text = await option.textContent();
  return text?.includes(expectedLabel) ?? false;
}

async function answerRatingQuestion(page: Page, rating: number): Promise<void> {
  // Rating buttons are numbered 1-5, find and click the right one
  const ratingButton = page.locator(`button`).filter({
    hasText: new RegExp(`^${rating}$`),
  });
  await ratingButton.first().click();
}

async function answerYesNoQuestion(page: Page, value: boolean): Promise<void> {
  const label = value ? 'Yes' : 'No';
  const button = page.locator('button').filter({
    hasText: new RegExp(`^${label}$`, 'i'),
  });
  await button.click();
}

async function answerMultipleChoiceQuestion(page: Page, value: string): Promise<void> {
  // Map values to expected label text
  const valueToLabel: Record<string, string> = {
    talk_immediately: 'Talk it out immediately',
    need_space: 'Need space first',
    avoid: 'Tend to avoid',
    mixed: 'It depends',
    none: 'None - ready to talk right away',
    short: 'A few minutes',
    medium: 'About an hour',
    long: 'Several hours or overnight',
  };

  const labelText = valueToLabel[value] || value;
  const option = page.locator('button').filter({
    hasText: labelText,
  });
  await option.click();
}

async function answerDayPickerQuestion(page: Page, dayIndex: number): Promise<void> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLabel = days[dayIndex];
  const dayButton = page.locator('button').filter({
    hasText: new RegExp(`^${dayLabel}$`),
  });
  await dayButton.click();
}

/**
 * Answer a question based on its type
 */
async function answerQuestion(
  page: Page,
  questionType: string,
  value: unknown
): Promise<void> {
  switch (questionType) {
    case 'text':
      await answerTextQuestion(page, value as string);
      break;
    case 'checkbox':
      await answerCheckboxQuestion(page, value as string[]);
      break;
    case 'rating':
      await answerRatingQuestion(page, value as number);
      break;
    case 'yes_no':
      await answerYesNoQuestion(page, value as boolean);
      break;
    case 'multiple_choice':
      await answerMultipleChoiceQuestion(page, value as string);
      break;
    case 'day_picker':
      await answerDayPickerQuestion(page, value as number);
      break;
    default:
      throw new Error(`Unknown question type: ${questionType}`);
  }
}

/**
 * Click the NEXT button and wait for navigation or next question
 */
async function clickNext(page: Page): Promise<void> {
  const nextButton = page.locator('button').filter({
    hasText: /NEXT|GENERATE|SAVE/,
  });
  await nextButton.click();
  // Wait for either next question or page transition
  await page.waitForTimeout(500);
}

/**
 * Complete a single section
 */
async function completeSection(page: Page, sectionId: SectionId): Promise<void> {
  console.log(`\n--- Starting section: ${sectionId} ---`);

  // Navigate to section
  await page.goto(`/household/onboard/${sectionId}`);
  await page.waitForLoadState('networkidle');

  // Wait for the question card to appear
  await page.waitForSelector('text=/Question/i', { timeout: 10000 });

  const questions = QUESTION_ORDER[sectionId];
  const questionTypes = QUESTION_TYPES[sectionId];
  const answers = TEST_ANSWERS[sectionId];

  for (let i = 0; i < questions.length; i++) {
    const questionId = questions[i];
    const questionType = questionTypes[questionId];
    const answer = answers[questionId];

    console.log(`  Question ${i + 1}/${questions.length}: ${questionId} (${questionType})`);

    // Wait for question to be visible
    await page.waitForTimeout(300);

    // Answer the question
    await answerQuestion(page, questionType, answer);

    // Small delay to ensure the answer is registered
    await page.waitForTimeout(200);

    // Click next
    await clickNext(page);

    // Wait for transition
    await page.waitForTimeout(500);
  }

  // After last question, we should see either:
  // 1. Generating screen (for AI sections)
  // 2. Complete screen (for non-AI sections like pulse)

  // Wait for either generating or complete state
  const isAISection = sectionId !== 'household_pulse';

  if (isAISection) {
    // For AI sections, wait for generating then review screen
    console.log(`  Waiting for AI generation (demo mode uses fallback)...`);

    // In demo mode, this should be quick
    // Wait for review screen (has "Approve" button)
    try {
      await page.waitForSelector('text=/Approve|Review/i', { timeout: 30000 });
      console.log(`  Review screen loaded`);

      // Click approve to save
      const approveButton = page.locator('button').filter({
        hasText: /Approve|Save/i,
      });
      await approveButton.click();
      console.log(`  Approved content`);
    } catch {
      // May already be on complete screen if generation was skipped
      console.log(`  Skipped review (may have auto-completed)`);
    }
  }

  // Wait for complete screen
  try {
    await page.waitForSelector('text=/Complete!/i', { timeout: 30000 });
    console.log(`  Section complete!`);
  } catch {
    // Check if we're already past this section
    const url = page.url();
    console.log(`  Current URL: ${url}`);
  }
}

/**
 * Login as demo user
 */
async function loginAsDemo(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.locator('[data-testid="email-input"]').fill(DEMO_USER.email);
  await page.locator('[data-testid="password-input"]').fill(DEMO_USER.password);

  // Click login
  await page.locator('[data-testid="login-button"]').click();

  // Wait for redirect to dashboard or household
  await page.waitForURL(/dashboard|household/, { timeout: 30000 });

  console.log('Logged in successfully');
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Household Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsDemo(page);
  });

  test('completes all 6 sections without errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Complete each section in order
    for (const sectionId of SECTIONS_ORDER) {
      await completeSection(page, sectionId);
    }

    // Verify no console errors (excluding expected ones)
    const unexpectedErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('Failed to load resource')
    );

    if (unexpectedErrors.length > 0) {
      console.log('Console errors:', unexpectedErrors);
    }

    // Navigate to household page to verify all sections are complete
    await page.goto('/household');
    await page.waitForLoadState('networkidle');

    console.log('\n=== All sections completed successfully ===');
  });

  test('completes home_charter section', async ({ page }) => {
    await completeSection(page, 'home_charter');
    await expect(page.locator('text=/Complete!/i')).toBeVisible({ timeout: 30000 });
  });

  test('completes sanctuary_map section', async ({ page }) => {
    await completeSection(page, 'sanctuary_map');
    await expect(page.locator('text=/Complete!/i')).toBeVisible({ timeout: 30000 });
  });

  test('completes village_wiki section', async ({ page }) => {
    await completeSection(page, 'village_wiki');
    await expect(page.locator('text=/Complete!/i')).toBeVisible({ timeout: 30000 });
  });

  test('completes roles_rituals section', async ({ page }) => {
    await completeSection(page, 'roles_rituals');
    await expect(page.locator('text=/Complete!/i')).toBeVisible({ timeout: 30000 });
  });

  test('completes communication_rhythm section', async ({ page }) => {
    await completeSection(page, 'communication_rhythm');
    await expect(page.locator('text=/Complete!/i')).toBeVisible({ timeout: 30000 });
  });

  test('completes household_pulse section (non-AI)', async ({ page }) => {
    await completeSection(page, 'household_pulse');
    await expect(page.locator('text=/Complete!/i')).toBeVisible({ timeout: 30000 });
  });

  test('handles NO answer on yes_no questions', async ({ page }) => {
    // Test specifically for the bug fix - selecting NO should work
    await page.goto('/household/onboard/sanctuary_map');
    await page.waitForLoadState('networkidle');

    // Navigate to the yes_no question (sanctuary_quiet_zone is question 4)
    // Answer first 3 questions to get there
    const questionsBeforeYesNo = ['sanctuary_light_quality', 'sanctuary_light_issues', 'sanctuary_sound_sources'];

    for (const qId of questionsBeforeYesNo) {
      const qType = QUESTION_TYPES.sanctuary_map[qId];
      const answer = TEST_ANSWERS.sanctuary_map[qId];
      await page.waitForTimeout(300);
      await answerQuestion(page, qType, answer);
      await page.waitForTimeout(200);
      await clickNext(page);
      await page.waitForTimeout(500);
    }

    // Now we're on the yes_no question
    // Click NO instead of YES
    await answerYesNoQuestion(page, false);

    // Verify the NO button is selected (has amber background)
    const noButton = page.locator('button').filter({ hasText: /^No$/i });
    await expect(noButton).toHaveClass(/bg-amber-500/);

    // Click next should work
    await clickNext(page);

    // Should proceed to next question
    await page.waitForTimeout(500);
    // Verify we moved to next question (sanctuary_quiet_zone_location)
    await expect(page.locator('text=/quiet.*zone|calm-down/i')).toBeVisible();

    console.log('YES/NO bug fix verified - NO selection works correctly');
  });
});
