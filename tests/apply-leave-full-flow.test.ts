import { test } from '../fixtures/test';
import { environment } from '../config/environment';
import { ApplyLeaveFullFlowPage } from '../pages/apply-leave-full-flow.page';

const leavePurpose = 'casual leaves';
const cancellationReason = 'test reason 123';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextLeaveDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  while (date.getDay() === 0 || date.getDay() === 5 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function getNextWorkday(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}

test('Apply leave full flow', async ({ page }) => {
  test.setTimeout(180_000);

  const leavePage = new ApplyLeaveFullFlowPage(page);
  const { username, password } = environment.credentials();
  const leaveDate = getNextLeaveDate();
  const fromDate = formatDate(leaveDate);
  const tillDate = fromDate;
  const backToWorkDate = formatDate(getNextWorkday(leaveDate));

  await test.step('Log in to the platform', () => leavePage.login(username, password));
  await test.step('Navigate to Create Requests and open Leave', () =>
    leavePage.openLeaveRequestForm(),
  );
  await test.step(`Apply for one day of casual leave on ${fromDate}`, () =>
    leavePage.enterLeaveDetails(fromDate, tillDate, backToWorkDate, leavePurpose),
  );
  await test.step('Submit the leave request', () => leavePage.submitLeave());
  await test.step('Open My Requests > Leave and verify the applied leave', async () => {
    await leavePage.openAppliedLeaveList();
    await leavePage.verifyLeaveEntry(fromDate, tillDate, 'Casual Leaves');
  });
  await test.step('Cancel the applied leave with a reason', () =>
    leavePage.cancelLeaveEntry(fromDate, tillDate, cancellationReason),
  );
  await test.step('Navigate to Dashboard', () => leavePage.navigateToDashboard());

  console.info('Apply leave full flow complete; Playwright will close the browser context.');
});
