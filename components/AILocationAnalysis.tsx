import React from 'react';

interface DetailedAnalysis {
    locationQuality: string;
    amenityDensity: string;
    lifestyleFactors: string;
    notableFeatures: string;
    recommendations: string;
}

interface Analysis {
    overview: string;
    detailedAnalysis: DetailedAnalysis;
    summary: string;
}

const DetailItem: React.FC<{ icon: string; title: string; content: string }> = ({ icon, title, content }) => (
    <div>
        <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center text-md">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/50 mr-3">
                <i className={`fa-solid ${icon} text-blue-600 dark:text-blue-400`}></i>
            </span>
            {title}
        </h5>
        <p className="text-sm text-gray-600 dark:text-gray-400 pl-11">{content}</p>
    </div>
);


const AILocationAnalysis: React.FC<{ analysis: Analysis | null }> = ({ analysis }) => {
    return (
        <div>
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">AI-Powered Location Insights</h3>
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-8">
                {analysis ? (
                    <>
                        <div>
                            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3"><i className="fa-solid fa-map-pin text-blue-500"></i>Location Overview</h4>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-2">{analysis.overview}</p>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3"><i className="fa-solid fa-magnifying-glass-chart text-blue-500"></i>Detailed Analysis</h4>
                            <div className="space-y-6 pt-2">
                               <DetailItem icon="fa-star" title="Location Quality" content={analysis.detailedAnalysis.locationQuality} />
                               <DetailItem icon="fa-store" title="Amenity Density" content={analysis.detailedAnalysis.amenityDensity} />
                               <DetailItem icon="fa-person-running" title="Lifestyle Factors" content={analysis.detailedAnalysis.lifestyleFactors} />
                               <DetailItem icon="fa-lightbulb" title="Notable Features" content={analysis.detailedAnalysis.notableFeatures} />
                               <DetailItem icon="fa-users" title="Recommendations" content={analysis.detailedAnalysis.recommendations} />
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3"><i className="fa-solid fa-clipboard-check text-blue-500"></i>Final Summary</h4>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-2">{analysis.summary}</p>
                        </div>
                    </>
                ) : <p>No analysis available.</p>}
            </div>
        </div>
    );
};

export default AILocationAnalysis;