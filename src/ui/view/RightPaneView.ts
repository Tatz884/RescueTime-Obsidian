import { ItemView, WorkspaceLeaf } from "obsidian";
import { renderHourlyBarChart } from '../component/HourlyBarChart'
import { getProductivityPulse, calculateProductivityPulse, calculateProductivityPulsesBy5MinInterval } from "../component/ProductivityPulse";
import { DataReturnType, Row } from "src/model/FetchedData";
import { renderDoughnutChart } from "../component/DoughnutChart";
import { renderCategoryBarChart } from "../component/CategoryBarChart";
import { ApiStatus, FetchedDataAndHeaders, Period, ResolutionTime } from "../../model/DataStore";
import { setFetchedData, getFetchedDataByPeriodAndResolution } from "../../store/DataStore";
import { today } from "../../util/TimeHelpers";
import RescueTimePlugin from "../../../main"
import { analyze } from "eslint-scope";
import { renderProductivityPulseChart } from "../component/ProductivityPulseChart";

export const RIGHT_PANE_VIEW = "right-pane-view";

export class RightPaneView extends ItemView {
  private _plugin: RescueTimePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: RescueTimePlugin) {
    super(leaf);
    this._plugin = plugin;
  }

  getViewType() {
    return RIGHT_PANE_VIEW;
  }

  getDisplayText() {
    return "RescueTime Integration";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h4", { text: "RescueTime dashboard" });
    const reloadButton = container.createEl("button", { text: "reload", cls: "reloadButton" });

    


    const wrapper = container.createEl("div", { cls: "wrapper"});
    const status = wrapper.createEl("div", { cls: "status"});
    const productivityChart = wrapper.createEl("canvas", {cls: "productivityChart"})
    const doughnutTitle = wrapper.createEl("div", { text: "Breakdown by productivity", cls: "doughnutTitle" });
    const doughnutContainer = wrapper.createEl("div", { cls: "doughnutContainer" });
    const score = doughnutContainer.createEl("div", { cls: "score" });
    const doughnutChart = doughnutContainer.createEl("canvas", { cls: "doughnutChart" });
    const barHourlyChart = wrapper.createEl("canvas", { cls: "barHourlyChart" });
    const barCategoryChart = wrapper.createEl("canvas", { cls: "barCategoryChart" });
    
    let productivityPulseChart: any
    let hourlyBarChartContent: any
    let doughnutChartContent: any
    let barCategoryChartContent: any

    

    function isFetchedDataAndHeaders(variable: any): variable is FetchedDataAndHeaders {
      return variable && 
            typeof variable === 'object' && 
            'headers' in variable && 
            'data' in variable;
    }

    function isApiStatus(value: any): value is ApiStatus {
      return Object.values(ApiStatus).includes(value);
    }

    const renderCurrentDashboard = async () => {
      this._plugin.response = await this._plugin.api.fetchData({apiToken: this._plugin.settings.apiToken, period: {start: today, end: today}, resolutionTime: ResolutionTime.MINUTE})

      if (productivityPulseChart) {
        await productivityPulseChart.clear();
        await productivityPulseChart.destroy();
      }

      if (!this._plugin.response) {
        throw new Error("Failed to fetch data today.");
      }
      await setFetchedData(this._plugin.response);

      const dataAndHeaders = await getFetchedDataByPeriodAndResolution(
        {start: today, end: today},
        ResolutionTime.MINUTE
      )

      if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows) {        
        productivityPulseChart = await renderProductivityPulseChart(dataAndHeaders.data.convertedRows)
      } else if (isApiStatus(dataAndHeaders)) {
        await status.setText(`${dataAndHeaders}`)
        doughnutTitle.setText(``)
      }
    }

    const renderDailyDashboard = async () => {
      this._plugin.response = await this._plugin.api.fetchData({apiToken: this._plugin.settings.apiToken})

      if (doughnutChartContent) {
        await doughnutChartContent.clear();
        await doughnutChartContent.destroy();
      }
      if (hourlyBarChartContent) {
        await hourlyBarChartContent.clear();
        await hourlyBarChartContent.destroy();
      }
      if (barCategoryChartContent) {
        await barCategoryChartContent.clear();
        await barCategoryChartContent.destroy();
      }

      if (!this._plugin.response) {
        throw new Error("Failed to fetch data today.");
      }
      await setFetchedData(this._plugin.response);

      const dataAndHeaders = await getFetchedDataByPeriodAndResolution(
        {start: today, end: today},
        ResolutionTime.HOUR
      )


    


      if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows) {
        
        await status.setText("Today's productivity pulse:")
        const {productivityPulse, } = calculateProductivityPulse(dataAndHeaders.data.convertedRows)
        const productivityPulseDisplay = String(Math.round(productivityPulse))
        this._plugin.statusBarItemEl.setText(`Today's productivity pulse: ${productivityPulseDisplay}`)
        hourlyBarChartContent = await renderHourlyBarChart(dataAndHeaders.data.convertedRows)
        doughnutChartContent = await renderDoughnutChart(dataAndHeaders.data.convertedRows)
        barCategoryChartContent = await renderCategoryBarChart(dataAndHeaders.data.convertedRows, 7, true)
        await getProductivityPulse(dataAndHeaders.data.convertedRows)
      } else if (isApiStatus(dataAndHeaders)) {
        await status.setText(`${dataAndHeaders}`)
      }
    }

    const renderAll = async () => {
      await renderCurrentDashboard()
      await renderDailyDashboard()
    }

    await renderAll()
    this.registerInterval(window.setInterval(() => renderAll(), 3.000 * 60 * 1000));

    reloadButton.addEventListener("click", async () => await renderAll())
  }

  async onClose() {


  }

  getIcon(): string {
    return "rescueTime";
  }
}