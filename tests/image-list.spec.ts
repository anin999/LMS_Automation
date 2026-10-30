import { test } from '../fixtures/test';
import { environment } from '../config/environment';
import { ImageListPage } from '../pages/image-list.page';

test('Image List: view and close a gallery image, then open Dashboard', async ({ page }) => {
  test.setTimeout(120_000);

  const imageListPage = new ImageListPage(page);
  const { username, password } = environment.credentials();

  await test.step('Log in to the platform', () => imageListPage.login(username, password));
  await test.step('Navigate to Inventory > Image Gallery', () =>
    imageListPage.openImageGallery(),
  );
  await test.step('View an album and close its image', () =>
    imageListPage.viewAlbumAndCloseImage(),
  );
  await test.step('Navigate to Dashboard', () => imageListPage.navigateToDashboard());

  console.info('Image List test complete; Playwright will close the browser context.');
});
