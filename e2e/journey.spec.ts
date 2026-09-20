import { expect, test, type Page } from '@playwright/test';
import { E2E_REVIEWER_KEY } from '../playwright.config';

/**
 * Main user journeys. Speech recognition isn't available in headless browsers, so the
 * tests use the same pipeline through the text composer and quick replies.
 */
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.webkitSpeechRecognition;
    delete w.SpeechRecognition;
    try {
      if (!localStorage.getItem('sv:prefs')) localStorage.setItem('sv:prefs', JSON.stringify({ greeted: true, voiceReplies: false }));
    } catch {
      /* ignore */
    }
  });
});

async function say(page: Page, text: string) {
  await page.getByRole('button', { name: /type instead/i }).click();
  const box = page.getByRole('dialog').getByRole('textbox');
  await box.fill(text);
  await box.press('Enter');
}

test('home is calm, accessible and voice-first', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /speak naturally/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /start speaking/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /emergency — call 112/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('symptom → follow-up → advice → nearby care → summary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /high fever and body ache/i }).click();
  await expect(page.getByText(/rash, stiff neck/i)).toBeVisible();

  await page.getByRole('button', { name: 'No', exact: true }).click();
  await expect(page.getByText(/see a doctor today/i).first()).toBeVisible();

  // No location yet → the app asks, and the demo location works.
  await page.getByRole('button', { name: /sample location/i }).click();
  await expect(page.getByText(/closest suitable one is/i)).toBeVisible();

  await page.getByRole('button', { name: /see a doctor today/i }).click();
  const sheet = page.getByRole('dialog', { name: /care summary/i });
  await expect(sheet.getByText(/what you told me/i)).toBeVisible();
  await expect(sheet.getByText('fever', { exact: false }).first()).toBeVisible();
  await expect(sheet.getByRole('link', { name: /directions/i }).first()).toHaveAttribute('href', /google\.com\/maps\/dir/);
  await sheet.getByRole('link', { name: /see all nearby/i }).click();

  await expect(page.getByRole('heading', { name: /nearby care/i })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(6);
  await page.getByRole('checkbox', { name: /compare/i }).nth(0).check();
  await page.getByRole('checkbox', { name: /compare/i }).nth(1).check();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();

  await page.getByRole('link', { name: 'Artemis Hospital' }).click();
  await expect(page.getByRole('heading', { name: 'Artemis Hospital', level: 2 })).toBeVisible();
  await expect(page.getByText(/departments listed by the hospital/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /^call$/i })).toHaveAttribute('href', /^tel:/);
});

test('emergency circuit breaker takes over immediately', async ({ page }) => {
  await page.goto('/');
  await say(page, 'mere papa ko seene mein tez dard ho raha hai');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  // The UI follows the user's language (Hinglish here).
  await expect(dialog.getByRole('link', { name: /abhi 112 par call/i })).toHaveAttribute('href', 'tel:112');
  await expect(dialog.getByText(/khud gaadi na chalayein/i)).toBeVisible();
  await dialog.getByRole('button', { name: /emergency nahi hai/i }).click();
  await expect(dialog).toBeHidden();
});

test('SOS button works without a conversation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /emergency — call 112/i }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('link', { name: /call 112 now/i })).toBeVisible();
  await expect(dialog.getByText('14416')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Hindi conversation is answered in Hindi', async ({ page }) => {
  await page.goto('/');
  await say(page, 'मुझे कल से खांसी और जुकाम है');
  await expect(page.getByText(/समझ गई/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'हाँ' })).toBeVisible();
});

test('Bengali conversation is answered in Bengali, through to the advice', async ({ page }) => {
  await page.goto('/');
  await say(page, 'আমার দু দিন ধরে খুব জ্বর আর গা ব্যথা');
  await expect(page.getByText(/বুঝলাম/)).toBeVisible();
  await page.getByRole('button', { name: 'না', exact: true }).click();
  // The urgency label, the recommended action and the disclaimer come from three
  // different layers — the web dictionary, the triage engine and the safety content —
  // so an untranslated layer shows up here as Hindi or English on the screen.
  await expect(page.getByText('শিগগিরই ডাক্তার দেখান').first()).toBeVisible();
  await expect(page.getByText(/জেনারেল মেডিসিন ওপিডি/).first()).toBeVisible();
  await expect(page.getByText(/সঞ্জীবনী ডাক্তার নয়/).first()).toBeVisible();
});

test('the language screen admits when a language is only partly translated', async ({ page }) => {
  await page.goto('/settings/language');
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  // Stated once, in the language now in use, rather than on every option.
  await expect(page.getByRole('status')).toContainText('বাংলা');
});

