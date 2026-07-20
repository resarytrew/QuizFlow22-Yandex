import type { Edge, Node } from "reactflow";

export type QuizTemplateId =
  | "default"
  | "ww2"
  | "economic"
  | "yandex"
  | "army"
  | "science"
  | "math"
  | "history"
  | "newyear"
  | "screenQuiz"
  | "importantTalks";

export enum CustomNodeType {
  Start = "startNode",
  Question = "questionNode",
  MultipleChoice = "multipleChoiceNode",
  Result = "resultNode",
  Info = "infoNode",
  Condition = "conditionNode",
  Score = "scoreNode",
  Variable = "variableNode",
  Formula = "formulaNode",
  GoTo = "goToNode",
  Timer = "timerNode",
  CollectInfo = "collectInfoNode",
  Feedback = "feedbackNode",
  Timeline = "timelineNode",
  Matching = "matchingNode",
  TextInput = "textInputNode",
  Achievement = "achievementNode",
  Group = "groupNode",
  Allocator = "allocatorNode",
  Progression = "progressionNode",
  Dialogue = "dialogueNode",
}

export type EffectOp = "set" | "add" | "subtract";

export interface Effect {
  variableName: string;
  op: EffectOp;
  value: string | number;
}

export interface EdgeData {
  label?: string;
  effects?: Effect[];
}

export interface BaseNodeData {
  label?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string; // Direct video URL or supported embed URL
  isRequiredWatch?: boolean; // Block navigation until video ends
  backgroundImageUrl?: string;
  buttonText?: string;
  soundSettings?: NodeSoundSettings;
  parentId?: string;
  screenQuiz?: Partial<ScreenQuizSettings>;
}

export interface NodeSoundSettings {
  onEntry?: string;
  onButtonPress?: string;
  voiceover?: string;
}

export type ScreenQuizLayout = 'auto' | 'media-right' | 'media-left' | 'media-top' | 'image-grid' | 'question-only' | 'hero-media';
export type ScreenQuizTransitionEffect = 'swipe-reveal' | 'pixel-dissolve' | 'zoom-in-reveal' | 'glitch-cut';
export type ScreenQuizIntroTiming = 'auto' | 'fast' | 'calm' | 'manual';
export type ScreenQuizTimelineMode = 'auto' | 'timeline';

export interface ScreenQuizSettings {
  backgroundPreset?: 'none' | 'pop' | 'candy' | 'aqua' | 'yellow' | 'travel';
  backgroundImageUrl?: string;
  backgroundColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  panelColor?: string;
  answerColor?: string;
  inkColor?: string;
  correctColor?: string;
  borderWidth?: number;
  radius?: number;
  decorIntensity?: number;
  motion?: 'premium' | 'calm' | 'off';
  transitionEffect?: ScreenQuizTransitionEffect;
  layout?: ScreenQuizLayout;
  timerSeconds?: number;
  showTimer?: boolean;
  showStoryTimer?: boolean;
  timelineMode?: ScreenQuizTimelineMode;
  holdSeconds?: number;
  revealSeconds?: number;
  transitionMs?: number;
  introEnabled?: boolean;
  introTiming?: ScreenQuizIntroTiming;
  introQuestionMs?: number;
  introAnswerMs?: number;
  introMediaMs?: number;
  introGapMs?: number;
}

export interface Answer {
  id: string;
  text: string;
  imageUrl?: string;
  isCorrect?: boolean;
}

export interface QuestionNodeData extends BaseNodeData {
  question?: string;
  answers?: Answer[];
  timer?: number;
  title?: string;
  correctAnswer?: string;
  importantTalks?: ImportantTalksQuestionContent;
}

export interface MultipleChoiceNodeData extends BaseNodeData {
  question?: string;
  answers?: Answer[];
  minSelections?: number;
  maxSelections?: number;
  correctOptions?: string[];
  scorePerCorrect?: number;
  penaltyPerIncorrect?: number;
  title?: string;
  variableName?: string;
  maxScore?: number;
  penaltyPerError?: number;
  minScore?: number;
}

