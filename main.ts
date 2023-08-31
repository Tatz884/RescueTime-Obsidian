import { App, addIcon, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, RequestUrlResponse, request } from 'obsidian';
import { RightPaneView, RIGHT_PANE_VIEW } from "./src/ui/view/RightPaneView";
import { PluginSettings } from "./src/config/PluginSettings";
import { DEFAULT_SETTINGS } from "./src/config/DefaultSettings";
import { SettingTab } from "./src/ui/SettingTab";
import { AnalyticDataAPI } from "./src/api/AnalyticDataAPI"
import { DataReturnType, Row} from "./src/model/FetchedData"
import { Period, ResolutionTime, FetchedDataAndHeaders, ApiStatus } from './src/model/DataStore';
import { setFetchedData, getFetchedDataByPeriodAndResolution } from './src/store/DataStore';
import { calculateProductivityPulse } from './src/ui/component/ProductivityPulse';
// Remember to rename these classes and interfaces!


export default class RescueTimePlugin extends Plugin {
	public settings: PluginSettings;
	public api: AnalyticDataAPI;
	public response: FetchedDataAndHeaders | void;
	public statusBarItemEl = this.addStatusBarItem();

	async onload() {
		await this.loadSettings();
		this.api = new AnalyticDataAPI;
		addIcon("rescueTime", "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M24 7.626v8.749c0 .597-.485 1.092-1.091 1.092h-5.447v5.452c0 .596-.485 1.092-1.091 1.092H7.629a1.094 1.094 0 0 1-1.091-1.092v-5.452H1.091A1.093 1.093 0 0 1 0 16.375V7.626c0-.597.485-1.092 1.091-1.092h5.447V1.082c0-.596.485-1.092 1.091-1.092h8.742c.596 0 1.091.485 1.091 1.092v5.452h5.447A1.1 1.1 0 0 1 24 7.626zm-3.325 4.339l-2.192-1.649l.333 1.042l-4.891-.344c.152.304.243.638.243.992c0 .343-.081.667-.213.95l4.871-.364l-.323 1.022zm-7.579.03l-.495-8l1.021.324l-1.647-2.185l-1.647 2.195l1.04-.334l-.454 8c0 .597.485 1.093 1.091 1.093c.596 0 1.091-.486 1.091-1.093z\"/></svg>")

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));


		this.registerView(
			RIGHT_PANE_VIEW,
			(leaf) => new RightPaneView(leaf, this)
		);
	  
		
		this.statusBarItemEl.setText("Connecting to RescueTime...")

		this.response = await this.api.fetchData({apiToken: this.settings.apiToken})
		if (!this.response) {
			throw new Error("Failed to fetch data today.");
		}
		await setFetchedData(this.response);

		if (this.response.headers.apiStatus && this.response.headers.apiStatus === ApiStatus.AVAILABLE && this.response.data?.convertedRows) {
			
			const {productivityPulse, } = calculateProductivityPulse(this.response.data.convertedRows)
			const productivityPulseDisplay = String(Math.round(productivityPulse))
			this.statusBarItemEl.setText(`Today's productivity pulse: ${productivityPulseDisplay}`)
		}

		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});

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
		//Detaches all leaves with the custom view.
		this.app.workspace.detachLeavesOfType(RIGHT_PANE_VIEW);
	
		// Adds the custom view on the right leaf
		await this.app.workspace.getRightLeaf(false).setViewState({
		  type: RIGHT_PANE_VIEW,
		  active: true,
		});
	
		//Reveals the leaf that contains the custom view.
		// I don't know what it means????
		this.app.workspace.revealLeaf(
		  this.app.workspace.getLeavesOfType(RIGHT_PANE_VIEW)[0]
		);
	  }
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


