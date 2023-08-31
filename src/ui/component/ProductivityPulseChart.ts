import { calculateProductivityPulsesBy5MinInterval } from './ProductivityPulse'; // Adjust the path as needed
import { Row } from '../../model/FetchedData';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns'; 
import { enUS } from 'date-fns/locale';
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, TimeScale );


export function renderProductivityPulseChart(rows: Row[]) {
    const pulsesByInterval = calculateProductivityPulsesBy5MinInterval(rows);

    

    // Extract data for the Chart.js format
    const labels: string[] = Array.from(pulsesByInterval.keys());
    const data: (number | null)[] = Array.from(pulsesByInterval.values());

    function interpolateColor(color1: string, color2: string, factor: number): string {
        const dec1 = parseInt(color1.substring(1), 16);
        const dec2 = parseInt(color2.substring(1), 16);
        const r1 = dec1 >> 16;
        const g1 = dec1 >> 8 & 0xFF;
        const b1 = dec1 & 0xFF;
        const r2 = dec2 >> 16;
        const g2 = dec2 >> 8 & 0xFF;
        const b2 = dec2 & 0xFF;
        
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }
    
    function getInterpolatedColor(value: number): string {
        if (value <= 25) {
            return interpolateColor("#d61800", "#dc685a", value / 25);
        } else if (value <= 50) {
            return interpolateColor("#dc685a", "#cedcdf", (value - 25) / 25);
        } else if (value <= 75) {
            return interpolateColor("#cedcdf", "#3d80e0", (value - 50) / 25);
        } else {
            return interpolateColor("#3d80e0", "#0055c4", (value - 75) / 25);
        }
    }

    function getYColor(value: number | null): string {
        if (!value) return "#0055c4"; // Default for null values
        if (value >= 100) return "#0055c4";
        if (value >= 75) return "#3d80e0";
        if (value >= 50) return "#cedcdf";
        if (value >= 25) return "#dc685a";
        return "#d61800";
    }
    
    function createGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
        const gradient: CanvasGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);

        gradient.addColorStop(0, getYColor(100));    // corresponds to 0%
        gradient.addColorStop(0.25, getYColor(75));  // corresponds to 25%
        gradient.addColorStop(0.5, getYColor(50));   // corresponds to 50%
        gradient.addColorStop(0.75, getYColor(25));  // corresponds to 75%
        gradient.addColorStop(1, getYColor(0));      // corresponds to 100%

        console.log({"gradient": gradient})
        return gradient;
    }
    

    const ctx = (document.querySelector('.productivityChart') as HTMLCanvasElement).getContext('2d');

    if (!ctx) throw new Error('Unable to get canvas rendering context.');

    const gradient: CanvasGradient = createGradient(ctx);


    // Create the Chart
    
    if (ctx) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Productivity Pulse',
                    borderColor: gradient,
                    data: data,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                spanGaps: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'hh:mm'
                            }
                        },
                        adapters: { 
                            date: {
                              locale: enUS, 
                            },
                          }, 
                    },
                    y: {
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8,
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            labelColor: function(tooltipItem) {
                                const value = Number(tooltipItem.formattedValue);
                                console.log(value);
                                const color = getInterpolatedColor(value);
                                return {
                                    borderColor: color,
                                    backgroundColor: color
                                };
                            }
                        }
                    }
                    
                }
            }
        })
    }
}