export interface ResultNodeData extends BaseNodeData {
  title?: string;
  showScore?: boolean;
  importantTalks?: ImportantTalksResultContent;
}

export interface ImportantTalksInfoContent {
  agendaTitle?: string;
  agendaItems?: string[];
}

export interface ImportantTalksQuestionContent {
  instruction?: string;
}

export interface ImportantTalksResultContent {
  kicker?: string;
  insightTitle?: string;
}

export interface InfoNodeData extends BaseNodeData {
  title?: string;
  importantTalks?: ImportantTalksInfoContent;
}

export interface ScoreNodeData extends BaseNodeData {
  operation: "add" | "subtract" | "set";
  value: number;
}

export interface VariableNodeData extends BaseNodeData {
  variableName: string;
  operation: "set" | "add" | "subtract";
  value: string | number;
  displayName?: string;
}

export interface ConditionNodeData extends BaseNodeData {
  variable: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains";
  value: string | number;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "number" | "tel";
  variableName: string;
}

export interface CollectInfoNodeData extends BaseNodeData {
  title?: string;
  fields?: FormField[];
}

export interface FeedbackNodeData extends BaseNodeData {
  title?: string;
  message?: string;
}

export interface GoToNodeData extends BaseNodeData {
  targetNodeId?: string;
}

export interface TimerNodeData extends BaseNodeData {
  duration?: number;
  action?: "goToNext" | "goToNode";
  targetNodeId?: string;
}

export interface TimelineEvent {
  id: string;
  text: string;
}

export interface TimelineNodeData extends BaseNodeData {
  question?: string;
  events?: TimelineEvent[];
  correctOrder?: string[];
  title?: string;
}

