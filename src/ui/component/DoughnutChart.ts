import { Row } from "src/model/FetchedData";
import { colorMapping, scoreMapping } from "../../util/ComponentHelpers";

import { Chart, BarController, CategoryScale, LinearScale, BarElement, PieController, ArcElement, Tooltip} from 'chart.js';
Chart.register(BarController, CategoryScale, LinearScale, BarElement, PieController, ArcElement, Tooltip);
function aggregateByProductivityScore(rows: Row[]): { [score: number]: number } {
    return rows.reduce((acc, row) => {
        if (row.productivity === undefined) {
            throw new Error("productivity cannot be obtained from the fetched data")
        }
        const timeSpent = row.timeSpentSeconds;
        const productivityScore = row.productivity;
        if (!acc[productivityScore]) {
            acc[productivityScore] = 0;
        }
        acc[productivityScore] += timeSpent;
        return acc;
    }, {} as { [score: number]: number });
}

export async function renderDoughnutChart(rows: any[], ctx: CanvasRenderingContext2D) {

    if (document.body.classList.contains("theme-dark")) {
        Chart.defaults.borderColor = "#FFFFFF";
        Chart.defaults.color = "#FFFFFF";
    } else {
        Chart.defaults.borderColor = "#000000";
        Chart.defaults.color = "#000000";
    }


    const aggregatedData = aggregateByProductivityScore(rows);
    const labels = Object.keys(aggregatedData).map(label => parseInt(label)).sort((a, b) => a - b);
    const data = labels.map(label => aggregatedData[label]);
    const backgroundColors = labels.map(label => colorMapping[label]);

    if (ctx) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                responsive: true,
                cutout: "60%",
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                if (context[0] && context[0].chart && context[0].chart.data && Array.isArray(context[0].chart.data.labels)) {
                                    const score = context[0].chart.data.labels[context[0].dataIndex] as number;
                                    return scoreMapping[score];
                                }
                                return '';
                            },
                            label: function(context) {
                                const value: number = context.dataset.data[context.dataIndex];
                                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                            
                                // Convert value into hours, minutes, and seconds.
                                const hours = Math.floor(value / 3600);
                                const minutes = Math.floor((value % 3600) / 60);
                                const seconds = value % 60;
                            
                                // Construct the time string based on your conditions.
                                let timeString = "";
                                if (hours > 0) timeString += hours + ":";
                                if (minutes > 0 || hours > 0) timeString += minutes.toString().padStart(2, '0') + ":";
                                timeString += seconds.toString().padStart(2, '0');
                            
                                return `${timeString} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        console.error("Unable to get 2D context from canvas");
    }
}