/*
 * The clinician review console, end to end: sign in, read a decision the app itself
 * just produced, record a verdict, and see the agreement panel move. The assertion
 * that matters most is the negative one — the reviewer's screen must not contain the
 * words the patient typed.
 */
test('a clinician reviews a real decision, and never sees what the patient typed', async ({ page }) => {
  const SAID = 'I have had a high fever and body ache for two days';

  // Produce a decision to review.
  await page.goto('/');
  await say(page, SAID);
  await expect(page.getByText(/I understand/i)).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await expect(page.getByText(/see a doctor/i).first()).toBeVisible();

  await page.goto('/review');
  await page.getByLabel(/access key/i).fill(E2E_REVIEWER_KEY);
  await page.getByRole('button', { name: /start reviewing/i }).click();

  /*
   * Asserted on structure rather than on a particular symptom: the queue is ordered by
   * consequence, so whichever decision it hands over first depends on what else this
   * run has produced. What must hold for *any* case is that the clinical facts are
   * there, the rules that fired are named, and the patient's own sentence is not.
   */
  await expect(page.getByText(/rules that fired/i)).toBeVisible();
  await expect(page.getByRole('article').getByRole('listitem').first()).toBeVisible();
  await expect(page.getByText(/engine confidence/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(SAID);

  await page.getByRole('button', { name: 'Reasonable', exact: true }).click();
  await page.getByRole('button', { name: /record and next/i }).click();

  await expect(page.getByText(/reviews recorded/i)).toBeVisible();
  await expect(page.getByText(/judged reasonable/i)).toBeVisible();
  // The caveat travels with the number on screen, not just in the payload.
  await expect(page.getByText(/over-samples emergencies/i)).toBeVisible();
});

test('the review console refuses a wrong key', async ({ page }) => {
  await page.goto('/review');
  await page.getByLabel(/access key/i).fill('not-the-key');
  await page.getByRole('button', { name: /start reviewing/i }).click();
  // Scoped to the form: Next's route announcer is also role="alert".
  await expect(page.locator('form').getByRole('alert')).toContainText(/not accepted/i);
});

test('accessibility settings persist', async ({ page }) => {
  await page.goto('/settings/accessibility');
  await page.getByRole('radio', { name: 'Extra large' }).click();
  await page.getByRole('switch', { name: 'High contrast' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text', 'xlarge');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(page.getByRole('switch', { name: 'High contrast' })).toHaveAttribute('aria-checked', 'true');
});

test('history shows past conversations and privacy deletion clears them', async ({ page }) => {
  await page.goto('/');
  await say(page, 'I have had a toothache since yesterday');
  await expect(page.getByText(/I understand/)).toBeVisible();
  await page.goto('/history');
  await expect(page.getByRole('link', { name: /toothache/i })).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.goto('/privacy');
  await page.getByRole('button', { name: /delete all my data/i }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/history');
  await expect(page.getByText(/no conversations yet/i)).toBeVisible();
});

test('emergency numbers page is static and complete', async ({ page }) => {
  await page.goto('/emergency');
  await expect(page.getByRole('link', { name: /call 112/i })).toHaveAttribute('href', 'tel:112');
  await expect(page.locator('a[href="tel:108"]')).toBeVisible();
  await expect(page.locator('a[href="tel:14416"]')).toBeVisible();
});

test('feedback can be sent', async ({ page }) => {
  await page.goto('/feedback');
  await page.getByRole('button', { name: /yes, helpful/i }).click();
  await page.getByRole('button', { name: 'Voice' }).click();
  await page.getByRole('button', { name: /send feedback/i }).click();
  await expect(page.getByText(/thank you/i)).toBeVisible();
});

test('settings is a hub that reaches every screen and shows current values', async ({ page }) => {
  await page.goto('/settings');
  // The hub answers what the settings currently are, without opening them.
  await expect(page.getByRole('link', { name: /language/i })).toContainText(/automatic/i);

  await page.getByRole('link', { name: /language/i }).click();
  await expect(page).toHaveURL('/settings/language');
  await page.getByRole('button', { name: 'हिंदी', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');

  await page.goto('/settings');
  await page.getByRole('link', { name: /accessibility|सुलभता/i }).click();
  await expect(page).toHaveURL('/settings/accessibility');
});

test('how it works explains the safety rules and shows the real ranking weights', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: /what it will never do/i })).toBeVisible();
  await expect(page.getByText(/give you a diagnosis/i)).toBeVisible();
  // Weights are rendered from the same constant the server ranks with.
  await expect(page.getByText('40%')).toBeVisible();
  await expect(page.getByText('25%')).toBeVisible();
});

test('a guide example starts a real conversation', async ({ page }) => {
  await page.goto('/guide');
  await page.getByRole('button', { name: /high fever and body ache/i }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(/rash|stiff neck/i)).toBeVisible({ timeout: 15000 });
});

test('saved places collects bookmarks and lets them go', async ({ page }) => {
  await page.goto('/saved');
  await expect(page.getByText(/nothing saved yet/i)).toBeVisible();

  await page.goto('/care?type=hospital&specialty=general_medicine&urgency=routine');
  await page.getByRole('button', { name: /use sample location/i }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();

  await page.goto('/saved');
  const first = page.getByRole('listitem').first();
  await expect(first).toBeVisible();
  await first.getByRole('button', { name: /remove/i }).click();
  await expect(page.getByText(/nothing saved yet/i)).toBeVisible();
});

test('an emergency contact is saved, offered on the emergency screen, and never sent to the server', async ({ page }) => {
  // Watch every request the page makes for the duration of the test.
  const uploads: string[] = [];
  page.on('request', (req) => {
    const body = req.postData() ?? '';
    if (body.includes('9876543210') || body.includes('Priya')) uploads.push(`${req.method()} ${req.url()}`);
  });

  await page.goto('/settings/emergency-contact');
  await page.getByLabel('Name', { exact: true }).fill('Priya');
  await page.getByLabel(/relationship/i).fill('Sister');
  await page.getByLabel(/phone number/i).fill('+91 98765 43210');
  await page.getByRole('button', { name: /save contact/i }).click();
  await expect(page.getByText(/contact saved on this device/i)).toBeVisible();

  // It survives a reload, because it is stored locally.
  await page.reload();
  await expect(page.getByText('+919876543210')).toBeVisible();

  // The hub shows who it is without opening the screen.
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: /emergency contact/i })).toContainText('Priya');

  // It appears on the offline emergency page as a one-tap call.
  await page.goto('/emergency');
  await expect(page.getByRole('link', { name: /call priya/i })).toHaveAttribute('href', 'tel:+919876543210');

  // And on the emergency takeover, above the instructions.
  await page.goto('/');
  await say(page, 'my father has severe chest pain and is sweating');
  const dialog = page.locator('[role=alertdialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: /call priya/i })).toBeVisible();
  // 112 still leads — the trusted contact never displaces emergency services.
  await expect(dialog.getByRole('link', { name: /call 112/i })).toBeVisible();

  expect(uploads, `contact details were sent to: ${uploads.join(', ')}`).toEqual([]);
});

test('an invalid phone number is refused rather than silently saved', async ({ page }) => {
  await page.goto('/settings/emergency-contact');
  await page.getByLabel('Name', { exact: true }).fill('Test');
  await page.getByLabel(/phone number/i).fill('not a number');
  await page.getByRole('button', { name: /save contact/i }).click();
  await expect(page.locator('#ec-error')).toContainText(/does not look like a phone number/i);
});

test('the answer carries a trace showing safety rules ran before generation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /high fever and body ache/i }).click();
  await expect(page.getByText(/rash, stiff neck/i)).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();

  // The triage card opens the summary sheet, which carries the trace panel.
  await page.getByRole('button', { name: /see a doctor today/i }).click();
  const sheet = page.getByRole('dialog', { name: /care summary/i });
  await sheet.getByRole('button', { name: /how this answer was produced/i }).click();

  await expect(sheet.getByText(/emergency rules/i)).toBeVisible();
  // The emergency check is listed before triage — the order is the point.
  const stages = await sheet.locator('ol li').allTextContents();
  const emergencyAt = stages.findIndex((line) => /emergency rules/i.test(line));
  const triageAt = stages.findIndex((line) => /triage/i.test(line));
  expect(emergencyAt).toBeGreaterThanOrEqual(0);
  expect(emergencyAt).toBeLessThan(triageAt);
  // The trace must never leak what the person actually said.
  const traceText = stages.join(' ');
  expect(traceText).not.toMatch(/fever|body ache/i);
});

test('triage still works when the server is unreachable', async ({ page }) => {
  await page.goto('/');
  // Let the idle warm-up pull the engine in while the network still works.
  await page.waitForTimeout(3000);

  // Now cut the API off completely — the same thing a dropped connection does.
  await page.route('**/api/**', (route) => route.abort('failed'));

  await say(page, 'my father has severe chest pain and is sweating');

  // The emergency circuit breaker ran in the browser. This is the case that matters:
  // no network, and the person is still told to call 112.
  const dialog = page.locator('[role=alertdialog]');
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await expect(dialog.getByRole('link', { name: /call 112/i })).toHaveAttribute('href', 'tel:112');
});

test('an offline answer says so, and says what it cost', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.route('**/api/**', (route) => route.abort('failed'));

  await say(page, 'I have had a headache and mild fever for two days');

  // A follow-up question, produced with no server involved.
  await expect(page.getByText(/rash|stiff neck/i)).toBeVisible({ timeout: 20000 });
  // And an honest label rather than a silent degradation.
  await expect(page.getByText(/answered on your phone/i)).toBeVisible();
  await expect(page.getByText(/not being saved/i)).toBeVisible();
});