export interface MatchColumnItem {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface MatchPair {
  leftId: string;
  rightId: string;
}

export interface MatchingNodeData extends BaseNodeData {
  question?: string;
  leftColumn?: MatchColumnItem[];
  rightColumn?: MatchColumnItem[];
  correctPairs?: MatchPair[];
  title?: string;
}

export interface TextInputNodeData extends BaseNodeData {
  title?: string;
  question?: string;
  keyword?: string;
}

export interface AchievementNodeData extends BaseNodeData {
  title?: string;
  icon?: string;
}

export interface GroupNodeData extends BaseNodeData {
  color?: string;
}

export interface AllocatorItem {
  id: string;
  label: string;
  variableName: string;
  defaultValue?: number;
  correctValue?: number;
}

export interface AllocatorNodeData extends BaseNodeData {
  title?: string;
  question?: string;
  maxTotal?: number;
  items?: AllocatorItem[];
}

export interface FormulaNodeData extends BaseNodeData {
  variableName: string;
  expression: string;
  decimalPlaces?: number;
}

export interface Requirement {
  id: string;
  type: "minVar" | "maxVar" | "minScore" | "maxScore";
  variable?: string;
  value: number;
}

export interface RankRule {
  id: string;
  level: number;
  name: string;
  requireAll: boolean;
  requirements: Requirement[];
}

export interface ProgressionNodeData extends BaseNodeData {
  levelVar: string;
  nameVar: string;
  rules: RankRule[];
  lockDegrade: boolean;
  onLevelUpHandle?: "levelUp" | null;
}

export interface DialogueNodeData extends BaseNodeData {
  characterName: string;
  characterRole?: string;
  characterAvatar?: string;
  dialogueText: string;
  mood?: "neutral" | "excited" | "serious" | "sad" | "mysterious";
  textAlign?: "left" | "center";
}

export type NodeData =
  | QuestionNodeData
  | MultipleChoiceNodeData
  | ResultNodeData
  | InfoNodeData
  | ScoreNodeData
  | VariableNodeData
  | ConditionNodeData
  | CollectInfoNodeData
  | FeedbackNodeData
  | GoToNodeData
  | TimerNodeData
  | TimelineNodeData
  | MatchingNodeData
  | TextInputNodeData
  | AchievementNodeData
  | GroupNodeData
  | AllocatorNodeData
  | FormulaNodeData
  | ProgressionNodeData
  | DialogueNodeData
  | BaseNodeData;

export interface GlobalTimer {
  enabled: boolean;
  duration: number;
  onTimeoutNodeId: string | null;
}

export interface DesignSettings {
  brand?: {
    logoUrl?: string;
    avatarUrl?: string;
    brandName?: string;
    scoreLabel?: string;
    primaryColor?: string;
    accentColor?: string;
    neutralColor?: string;
    experiencePreset?: 'conversational' | 'leadForm' | 'calculator' | 'assessment' | 'editorial' | 'minimal';
  };
  background: {
    color: string;
    imageUrl: string;
    overlayColor: string;
    overlayOpacity: number;
    mode?: 'solid' | 'gradient' | 'image';
    gradientFrom?: string;
    gradientTo?: string;
    imageFit?: 'cover' | 'contain' | 'repeat';
    texture?: 'none' | 'grain' | 'grid' | 'paper';
  };
  typography: {
    fontFamily: string;
    displayFontFamily?: string;
    headingColor: string;
    bodyTextColor: string;
    headingWeight?: number;
    bodyWeight?: number;
    headingScale?: number;
    bodyScale?: number;
    lineHeight?: number;
    letterSpacing?: number;
    headingLineHeight?: number;
    paragraphWidth?: number;
  };
  layout?: {
    preset?: 'classic' | 'split' | 'focus' | 'editorial' | 'compact' | 'conversational' | 'calculator' | 'assessment';
    interfacePreset?: 'studio' | 'immersive' | 'form' | 'exam' | 'kiosk' | 'magazine' | 'product' | 'minimal' | 'workshop' | 'report';
    contentWidth?: number;
    cardRadius?: number;
    cardPadding?: number;
    cardOpacity?: number;
    mediaPosition?: 'top' | 'left' | 'right' | 'background';
    surfaceStyle?: 'solid' | 'paper' | 'outline' | 'glass' | 'minimal';
    questionAlign?: 'left' | 'center';
    verticalAlign?: 'top' | 'center';
    density?: 'compact' | 'balanced' | 'relaxed';
    chrome?: 'full' | 'compact' | 'none';
    blocks?: {
      topbar?: boolean;
      brand?: boolean;
      logo?: boolean;
      title?: boolean;
      progress?: boolean;
      timer?: boolean;
      description?: boolean;
      media?: boolean;
      achievements?: boolean;
      variables?: boolean;
      stats?: boolean;
      resultStats?: boolean;
      backgroundDecor?: boolean;
    };
  };
  questionCard?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    radius?: number;
    padding?: number;
    shadow?: 'none' | 'soft' | 'strong';
    mediaPosition?: 'top' | 'left' | 'right' | 'background';
    mediaWidth?: number;
    mediaRadius?: number;
    mediaFit?: 'cover' | 'contain';
  };
  buttons: {
    backgroundColor: string;
    textColor: string;
    hoverBackgroundColor: string;
    hoverTextColor: string;
    borderRadius: number;
    style?: 'solid' | 'outline' | 'ghost' | 'soft' | 'premium';
    height?: number;
    shadow?: 'none' | 'soft' | 'strong';
    fontWeight?: number;
    width?: 'auto' | 'full';
    textTransform?: 'none' | 'uppercase';
  };
  answerCards: {
    backgroundColor: string;
    textColor: string;
    hoverBackgroundColor: string;
    hoverTextColor: string;
    selectedBackgroundColor: string;
    selectedTextColor: string;
    borderRadius: number;
    style?: 'card' | 'list' | 'tiles' | 'minimal';
    borderColor?: string;
    selectedBorderColor?: string;
    spacing?: number;
    markerStyle?: 'none' | 'letters' | 'numbers';
    columns?: 1 | 2 | 3;
    minHeight?: number;
    mediaAspectRatio?: 'auto' | '16/9' | '4/3' | '1/1';
  };
  progress?: {
    style?: 'bar' | 'steps' | 'ring' | 'hidden';
    position?: 'top' | 'bottom' | 'inside';
    color?: string;
    trackColor?: string;
    showPercent?: boolean;
    showStepLabel?: boolean;
    height?: number;
  };
  result?: {
    preset?: 'card' | 'certificate' | 'report' | 'landing';
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    showScore?: boolean;
    showShare?: boolean;
    scoreStyle?: 'badge' | 'ring' | 'stat';
  };
  advanced?: {
    customCss?: string;
    reducedMotion?: boolean;
    highContrast?: boolean;
  };
  screenQuiz?: ScreenQuizSettings;
  sound: {
    volume: number;
    backgroundMusic?: string;
    musicVolume?: number;
    voiceVolume?: number;
    sfxVolume?: number;
    tickVolume?: number;
    buttonClick?: string;
    correctAnswer?: string;
    incorrectAnswer?: string;
    achievementUnlock?: string;
    screenQuizIntro?: string;
    screenQuizTick?: string;
    screenQuizReveal?: string;
    screenQuizTransition?: string;
  };
}

