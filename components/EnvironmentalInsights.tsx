
import React from 'react';
import type { AirQualityResponse, SolarPotentialResponse, PollenResponse } from '../types';

interface EnvironmentalInsightsProps {
    data: {
        air: AirQualityResponse;
        solar: SolarPotentialResponse;
        pollen: PollenResponse;
    } | null;
    isLoading: boolean;
    error: string | null;
}

const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="loading-animation w-10 h-10 border-4 border-gray-200 dark:border-gray-600 border-solid rounded-full"></div>
        <p className="mt-4 text-gray-700 dark:text-gray-300 font-medium">Fetching environmental data...</p>
    </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="p-8 text-center bg-red-50 border border-red-300 text-red-700 rounded-lg">
        <p className="font-bold">Could not load environmental data.</p>
        <p className="text-sm">{message}</p>
    </div>
);

const getEpaAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-green-500';
    if (aqi <= 100) return 'text-yellow-500';
    if (aqi <= 150) return 'text-orange-500';
    if (aqi <= 200) return 'text-red-500';
    if (aqi <= 300) return 'text-purple-500';
    return 'text-pink-700';
};

const getUaqiColor = (aqi: number) => {
    // UAQI (Universal Air Quality Index) matches 0 (Poor) to 100 (Excellent)
    if (aqi >= 80) return 'text-green-500'; // Excellent
    if (aqi >= 60) return 'text-lime-500'; // Good
    if (aqi >= 40) return 'text-yellow-500'; // Moderate
    if (aqi >= 20) return 'text-orange-500'; // Low
    return 'text-red-500'; // Poor
};

const AirQualityCard: React.FC<{ data?: AirQualityResponse }> = ({ data }) => {
    // Prioritize indices to match Google Maps behavior:
    // 1. USA EPA (code: usa_epa)
    // 2. Any index named "National Air Quality Index"
    // 3. Any non-UAQI index
    // 4. Fallback to UAQI
    const aqiIndex = data?.indexes?.find(i => i.code === 'usa_epa') || 
                     data?.indexes?.find(i => i.displayName?.includes('National Air Quality Index')) ||
                     data?.indexes?.find(i => i.code && i.code !== 'uaqi') || 
                     data?.indexes?.find(i => i.code === 'uaqi') || 
                     data?.indexes?.find(i => i.displayName?.includes('Universal')) ||
                     data?.indexes?.[0];
    
    if (!aqiIndex) return <p className="text-sm text-center text-gray-500 dark:text-gray-400">Air quality data not available.</p>;

    const aqi = aqiIndex.aqi;
    const isUaqi = aqiIndex.code === 'uaqi' || aqiIndex.displayName?.includes('Universal');
    const colorClass = isUaqi ? getUaqiColor(aqi) : getEpaAqiColor(aqi);
    
    // For EPA, max usually considered around 300-500. For UAQI, max is 100.
    const maxVal = isUaqi ? 100 : 300;

    return (
        <div className="text-center">
            <div className={`relative w-32 h-32 mx-auto flex items-center justify-center text-4xl font-extrabold ${colorClass}`}>
                <svg className="absolute w-full h-full" viewBox="0 0 36 36">
                    <path className="text-gray-200 dark:text-gray-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className={colorClass} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${Math.min((aqi / maxVal) * 100, 100)}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                </svg>
                {aqi}
            </div>
            <p className={`mt-2 text-lg font-bold ${colorClass}`}>{aqiIndex.category}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {aqiIndex.displayName || (isUaqi ? 'Universal AQI' : 'National Air Quality Index')}
            </p>
             <p className="text-xs text-gray-500 dark:text-gray-400">
                {aqiIndex.dominantPollutant && `Dominant: ${aqiIndex.dominantPollutant}`}
            </p>
        </div>
    );
};

const SolarPotentialCard: React.FC<{ data?: SolarPotentialResponse }> = ({ data }) => {
    const analysis = data?.solarPotential?.financialAnalyses?.[0];
    if (!analysis) return <p className="text-sm text-center text-gray-500 dark:text-gray-400">Solar potential data not available.</p>;

    const savings = analysis.financialDetails.savings;
    const formatNanos = (n: { units: string, nanos: number }) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseInt(n.units, 10) + n.nanos / 1e9);

    return (
        <div className="space-y-4">
            <div className="text-center">
                <p className="text-3xl font-bold text-yellow-500">{formatNanos(savings.savingsYear1)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Savings (First Year)</p>
            </div>
             <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{formatNanos(savings.savingsYear20)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Savings (20 Years)</p>
            </div>
            <div className="text-center">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{(data.solarPotential.carbonOffsetFactorKgPerMwh * analysis.panelConfig.yearlyEnergyDcKwh / 1000).toFixed(1)} metric tons</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Carbon Offset Equivalent (20 years)</p>
            </div>
        </div>
    );
};

const PollenInfoCard: React.FC<{ data?: PollenResponse }> = ({ data }) => {
    const todayInfo = data?.dailyInfo?.[0]?.pollenTypeInfo;
    if (!todayInfo) return <p className="text-sm text-center text-gray-500 dark:text-gray-400">Pollen data not available.</p>;

    const activePollen = todayInfo.filter(p => p.inSeason && p.indexInfo && p.indexInfo.value > 0);

    return (
        <div>
            {activePollen.length > 0 ? (
                <ul className="space-y-2">
                    {activePollen.map(pollen => (
                        <li key={pollen.code} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{pollen.displayName}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-sm">{pollen.indexInfo?.category}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">No significant pollen levels today.</p>
            )}
        </div>
    );
};

const EnvironmentalInsights: React.FC<EnvironmentalInsightsProps> = ({ data, isLoading, error }) => {
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState message={error} />;
    if (!data) return <p>No environmental data available for this location.</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="text-xl font-bold text-center mb-4 text-gray-800 dark:text-gray-200"><i className="fa-solid fa-wind mr-2 text-blue-500"></i>Air Quality</h4>
                <AirQualityCard data={data.air} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="text-xl font-bold text-center mb-4 text-gray-800 dark:text-gray-200"><i className="fa-solid fa-solar-panel mr-2 text-yellow-500"></i>Solar Potential</h4>
                <SolarPotentialCard data={data.solar} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="text-xl font-bold text-center mb-4 text-gray-800 dark:text-gray-200"><i className="fa-solid fa-seedling mr-2 text-green-500"></i>Pollen Levels</h4>
                <PollenInfoCard data={data.pollen} />
            </div>
        </div>
    );
};

export default EnvironmentalInsights;
