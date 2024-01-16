import { ItemView, WorkspaceLeaf } from "obsidian";
import { getProductivityPulse, calculateProductivityPulse, calculateProductivityPulsesBy5MinInterval } from "../component/ProductivityPulse";
import { renderDoughnutChart } from "../component/DoughnutChart";
import { renderCategoryBarChart } from "../component/CategoryBarChart";
import { ApiStatus, ResolutionTime, RestrictKind } from "../../model/DataStore";
import RescueTimePlugin from "../../../main"
import { renderProductivityPulseChart } from "../component/ProductivityPulseChart";
import { isFetchedDataAndHeaders, isApiStatus } from "../../util/TypeGuards";
import { renderIntervalBarChart } from "../component/IntervalBarChart";
import { Interval } from "../../model/ChartSetting";
import { DataService } from "../../api/DataService";
import { getToday } from "../../util/TimeHelpers";

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
    const doughnutTitle = wrapper.createEl("div", { text: "", cls: "doughnutTitle" });
    const doughnutContainer = wrapper.createEl("div", { cls: "doughnutContainer" });
    const score = doughnutContainer.createEl("div", { cls: "score" });
    const doughnutChart = doughnutContainer.createEl("canvas", { cls: "doughnutChart" });
    const barHourlyTitle = wrapper.createEl("div", { text: "", cls: "barHourlyTitle" });
    const barHourlyChart = wrapper.createEl("canvas", { cls: "barHourlyChart" });
    const barCategoryTitle = wrapper.createEl("div", { text: "", cls: "barCategoryTitle" });
    const barCategoryChart = wrapper.createEl("canvas", { cls: "barCategoryChart" });
    
    let productivityPulseChart: any
    let hourlyBarChartContent: any
    let doughnutChartContent: any
    let barCategoryChartContent: any

    function setAllTexts() {
      doughnutTitle.setText("Today's productivity pulse")
      barHourlyTitle.setText("Hourly productivity")
      barCategoryTitle.setText("Category vs time spent")
    }
  
    function modifyTextsInError() {
      doughnutTitle.setText("")
      barHourlyTitle.setText("")
      barCategoryTitle.setText("")
    }

    const dataService = new DataService(this._plugin);

    const renderCurrentDashboard = async (today: string) => {

      if (productivityPulseChart) {
        await productivityPulseChart.clear();
        await productivityPulseChart.destroy();
      }


      

      let dataAndHeaders = await dataService.fetchAndProcessData({start: today, end: today},
        ResolutionTime.MINUTE,
        RestrictKind.PRODUCTIVITY);

      if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows &&
      dataAndHeaders.headers.apiStatus == ApiStatus.AVAILABLE) {  

        const productivityChartCtx = (container.querySelector('.productivityChart') as HTMLCanvasElement).getContext('2d');
        if (!productivityChartCtx) {
            console.error("Unable to get canvas element");
            return;
        }

        productivityPulseChart = await renderProductivityPulseChart(dataAndHeaders.data.convertedRows, productivityChartCtx)
        setAllTexts()
      } else if (isApiStatus(dataAndHeaders)) {
        await status.setText(`${dataAndHeaders}`)
        modifyTextsInError()
      }  else if (dataAndHeaders?.headers.apiStatus) {
        await status.setText(`${dataAndHeaders.headers.apiStatus}`)
        modifyTextsInError()
      }
    }

    const renderDailyDashboard = async (today: string) => {
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

      if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows &&
        dataAndHeaders.headers.apiStatus == ApiStatus.AVAILABLE) {
        setAllTexts()
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
        const barCategoryChartCtx = (container.querySelector('.barCategoryChart') as HTMLCanvasElement).getContext('2d');
        if (!barCategoryChartCtx) {
            console.error("Unable to get canvas element");
            return;
        }
        const displayScore = container.querySelector('.score');

        hourlyBarChartContent = await renderIntervalBarChart(dataAndHeaders.data.convertedRows, Interval.HOURLY, barHourlyChartCtx)
        doughnutChartContent = await renderDoughnutChart(dataAndHeaders.data.convertedRows, doughnutChartCtx)
        barCategoryChartContent = await renderCategoryBarChart(dataAndHeaders.data.convertedRows, 7, true, barCategoryChartCtx)
        await getProductivityPulse(dataAndHeaders.data.convertedRows, displayScore)
      } else if (isApiStatus(dataAndHeaders)) {
        await status.setText(`${dataAndHeaders}`)
        modifyTextsInError()
      } else if (dataAndHeaders?.headers.apiStatus) {
        await status.setText(`${dataAndHeaders.headers.apiStatus}`)
        modifyTextsInError()
      }
    }

    const renderAll = async () => {

      let today = getToday();

      await renderCurrentDashboard(today)
      await renderDailyDashboard(today)
    }

    await renderAll()
    this.registerInterval(window.setInterval(async () => await renderAll(), 3.000 * 60 * 1000));

    reloadButton.addEventListener("click", async () => await renderAll())
  }

  async onClose() {
    


  }



  getIcon(): string {
    return "rescueTime";
  }
}