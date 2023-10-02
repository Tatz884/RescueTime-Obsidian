import { scoreMapping, colorMapping } from "../../util/ComponentHelpers"
import { secondsToMinutes, formatTime } from "../../util/TimeHelpers"
import { Row } from "../../model/FetchedData"
import { formatDateLabel, secondsToHours } from "../../util/TimeHelpers"
import { Interval } from "../../model/ChartSetting"
import { calculateProductivityPulse } from "./ProductivityPulse"

import { Chart, registerables} from 'chart.js';
Chart.register(...registerables);

interface Dataset {
    type?: 'bar' | 'line'; // The '?' makes this property optional.
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
    pointBackgroundColor?: string;
    pointBorderColor?: string;
    yAxisID?: string;
    order: number;
}
  
interface ProductivityTotalsType {
    [key: string]: { // The key can now be string representation of either hour or date.
      [key: number]: number;
    }
}

async function processProductivityAndPulse(rows: Row[], interval: Interval): Promise<{ totals: ProductivityTotalsType; pulses: { [key: string]: number } }> {
    const productivityTotals: ProductivityTotalsType = {};
    const productivityPulses: {[key: string]: number} = {};

    for (let record of rows) {
        if (record.productivity === undefined) {
            throw new Error("productivity cannot be obtained from the fetched data");
        }

        let key: string;
        if (interval === Interval.HOURLY) {
            key = `${String(record.date.getHours()).padStart(2, '0')}:${String(record.date.getMinutes()).padStart(2, '0')}`;
        } else {
            key = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}-${String(record.date.getDate()).padStart(2, '0')}`;
        }

        let seconds: number = record.timeSpentSeconds;
        let productivityScore: number = record.productivity;

        if (!productivityTotals[key]) {
            productivityTotals[key] = {};
            [-2, -1, 0, 1, 2].forEach(score => {
                productivityTotals[key][score] = 0;
            });
        }

        productivityTotals[key][productivityScore] += seconds;
    }

    // Calculate productivity pulse for each interval
    for (let key in productivityTotals) {
        const intervalRows = rows.filter(row => {
            if (interval === Interval.HOURLY) {
                return `${String(row.date.getHours()).padStart(2, '0')}:${String(row.date.getMinutes()).padStart(2, '0')}` === key;
            } else {
                return `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}` === key;
            }
        });
        const pulseData = await calculateProductivityPulse(intervalRows);
        productivityPulses[key] = pulseData.productivityPulse;
    }

    return {totals: productivityTotals, pulses: productivityPulses};
}


function filterRelevantKeys(productivityTotals: ProductivityTotalsType): string[] {
    return Object.keys(productivityTotals)
        .filter(key => Object.values(productivityTotals[key])
            .reduce((acc, val) => acc + val, 0) > 0) // Only keep keys with actual data
        .sort();
}


export async function renderIntervalBarChart(rows: Row[], interval: Interval, ctx: HTMLCanvasElement) {
    if (document.body.classList.contains("theme-dark")) {
        Chart.defaults.borderColor = "#FFFFFF";
        Chart.defaults.color = "#FFFFFF";
    } else {
        Chart.defaults.borderColor = "#000000";
        Chart.defaults.color = "#000000";
    }

    const processedData = await processProductivityAndPulse(rows, interval);
    const productivityTotals = processedData.totals;
    const productivityPulses = processedData.pulses;

    if (!ctx) {
        console.error("Unable to get canvas element");
        return;
    }

    const relevantKeys = filterRelevantKeys(productivityTotals);
    const { labels, originalIntervals, formattedToOriginalDayMapping } = buildLabelsAndMapping(interval, relevantKeys);

    


    let datasets: Dataset[] = [-2, -1, 0, 1, 2].map((score, index) => {
        let data;
        if (interval === Interval.HOURLY) {
            data = labels.map(hour => secondsToMinutes(productivityTotals[hour][score]) || 0);
        } else {
            data = originalIntervals.map(day => secondsToHours(productivityTotals[day][score]) || 0);
        }

        return {
            label: `Score ${score}`,
            data,
            backgroundColor: colorMapping[score],
            order: 1
        };
    });

    let lineData;
    if (interval === Interval.HOURLY) {
        lineData = labels.map(label => productivityPulses[label] || 0)
    } else if (interval === Interval.DAILY) {
        lineData = originalIntervals.map(label => productivityPulses[label] || 0)
    } else {
        lineData = originalIntervals.map(label => productivityPulses[label] || 0)
    }

    const lineColor = '#00CC66'
    datasets.push({
        type: 'line',
        label: 'Productivity Pulse',
        data: lineData,
        fill: false,
        borderColor: lineColor,
        pointBackgroundColor: lineColor,
        pointBorderColor: lineColor,
        yAxisID: 'pulseAxis',
        order: 0
    });

    return createChart(ctx, interval, labels, datasets, formattedToOriginalDayMapping, productivityTotals);
}

function buildLabelsAndMapping(interval: Interval, relevantKeys: string[]) {
    let labels: string[] = [];
    let formattedToOriginalDayMapping: { [formattedDay: string]: string } = {};
    let originalIntervals = relevantKeys;

    if (interval === Interval.HOURLY) {
        labels = relevantKeys.map(hour => `${hour}`);
    } else if (interval === Interval.DAILY) {
        labels = relevantKeys.map(day => formatDateLabel(day));
        // Create a mapping between formatted day and the original day
        originalIntervals.forEach(day => {
            formattedToOriginalDayMapping[formatDateLabel(day)] = day;
        });
    }

    return { labels, originalIntervals, formattedToOriginalDayMapping };
}

function createChart(ctx: any, interval: Interval, labels: string[], datasets: any, formattedToOriginalDayMapping: any, productivityTotals: ProductivityTotalsType) {
    return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            maintainAspectRatio: true,
            scales: {
                y: { // scale for the stacked bar
                    position: 'right',
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        callback: function(value, index) {
                            if (value === this.min || value === this.max) {
                                return interval === Interval.HOURLY ? `${value} min` : `${value} hr`;
                            } else {
                                return '';
                            }
                        }
                    },                    
                    grid: { 
                        display: false,
                    },
                },
                pulseAxis: { // scale for the line
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        callback: value => value
                    },
                    
                    suggestedMax: 100,
                    suggestedMin: 0,
                    
                },
                x: {
                    stacked: true,
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false,
                    text: 'Interval Productivity'
                },
                tooltip: {
                    callbacks: {
                        title: tooltipItems => scoreMapping[[-2, -1, 0, 1, 2][tooltipItems[0].datasetIndex]],
                        label: context => {
                            //@ts-ignore
                            if (context.dataset.type === 'line') {
                                return context.formattedValue
                            } else { // stacked bar chart
                                const score = [-2, -1, 0, 1, 2][context.datasetIndex!];
                                let formattedLabel = context.label!;
                                let label = formattedLabel;
                                let yunitsForScore, yunit;
                                if (interval === Interval.HOURLY) {
                                    yunit = "min";
                                    yunitsForScore = productivityTotals[label][score] / 60 || 0;
                                } else if (interval === Interval.DAILY) {
                                    label = formattedToOriginalDayMapping[formattedLabel];
                                    yunit = "hr";
                                    yunitsForScore = productivityTotals[label][score] / 3600 || 0;
                                } else {
                                    label = formattedToOriginalDayMapping[formattedLabel];
                                    yunit = "hr";
                                    yunitsForScore = productivityTotals[label][score] / 3600 || 0;
                                    console.error("Unexpected interval - notify the developer if you see this message")
                                }

                                const totalSecondsInInterval = Object.values(productivityTotals[label]).reduce((acc, val) => acc + val, 0);
                                const percentage = ((productivityTotals[label][score] / totalSecondsInInterval) * 100).toFixed(2);

                                return `${yunitsForScore.toFixed(2)} ${yunit} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        }
    });
}