export interface BoardSettings {
  backgroundColor: string;
  pattern: "none" | "small" | "medium" | "large";
  lineColor: string;
  lineWidth: number;
}

// Complex types for Passport tables
export interface PassportVariable {
  id: string;
  name: string;
  type: string[];
  purpose: string;
  initValue: string;
}

export interface PassportNodeTypeItem {
  id: string;
  type: string;
  count: string;
  purpose: string;
}

export interface PassportFormula {
  id: string;
  formula: string;
  place: string;
  logic: string;
}

export interface PassportAiTool {
  id: string;
  name: string;
  developer: string;
  purpose: string;
}

export interface PassportSource {
  id: string;
  name: string;
  authorOrUrl?: string;
  date?: string;
  license?: string;
}

export interface ProjectPassport {
  organization: string;
  projectName: string;
  nomination: string;
  authors: string;
  year: string;

  // 1. General
  productType: string[];
  productTypeOther: string;
  subject: string;
  topic: string;

  // 1.2 Audience
  educationLevel: string[];
  classGrade: string;
  ageGroupFrom: string;
  ageGroupTo: string;
  audienceFeatures: string;

  // 1.3 Place
  placeInProcess: string[];
  lessonStage: string;
  placeOther: string;

  // 2. Conceptual
  relevance: string;
  goal: string;
  tasks: string;

  // 2.4 Results
  subjectResults: string;
  cognitiveSkills: string;
  regulatorySkills: string;
  communicativeSkills: string;
  personalResults: string;

  // 3. Content
  scenarioDescription: string;
  schemeUrl?: string;
  mechanicsInteraction: string;
  evaluationSystem: string;

  // 4. Technical
  nodeCount: string;
  branchCount: string;
  endingsCount: string;
  avgTime: string;
  minTime: string;
  maxTime: string;
  variablesList: PassportVariable[];
  nodeTypesList: PassportNodeTypeItem[];
  formulasList: PassportFormula[];

  // 5. AI
  aiToolsList: PassportAiTool[];
  aiTools?: string;
  aiUsage: string[];
  aiUsageOther?: string;
  aiVerification: string;

  // 6. Methodology
  usageRecommendations: string;
  requirements: string;
  studentInstructions: string;
  analysisRecommendations: string;
  adaptationPossibilities: string;

  // 7. Testing
  testingDate: string;
  testingCount: string;
  testingClass: string;
  testingForm: string[];
  testingResults: string;

  // 8. Sources
  normativeDocs: PassportSource[];
  methodicalMaterials: PassportSource[];
  internetResources: PassportSource[];
  illustrationSources: PassportSource[];

  // 9. Additional
  additionalMaterials: string[];
  additionalMaterialsOther?: string;
}

export type QuizPassport = ProjectPassport;

export interface ContestSubmission {
  id: string;
  user_id: string;
  created_at: string;
  project_name: string;
  nomination: string;
  authors: string;
  organization: string;
  passport_data: ProjectPassport;
  attached_files: string[];
  status: "pending" | "approved" | "rejected";
}

export interface ResultAchievement {
  title?: string;
  description?: string;
}

export interface QuizResultData {
  variables?: Record<string, unknown>;
  achievements?: Array<ResultAchievement | string>;
  [key: string]: unknown;
}

