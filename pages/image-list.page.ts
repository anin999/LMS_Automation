import { expect, type Locator, type Page } from '@playwright/test';
import { LoginPage } from './login.page';

export class ImageListPage {
  private readonly loginPage: LoginPage;
  private readonly sidebar: Locator;
  private readonly inventoryMenu: Locator;
  private readonly imageGalleryLink: Locator;
  private readonly galleryHeading: Locator;
  private readonly viewAlbumLink: Locator;
  private readonly albumImageLink: Locator;
  private readonly imageDialog: Locator;
  private readonly closeImageButton: Locator;
  private readonly dashboardLink: Locator;

  constructor(private readonly page: Page) {
    this.loginPage = new LoginPage(page);
    this.sidebar = page.getByRole('complementary');
    this.inventoryMenu = this.sidebar.getByRole('link', { name: /Inventory/ });
    this.imageGalleryLink = this.sidebar.getByRole('link', { name: /Image Gallery/ });
    this.galleryHeading = page.getByRole('heading', { name: 'Image Gallery', exact: true });
    this.viewAlbumLink = page.getByRole('link', { name: 'View Album', exact: true });
    this.albumImageLink = page.locator('a[href*="/avatar/imageGallery/"]').filter({
      has: page.locator('img'),
    });
    this.imageDialog = page.getByRole('dialog');
    this.closeImageButton = this.imageDialog.getByRole('button', { name: 'Close' });
    this.dashboardLink = this.sidebar.getByRole('link', { name: /Dashboard/ });
  }

  async login(username: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.email.fill(username);
    await this.loginPage.password.fill(password);
    await this.click(this.loginPage.signInButton, 'Sign In');
    await expect(this.page).not.toHaveURL(/\/login(?:[?#].*)?$/);
    await expect(this.sidebar).toBeVisible();
  }

  async openImageGallery(): Promise<void> {
    await this.click(this.inventoryMenu, 'Inventory');
    await expect(this.imageGalleryLink).toBeVisible();
    await this.click(this.imageGalleryLink, 'Image Gallery');
    await expect(this.galleryHeading).toBeVisible();
    await expect(this.viewAlbumLink).toBeVisible();
  }

  async viewAlbumAndCloseImage(): Promise<void> {
    await this.click(this.viewAlbumLink, 'View Album');
    await expect(this.page).toHaveURL(/\/album\/\d+(?:[?#].*)?$/);
    await expect(this.galleryHeading).toBeVisible();
    await expect(this.albumImageLink.first()).toBeVisible();
    await this.click(this.albumImageLink.first(), 'album image');
    await expect(this.imageDialog).toBeVisible();
    await this.click(this.closeImageButton, 'Close image');
    await expect(this.imageDialog).toBeHidden();
  }

  async navigateToDashboard(): Promise<void> {
    await this.click(this.dashboardLink, 'Dashboard');
    await expect(this.page).toHaveURL(/\/dashboard(?:[?#].*)?$/);
  }

  private async click(locator: Locator, description: string): Promise<void> {
    console.info(`Clicking ${description}`);
    await locator.click();
    await this.page.waitForTimeout(2_000);
  }
}
