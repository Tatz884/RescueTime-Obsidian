import type RescueTimePlugin from "main";
import { App, ButtonComponent, DropdownComponent, ExtraButtonComponent, Notice, PluginSettingTab, Setting} from "obsidian";

export class SettingTab extends PluginSettingTab {
	plugin: RescueTimePlugin;

	constructor(app: App, plugin: RescueTimePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('API token')
			.setDesc(
				'Enter your RescueTime API token to use this plugin.' +
				'You can find yours at https://www.rescuetime.com/anapi/manage'
				)
			.addText(text => text
				.setPlaceholder('Your API token')
				.setValue(this.plugin.settings.apiToken)
				.onChange(async (value) => {
					this.plugin.settings.apiToken = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API connection test')
			.setDesc("Test your API token by connecting to RescueTime")
			.addButton((button: ButtonComponent) => {
			  button.setButtonText("connect");
			  button.onClick(() => this.testConnection(button));
			  button.setCta();
			});
	}

	private async testConnection(button: ButtonComponent) {
		button.setDisabled(true);
		try {
		  const error = await this.plugin.api.testConnection(this.plugin.settings.apiToken);
		  if (error) {
			throw error
		  }
		  new Notice('API connection succeeded.');
		  button.setButtonText("success!");
		} catch (error) {
			new Notice(`${error}`);
		  	button.setButtonText("test failed");
		} finally {
		  button.setDisabled(false);
		  window.setTimeout(() => {
			button.setButtonText("connect");
		  }, 2500);
		}
	  }
}