test('offline still names a hospital, and says the list is a snapshot', async ({ page }) => {
  await page.goto('/');
  // Give the app a position first — the bundled directory is ranked around it, on
  // this device, so without one there is nothing to rank against.
  await page.getByRole('button', { name: /high fever and body ache/i }).click();
  await expect(page.getByText(/rash, stiff neck/i)).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await page.getByRole('button', { name: /use sample location/i }).click();
  await expect(page.getByText(/closest suitable one is/i)).toBeVisible();

  // Now cut the network completely and keep going.
  await page.route('**/api/**', (route) => route.abort('failed'));
  await say(page, 'it is worse now and I am vomiting');

  // The engine asks its follow-ups offline exactly as it would online; answer them
  // until it reaches advice rather than asserting on a half-finished turn.
  for (const label of ['Yes', '1–2 days']) {
    const button = page.getByRole('button', { name: label, exact: true }).first();
    await expect(button).toBeVisible({ timeout: 20000 });
    await button.click();
  }

  // A named hospital, ranked with no server involved...
  await expect(page.getByText(/nearest suitable option is/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /show directions/i })).toBeVisible();
  // ...and the one thing that must never be implied: that it was checked just now.
  await expect(page.getByText(/verified earlier, not checked just now/i)).toBeVisible();
});

