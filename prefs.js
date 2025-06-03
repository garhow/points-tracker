import Gio from 'gi://Gio';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Settings'),
            description: _('Configure the extension'),
        });
        page.add(group);

        // Create a new preferences row
        const contributorNameInput = new Adw.EntryRow({
            title: _('Contributor Name'),
        });

        // const showRankingInput = new Adw.SwitchRow({
        //    title: _('Show Ranking'),
        //    subtitle: _('Whether to show the ranking'),
        // });

        group.add(contributorNameInput);
        // group.add(showRankingInput);

        // Create a settings object and bind the row to the `show-indicator` key
        window._settings = this.getSettings();
        window._settings.bind('contributor-name', contributorNameInput, 'text', Gio.SettingsBindFlags.DEFAULT);
        // window._settings.bind('show-ranking', showRankingInput, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}
