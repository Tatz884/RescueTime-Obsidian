import { ItemView, WorkspaceLeaf } from "obsidian";
import { getProductivityPulse, calculateProductivityPulse, calculateProductivityPulsesBy5MinInterval } from "../component/ProductivityPulse";
import { renderDoughnutChart } from "../component/DoughnutChart";
import { renderCategoryBarChart } from "../component/CategoryBarChart";
import { ResolutionTime, RestrictKind } from "../../model/DataStore";
import { today } from "../../util/TimeHelpers";
import RescueTimePlugin from "../../../main"
import { renderProductivityPulseChart } from "../component/ProductivityPulseChart";
import { isFetchedDataAndHeaders, isApiStatus } from "../../util/TypeGuards";
import { renderIntervalBarChart } from "../component/IntervalBarChart";
import { Interval } from "../../model/ChartSetting";
import { DataService } from "../../api/DataService";

export const RESCUE_TIME_RIGHT_PANE_VIEW = "rescue-time-right-pane-view";

export class RescueTimeRightPaneView extends ItemView {
  private _plugin: RescueTimePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: RescueTimePlugin) {
    super(leaf);
    this._plugin = plugin;
  }

  getViewType() {
    return RESCUE_TIME_RIGHT_PANE_VIEW;
  }

  getDisplayText() {
    return "RescueTime Integration";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.setAttribute('style', 'backgroundColor: black;');
    container.empty();
    container.createEl("h4", { text: "RescueTime dashboard" });
    const reloadButton = container.createEl("button", { text: "reload", cls: "reloadButton" });

    const wrapper = container.createEl("div", { cls: "wrapper"});
    const status = wrapper.createEl("div", { cls: "status"});
    const productivityChart = wrapper.createEl("canvas", {cls: "productivityChart"})
    const doughnutTitle = wrapper.createEl("div", { text: "Today's productivity pulse", cls: "doughnutTitle" });
    const doughnutContainer = wrapper.createEl("div", { cls: "doughnutContainer" });
    const score = doughnutContainer.createEl("div", { cls: "score" });
    const doughnutChart = doughnutContainer.createEl("canvas", { cls: "doughnutChart" });
    const barHourlyTitle = wrapper.createEl("div", { text: "Hourly productivity", cls: "barHourlyTitle" });
    const barHourlyChart = wrapper.createEl("canvas", { cls: "barHourlyChart" });
    const barCategoryTitle = wrapper.createEl("div", { text: "Category vs time spent", cls: "barCategoryTitle" });
    const barCategoryChart = wrapper.createEl("canvas", { cls: "barCategoryChart" });
    
    let productivityPulseChart: any
    let hourlyBarChartContent: any
    let doughnutChartContent: any
    let barCategoryChartContent: any

    const dataService = new DataService(this._plugin);
    



    const renderCurrentDashboard = async () => {
      
      if (productivityPulseChart) {
        await productivityPulseChart.clear();
        await productivityPulseChart.destroy();
      }



      let dataAndHeaders = await dataService.fetchAndProcessData({start: today, end: today},
        ResolutionTime.MINUTE,
        RestrictKind.PRODUCTIVITY);

      if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows) {        
        productivityPulseChart = await renderProductivityPulseChart(dataAndHeaders.data.convertedRows)
      } else if (isApiStatus(dataAndHeaders)) {
        await status.setText(`${dataAndHeaders}`)
        doughnutTitle.setText(``)
      }
    }

    const renderDailyDashboard = async () => {
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

      let dataAndHeaders = await dataService.fetchAndProcessData({start: today, end: today},
        ResolutionTime.HOUR,
        RestrictKind.ACTIVITY)

      if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows) {
        
        await status.setText("Time-course change of today's pulse")
        const {productivityPulse, } = await calculateProductivityPulse(dataAndHeaders.data.convertedRows)
        const productivityPulseDisplay = String(Math.round(productivityPulse))
        this._plugin.statusBarItemEl.setText(`Today's productivity pulse: ${productivityPulseDisplay}`)

        // get .barHourlyChart from the container of the rightpaneview, rather from document
        const barHourlyChartCtx = await container.querySelector('.barHourlyChart') as HTMLCanvasElement | null;
        if (!barHourlyChartCtx) {
            console.error("Unable to get canvas element");
            return;
        }
        const doughnutChartCtx = (container.querySelector('.doughnutChart') as HTMLCanvasElement).getContext('2d');
        if (!doughnutChartCtx) {
            console.error("Unable to get canvas element");
            return;
        }
        const displayScore = container.querySelector('.score');

        hourlyBarChartContent = await renderIntervalBarChart(dataAndHeaders.data.convertedRows, Interval.HOURLY, barHourlyChartCtx)
        doughnutChartContent = await renderDoughnutChart(dataAndHeaders.data.convertedRows, doughnutChartCtx)
        barCategoryChartContent = await renderCategoryBarChart(dataAndHeaders.data.convertedRows, 7, true)
        await getProductivityPulse(dataAndHeaders.data.convertedRows, displayScore)
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