export interface PathEventDetails {
  question?: string;
  selectedAnswer?: unknown;
  isCorrect?: boolean | string;
  scoreChange?: number;
  [key: string]: unknown;
}

export interface QuizData {
  nodes: Node<NodeData>[];
  edges: Edge[];
  globalTimer: GlobalTimer;
  designSettings: DesignSettings;
  templateId?: QuizTemplateId;
  currentQuizName?: string;
  description?: string;
  cover_image_url?: string;
  keywords?: string[];
  passport?: ProjectPassport;
}

export interface Quiz {
  id: string;
  user_id: string;
  name: string;
  quiz_data: QuizData;
  quiz_data_loaded?: boolean;
  created_at: string;
  updated_at: string;
  is_published?: boolean;
  published_at?: string;
  is_favorite?: boolean;
  visibility?: QuizVisibility;
  display_code?: string;
}

export type QuizVisibility = 'private' | 'unlisted' | 'public';

export interface PublicQuiz {
  id: string;
  name: string;
  quiz_data: QuizData;
  created_at: string;
  published_at: string;
  visibility?: QuizVisibility;
  is_favorite?: boolean;
  is_published?: boolean;
}

export interface QuizResult {
  id: string;
  created_at: string;
  quiz_id: string;
  session_id?: string;
  user_id?: string;
  score: number;
  final_node_title: string;
  results_data: QuizResultData;
  participant_name?: string;
  participant_email?: string;
  time_spent_seconds?: number;
  path_data?: PathEvent[];
}

export interface PathEvent {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  timestamp: string;
  details: PathEventDetails;
}

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface QuizSession {
  id: string;
  created_at: string;
  updated_at: string;
  quiz_id: string;
  user_id?: string;
  participant_name?: string;
  participant_email?: string;
  status: SessionStatus;
  score: number;
  variables: Record<string, unknown>;
  achievements: Array<ResultAchievement | string>;
  path_data: PathEvent[];
  started_at: string;
  completed_at?: string;
  time_spent_seconds?: number;
}

// --- Quiz Template (for landing page → editor handoff) ---

export interface QuizTemplate {
  id?: string;
  name?: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  description?: string;
  globalTimer?: GlobalTimer;
  designSettings?: DesignSettings;
  templateId?: QuizTemplateId;
  currentQuizName?: string;
}

// --- Autosave ---

export interface AutosavePayload {
  currentQuizId: string | null;
  nodes: Node<NodeData>[];
  edges: Edge[];
  globalTimer: GlobalTimer;
  designSettings: DesignSettings;
  templateId: QuizTemplateId;
  currentQuizName: string;
}

// --- Billing & subscriptions ---

export type PlanId = 'pro_monthly' | 'pro_yearly';
export type PlanName = 'free' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  period: 'month' | 'year';
  price_kopecks: number;
  currency: 'RUB';
  features: Record<string, unknown>;
  sort_order?: number;
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'expired';

