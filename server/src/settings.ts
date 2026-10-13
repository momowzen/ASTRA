import * as sheets from './sheets';
import { config } from './config';

const HEADER = ['KEY', 'VALUE'];

/** Create the hidden settings tab if it does not exist yet. */
export async function ensureSettingsTab(): Promise<void> {
  const meta = await sheets.getSpreadsheetMeta();
  let tab = meta.sheets.find((s) => s.title === config.settingsTab);
  if (!tab) {
    try {
      const sheetId = await sheets.addSheet(config.settingsTab);
      await sheets.setSheetHidden(sheetId, true);
      await sheets.updateValues(config.settingsTab, 'A1:B2', [HEADER, ['member_edit', 'on']]);
      console.log(`[settings] created hidden settings tab "${config.settingsTab}"`);
      return;
    } catch (err) {
      console.warn('[settings] addSheet failed, re-checking:', err instanceof Error ? err.message : err);
      tab = (await sheets.getSpreadsheetMeta()).sheets.find((s) => s.title === config.settingsTab);
      if (!tab) throw err;
    }
  }
  if (!tab.hidden) {
    await sheets.setSheetHidden(tab.sheetId, true);
    console.log(`[settings] hid settings tab "${config.settingsTab}"`);
  }
}
