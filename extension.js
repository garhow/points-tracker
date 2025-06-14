/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import St from "gi://St";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

function extractTable(markdownContent) {
	const tableRegex = /(\|[^\n]+(?:\n\|[^\n]+)*)/g;

	if (markdownContent != null) {
		const tableMatch = markdownContent.match(tableRegex);
	
		if (tableMatch) {
			return tableMatch[0];
		}
	}

	return null;
}

function read_https_file(url) {
	let networkMonitor = Gio.NetworkMonitor.get_default();
	if (networkMonitor.get_network_available()) {
		let file = Gio.File.new_for_uri(url);
	
		try {
			let [ok, contents, etag] = file.load_contents(null);
	
			if (ok) {
				return new TextDecoder().decode(contents);
			}
		} catch (e) {
			console.log(e.message);
		}
	} else {
		console.log("Connectivity lost! Points tracker will not function.");
	}
	return null;
}

function getLines() {
	let hedgedocMarkdown = read_https_file("https://pad.gnome.org/summer-of-gnomeos/download");
	let tableContent = extractTable(hedgedocMarkdown);

	if (tableContent == null) {
		return null;
	}

	// Remove the header from the table
	const lines = tableContent.split('\n');
	lines.splice(0, 2);

	return lines;
}

function getScore(participant) {
	let lines = getLines();
	if (lines != null) {
		for (let line of lines) {
			const columns = line.split('|').map(col => col.trim());
			const name_column = columns[1];
			const score_column = columns[columns.length - 2];
			if (name_column == participant) {
				return score_column;
			}
		}
	}

	return null;
}

function getHighScore() {
	let scores = [];
	let lines = getLines();
	if (lines != null) {
		for (let line of lines) {
			const columns = line.split('|').map(col => col.trim());
			const score_column = columns[columns.length - 2];
			if (!isNaN(score_column)) {
				scores.push(parseInt(score_column));
			}
		}

		// Sort scores in descending order
		scores.sort((x, y) => y - x);

		return scores[0];
	}

	return null;
}

function refresh(label, settings) {
	console.log("Points tracker is refreshing...");

	const score = getScore(settings.get_string('contributor-name'));
	const highScore = getHighScore();

	var message;

	if (score) {
		let optional_highscore = settings.get_boolean('show-highscore') ? "/" + highScore : ""
		message = score + optional_highscore;
	} else {
		message = "?";
	}

	label.text = message;

	console.log("Point tracker refresh complete");
}

export default class IndicatorExampleExtension extends Extension {
	enable() {
		this._settings = this.getSettings();

		this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

		// Create layout
		const box = new St.BoxLayout({
			visible: true,
			min_width: 80,
			y_align: Clutter.ActorAlign.CENTER,
		});

		const icon = new St.Icon({
	  		icon_name: "applications-science-symbolic",
	  		style_class: "system-status-icon",
		});

	  	var label = new St.Label({
			y_align: Clutter.ActorAlign.CENTER,
	  	});

		// Apply layout
		box.add_child(icon);
		box.add_child(label);
		this._indicator.add_child(box);

		// Add the indicator to the panel
		Main.panel.addToStatusArea(this.uuid, this._indicator);

		refresh(label, this._settings);

		// Add menu items to refresh, open the web page and the preferences window
		this._indicator.menu.addAction(_("Refresh"), () =>
			refresh(label, this._settings),
		);

		this._indicator.menu.addAction(_("View Website"), () => {
			const url = "https://pad.gnome.org/s/summer-of-gnomeos";
			let appInfo = Gio.AppInfo.create_from_commandline("xdg-open " + url, null, null);
			if (appInfo) {
				appInfo.launch_uris([url], null);
			}
		});

		this._indicator.menu.addAction(_("Configure"), () =>
			this.openPreferences(),
		);

		// Watch for changes in settings
		this._settings.connect("changed::contributor-name", (settings, key) => {
			refresh(label, settings)
		});

		this._settings.connect("changed::show-highscore", (settings, key) => {
			refresh(label, settings)
		});


		// Refresh stats every thirty minutes
		function refreshLoop(settings) {
			setTimeout(function() {
				refresh(label, settings);
				refreshLoop(settings);
			}, 30*60*1000);
		}

		refreshLoop(this._settings);
	}

	disable() {
		this._indicator.destroy();
		this._indicator = null;
		this._settings = null;
	}
}
