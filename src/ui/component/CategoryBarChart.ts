import { Row } from "src/model/FetchedData";
import { secondsToMinutes, formatTime } from "../../util/TimeHelpers";
import { Chart, BarController, CategoryScale, LinearScale, BarElement, PieController, ArcElement, Tooltip} from 'chart.js';
import { colorMapping } from "../../util/ComponentHelpers";
Chart.register(BarController, CategoryScale, LinearScale, BarElement, PieController, ArcElement, Tooltip);

function aggregateByCategory(rows: Row[]): { aggregatedData: Record<string, number>, categoryToProductivityScore: Record<string, number> } {
    const aggregatedData: Record<string, number> = {};
    const categoryToProductivityScore: Record<string, number> = {};

    rows.forEach(row => {

        if (row.productivity === undefined) {
            throw new Error("productivity cannot be obtained from the fetched data")
        }
        if (row.category === undefined) {
            throw new Error("category cannot be obtained from the fetched data")
        }
        const seconds = row.timeSpentSeconds;
        const category = row.category;
        const productivityScore = row.productivity;


        aggregatedData[category] = (aggregatedData[category] || 0) + seconds;
        categoryToProductivityScore[category] = productivityScore;  // Assumed constant for category
    });

    return { aggregatedData, categoryToProductivityScore };
}

function aggregateActivitiesByCategory(rows: Row[]): Record<string, string[]> {
    return rows.reduce((acc, row) => {
        if (row.activity === undefined) {
            throw new Error("activity cannot be obtained from the fetched data")
        }
        if (row.category === undefined) {
            throw new Error("category cannot be obtained from the fetched data")
        }
        const activity = row.activity;
        const category = row.category;

        acc[category] = acc[category] || [];
        if (!acc[category].includes(activity)) {
            acc[category].push(activity);
        }

        return acc;
    }, {} as Record<string, string[]>);
}

function getTopNCategories(aggregatedData: Record<string, number>, n: number): Record<string, number> {
    return Object.entries(aggregatedData)
        .map(([category, seconds]) => ({ category, seconds }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, n)
        .reduce((acc, current) => {
            acc[current.category] = current.seconds;
            return acc;
        }, {} as Record<string, number>);
}

function processCategoryLabel(category: string): string {
    if (category.startsWith("General ")) {
        category = category.replace("General ", "...");
    }

    if (category.length > 15) {
        category = category.slice(0, 15) + "...";
    }

    return category;
}

function processAndMapLabels(rawLabels: string[], processLabels: boolean): { processedLabels: string[], labelMapping: Record<string, string> } {
    const processedLabels = processLabels ? rawLabels.map(processCategoryLabel) : [...rawLabels];
    
    // Create a mapping between the processed label and the original label
    const labelMapping: Record<string, string> = {};
    rawLabels.forEach((raw, idx) => {
        labelMapping[processedLabels[idx]] = raw;
    });

    return {
        processedLabels,
        labelMapping
    };
}


/**
 * Renders a bar chart visualizing time spent by categories.
 * 
 * @param rows - The data entries to be represented.
 * @param numCategories - The number of top categories to display (default is 10).
 * @param processLabels - Whether to process category labels for display purposes (default is true).
 * 
 * The chart highlights the top N categories based on their total time spent. Each category's bar 
 * is color-coded based on its productivity score. The chart's x-axis labels can be either the 
 * raw category names or their processed versions, depending on the processLabels parameter.
 * Tooltips provide additional insights, showing the top activities within each category.
 * 
 * Note:
 * If you see the label is off, you want to manually modify labelOffset in xticks
 */
export async function renderCategoryBarChart(rows: Row[], numCategories: number = 10, processLabels: boolean = true, ctx: CanvasRenderingContext2D) {
    
    if (document.body.classList.contains("theme-dark")) {
        Chart.defaults.borderColor = "#FFFFFF";
        Chart.defaults.color = "#FFFFFF";
    } else {
        Chart.defaults.borderColor = "#000000";
        Chart.defaults.color = "#000000";
    }
    
    
    const { aggregatedData, categoryToProductivityScore } = aggregateByCategory(rows);
    const topAggregatedData = getTopNCategories(aggregatedData, numCategories);
    const totalTime = Object.values(aggregatedData).reduce((acc, curr) => acc + curr, 0);
    const activitiesByCategory = aggregateActivitiesByCategory(rows);

    const rawLabels = Object.keys(topAggregatedData);
    const { processedLabels: labels, labelMapping } = processAndMapLabels(rawLabels, processLabels);

    const data = rawLabels.map(label => secondsToMinutes(topAggregatedData[label]));
    const colors = rawLabels.map(label => colorMapping[categoryToProductivityScore[label].toString()]);

    if (ctx) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors
                }]
            },
            options: {
                indexAxis: "y",
                plugins: {
                    legend: {
                        display: false // Hide legend
                    },
                    title: {
                        display: false,
                        text: 'Category vs Time Spent'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                const processedLabel = tooltipItems[0].label as string;
                                return labelMapping[processedLabel];
                            },
                            label: function(tooltipItem: any) {
                                const originalCategory = labelMapping[tooltipItem.label as string];
                                const timeInSec = topAggregatedData[originalCategory];
                                const percentage = ((timeInSec / totalTime) * 100).toFixed(2);
                                const topActivities = activitiesByCategory[originalCategory].slice(0, 3);
                                const additionalActivities = activitiesByCategory[originalCategory].length > 3 ? '...' : '';
                            
                                let timeString = formatTime(timeInSec);
                            
                                return [
                                    `${timeString} (${percentage}%)`,
                                    ...topActivities,
                                    additionalActivities
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            autoSkip: false,
                        }
                    },
                    x: {
                        position: 'top',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value, index, values) {
                                return value + ' min';
                            }
                        }
                    },
                }
            }
        });
    }
}