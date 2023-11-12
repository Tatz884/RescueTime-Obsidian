import { App, addIcon, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { RescueTimeRightPaneView, RESCUE_TIME_RIGHT_PANE_VIEW } from "./src/ui/view/RightPaneView";
import { PluginSettings } from "./src/config/PluginSettings";
import { DEFAULT_SETTINGS } from "./src/config/DefaultSettings";
import { SettingTab } from "./src/ui/SettingTab";
import { AnalyticDataAPI } from "./src/api/AnalyticDataAPI"
import { Period, ResolutionTime, FetchedDataAndHeaders, ApiStatus } from './src/model/DataStore';
import { setFetchedData, getFetchedDataByPeriodAndResolution } from './src/store/DataStore';
import { calculateProductivityPulse } from './src/ui/component/ProductivityPulse';

import { codeBlockHandler } from './src/query/CodeBlockHandler';

export default class RescueTimePlugin extends Plugin {
	public settings: PluginSettings;
	public api: AnalyticDataAPI;
	public response: FetchedDataAndHeaders | void;
	public statusBarItemEl = this.addStatusBarItem();

	async onload() {
		await this.loadSettings();
		this.api = new AnalyticDataAPI;
		addIcon("rescueTime", "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M24 7.626v8.749c0 .597-.485 1.092-1.091 1.092h-5.447v5.452c0 .596-.485 1.092-1.091 1.092H7.629a1.094 1.094 0 0 1-1.091-1.092v-5.452H1.091A1.093 1.093 0 0 1 0 16.375V7.626c0-.597.485-1.092 1.091-1.092h5.447V1.082c0-.596.485-1.092 1.091-1.092h8.742c.596 0 1.091.485 1.091 1.092v5.452h5.447A1.1 1.1 0 0 1 24 7.626zm-3.325 4.339l-2.192-1.649l.333 1.042l-4.891-.344c.152.304.243.638.243.992c0 .343-.081.667-.213.95l4.871-.364l-.323 1.022zm-7.579.03l-.495-8l1.021.324l-1.647-2.185l-1.647 2.195l1.04-.334l-.454 8c0 .597.485 1.093 1.091 1.093c.596 0 1.091-.486 1.091-1.093z\"/></svg>")

		this.addSettingTab(new SettingTab(this.app, this));


		this.registerView(
			RESCUE_TIME_RIGHT_PANE_VIEW,
			(leaf) => new RescueTimeRightPaneView(leaf, this)
		);

		// display the current score at the status bar
		if (this.settings.apiToken) {
			this.api.fetchData(this.settings.apiToken)
				.then(response => {
					this.response = response;
					if (!this.response) {
						console.log("Failed to fetch data today.");
					} else {
						return setFetchedData(this.response);
					}
				})
				.then(() => {
					if (this.response && this.response.headers.apiStatus === ApiStatus.AVAILABLE && this.response.data?.convertedRows) {
						return calculateProductivityPulse(this.response.data.convertedRows);
					}
					return null;  // Return null or undefined if not processing further
				})
				.then(result => {
					if (result) {
						const {productivityPulse} = result;
						if (productivityPulse !== undefined) {
							const productivityPulseDisplay = String(Math.round(productivityPulse));
							this.statusBarItemEl.setText(`Today's productivity pulse: ${productivityPulseDisplay}`);
						}
					}
				})
				.catch(error => {
					// Handle any errors here
					console.error('There was an error:', error);
				});
		}

		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});

		await this.registerMarkdownCodeBlockProcessor("rescuetime", async (source, el, ctx) => {
			console.log("source:", source)
			console.log("el:", el)
			console.log("ctx:", ctx)
				await codeBlockHandler(source, el, ctx, this)
			}
		)

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {

		// Adds the custom view on the right leaf
		if (this.app.workspace.getLeavesOfType(RESCUE_TIME_RIGHT_PANE_VIEW).length) {
			return;
		}
		await this.app.workspace.getRightLeaf(false).setViewState({
		  type: RESCUE_TIME_RIGHT_PANE_VIEW,
		  active: true,
		});

	  }
}