export interface Subscription {
  id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

export type PaymentStatus =
  | 'pending'
  | 'waiting_for_capture'
  | 'succeeded'
  | 'canceled'
  | 'refunded';

export interface Payment {
  id: string;
  plan_id: PlanId;
  status: PaymentStatus;
  amount_kopecks: number;
  currency: 'RUB';
  created_at: string;
  receipt_url: string | null;
  description: string | null;
}

export interface Entitlement {
  plan: PlanName;
  features: {
    max_quizzes: number | null;
    ai_tier: 'basic' | 'advanced' | 'premium';
    hide_branding: boolean;
    premium_templates: boolean;
    unlimited_logic: boolean;
    [k: string]: unknown;
  };
  valid_until: string | null;
  source: 'system' | 'admin' | 'promo';
}

export interface BillingSnapshot {
  entitlement: Entitlement;
  subscription: Subscription | null;
  payments: Payment[];
  plans: Plan[];
}

// --- Administration ---

export type AdminRole = 'owner' | 'admin' | 'moderator' | 'support';
export type AdminAuthenticatorLevel = 'aal1' | 'aal2';

export interface AdminStaffSession {
  user_id: string;
  email: string | null;
  role: AdminRole;
  permissions: string[];
  account_code: number;
  idle_timeout_minutes: number;
  current_aal: AdminAuthenticatorLevel | null;
  ip_restricted: boolean;
}

export interface AdminSessionResponse {
  staff: AdminStaffSession;
  mfa_required: boolean;
}

export interface AdminOverviewMetrics {
  users_total: number;
  users_active_30d: number;
  users_new_24h: number;
  quizzes_total: number;
  quizzes_new_24h: number;
  users_blocked: number;
  quizzes_pending_moderation: number;
  staff_active: number;
  subscriptions_active: number;
  subscriptions_admin_granted: number;
  quiz_completions_total: number;
  quiz_completions_24h: number;
  reports_open: number | null;
  support_open: number | null;
}

export interface AdminAuditEntry {
  id: number;
  actor_user_id: string | null;
  actor_account_code: number | null;
  actor_display_name: string | null;
  action: string;
  permission: string | null;
  target_type: string | null;
  target_id: string | null;
  outcome: 'success' | 'denied' | 'failed';
  details: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export interface AdminDashboardTrendPoint {
  date: string;
  users: number;
  quizzes: number;
  completions: number;
}

export interface AdminDashboardBreakdown {
  quizzes_by_visibility: Record<QuizVisibility, number>;
  subscriptions_by_plan: {
    pro_monthly: number;
    pro_yearly: number;
    admin_granted: number;
  };
}

export interface AdminOverview {
  staff: AdminStaffSession;
  metrics: AdminOverviewMetrics;
  trend_7d: AdminDashboardTrendPoint[];
  breakdown: AdminDashboardBreakdown;
  recent_actions: AdminAuditEntry[];
  unavailable_sources: Array<'reports' | 'support'>;
  generated_at: string;
}

export interface AdminListMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  query: string;
}

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface AdminUserListItem {
  id: string;
  account_code: number;
  username: string | null;
  display_name: string | null;
  status: 'active' | 'temporarily_blocked' | 'blocked';
  blocked_until: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
  quiz_count: number;
}

export interface AdminUsersResponse {
  staff: AdminStaffSession;
  users: AdminUserListItem[];
  meta: AdminListMeta;
  generated_at: string;
}

export type AdminUserStatus = 'active' | 'temporarily_blocked' | 'blocked';

export interface AdminUpdateUserStatusPayload {
  user_id: string;
  status: AdminUserStatus;
  blocked_until?: string | null;
  reason?: string | null;
}

export type AdminProPlan = 'pro_monthly' | 'pro_yearly';

export interface AdminGrantProPayload {
  user_id: string;
  plan: AdminProPlan;
  reason?: string | null;
}

export interface AdminGrantProResponse {
  staff: AdminStaffSession;
  grant: {
    user_id: string;
    plan: AdminProPlan;
    valid_until: string;
    reason: string | null;
  };
  generated_at: string;
}

export interface AdminUpdateUserStatusResponse {
  staff: AdminStaffSession;
  user: AdminUserListItem;
  generated_at: string;
}

export interface AdminQuizzesParams {
  page?: number;
  limit?: number;
  q?: string;
  visibility?: QuizVisibility | 'all';
}

export type AdminQuizModerationStatus =
  | 'unreviewed'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'blocked'
  | 'hidden'
  | 'deleted';

export interface AdminQuizListItem {
  id: string;
  owner_user_id: string;
  owner_account_code: number | null;
  owner_display_name: string | null;
  owner_username: string | null;
  owner_status: string | null;
  name: string;
  visibility: QuizVisibility;
  display_code: string | null;
  raw_display_code: number | null;
  moderation_status: AdminQuizModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  deleted_at: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminQuizzesResponse {
  staff: AdminStaffSession;
  quizzes: AdminQuizListItem[];
  meta: AdminListMeta;
  generated_at: string;
}

export interface AdminModerateQuizPayload {
  quiz_id: string;
  moderation_status: AdminQuizModerationStatus;
  reason?: string | null;
}

export interface AdminModerateQuizResponse {
  staff: AdminStaffSession;
  quiz: AdminQuizListItem;
  generated_at: string;
}

export interface AdminProfileSummary {
  account_code: number | null;
  display_name: string | null;
  username: string | null;
}

export type AdminReportStatus = 'new' | 'reviewing' | 'approved' | 'rejected' | 'closed';

export interface AdminReportListItem {
  id: string;
  quiz_id: string;
  reporter_user_id: string | null;
  reason: string;
  comment: string | null;
  status: AdminReportStatus;
  assigned_to: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  quiz_name: string | null;
  quiz_display_code: string | null;
  quiz_owner: AdminProfileSummary;
  reporter: AdminProfileSummary;
  assignee: AdminProfileSummary;
}

export interface AdminReportsParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: AdminReportStatus | 'all';
}

export interface AdminReportsResponse {
  staff: AdminStaffSession;
  reports: AdminReportListItem[];
  meta: AdminListMeta;
  generated_at: string;
}

export type AdminSupportStatus = 'new' | 'in_progress' | 'waiting_user' | 'closed';

export interface AdminSupportTicket {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: AdminSupportStatus;
  message: string;
  assigned_to: string | null;
  internal_note: string | null;
  resolution: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  user: AdminProfileSummary;
  assignee: AdminProfileSummary;
  messages?: SupportTicketMessage[];
}

export interface AdminSupportParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: AdminSupportStatus | 'all';
}

