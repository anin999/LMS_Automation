import { randomUUID } from 'node:crypto';
import { test } from '../fixtures/test';
import { environment } from '../config/environment';
import { ApplyCompoFullFlowPage } from '../pages/apply-compo-full-flow.page';

test('Apply Compo for a random available past date and verify in My Requests', async ({ page }) => {
  test.setTimeout(180_000);

  const compoPage = new ApplyCompoFullFlowPage(page);
  const { username, password } = environment.credentials();
  let compoDate = '';
  const project = `xmindstest-${randomUUID()}`;

  await test.step('Log in to the platform', () => compoPage.login(username, password));
  await test.step('Choose a random unused Compo date from the past six months', async () => {
    compoDate = await compoPage.findRandomAvailableDateFromPastSixMonths();
  });
  await test.step('Open Create Requests > Compo', () => compoPage.openApplyCompo());
  await test.step(`Submit Compo request for ${compoDate} with a unique project name`, () =>
    compoPage.applyCompo(compoDate, project),
  );
  await test.step('Open My Requests > Compo and verify the request', async () => {
    await compoPage.openAppliedCompoList();
    await compoPage.verifyAppliedCompo(compoDate, project);
  });
  await test.step('Navigate to Dashboard', () => compoPage.navigateToDashboard());

  console.info('Compo full flow complete; Playwright will close the browser context.');
});
