import {Row} from "../../model/FetchedData"

interface AccumulatorType {
    productivityPulseSum: number;
    timeSum: number;
}


export function calculateProductivityPulsesBy5MinInterval(rows: Row[]): Map<string, number | null> {
    const productivityPulsesBy5MinInterval: Map<string, number | null> = new Map();

    const endTime = rows[rows.length - 1].date;
    const startTime = rows[0].date;

    let intervalStartTime = new Date(startTime);
    
    // Cumulative values
    let cumulativeProductivity = 0;
    let cumulativeTime = 0;

    while (intervalStartTime <= endTime) {
        const intervalEndTime = new Date(intervalStartTime.getTime() + 5 * 60 * 1000);
        // Adjusted filtering logic here
        let intervalRows;
        if (+intervalStartTime === +startTime) {
            intervalRows = rows.filter(row => row.date < intervalEndTime);
        } else {
            intervalRows = rows.filter(row => row.date >= intervalStartTime && row.date < intervalEndTime);
        }

        // Calculate productivity pulse for the interval
        const { productivityPulse, timeSum } = calculateProductivityPulse(intervalRows);

        if (cumulativeTime + timeSum === 0) {
            cumulativeProductivity = 0;
        } else {
            // Calculate weighted average
            cumulativeProductivity = (cumulativeProductivity * cumulativeTime + productivityPulse * timeSum) / (cumulativeTime + timeSum);
        }
        // Calculate weighted average
        cumulativeTime += timeSum;
        if (timeSum === 0) {
            productivityPulsesBy5MinInterval.set(intervalStartTime.toISOString(), null);
        } else {
            productivityPulsesBy5MinInterval.set(intervalStartTime.toISOString(), cumulativeProductivity);
        }

        intervalStartTime = intervalEndTime;
    }

    return productivityPulsesBy5MinInterval;
}

export function calculateProductivityPulse(rows: Row[]): { productivityPulse: number, timeSum: number } {
    const totalScoreAndTime: AccumulatorType = rows.reduce((accumulator: AccumulatorType, entry: Row) => {
        accumulator.productivityPulseSum += (entry.productivity + 2) * entry.timeSpentSeconds;
        accumulator.timeSum += entry.timeSpentSeconds;
        return accumulator;
    }, {productivityPulseSum: 0, timeSum: 0});

    const productivityPulse: number = totalScoreAndTime.timeSum !== 0 
    ? 100 * totalScoreAndTime.productivityPulseSum / (totalScoreAndTime.timeSum * 4) 
    : 0;

    
    return {
        productivityPulse,
        timeSum: totalScoreAndTime.timeSum
    };
}


export function setDisplayScore(productivityPulse: number) {
    const displayScore = document.querySelector('.score');
    if (displayScore) {
        displayScore.textContent = String(Math.round(productivityPulse));
    }
}

// If you want to use both functions together:
export async function getProductivityPulse(rows: Row[]) {
    const {productivityPulse, } = calculateProductivityPulse(rows);
    setDisplayScore(productivityPulse);
}

