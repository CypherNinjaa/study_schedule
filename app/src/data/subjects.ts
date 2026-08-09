import type { Subject, Topic } from '@/types';
import { uid } from '@/utils/misc';

interface SubjectSeed {
  code: string;
  name: string;
  teacher: string;
  credits: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  color: string;
  /** module label -> topic titles, taken from the official course curriculum */
  modules: Record<string, string[]>;
}

/**
 * Topics are seeded from the AIIT BCA-V syllabus PDFs in ../../Syllabus.
 * Campus to Corporate and Communicative French had no machine-readable
 * curriculum available, so they start with module placeholders you can edit.
 */
const SEEDS: SubjectSeed[] = [
  {
    code: 'STAT311',
    name: 'Time Series Analysis',
    teacher: 'Dr. Priyadarshni',
    credits: 5,
    difficulty: 4,
    color: '#6366f1',
    modules: {
      'Module I — Infrastructure': [
        'Introduction to R for time series analysis',
        'Python infrastructure for time series analysis',
      ],
      'Module II — Characteristics of time series data': [
        'Time series and their features',
        'Basic descriptive techniques',
        'Trends and time series decomposition',
      ],
      'Module III — Forecasting and smoothing': [
        'Smoothing techniques',
        'Moving average',
        'Exponential smoothing',
        'Introduction to linear time series models',
        'AR, MA and ARMA models',
        'ARIMA modeling',
        'SARIMA / seasonality',
        'Stationarity and autocorrelation (ACF/PACF)',
      ],
      'Module IV — Models and evaluation': [
        'Volatility models',
        'State space representation of time series',
        'Time series forecasting',
        'Residual analysis and goodness-of-fit tests',
        'Forecast accuracy and performance evaluation',
      ],
    },
  },
  {
    code: 'CSIT379',
    name: 'Data Science — An Introduction',
    teacher: 'Mr. Ranjit Choudhary',
    credits: 5,
    difficulty: 4,
    color: '#0ea5e9',
    modules: {
      'Module I — Foundations & EDA': [
        'Introduction to data science',
        'Big data and data science, big data platforms',
        'Challenges of conventional systems',
        'Nature of data, analytic processes and tools',
        'Analysis vs reporting',
        'Modern data analytic tools, Power BI and Tableau overview',
        'Multi-dimensional data, basic tools of EDA',
        'Data cleaning, integration and transformation',
        'Data reduction, discretization and concept hierarchy',
        'Data summarization and normalization',
      ],
      'Module II — Inference & features': [
        'Computer vision',
        'Time series analysis and forecasting',
        'Streaming data',
        'Statistical inference: populations and samples',
        'Statistical modeling and probability distributions',
        'Fitting a model',
        'Feature generation (role of domain expertise)',
        'Feature selection algorithms',
      ],
      'Module III — Data mining': [
        'Data preprocessing',
        'Statistical techniques, characterization and discrimination',
        'Association and market basket analysis',
        'Classification and prediction',
        'Decision trees',
        'Neural networks',
        'Bayesian classification',
        'Association rules: Apriori, FP-Tree',
        'Introduction to genetic algorithms',
        'Cluster analysis and automatic cluster detection',
        'Outlier analysis',
      ],
      'Module IV — Text & sequence models': [
        'Raw text, sourcing and normalization',
        'Tokenization and lemmatization',
        'Chunking, sentence parse and dependencies',
        'Information extraction and text classification',
        'Sentiment analysis',
        'Recurrent neural networks (LSTM)',
      ],
    },
  },
  {
    code: 'CSIT394',
    name: 'Analytical Data Visualization',
    teacher: 'Ms. Khushboo',
    credits: 5,
    difficulty: 3,
    color: '#f59e0b',
    modules: {
      'Module I — Introduction': [
        'Introduction to data analytics and data visualization',
        'Data-driven decision making',
        'Data analytics process: collection, cleaning, preparation',
        'Analysis, visualization, interpretation',
        'Introduction to visual perception',
        'Reports and dashboards',
        'Challenges and limitations',
      ],
      'Module II — EDA & tools': [
        'Introduction to exploratory data analysis',
        'Data quality assessment, missing values, duplicates',
        'Outlier detection and data cleaning techniques',
        'Data transformation',
        'Summary statistics: mean, median, mode, variance, SD',
        'Data relationships: ranking, comparison, correlation',
        'Distribution and trends',
        'Visualization tools: Excel, Tableau, Power BI',
        'Python: Matplotlib and Seaborn overview',
        'Importing and preparing data in Power BI',
      ],
      'Module III — Visualization design': [
        'Principles of effective visualization',
        'Choosing appropriate charts',
        'Visual encoding and colour theory',
        'Dashboard design principles',
        'Interactive dashboards and KPI design',
        'Data storytelling and dashboard layout',
        'Filters, slicers, drill-down, drill-through',
        'Ethical data visualization and misleading graphs',
        'Data privacy and responsible data usage',
        'Evaluation of visualization quality',
      ],
      'Module IV — Analytics applications': [
        'Analytical thinking and business intelligence concepts',
        'KPI analysis',
        'Sales, customer and education analytics',
        'Healthcare and financial analytics',
        'Interactive dashboard development using Power BI',
        'Dashboard publishing',
        'Interpretation of insights',
        'Presentation of analytical reports',
        'Mini project',
      ],
    },
  },
  {
    code: 'QAM303',
    name: 'Computational Quantitative Techniques',
    teacher: 'Mr. Suman Kumar Mishra',
    credits: 2,
    difficulty: 3,
    color: '#10b981',
    modules: {
      'Module I — Number system': [
        'Number system',
        'HCF and LCM of numbers',
        'Decimal fractions',
        'Simplification',
        'Square roots and cube roots',
        'Problems on numbers',
      ],
      'Module II — Applied arithmetic & algebra': [
        'Average',
        'Problems on ages',
        'Surds and indices',
        'Logarithms',
        'Percentage',
        'Chain rule',
      ],
      'Module III — Business & speed mathematics': [
        'Profit and loss',
        'Ratio and proportion',
        'Partnership problems',
        'Pipes and cisterns',
        'Time and work',
        'Time and distance',
        'Boats and streams',
        'Problems on trains',
      ],
      'Module IV — Advanced concepts': [
        'Simple interest',
        'Compound interest',
        'Area',
        'Volume and surface area',
        'Calendar',
        'Clocks',
        'Permutations and combinations',
        'Probability (basic)',
      ],
    },
  },
  {
    code: 'BC308',
    name: 'Campus to Corporate',
    teacher: 'Dr. Abhijeet Ghosh',
    credits: 2,
    difficulty: 2,
    color: '#a855f7',
    modules: {
      'Module I': ['Add topics from your course handout'],
      'Module II': ['Add topics from your course handout'],
      'Module III': ['Add topics from your course handout'],
      'Module IV': ['Add topics from your course handout'],
    },
  },
  {
    code: 'FREN316',
    name: 'Communicative French',
    teacher: 'Dr. Sushant Kumar Dubey',
    credits: 2,
    difficulty: 2,
    color: '#ec4899',
    modules: {
      'Module I': ['Add topics from your course handout'],
      'Module II': ['Add topics from your course handout'],
      'Module III': ['Add topics from your course handout'],
      'Module IV': ['Add topics from your course handout'],
    },
  },
];

/** Stable subject ids so the seeded timetable can reference them. */
export const SUBJECT_IDS: Record<string, string> = {
  STAT311: 'subj_stat311',
  CSIT379: 'subj_csit379',
  CSIT394: 'subj_csit394',
  QAM303: 'subj_qam303',
  BC308: 'subj_bc308',
  FREN316: 'subj_fren316',
};

export function buildSeedSubjects(): Subject[] {
  return SEEDS.map((seed) => {
    const topics: Topic[] = [];
    for (const [moduleName, titles] of Object.entries(seed.modules)) {
      for (const title of titles) {
        topics.push({ id: uid('top'), title, module: moduleName, done: false });
      }
    }
    // 5-credit subjects get a heavier semester target than 2-credit ones.
    const targetMinutes = seed.credits >= 5 ? 60 * 60 : 30 * 60;
    return {
      id: SUBJECT_IDS[seed.code] ?? uid('subj'),
      code: seed.code,
      name: seed.name,
      teacher: seed.teacher,
      credits: seed.credits,
      difficulty: seed.difficulty,
      targetMinutes,
      color: seed.color,
      topics,
      assignments: [],
      examDate: null,
      notes: '',
      archived: false,
    };
  });
}
