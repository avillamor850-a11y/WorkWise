import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ChartBarIcon,
    CurrencyDollarIcon,
    ClipboardDocumentListIcon,
    StarIcon,
    BriefcaseIcon,
    ArrowTrendingUpIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    CalendarDaysIcon,
    ClockIcon,
    TrophyIcon,
    EyeIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function FreelancerDashboard({ overview, monthly_earnings, recent_projects, skills_performance }) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Use real overview data; only fall back for null/undefined (so 0 from DB is shown as 0)
    const totalEarnings = overview?.total_earnings ?? 0;
    const completedProjects = overview?.completed_projects ?? 0;
    const activeProjects = overview?.active_projects ?? 0;
    const averageRating = overview?.average_rating ?? 0;
    const bidSuccessRate = overview?.bid_success_rate ?? 0;

    const projectStatusData = [
        { name: 'Completed', value: completedProjects, color: '#10B981' },
        { name: 'In Progress', value: activeProjects, color: '#3B82F6' },
        { name: 'Pending', value: 0, color: '#F59E0B' }
    ];

    const weeklyActivity = [
        { day: 'Mon', hours: 8, projects: 2 },
        { day: 'Tue', hours: 6, projects: 1 },
        { day: 'Wed', hours: 9, projects: 3 },
        { day: 'Thu', hours: 7, projects: 2 },
        { day: 'Fri', hours: 8, projects: 2 },
        { day: 'Sat', hours: 4, projects: 1 },
        { day: 'Sun', hours: 2, projects: 0 }
    ];

    const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle, trendValue }) => {
        const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            green: 'from-green-500 to-green-600',
            yellow: 'from-yellow-500 to-yellow-600',
            purple: 'from-purple-500 to-purple-600',
            indigo: 'from-indigo-500 to-indigo-600',
            red: 'from-red-500 to-red-600'
        };

        return (
            <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
                                <div className="text-2xl font-bold text-gray-900">{value}</div>
                                {subtitle && (
                                    <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
                                )}
                            </div>
                        </div>
                        {trend && (
                            <div className={`flex items-center text-sm font-medium ${
                                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                                {trend === 'up' && <ArrowUpIcon className="w-4 h-4 mr-1" />}
                                {trend === 'down' && <ArrowDownIcon className="w-4 h-4 mr-1" />}
                                {trendValue}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            Analytics Dashboard
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Track your freelance performance and earnings
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Link
                            href="/analytics/detailed"
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 inline-flex items-center"
                        >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            Detailed Reports
                        </Link>
                        <button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 inline-flex items-center">
                            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                            Export PDF
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Analytics Dashboard" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative py-8 bg-white overflow-hidden">
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                <div className="relative z-20 mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-8">
                    
                    {/* Performance Summary Banner */}
                    <div className="overflow-hidden bg-gradient-to-r from-green-600 to-green-700 shadow-lg sm:rounded-xl">
                        <div className="p-8 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">
                                        Your Performance This Month
                                    </h3>
                                    <p className="text-green-100 text-lg">
                                        {totalEarnings > 0
                                            ? `You've earned ${formatCurrency(totalEarnings)} with a ${bidSuccessRate}% success rate`
                                            : "You haven't earned yet. Complete jobs to see your performance here."}
                                    </p>
                                </div>
                                <div className="hidden md:block">
                                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                                        <TrophyIcon className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                <div className="bg-white/20 rounded-lg p-4">
                                    <div className="text-2xl font-bold">{completedProjects}</div>
                                    <div className="text-green-100">Projects Completed</div>
                                </div>
                                <div className="bg-white/20 rounded-lg p-4">
                                    <div className="text-2xl font-bold">{averageRating}/5</div>
                                    <div className="text-green-100">Average Rating</div>
                                </div>
                                <div className="bg-white/20 rounded-lg p-4">
                                    <div className="text-2xl font-bold">{activeProjects}</div>
                                    <div className="text-green-100">Active Projects</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Performance Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <StatCard
                            title="Total Earnings"
                            value={formatCurrency(totalEarnings)}
                            icon={CurrencyDollarIcon}
                            color="green"
                            trend={totalEarnings > 0 ? 'up' : null}
                            trendValue={totalEarnings > 0 ? '+12%' : null}
                        />
                        <StatCard
                            title="Completed Projects"
                            value={completedProjects}
                            icon={ClipboardDocumentListIcon}
                            color="blue"
                            trend={completedProjects > 0 ? 'up' : null}
                            trendValue={completedProjects > 0 ? '+3' : null}
                        />
                        <StatCard
                            title="Average Rating"
                            value={`${averageRating}/5`}
                            icon={StarIcon}
                            color="yellow"
                            trend={averageRating > 0 ? 'up' : null}
                            trendValue={averageRating > 0 ? '+0.2' : null}
                        />
                        <StatCard
                            title="Active Projects"
                            value={activeProjects}
                            icon={BriefcaseIcon}
                            color="purple"
                            subtitle="In progress"
                        />
                        <StatCard
                            title="Success Rate"
                            value={`${bidSuccessRate}%`}
                            icon={ArrowTrendingUpIcon}
                            color="indigo"
                            trend={bidSuccessRate > 0 ? 'up' : null}
                            trendValue={bidSuccessRate > 0 ? '+5%' : null}
                        />
                    </div>

                    {/* Main Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Earnings Chart - Takes 2 columns */}
                        <div className="lg:col-span-2">
                            <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Monthly Earnings Trend</h3>
                                        <div className="flex space-x-2">
                                            <button className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">6M</button>
                                            <button className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">1Y</button>
                                        </div>
                                    </div>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={monthly_earnings}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="period" 
                                                    tick={{ fontSize: 12 }}
                                                    stroke="#6b7280"
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 12 }}
                                                    stroke="#6b7280"
                                                />
                                                <Tooltip 
                                                    formatter={(value) => [formatCurrency(value), 'Earnings']}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="earnings" 
                                                    stroke="#10B981" 
                                                    strokeWidth={3}
                                                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                                                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Project Status Pie Chart */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Status</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={projectStatusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {projectStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        {projectStatusData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div 
                                                        className="w-3 h-3 rounded-full mr-2" 
                                                        style={{ backgroundColor: item.color }}
                                                    ></div>
                                                    <span className="text-sm text-gray-600">{item.name}</span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skills Performance and Recent Projects */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Skills Performance */}
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Top Earning Skills</h3>
                                    <Link
                                        href="/analytics/skills"
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        View All
                                    </Link>
                                </div>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={skills_performance} margin={{ bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis 
                                                dataKey="skill" 
                                                angle={-45} 
                                                textAnchor="end" 
                                                height={80}
                                                tick={{ fontSize: 11 }}
                                                stroke="#6b7280"
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 12 }}
                                                stroke="#6b7280"
                                            />
                                            <Tooltip 
                                                formatter={(value) => [formatCurrency(value), 'Earnings']}
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                            />
                                            <Bar 
                                                dataKey="earnings" 
                                                fill="#3B82F6"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Recent Projects */}
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
                                    <Link
                                        href="/projects"
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        View All
                                    </Link>
                                </div>
                                <div className="space-y-4 max-h-80 overflow-y-auto">
                                    {recent_projects && recent_projects.length > 0 ? (
                                        recent_projects.map((project) => (
                                            <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-medium text-gray-900 text-sm">
                                                        {project.job?.title || 'Untitled Project'}
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {project.status?.replace('_', ' ') || 'Active'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-2">
                                                    Client: {project.client?.first_name} {project.client?.last_name}
                                                </p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-green-600">
                                                        {formatCurrency(project.agreed_amount ?? project.amount ?? 0)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recent'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <BriefcaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500">No recent projects found</p>
                                            <Link
                                                href="/jobs"
                                                className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
                                            >
                                                Browse Available Jobs
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Activity Overview */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Weekly Activity</h3>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                        Hours Worked
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                        Projects
                                    </div>
                                </div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyActivity}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis 
                                            dataKey="day" 
                                            tick={{ fontSize: 12 }}
                                            stroke="#6b7280"
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 12 }}
                                            stroke="#6b7280"
                                        />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Bar dataKey="hours" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="projects" fill="#10B981" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                body {
                    background: white;
                    color: #333;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