export interface AdminSupportResponse {
  staff: AdminStaffSession;
  tickets: AdminSupportTicket[];
  meta: AdminListMeta;
  generated_at: string;
}

export interface AdminFinancePayment {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  external_id: string | null;
  status: PaymentStatus;
  amount_kopecks: number;
  currency: string;
  receipt_url: string | null;
  description: string | null;
  created_at: string;
  user: AdminProfileSummary;
}

export interface AdminFinancesParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: PaymentStatus | 'all';
}

export interface AdminFinancesResponse {
  staff: AdminStaffSession;
  metrics: {
    revenue_kopecks: number;
    refunds_kopecks: number;
    net_revenue_kopecks: number;
    active_subscriptions: number;
  };
  payments: AdminFinancePayment[];
  meta: AdminListMeta;
  generated_at: string;
}

export interface AdminPromocodeItem {
  code: string;
  plan_id: AdminProPlan;
  discount_pct: number;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminPromocodesResponse {
  staff: AdminStaffSession;
  promocodes: AdminPromocodeItem[];
  meta: AdminListMeta;
  generated_at: string;
}

export interface AdminPromocodeCreatePayload {
  code: string;
  plan_id: AdminProPlan;
  valid_until?: string | null;
  max_uses?: number | null;
}

export interface AdminPromocodeTogglePayload {
  code: string;
  is_active: boolean;
}

export interface AdminOperationResponse {
  staff: AdminStaffSession;
  ok: true;
  generated_at: string;
}

export type SupportTicketStatus = 'new' | 'in_progress' | 'waiting_user' | 'closed';
export type SupportTicketCategory =
  | 'general'
  | 'account'
  | 'billing'
  | 'quiz'
  | 'technical'
  | 'other';

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_user_id: string | null;
  sender_kind: 'user' | 'staff' | 'system';
  body: string;
  attachment_name: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface UserSupportTicket {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: SupportTicketStatus;
  message: string;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

/** Ноды, доступные только в PRO. Источник истины — runtime, плюс фоллбэк в коде. */
export const PRO_NODE_TYPES: ReadonlySet<CustomNodeType> = new Set<CustomNodeType>([
  CustomNodeType.MultipleChoice,
  CustomNodeType.Variable,
  CustomNodeType.Condition,
  CustomNodeType.Formula,
  CustomNodeType.GoTo,
  CustomNodeType.Matching,
  CustomNodeType.Timeline,
  CustomNodeType.Achievement,
  CustomNodeType.Allocator,
  CustomNodeType.Progression,
  CustomNodeType.Group,
  CustomNodeType.Dialogue,
]);

export function isProNode(type: CustomNodeType): boolean {
  return PRO_NODE_TYPES.has(type);
}