test('a server error is surfaced, not silently answered offline', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  // A 400 is a decision the server made. Second-guessing it in the browser would be
  // worse than showing it, so the offline path must not engage.
  await page.route('**/api/v1/conversations/*/turns', (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { code: 'bad_request', message: 'That message is too long.' } }) }),
  );

  await say(page, 'I have a headache');
  await expect(page.getByText(/that message is too long/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/answered on your phone/i)).toHaveCount(0);
});

test('a check-in is offered, falls due, and hands "worse" back to the rules', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /high fever and body ache/i }).click();
  // Wait for the follow-up before answering it, or the click races the reply.
  await expect(page.getByText(/rash, stiff neck/i)).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await expect(page.getByText(/see a doctor today/i).first()).toBeVisible();

  await page.getByRole('button', { name: /see a doctor today/i }).click();
  const sheet = page.getByRole('dialog', { name: /care summary/i });
  const offer = sheet.getByRole('button', { name: /check back in \d+h/i });
  await expect(offer).toBeVisible();
  await offer.click();
  await expect(sheet.getByText(/i.ll ask in \d+ hours/i)).toBeVisible();

  // Stored on the device, with labels rather than codes, and nothing clinical beyond them.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sv:checkins') ?? '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0].status).toBe('pending');
  expect(stored[0].symptoms.length).toBeGreaterThan(0);

  // Wind the clock forward rather than waiting six hours for it.
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('sv:checkins') ?? '[]');
    for (const c of list) c.dueAt = Date.now() - 1000;
    localStorage.setItem('sv:checkins', JSON.stringify(list));
  });

  await page.goto('/');
  const prompt = page.getByRole('region', { name: /checking back/i });
  await expect(prompt).toBeVisible();

  await prompt.getByRole('button', { name: /^worse$/i }).click();

  // "Worse" is not decided here: it starts a turn and the engine answers it.
  await expect(prompt).toBeHidden();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('sv:checkins') ?? '[]'));
  expect(after[0].entries.at(-1).change).toBe('worse');
  expect(after[0].status).toBe('closed');
  await expect(page.getByText(/got worse|bigad|बिगड़/i).first()).toBeVisible({ timeout: 20000 });
});

test('the dashboard re-derives the safety numbers in the browser', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /run all cases/i }).click();

  // Whatever it finds, it reports. This asserts the run completes and passes.
  await expect(page.getByText(/all thresholds met/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/\d+ cases · \d+ ms/)).toBeVisible();

  // The deterministic probe: an emergency phrase in Hinglish, decided with no server.
  await page.route('**/api/**', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Seene mein bahut tez dard ho raha hai' }).click();
  await expect(page.getByText(/emergency — cardiac/i)).toBeVisible({ timeout: 20_000 });

  // And the one that must stay quiet: a finished episode.
  await page.getByRole('button', { name: /i had chest pain last year/i }).click();
  await expect(page.getByText(/no emergency detected/i)).toBeVisible({ timeout: 20_000 });
});
