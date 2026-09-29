// Example system. It demonstrates the real workflows from the brief:
// Finance job search chain, a 10h VIRORA allocation split, and an overloaded week.

import { emptyData, defaultResources, AREA_COLORS, SCHEMA_VERSION } from './schema.js';
import { today, addDays, weekStart } from './util.js';

export function exampleData() {
  const t = today();
  const d = (n) => addDays(t, n);
  const data = emptyData();
  data.schemaVersion = SCHEMA_VERSION;
  data.meta.onboardedAt = new Date().toISOString();
  data.meta.lastReviewAt = new Date(Date.now() - 8 * 86400000).toISOString();
  data.mission = {
    id: 'mission', type: 'mission', title: 'Life',
    statement: 'Build a stable, self-directed life through Finance, technology and systems thinking.',
    vision: 'A Finance career with a technical edge, a real product in VIRORA, financial stability, and a sustainable pace.',
    focus: 'Career transition into Finance', focusAreaId: 'ar_career',
  };
  data.settings = { weeklyHours: 74, dailyHours: 11, currency: '', showCompleted: false };
  data.resources = defaultResources();

  const area = (id, title, i, why, current, desired) => ({ id, type: 'area', title, color: AREA_COLORS[i], status: 'active', why, current, desired, notes: '', order: i });
  data.areas = [
    area('ar_university', 'University', 0, 'Degree and career capital', 'Final year', 'Degree completed with strong results'),
    area('ar_career', 'Finance Career', 1, 'Enter relevant Finance work', 'Career transition', 'First Finance / Banking / Fintech role'),
    area('ar_teaching', 'Teaching', 2, 'Reliable income with controlled workload', 'Fixed teaching schedule', 'Reliable cash flow, sustainable load'),
    area('ar_virora', 'VIRORA', 3, 'Long-term product asset', 'MVP in active development', 'Useful product with real users'),
    area('ar_pfinance', 'Personal Finance', 4, 'Control cash flow and build a buffer', 'Active management', 'Stability plus savings capacity'),
    area('ar_skills', 'Skills', 5, 'Technical capital for career and product', 'Finance + tech foundation', 'Finance + Analytics + AI competence'),
    area('ar_personal', 'Personal Life', 6, 'Relationships and admin under control', 'Several open loops', 'Low-friction personal life'),
    area('ar_health', 'Health', 7, 'Protect execution capacity', 'Maintenance', 'Stable energy and fitness'),
  ];

  const goal = (id, title, areaId, horizon, desired, why, extra = {}) => ({ id, type: 'goal', title, areaId, parentId: null, horizon, status: 'active', desired, why, current: '', deadline: '', notes: '', ...extra });
  data.goals = [
    goal('gl_finance', 'Enter the Finance industry', 'ar_career', '3y', 'Working in Finance with a clear growth path', 'The core of the career transition'),
    goal('gl_degree', 'Graduate with a strong degree', 'ar_university', '3y', 'Degree completed, strong final results', 'Unlocks Finance roles and Master’s options'),
    goal('gl_virora', 'VIRORA: a useful product with real users', 'ar_virora', '3y', 'Retained users who learn with it every week', 'Builds product skills and potential future income'),
    goal('gl_stability', 'Financial stability', 'ar_pfinance', '3y', '6-month savings buffer', 'Freedom to make career decisions without panic'),
    goal('gl_masters', 'Evidence-based Master’s decision', 'ar_career', 'life', 'Decide yes/no with clear criteria', 'Keep postgraduate study strategic, not reactive'),
  ];

  const obj = (id, title, parentId, horizon, desired, extra = {}) => ({ id, type: 'objective', title, parentId, areaId: null, horizon, status: 'active', desired, why: '', current: '', deadline: '', weekOf: null, notes: '', ...extra });
  const ws = weekStart(t);
  data.objectives = [
    obj('ob_role', 'Obtain first relevant Finance role', 'gl_finance', 'year', 'Signed offer for an analyst-level role', { deadline: d(240), why: 'The concrete step that makes the career goal real' }),
    obj('ob_search', 'Run a consistent job search', 'ob_role', 'quarter', '10 qualified applications per month', { deadline: d(70) }),
    obj('ob_materials', 'Application materials ready', 'ob_search', 'month', 'CV, LinkedIn and HH profile finished', { deadline: d(25) }),
    obj('ob_final', 'Complete final-year requirements', 'gl_degree', 'year', 'Zero unknown graduation requirements', { deadline: d(230) }),
    obj('ob_engine', 'Ship a stable grammar progression engine', 'gl_virora', 'quarter', 'Placement + progression working end to end', { deadline: d(60) }),
    obj('ob_week_cv', 'CV experience section drafted', 'ob_materials', 'week', 'Draft reviewed once', { weekOf: ws }),
  ];

  const proj = (id, title, areaId, objectiveId, desired, extra = {}) => ({ id, type: 'project', title, areaId, objectiveId, parentId: null, status: 'active', desired, current: '', why: '', deadline: '', priority: 'medium', owner: '', milestones: [], notes: '', ...extra });
  data.projects = [
    proj('pr_jobsearch', 'Job Search', 'ar_career', 'ob_search', 'Pipeline producing interviews', { priority: 'high' }),
    proj('pr_cv', 'Finance CV', 'ar_career', 'ob_materials', 'CV that positions Finance experience credibly', { parentId: 'pr_jobsearch', priority: 'high', deadline: d(12), current: 'Generic template', milestones: [{ id: 'ms1', title: 'Experience section', done: false }, { id: 'ms2', title: 'Skills section', done: false }, { id: 'ms3', title: 'Peer review', done: false }] }),
    proj('pr_linkedin', 'LinkedIn profile', 'ar_career', 'ob_materials', 'Recruiter-ready profile', { parentId: 'pr_jobsearch' }),
    proj('pr_hh', 'HH profile', 'ar_career', 'ob_materials', 'Complete HH profile with CV attached', { parentId: 'pr_jobsearch', status: 'not_started' }),
    proj('pr_pipeline', 'Job Pipeline', 'ar_career', 'ob_search', 'Tracked pipeline of qualified roles', { parentId: 'pr_jobsearch' }),
    proj('pr_interview', 'Interview Preparation', 'ar_career', 'ob_role', 'Confident in technical + behavioural interviews', { status: 'not_started' }),
    proj('pr_skillgap', 'Skill Gap: Finance analytics', 'ar_skills', 'ob_role', 'Excel + SQL + modelling at employable level', { current: 'Foundation' }),
    proj('pr_grad', 'Graduation Tracker', 'ar_university', 'ob_final', 'Every requirement listed and scheduled'),
    proj('pr_thesis', 'Final thesis', 'ar_university', 'ob_final', 'Submitted thesis', { deadline: d(95), status: 'waiting' }),
    proj('pr_engine', 'Grammar Engine', 'ar_virora', 'ob_engine', 'Stable progression engine', { priority: 'high' }),
    proj('pr_landing', 'Landing page & launch content', 'ar_virora', 'ob_engine', 'Public page that explains VIRORA'),
    proj('pr_budget', 'Monthly Budget', 'ar_pfinance', null, 'Clear monthly position', { current: 'Needs update' }),
    proj('pr_admin', 'Personal admin sweep', 'ar_personal', null, 'No unresolved obligations'),
  ];

  const task = (id, title, projectId, extra = {}) => ({ id, type: 'task', title, projectId, areaId: null, status: 'open', isNext: false, due: '', plannedFor: null, plannedPriority: null, estimate: null, energy: null, notes: '', completedAt: null, order: 0, ...extra });
  data.tasks = [
    task('tk_extract', 'Extract university practical work into CV evidence', 'pr_cv', { isNext: true, estimate: 3, plannedFor: t, plannedPriority: 'must', energy: 'high', order: 1 }),
    task('tk_rewrite', 'Rewrite CV experience section', 'pr_cv', { estimate: 2, order: 2, plannedFor: d(1), plannedPriority: 'optional' }),
    task('tk_skills', 'Write skills section (Excel, SQL, modelling)', 'pr_cv', { estimate: 1, order: 3 }),
    task('tk_headline', 'Draft LinkedIn headline and About section', 'pr_linkedin', { isNext: true, estimate: 1.5 }),
    task('tk_pipeline', 'Create application tracker with 15 target roles', 'pr_pipeline', { isNext: true, estimate: 3, due: d(4) }),
    task('tk_skillgap', 'List requirements from 10 analyst job posts', 'pr_skillgap', { isNext: true, estimate: 2 }),
    task('tk_grad', 'List every outstanding graduation requirement', 'pr_grad', { isNext: true, estimate: 1, due: d(-1) }),
    task('tk_engine', 'Choose the current implementation milestone', 'pr_engine', { isNext: true, estimate: 1, plannedFor: t, plannedPriority: 'must' }),
    task('tk_engine2', 'Write placement regression tests', 'pr_engine', { estimate: 3 }),
    task('tk_landing', 'Outline landing page sections', 'pr_landing', { isNext: true, estimate: 1.5 }),
    task('tk_budget', 'Enter current income and obligations', 'pr_budget', { isNext: true, estimate: 1, plannedFor: t, plannedPriority: 'optional' }),
    task('tk_done1', 'Collect three analyst CV examples', 'pr_cv', { status: 'done', completedAt: d(-2) }),
    task('tk_capture', 'Renew residence documents', null, { areaId: 'ar_personal', estimate: 1 }),
  ];

  data.responsibilities = [
    { id: 'rs_teach', type: 'responsibility', title: 'Teach B1 / B2 classes', areaId: 'ar_teaching', status: 'active', days: [1, 2, 3, 4, 5], start: '17:00', duration: 4, hoursPerWeek: null, why: 'Main income', notes: '' },
    { id: 'rs_prep', type: 'responsibility', title: 'Lesson preparation', areaId: 'ar_teaching', status: 'active', days: [7], start: '10:00', duration: 1, hoursPerWeek: null, why: '', notes: '' },
    { id: 'rs_lectures', type: 'responsibility', title: 'University lectures', areaId: 'ar_university', status: 'active', days: [1, 2, 3, 4], start: '09:00', duration: 5, hoursPerWeek: null, why: '', notes: '' },
    { id: 'rs_seminar', type: 'responsibility', title: 'Seminar', areaId: 'ar_university', status: 'active', days: [5], start: '10:00', duration: 2, hoursPerWeek: null, why: '', notes: '' },
  ];

  data.habits = [
    { id: 'hb_train', type: 'habit', title: 'Train', areaId: 'ar_health', status: 'active', targetPerWeek: 3, log: [addDays(ws, 0)].filter((x) => x <= t), why: 'Energy is the base of all execution', notes: '' },
    { id: 'hb_read', type: 'habit', title: 'Read Finance news (20 min)', areaId: 'ar_skills', status: 'active', targetPerWeek: 5, log: [], why: 'Interview fluency', notes: '' },
  ];

  data.people = [
    { id: 'pp_office', type: 'person', title: 'University office', role: 'Registrar', status: 'active', notes: '' },
    { id: 'pp_recruiter', type: 'person', title: 'Bank recruiter', role: 'Recruiter', status: 'active', notes: '' },
  ];

  data.waiting = [
    { id: 'wt_transcript', type: 'waiting', title: 'Official transcript', who: 'University office', personId: 'pp_office', status: 'open', requestedAt: d(-9), expectedAt: d(-2), followUpAt: d(0), projectId: 'pr_grad', areaId: null, followUpAction: 'Email the registrar asking for an ETA', notes: '', log: [] },
    { id: 'wt_recruiter', type: 'waiting', title: 'Reply about analyst internship', who: 'Bank recruiter', personId: 'pp_recruiter', status: 'open', requestedAt: d(-4), expectedAt: d(3), followUpAt: d(5), projectId: 'pr_pipeline', areaId: null, followUpAction: 'Send a short follow-up note', notes: '', log: [] },
    { id: 'wt_supervisor', type: 'waiting', title: 'Thesis topic approval', who: 'Supervisor', personId: null, status: 'open', requestedAt: d(-6), expectedAt: d(4), followUpAt: d(4), projectId: 'pr_thesis', areaId: null, followUpAction: 'Ask at the seminar', notes: '', log: [] },
  ];

  data.constraints = [
    { id: 'cn_evenings', type: 'constraint', title: 'Weekday evenings are fixed teaching time', areaId: 'ar_teaching', resourceId: null, severity: 'hard', status: 'active', description: 'No deep work after 17:00 Mon–Fri.', notes: '' },
    { id: 'cn_buffer', type: 'constraint', title: 'Thin savings buffer', areaId: null, resourceId: 'rc_money', severity: 'soft', status: 'active', description: 'Limits paid courses and risky moves.', notes: '' },
  ];

  const rel = (id, from, kind, to, note) => ({ id, type: 'relationship', from, to, kind, note });
  data.relationships = [
    rel('rl_time_career', 'rc_time', 'requires', 'ar_career', 'Finance Career requires dedicated weekly capacity.'),
    rel('rl_time_virora', 'rc_time', 'requires', 'ar_virora', 'VIRORA needs protected deep-work blocks.'),
    rel('rl_att_virora', 'rc_attention', 'requires', 'ar_virora', 'Product work consumes sustained attention.'),
    rel('rl_uni_career', 'ar_university', 'enables', 'ar_career', 'The degree is the entry ticket for most Finance roles.'),
    rel('rl_teach_pf', 'ar_teaching', 'funds', 'ar_pfinance', 'Teaching income pays the monthly budget.'),
    rel('rl_teach_money', 'ar_teaching', 'produces', 'rc_money', 'Teaching is the current income source.'),
    rel('rl_skills_career', 'ar_skills', 'supports', 'ar_career', 'Analytics skills make applications credible.'),
    rel('rl_virora_skills', 'ar_virora', 'builds', 'ar_skills', 'Building VIRORA builds technical and product skills.'),
    rel('rl_virora_money', 'ar_virora', 'produces', 'rc_money', 'Potential future income.'),
    rel('rl_health_energy', 'ar_health', 'produces', 'rc_energy', 'Training and sleep restore energy.'),
    rel('rl_pf_masters', 'ar_pfinance', 'constrains', 'gl_masters', 'Savings determine whether a Master’s is affordable.'),
    rel('rl_career_pf', 'ar_career', 'funds', 'ar_pfinance', 'A Finance role would become the main income.'),
    rel('rl_cv_pipeline', 'pr_cv', 'blocks', 'pr_pipeline', 'Applications should not go out before the CV is ready.'),
    rel('rl_c_career_virora', 'ar_career', 'competes', 'ar_virora', 'Both need the same scarce deep-work hours.'),
    rel('rl_c_teach_health', 'ar_teaching', 'competes', 'ar_health', 'Evening teaching eats into recovery time.'),
    rel('rl_c_uni_career', 'ar_university', 'competes', 'ar_career', 'Final-year load vs job search.'),
  ];

  const al = (id, targetId, amount, extra = {}) => ({ id, type: 'allocation', resourceId: 'rc_time', targetId, amount, direction: 'out', breakdown: [], note: '', ...extra });
  data.allocations = [
    al('al_career', 'ar_career', 8),
    al('al_virora', 'ar_virora', 10),
    al('al_engine', 'pr_engine', 10, { breakdown: [{ id: 'b1', label: 'Engineering', amount: 3 }, { id: 'b2', label: 'Product', amount: 3 }, { id: 'b3', label: 'Content', amount: 2 }, { id: 'b4', label: 'QA', amount: 2 }] }),
    al('al_landing', 'pr_landing', 3),
    al('al_uni', 'ar_university', 5),
    al('al_health', 'ar_health', 4),
    al('al_personal', 'ar_personal', 3),
    al('al_skills', 'ar_skills', 3),
    al('al_buffer', 'buffer', 2),
    { id: 'al_m_teach', type: 'allocation', resourceId: 'rc_money', targetId: 'ar_teaching', amount: 1400, direction: 'in', breakdown: [], note: 'Teaching salary' },
    { id: 'al_m_living', type: 'allocation', resourceId: 'rc_money', targetId: 'ar_personal', amount: 900, direction: 'out', breakdown: [], note: 'Rent + living' },
    { id: 'al_m_save', type: 'allocation', resourceId: 'rc_money', targetId: 'ar_pfinance', amount: 250, direction: 'out', breakdown: [], note: 'Savings' },
    { id: 'al_m_skills', type: 'allocation', resourceId: 'rc_money', targetId: 'ar_skills', amount: 60, direction: 'out', breakdown: [], note: 'Courses' },
    { id: 'al_e_teach', type: 'allocation', resourceId: 'rc_energy', targetId: 'ar_teaching', amount: 35, direction: 'out', breakdown: [], note: '' },
    { id: 'al_e_uni', type: 'allocation', resourceId: 'rc_energy', targetId: 'ar_university', amount: 25, direction: 'out', breakdown: [], note: '' },
    { id: 'al_e_career', type: 'allocation', resourceId: 'rc_energy', targetId: 'ar_career', amount: 20, direction: 'out', breakdown: [], note: '' },
    { id: 'al_e_virora', type: 'allocation', resourceId: 'rc_energy', targetId: 'ar_virora', amount: 20, direction: 'out', breakdown: [], note: '' },
    { id: 'al_a_career', type: 'allocation', resourceId: 'rc_attention', targetId: 'ar_career', amount: 40, direction: 'out', breakdown: [], note: '' },
    { id: 'al_a_virora', type: 'allocation', resourceId: 'rc_attention', targetId: 'ar_virora', amount: 35, direction: 'out', breakdown: [], note: '' },
    { id: 'al_a_uni', type: 'allocation', resourceId: 'rc_attention', targetId: 'ar_university', amount: 25, direction: 'out', breakdown: [], note: '' },
  ];
  return data;
}
