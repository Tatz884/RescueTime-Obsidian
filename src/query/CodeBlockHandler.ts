import type { MarkdownPostProcessorContext } from "obsidian";
import { ResolutionTime, RestrictKind, Period } from "../model/DataStore";
import { renderIntervalBarChart } from "../ui/component/IntervalBarChart";
import { Interval } from "../model/ChartSetting";
import { renderDoughnutChart } from "../ui/component/DoughnutChart";
import { getProductivityPulse } from "../ui/component/ProductivityPulse";
import RescueTimePlugin from "../../main";
import { DataService } from "../api/DataService"; // Adjust the path as needed
import { FetchedDataAndHeaders } from "../model/DataStore";
import { isFetchedDataAndHeaders } from "../util/TypeGuards";
import { isApiStatus } from "../util/TypeGuards";
import { ApiStatus } from "../model/DataStore";

export async function codeBlockHandler(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    plugin: RescueTimePlugin
) {

    const codeBlockWrapper = el.createEl("div", {cls: "codeBlockWrapper"})
    const errorMessage = await validateDateInput(source);
    if (errorMessage) {
        const error = el.createEl("div", { text: errorMessage, cls: "errorMessage" });
        return;
    }

    let loading: HTMLElement | null;
    loading = el.createEl("div", { text: "loading...", cls: "loadingText" });

    const period = extractDates(source);
    const dataService = new DataService(plugin);
    let dataAndHeaders = await dataService.fetchAndProcessData(period, ResolutionTime.DAY, RestrictKind.PRODUCTIVITY);

    if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows &&
    dataAndHeaders.headers.apiStatus == ApiStatus.AVAILABLE) {
        createElements(codeBlockWrapper, dataAndHeaders)
        renderCharts(codeBlockWrapper, dataAndHeaders)
        handleResponsiveDesign(codeBlockWrapper);
        loading.setText("") // This is not a best practice; Need to think a better way to delete "loading..."
    }  else if (isApiStatus(dataAndHeaders)) {
        const error = el.createEl("div", { text: `${dataAndHeaders}`, cls: "errorMessage" });
        loading.setText("");
      } else if (dataAndHeaders?.headers.apiStatus) {
        const error = el.createEl("div", { text: `${dataAndHeaders?.headers.apiStatus}`, cls: "errorMessage" });
        loading.setText("");
      }
}


async function validateDateInput(source: string): Promise<string | null> {
        const regex = /^FROM (\d{4}-\d{2}-\d{2}) TO (\d{4}-\d{2}-\d{2})$/;
        const match = source.match(regex);
    
        if (!match) {
            return "User input error: Invalid format. Expected 'FROM YYYY-MM-DD TO YYYY-MM-DD'.";
        }
    
        const startDate = new Date(match[1]);
        const endDate = new Date(match[2]);
    
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return "User input error: Invalid date format.";
        }
    
        if (startDate > endDate) {
            return "User input error: Start date must come before the end date.";
        }
    
        const today = new Date();
        const ninetyThreeDaysAgo = new Date(today);
        ninetyThreeDaysAgo.setDate(today.getDate() - 93);
    
        if (startDate <= ninetyThreeDaysAgo) {
            return "User input error: Start date must be 92 or less days before today.";
        }
    
        const dateDifference = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
        if (dateDifference >= 32) {
            return "User input error: The period specified between start date and end date must span 31 days or less.";
        }
    
        return null; // return null if no errors found
}

function extractDates(source: string): Period {
    // This function expects the source to be valid.
    // Regular expression to match format "FROM YYYY-MM-DD TO YYYY-MM-DD"
    const regex = /^FROM (\d{4}-\d{2}-\d{2}) TO (\d{4}-\d{2}-\d{2})$/;
    const match = source.match(regex)!; // We are now certain that match is non-null, hence the "!"

    return {
        start: match[1],
        end: match[2]
    };
};

async function createElements(codeBlockWrapper: Element, dataAndHeaders: FetchedDataAndHeaders) {
    const periodStr = `${dataAndHeaders.headers.period.start}-${dataAndHeaders.headers.period.end}`

    const barDailyTitle = codeBlockWrapper.createEl("div", { text: `Productivity over ${periodStr}`, cls: "barDailyTitle" });
    const barDailyChart = codeBlockWrapper.createEl("canvas", { cls: "barDailyChart" });
    const doughnutTitle = codeBlockWrapper.createEl("div", { text: "Average produtivity pulse", cls: "doughnutTitle" });
    const doughnutContainer = codeBlockWrapper.createEl("div", { cls: "doughnutContainer" });
    const score = doughnutContainer.createEl("div", { cls: "score" });
    const doughnutChart = doughnutContainer.createEl("canvas", { cls: "doughnutChart" });

}

async function renderCharts(codeBlockWrapper: Element, dataAndHeaders: FetchedDataAndHeaders) {
    const barDailyChartCtx = await codeBlockWrapper.querySelector('.barDailyChart') as HTMLCanvasElement | null;
    if (!barDailyChartCtx) {
        console.error("Unable to get canvas element");
        return;
    }
    const doughnutChartCtx = (codeBlockWrapper.querySelector('.doughnutChart') as HTMLCanvasElement).getContext('2d');
    if (!doughnutChartCtx) {
        console.error("Unable to get canvas element");
        return;
    }
    const displayScore = codeBlockWrapper.querySelector('.score');

    if (dataAndHeaders.data && dataAndHeaders.data.convertedRows) {
        await renderIntervalBarChart(dataAndHeaders.data.convertedRows, Interval.DAILY, barDailyChartCtx);
        await renderDoughnutChart(dataAndHeaders.data.convertedRows, doughnutChartCtx);
        await getProductivityPulse(dataAndHeaders.data.convertedRows, displayScore)
    }
}

export function handleResponsiveDesign(codeBlockWrapper: HTMLElement) {

    // ResizeObserver sees if codeBlockWrapper width is too small
    // for having productivity chart and doughnut chart on the same line
    const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
          const width = entry.contentRect.width;
          checkWrapperSize(width);
        }
      });
      
      ro.observe(codeBlockWrapper);
      
      function checkWrapperSize(width: number) {
        if (width <= 450) {
          codeBlockWrapper.classList.add('small');
        } else {
          codeBlockWrapper.classList.remove('small');
        }
      }
}