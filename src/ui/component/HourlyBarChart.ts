import { scoreMapping, colorMapping } from "../../util/ComponentHelpers"
import { secondsToMinutes, formatTime } from "../../util/TimeHelpers"
import { Row } from "../../model/FetchedData"

import { Chart, BarController, CategoryScale, LinearScale, BarElement, PieController, ArcElement, Tooltip} from 'chart.js';
Chart.register(BarController, CategoryScale, LinearScale, BarElement, PieController, ArcElement, Tooltip);
Chart.defaults.borderColor = "#FFFFFF";
Chart.defaults.color = "#FFFFFF";

// Render hourly bar charts
// Render hourly bar charts


interface HourlyProductivityTotalsType {
    [key: number]: {
      [key: number]: number;
    }
}

function processHourlyProductivity(rows: Row[]): HourlyProductivityTotalsType {
    const hourlyProductivityTotals: HourlyProductivityTotalsType = {};
    
    // Initialize every hour with default values
    for (let i = 0; i <= 23; i++) {
        hourlyProductivityTotals[i] = {};
        [-2, -1, 0, 1, 2].forEach(score => {
            hourlyProductivityTotals[i][score] = 0;
        });
    }

    for (let record of rows) {
        let hour: number = record.date.getHours();
        let seconds: number = record.timeSpentSeconds;
        let productivityScore: number = record.productivity;
        hourlyProductivityTotals[hour][productivityScore] += seconds;
    }
    
    return hourlyProductivityTotals;
}

function filterRelevantHours(hourlyProductivityTotals: HourlyProductivityTotalsType): number[] {
    const hoursWithData = Object.keys(hourlyProductivityTotals)
        .map(Number)
        .filter(hour => Object.values(hourlyProductivityTotals[hour])
            .reduce((acc, val) => acc + val, 0) > 0) // Only keep hours with actual data
        .sort((a, b) => a - b);

    const firstHourWithData = hoursWithData[0];
    const lastHourWithData = hoursWithData[hoursWithData.length - 1];

    return Array.from({ length: (lastHourWithData - firstHourWithData + 1) }, (_, i) => i + firstHourWithData);
}

export async function renderHourlyBarChart(rows: Row[]) {
    const hourlyProductivityTotals = processHourlyProductivity(rows);
    const ctx = await document.querySelector('.barHourlyChart') as HTMLCanvasElement | null;

    if (!ctx) {
        console.error("Unable to get canvas element");
        return;
    }

    const relevantHours = filterRelevantHours(hourlyProductivityTotals);
    const labels = relevantHours.map(hour => `${hour}:00`);

    const datasets = [-2, -1, 0, 1, 2].map((score, index) => ({
        label: `Score ${score}`,
        data: labels.map(hour => secondsToMinutes(hourlyProductivityTotals[parseInt(hour)][score]) || 0),
        backgroundColor: colorMapping[score]
    }));

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets,
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        callback: value => `${value} min`
                    }
                },
                x: {
                    stacked: true,
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Hourly Productivity'
                },
                tooltip: {
                    callbacks: {
                        title: tooltipItems => {
                            const scores = [-2, -1, 0, 1, 2];
                            return scoreMapping[scores[tooltipItems[0].datasetIndex]];
                        },
                        label: context => {
                            const hour = parseInt(context.label!.split(":")[0]);
                            const score = [-2, -1, 0, 1, 2][context.datasetIndex!];
                            const secondsForScore = hourlyProductivityTotals[hour][score] || 0;
                            const totalSecondsInHour = Object.values(hourlyProductivityTotals[hour]).reduce((acc, val) => acc + val, 0);
                            const percentage = ((secondsForScore / totalSecondsInHour) * 100).toFixed(2);

                            return `${(secondsForScore / 60).toFixed(2)} min (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}