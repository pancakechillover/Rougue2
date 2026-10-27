import { format, subDays, addDays } from 'date-fns';
import {
  AppState,
  Dungeon,
  MajorDungeon,
  StudySession,
  Tag,
  DailyLog,
  WorkstationInterval,
  RewardHistoryItem,
  QuestHistoryItem,
  Transaction,
  TodayTodo,
  Quest,
} from '../types';
import { INITIAL_REWARD_POOL, DEFAULT_QUESTS, DEFAULT_SAGE_PROMPTS } from '../constants';
import { CURRENT_SCHEMA_VERSION } from './migrations';

export const PRE_DEMO_BACKUP_KEY = 'scholars_dungeon_pre_demo_backup';
export const DEMO_SEEDED_FLAG_KEY = 'scholars_dungeon_preview_seeded_v1';

export interface PreviewDemoBundle {
  state: AppState;
  dungeons: Dungeon[];
  majorDungeons: MajorDungeon[];
}

export function buildPreviewDemoData(baseDate: Date = new Date()): PreviewDemoBundle {
  const now = baseDate;
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentWeekStr = format(now, 'yyyy-' + Math.ceil(now.getDate() / 7));
  const currentMonthStr = format(now, 'yyyy-MM');

  // 1. Comprehensive Tags (all 8 TagColor palettes represented)
  const tags: Tag[] = [
    { id: 'tag-research', name: 'Deep Research', color: 'indigo' },
    { id: 'tag-coding', name: 'System Engineering', color: 'sky' },
    { id: 'tag-fitness', name: 'Physical Training', color: 'teal' },
    { id: 'tag-reading', name: 'Literature & Papers', color: 'violet' },
    { id: 'tag-writing', name: 'Academic Writing', color: 'amber' },
    { id: 'tag-art', name: 'Digital Illustration', color: 'rose' },
    { id: 'tag-lang', name: 'Language Mastery', color: 'cyan' },
    { id: 'tag-archived', name: 'Legacy Coursework', color: 'fuchsia', archived: true },
  ];

  // 2. Major Goals (Active finalized, Active routine, Active unfinalized, Completed, Archived)
  const majorDungeons: MajorDungeon[] = [
    {
      id: 'm-thesis',
      name: 'Neural Architecture & Thesis',
      description: 'Sparse attention kernels, ablation benchmarks, and thesis manuscript chapters',
      status: 'active',
      isFinalized: true,
      deadline: format(addDays(now, 14), 'yyyy-MM-dd'),
      tags: ['tag-research', 'tag-writing'],
      rewards: [
        { type: 'coins', amount: 500 },
        { type: 'xp', amount: 800 },
        { type: 'talentPoint', amount: 1 },
      ],
    },
    {
      id: 'm-routine',
      name: 'Daily Scholar Routine',
      description: 'Core daily and weekly habits for physical energy, reading, and creative practice',
      status: 'active',
      isRoutine: true,
      routineType: 'daily',
      lastRoutineReset: todayStr,
      rewards: [
        { type: 'coins', amount: 120 },
        { type: 'xp', amount: 150 },
      ],
    },
    {
      id: 'm-rust',
      name: 'Full-Stack Systems & Rust Engine',
      description: 'High-concurrency runtime architecture, memory profiling, and distributed sync',
      status: 'active',
      isFinalized: false,
      deadline: format(addDays(now, 21), 'yyyy-MM-dd'),
      tags: ['tag-coding'],
      rewards: [
        { type: 'coins', amount: 400 },
        { type: 'xp', amount: 600 },
        { type: 'item', amount: 1, itemType: 'talent_shard', itemName: 'Ancient Engine Shard' },
      ],
    },
    {
      id: 'm-stat-completed',
      name: 'Foundations of Statistical Learning',
      description: 'Convex optimization proofs, variational inference, and kernel methods',
      status: 'completed',
      isFinalized: true,
      completedAt: subDays(now, 5).toISOString(),
      tags: ['tag-research', 'tag-reading'],
      rewards: [
        { type: 'coins', amount: 350 },
        { type: 'xp', amount: 500 },
      ],
    },
    {
      id: 'm-seminar-archived',
      name: 'Spring Semester Colloquium Archive',
      description: 'Archived keynote slides and reading group notes from previous term',
      status: 'archived',
      isFinalized: true,
      completedAt: subDays(now, 24).toISOString(),
      tags: ['tag-archived'],
      rewards: [{ type: 'coins', amount: 200 }],
    },
  ];

  // 3. Multi-Tier Sub-Dungeons (including 3-level nested hierarchy, routines, open-ended, completed, archived)
  const dungeons: Dungeon[] = [
    // Under m-thesis: Phase 1 folder + children
    {
      id: 'd-thesis-p1',
      name: 'Phase 1: Literature & Baseline',
      description: 'Establish baseline metrics and complete literature synthesis',
      totalSessions: 14,
      completedSessions: 11,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 150 }],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-thesis',
      tags: ['tag-reading'],
    },
    {
      id: 'd-thesis-p1-1',
      name: 'Survey 15 Flash & Sparse Attention Papers',
      description: 'Annotate complexity trade-offs and hardware utilization tables',
      totalSessions: 6,
      completedSessions: 6,
      completedAt: subDays(now, 4).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 100 },
        { type: 'xp', amount: 150 },
      ],
      isLongTerm: true,
      status: 'completed',
      parentId: 'd-thesis-p1',
      tags: ['tag-reading'],
    },
    {
      id: 'd-thesis-p1-2',
      name: 'Reproduce Baseline Perplexity Benchmark',
      description: 'Verify training throughput and validation curves on 4x GPU node',
      totalSessions: 8,
      completedSessions: 5,
      deadline: format(addDays(now, 3), 'yyyy-MM-dd'),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 120 },
        { type: 'xp', amount: 200 },
      ],
      isLongTerm: true,
      status: 'active',
      parentId: 'd-thesis-p1',
      tags: ['tag-coding'],
    },
    // Under m-thesis: Phase 2 folder + children
    {
      id: 'd-thesis-p2',
      name: 'Phase 2: Kernel Experiments & Ablations',
      description: 'Custom Triton kernels and long-context memory scaling ablations',
      totalSessions: 16,
      completedSessions: 6,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 200 }],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-thesis',
      tags: ['tag-coding'],
    },
    {
      id: 'd-thesis-p2-1',
      name: 'Implement Block-Sparse Attention Kernel',
      description: 'Optimize shared-memory tiling and backward pass register pressure',
      totalSessions: 10,
      completedSessions: 4,
      deadline: format(addDays(now, 6), 'yyyy-MM-dd'),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 180 },
        { type: 'item', amount: 1, itemType: 'talent_shard', itemName: 'Kernel Mastery Shard' },
      ],
      isLongTerm: true,
      status: 'active',
      parentId: 'd-thesis-p2',
      tags: ['tag-coding'],
    },
    {
      id: 'd-thesis-p2-2',
      name: 'Run 32K Context Window Ablation Suite',
      description: 'Evaluate needle-in-a-haystack recall across sparsity ratios',
      totalSessions: 6,
      completedSessions: 2,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 100 }],
      isLongTerm: true,
      status: 'active',
      parentId: 'd-thesis-p2',
    },
    // Direct leaf under m-thesis
    {
      id: 'd-thesis-p3',
      name: 'Draft Methodology & Architecture Figures',
      description: 'Write Section 3 formal formulation and TikZ vector diagrams',
      totalSessions: 8,
      completedSessions: 3,
      deadline: format(addDays(now, 9), 'yyyy-MM-dd'),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 150 },
        { type: 'xp', amount: 250 },
      ],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-thesis',
      tags: ['tag-writing'],
    },

    // Under m-routine: Daily & Weekly Routine Tasks
    {
      id: 'd-routine-run',
      name: 'Morning 5km Run & Mobility',
      description: 'Zone 2 aerobic conditioning + 10m thoracic mobility',
      totalSessions: 1,
      completedSessions: 1,
      completedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 15).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 50 }],
      isLongTerm: true,
      status: 'completed',
      parentId: 'm-routine',
      isRoutine: true,
      routineType: 'daily',
      lastRoutineReset: todayStr,
      tags: ['tag-fitness'],
    },
    {
      id: 'd-routine-paper',
      name: 'ArXiv Paper Deep Reading',
      description: 'Read and summarize 1 frontier ML paper in research vault',
      totalSessions: 2,
      completedSessions: 2,
      completedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 45).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 60 },
        { type: 'xp', amount: 80 },
      ],
      isLongTerm: true,
      status: 'completed',
      parentId: 'm-routine',
      isRoutine: true,
      routineType: 'daily',
      lastRoutineReset: todayStr,
      tags: ['tag-reading'],
    },
    {
      id: 'd-routine-lang',
      name: 'Academic English & Shadowing',
      description: '25m conference talk shadowing and vocabulary review',
      totalSessions: 2,
      completedSessions: 1,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 45 }],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-routine',
      isRoutine: true,
      routineType: 'daily',
      lastRoutineReset: todayStr,
      tags: ['tag-lang'],
    },
    {
      id: 'd-routine-art',
      name: 'Digital Painting & Perspective Study',
      description: 'Environment lighting thumbnails and color harmony practice',
      totalSessions: 5,
      completedSessions: 3,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 120 },
        { type: 'text', amount: 1, rewardText: 'Unlock 30m Artbook Browsing Break' },
      ],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-routine',
      isRoutine: true,
      routineType: 'weekly',
      lastRoutineReset: currentWeekStr,
      tags: ['tag-art'],
    },

    // Under m-rust: Unfinalized Major Goal
    {
      id: 'd-rust-1',
      name: 'Custom Arena Allocator & Lifetimes Lab',
      description: 'Zero-copy parser and slab memory pool benchmarks',
      totalSessions: 4,
      completedSessions: 4,
      completedAt: subDays(now, 2).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 90 }],
      isLongTerm: true,
      status: 'completed',
      parentId: 'm-rust',
      tags: ['tag-coding'],
    },
    {
      id: 'd-rust-2',
      name: 'Async Raft Consensus & WebSocket Engine',
      description: 'Implement heartbeat election and log replication state machine',
      totalSessions: 6,
      completedSessions: 3,
      deadline: format(addDays(now, 5), 'yyyy-MM-dd'),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [
        { type: 'coins', amount: 140 },
        { type: 'xp', amount: 220 },
      ],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-rust',
      tags: ['tag-coding'],
    },
    {
      id: 'd-rust-3',
      name: 'Open-Ended Flamegraph & Perf Profiling',
      description: 'Continuous profiling session for lock-free ring buffers',
      totalSessions: 1,
      completedSessions: 7,
      isOpenEnded: true,
      totalFocusTime: 185,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 80 }],
      isLongTerm: true,
      status: 'active',
      parentId: 'm-rust',
      tags: ['tag-coding'],
    },

    // Under m-stat-completed
    {
      id: 'd-stat-1',
      name: 'Convex Optimization & KKT Proofs',
      description: 'Complete problem sets 1–4 with dual formulation derivations',
      totalSessions: 6,
      completedSessions: 6,
      completedAt: subDays(now, 8).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 120 }],
      isLongTerm: true,
      status: 'completed',
      parentId: 'm-stat-completed',
      tags: ['tag-research'],
    },
    {
      id: 'd-stat-2',
      name: 'Variational Autoencoder & MCMC Sampler',
      description: 'Implement HMC and ELBO diagnostics from scratch',
      totalSessions: 6,
      completedSessions: 6,
      completedAt: subDays(now, 5).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 140 }],
      isLongTerm: true,
      status: 'completed',
      parentId: 'm-stat-completed',
      tags: ['tag-coding', 'tag-research'],
    },

    // Under m-seminar-archived
    {
      id: 'd-arch-1',
      name: 'Keynote Deck & Speaker Notes',
      description: 'Departmental presentation on efficient sequence modeling',
      totalSessions: 4,
      completedSessions: 4,
      completedAt: subDays(now, 24).toISOString(),
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 80 }],
      isLongTerm: true,
      status: 'archived',
      parentId: 'm-seminar-archived',
      tags: ['tag-archived'],
    },

    // Standalone Tier (no parent)
    {
      id: 'd-standalone-review',
      name: 'Weekly Zettelkasten & Inbox Zero',
      description: 'Organize fleeting notes into permanent literature cards',
      totalSessions: 2,
      completedSessions: 1,
      rewardCoins: 0,
      rewardXP: 0,
      rewardText: '',
      rewards: [{ type: 'coins', amount: 60 }],
      isLongTerm: true,
      status: 'active',
      isRoutine: true,
      routineType: 'weekly',
      lastRoutineReset: currentWeekStr,
      tags: ['tag-writing'],
    },
  ];

  // 4. Generate 30 days of Study Sessions (including 4 sessions today & unbroken 14-day streak)
  const history: StudySession[] = [];
  const dungeonCycle: {
    id: string;
    tags: string[];
    notes: string[];
  }[] = [
    {
      id: 'd-routine-run',
      tags: ['tag-fitness'],
      notes: ['Morning 5km tempo run, crisp pace and great energy.', 'Steady aerobic run + ankle & hip mobility.', 'Outdoor track intervals + cooldown stretch.'],
    },
    {
      id: 'd-routine-paper',
      tags: ['tag-reading', 'tag-research'],
      notes: ['Read FlashAttention-3 paper and derived warp specialization notes.', 'Annotated ring-attention communication overlap proofs.', 'Synthesized related work on linear-time state space models.'],
    },
    {
      id: 'd-thesis-p2-1',
      tags: ['tag-coding', 'tag-research'],
      notes: ['Implemented shared memory swizzling to eliminate bank conflicts.', 'Profiled Triton kernel occupancy across block sizes 64 and 128.', 'Verified numerical parity against FP16 reference implementation.'],
    },
    {
      id: 'd-thesis-p1-2',
      tags: ['tag-coding', 'tag-research'],
      notes: ['Ran FineWeb-Edu validation perplexity eval at 8k context.', 'Logged gradient norm and throughput curves in W&B.', 'Tuned cosine learning rate warmup schedule.'],
    },
    {
      id: 'd-rust-2',
      tags: ['tag-coding'],
      notes: ['Implemented Raft AppendEntries RPC handler with Tokio channels.', 'Added randomized election timeout and snapshot compaction test.', 'Fixed lock contention in concurrent subscriber registry.'],
    },
    {
      id: 'd-thesis-p3',
      tags: ['tag-writing', 'tag-research'],
      notes: ['Drafted Section 3.2 on hardware-aware sparsity patterns.', 'Polished LaTeX tables and caption formatting.', 'Created architecture diagram for multi-stage pipeline.'],
    },
    {
      id: 'd-routine-art',
      tags: ['tag-art'],
      notes: ['Painted 3 atmospheric perspective studies in Procreate.', 'Practiced rim-lighting and subsurface scattering on foliage.', 'Sketched architectural silhouettes and composition grids.'],
    },
    {
      id: 'd-routine-lang',
      tags: ['tag-lang'],
      notes: ['Shadowed ICML oral presentation and reviewed 25 academic idioms.', 'Practiced impromptu 3-minute research pitch recording.', 'Completed active recall deck for technical collocations.'],
    },
  ];

  const rewardCardNames = [
    { name: 'Study Gem', icon: 'Gem' },
    { name: 'Tiny Scroll', icon: 'Scroll' },
    { name: 'Copper Bag', icon: 'Coins' },
    { name: 'Small Wallet', icon: 'Wallet' },
    { name: 'Coffee Bean', icon: 'Coffee' },
    { name: 'Lucky Penny', icon: 'Coins' },
  ];

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    // Skip a couple of days > 15 days ago so streak is cleanly 14 days
    if (daysAgo === 15 || daysAgo === 21 || daysAgo === 26) continue;

    const dayDate = subDays(now, daysAgo);
    const dateStr = format(dayDate, 'yyyy-MM-dd');

    // Number of sessions on this day (today = 5 sessions; recent days = 3 to 6 sessions)
    const sessionsCount =
      daysAgo === 0
        ? 5
        : daysAgo <= 6
        ? 4 + (daysAgo % 3)
        : 3 + ((daysAgo * 7) % 3);

    const slotHours = [8, 10, 14, 16, 19, 21];

    for (let sIdx = 0; sIdx < sessionsCount; sIdx++) {
      const hour = slotHours[sIdx % slotHours.length];
      const minute = (sIdx * 13 + daysAgo * 7) % 35;
      const sessionTimestamp = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        hour,
        minute,
        0
      );

      // Don't create future timestamps on today
      if (daysAgo === 0 && sessionTimestamp.getTime() > now.getTime()) {
        sessionTimestamp.setHours(Math.max(7, now.getHours() - (sessionsCount - sIdx)), 15, 0);
      }

      const dInfo = dungeonCycle[(daysAgo * 3 + sIdx) % dungeonCycle.length];
      const focusDuration = sIdx === 2 && daysAgo % 2 === 0 ? 50 : 25;
      const restDuration = focusDuration === 50 ? 10 : 5;
      const duration = focusDuration + restDuration;
      const isCrit = (daysAgo + sIdx) % 9 === 0;
      const baseCoins = focusDuration === 50 ? 28 : 14;
      const coinsEarned = isCrit ? baseCoins * 5 : baseCoins + ((daysAgo + sIdx) % 6);
      const xpEarned = focusDuration === 50 ? 95 : 48;
      const rewardPick = rewardCardNames[(daysAgo + sIdx) % rewardCardNames.length];
      const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night';

      history.push({
        id: `demo-sess-${daysAgo}-${sIdx}`,
        dungeonId: dInfo.id,
        duration,
        focusDuration,
        restDuration,
        distractions: {
          internal: (daysAgo + sIdx) % 4 === 0 ? 1 : 0,
          external: (daysAgo + sIdx) % 7 === 0 ? 1 : 0,
          unavoidable: (daysAgo + sIdx) % 11 === 0 ? 1 : 0,
        },
        timestamp: sessionTimestamp.toISOString(),
        coinsEarned,
        xpEarned,
        rewardName: rewardPick.name,
        rewardIcon: rewardPick.icon,
        note: dInfo.notes[(daysAgo + sIdx) % dInfo.notes.length],
        isCrit,
        period,
        assignedDateStr: dateStr,
        tags: dInfo.tags,
        ...(sIdx === sessionsCount - 1 && sessionsCount >= 5
          ? {
              triggeredTalents: {
                perfectTheory: { xp: 180, coins: 90 },
              },
            }
          : {}),
      });
    }
  }

  // Sort history newest-first
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 5. Workstation Check-in Logs (past 14 days across Lab, Library, Home)
  const workstationLogs: Record<string, WorkstationInterval[]> = {};
  const locations = ['Lab', 'Library', 'Home'];
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const d = subDays(now, daysAgo);
    const dateStr = format(d, 'yyyy-MM-dd');
    const morningStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30);
    const morningEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 15);
    const afternoonStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13, 45);
    const afternoonEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 5);

    const loc1 = locations[daysAgo % locations.length];
    const loc2 = locations[(daysAgo + 1) % locations.length];

    workstationLogs[dateStr] = [
      {
        id: `ws-${daysAgo}-am`,
        date: dateStr,
        startTime: morningStart.toISOString(),
        endTime: morningEnd.toISOString(),
        durationMinutes: 225,
        location: loc1,
        note: `Morning deep work block at ${loc1}: kernel implementation & literature review`,
      },
      {
        id: `ws-${daysAgo}-pm`,
        date: dateStr,
        startTime: afternoonStart.toISOString(),
        endTime: afternoonEnd.toISOString(),
        durationMinutes: 260,
        location: loc2,
        note: `Afternoon experiments & writing session at ${loc2}`,
      },
    ];
  }

  // 6. Daily Logs (Sleep Tracker + Mood + Efficiency Rating + Markdown Journals)
  const dailyLogs: Record<string, DailyLog> = {};
  const moodPool = ['focused', 'productive', 'great', 'inspired', 'good'];
  const journalTitles = [
    'Breakthrough on Block-Sparse Kernel Tiling',
    'Steady Flow State & Clean Benchmark Curves',
    'Deep Literature Synthesis & Architecture Diagrams',
    'High-Focus Lab Session & Raft Consensus Progress',
    'Balanced Study Rhythm & Evening Perspective Sketching',
    'Zero-Distraction Morning & Methodology Draft',
    ' Strong Momentum on Distributed Ablations',
  ];

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const d = subDays(now, daysAgo);
    const dateStr = format(d, 'yyyy-MM-dd');
    const sleepMin = 440 + ((daysAgo * 17) % 55); // 7h20m - 8h15m
    const sleepH = 23;
    const sleepM = (10 + daysAgo * 7) % 45;
    const wakeTotalMin = (sleepH * 60 + sleepM + sleepMin) % (24 * 60);
    const wakeH = Math.floor(wakeTotalMin / 60);
    const wakeM = wakeTotalMin % 60;

    const sleepTime = `${String(sleepH).padStart(2, '0')}:${String(sleepM).padStart(2, '0')}`;
    const wakeTime = `${String(wakeH).padStart(2, '0')}:${String(wakeM).padStart(2, '0')}`;
    const mood = moodPool[daysAgo % moodPool.length];
    const rating = 82 + ((daysAgo * 5) % 15);
    const title = journalTitles[daysAgo % journalTitles.length].trim();

    dailyLogs[dateStr] = {
      title,
      rating,
      mood,
      moodScore: rating >= 90 ? 5 : 4,
      sleepTime,
      wakeTime,
      sleepDurationMin: sleepMin,
      reflection: `### 🎯 Accomplishments & Deep Work\n- Completed **${4 + (daysAgo % 3)} focus sessions** across *Neural Architecture & Thesis* and *Daily Scholar Routine*.\n- Verified shared-memory tiling efficiency and updated benchmark plots.\n\n### 🧠 Focus Quality & Distractions\n- Maintained **${rating}% efficiency** with phone in another room during morning Lab blocks.\n- Logged fleeting thoughts in Zettelkasten instead of switching browser tabs.\n\n### 💡 Key Insights & Adjustments\n- Starting with a 5km aerobic run before opening the terminal consistently boosts morning concentration.\n\n### 🚀 Top Priority for Tomorrow\n- Advance *Block-Sparse Attention Kernel* and complete daily ArXiv reading.`,
    };
  }

  const journalBookmarks = [
    todayStr,
    format(subDays(now, 2), 'yyyy-MM-dd'),
    format(subDays(now, 5), 'yyyy-MM-dd'),
  ];

  // 7. Today's Todos
  const todayTodos: TodayTodo[] = [
    {
      id: 'todo-1',
      title: 'Morning 5km Run & Mobility',
      dungeonId: 'd-routine-run',
      completed: true,
      durationMinutes: 30,
      date: todayStr,
      source: 'routine',
      tags: ['tag-fitness'],
    },
    {
      id: 'todo-2',
      title: 'ArXiv Paper Deep Reading (FlashAttention-3)',
      dungeonId: 'd-routine-paper',
      completed: true,
      durationMinutes: 60,
      date: todayStr,
      source: 'routine',
      tags: ['tag-reading', 'tag-research'],
    },
    {
      id: 'todo-3',
      title: 'Implement Block-Sparse Attention Kernel',
      dungeonId: 'd-thesis-p2-1',
      completed: true,
      durationMinutes: 50,
      date: todayStr,
      source: 'expedition',
      tags: ['tag-coding', 'tag-research'],
    },
    {
      id: 'todo-4',
      title: 'Reproduce Baseline Perplexity Benchmark',
      dungeonId: 'd-thesis-p1-2',
      completed: false,
      durationMinutes: 50,
      date: todayStr,
      source: 'ddl',
      tags: ['tag-coding'],
    },
    {
      id: 'todo-5',
      title: 'Draft Section 3.2 Architecture Diagram',
      dungeonId: 'd-thesis-p3',
      completed: false,
      durationMinutes: 30,
      date: todayStr,
      source: 'manual',
      tags: ['tag-writing'],
    },
  ];

  // 8. Quests & Achievements (with 2 completed & unclaimed so the user can test claiming!)
  const quests: Quest[] = DEFAULT_QUESTS.map((q) => {
    if (q.id === 'q_daily_1') {
      return { ...q, progress: 5, completed: true, claimed: true };
    }
    if (q.id === 'q_daily_2') {
      return { ...q, progress: 5, completed: true, claimed: false }; // Unclaimed!
    }
    if (q.id === 'q_daily_3') {
      return { ...q, progress: 5, completed: true, claimed: false }; // Unclaimed!
    }
    if (q.id === 'q_weekly_1') {
      return { ...q, progress: 22, completed: true, claimed: true };
    }
    if (q.id === 'q_weekly_2') {
      return { ...q, progress: 22, completed: false, claimed: false };
    }
    if (q.id === 'q_monthly_1') {
      return { ...q, progress: 68, completed: true, claimed: true };
    }
    if (q.id === 'a_total_10') {
      return { ...q, progress: 84, completed: true, claimed: true };
    }
    if (q.id === 'a_total_50') {
      return { ...q, progress: 84, completed: true, claimed: true };
    }
    if (q.id === 'a_total_100') {
      return { ...q, progress: 84, completed: false, claimed: false };
    }
    if (q.id === 'a_streak_3') {
      return { ...q, progress: 14, completed: true, claimed: true };
    }
    if (q.id === 'a_streak_7') {
      return { ...q, progress: 14, completed: true, claimed: true };
    }
    return q;
  });

  const questHistory: QuestHistoryItem[] = [
    {
      id: 'qh-1',
      questId: 'q_daily_1',
      title: 'Daily Warmup',
      type: 'daily_sessions',
      timestamp: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      rewards: [{ type: 'xp', amount: 50 }],
      isAchievement: false,
    },
    {
      id: 'qh-2',
      questId: 'q_weekly_1',
      title: 'Weekly Scholar',
      type: 'weekly_sessions',
      timestamp: subDays(now, 1).toISOString(),
      rewards: [{ type: 'xp', amount: 300 }],
      isAchievement: false,
    },
    {
      id: 'qh-3',
      questId: 'a_streak_7',
      title: 'Unstoppable',
      type: 'consecutive_days',
      timestamp: subDays(now, 7).toISOString(),
      rewards: [{ type: 'item', amount: 1, itemName: 'Death Defying Gold Medal' }],
      isAchievement: true,
    },
    {
      id: 'qh-4',
      questId: 'a_total_50',
      title: 'Getting Serious',
      type: 'total_sessions',
      timestamp: subDays(now, 10).toISOString(),
      rewards: [{ type: 'xp', amount: 500 }],
      isAchievement: true,
    },
  ];

  // 9. Reward History (Vault items: unredeemed coupons + redeemed treasures)
  const rewardHistory: RewardHistoryItem[] = [
    {
      id: 'rh-1',
      name: 'Five-Minute Scroll',
      rarity: 'epic',
      source: 'Explore',
      timestamp: new Date(now.getTime() - 1.5 * 3600 * 1000).toISOString(),
      type: 'text',
      rewardText: 'Take a timed 5-minute scroll break, then return to your next task',
      redeemed: false,
      note: 'Implement Block-Sparse Attention Kernel',
      sessionGoal: 50,
      sessionDuration: 50,
    },
    {
      id: 'rh-2',
      name: 'Fancy Dinner / Movie Night / Dessert',
      rarity: 'SR',
      color: 'purple',
      source: 'Gacha',
      timestamp: subDays(now, 1).toISOString(),
      type: 'text',
      rewardText: 'Fancy Dinner / Movie Night / Dessert',
      redeemed: false,
    },
    {
      id: 'rh-3',
      name: 'One Song Pass',
      rarity: 'common',
      source: 'Explore',
      timestamp: subDays(now, 1).toISOString(),
      type: 'text',
      rewardText: 'Listen to one song as a short reward before your next task',
      redeemed: false,
      note: 'ArXiv Paper Deep Reading',
      sessionGoal: 25,
      sessionDuration: 25,
    },
    {
      id: 'rh-4',
      name: 'Specialty Pour-Over Coffee & Pastry',
      rarity: 'rare',
      source: 'Shop',
      timestamp: subDays(now, 2).toISOString(),
      type: 'text',
      rewardText: 'Treat yourself to an artisan pour-over coffee & croissant',
      redeemed: false,
    },
    {
      id: 'rh-5',
      name: 'B Prize: Luxury Cushion / Desk Mat',
      rarity: 'B Prize',
      color: 'purple',
      source: 'Gacha',
      timestamp: subDays(now, 3).toISOString(),
      type: 'text',
      rewardText: 'Luxury Cushion / Desk Mat',
      redeemed: true,
    },
    {
      id: 'rh-6',
      name: 'Talent Shard',
      rarity: 'legendary',
      source: 'Explore',
      timestamp: subDays(now, 4).toISOString(),
      type: 'item',
      itemType: 'talent_shard',
      amount: 1,
      redeemed: true,
      note: 'Survey 15 Flash & Sparse Attention Papers',
    },
    {
      id: 'rh-7',
      name: 'Death Defying Medal',
      rarity: 'legendary',
      source: 'Explore',
      timestamp: subDays(now, 6).toISOString(),
      type: 'item',
      itemType: 'death_defying_medal',
      amount: 1,
      redeemed: true,
    },
    {
      id: 'rh-8',
      name: 'Watch a Movie',
      rarity: 'common',
      source: 'Shop',
      timestamp: subDays(now, 7).toISOString(),
      type: 'text',
      rewardText: 'Treat yourself to a cinema experience',
      redeemed: true,
    },
  ];

  // 10. Transaction History
  const transactionHistory: Transaction[] = [
    {
      id: 'tx-1',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      type: 'coins',
      amount: 28,
      reason: 'Focus Session Completed',
    },
    {
      id: 'tx-2',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      type: 'xp',
      amount: 95,
      reason: 'Focus Session Completed',
    },
    {
      id: 'tx-3',
      timestamp: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      type: 'coins',
      amount: 60,
      reason: 'Dungeon Completed: ArXiv Paper Deep Reading',
    },
    {
      id: 'tx-4',
      timestamp: subDays(now, 1).toISOString(),
      type: 'coins',
      amount: -100,
      reason: 'Gacha Pull: Standard Gacha',
    },
    {
      id: 'tx-5',
      timestamp: subDays(now, 2).toISOString(),
      type: 'coins',
      amount: -180,
      reason: 'Purchased: Specialty Pour-Over Coffee & Pastry',
    },
    {
      id: 'tx-6',
      timestamp: subDays(now, 4).toISOString(),
      type: 'coins',
      amount: 100,
      reason: 'Dungeon Completed: Survey 15 Flash & Sparse Attention Papers',
    },
  ];

  // 11. Pending Reward Chest (1 chest ready to open on Explore view!)
  const pendingRewardChest = [
    {
      session: history[0],
      choices: [
        INITIAL_REWARD_POOL[7], // Tiny Scroll (rare, 30 XP)
        INITIAL_REWARD_POOL[9], // Small Wallet (epic, 5 Gold Coins)
        INITIAL_REWARD_POOL[12], // Talent Shard (legendary)
        INITIAL_REWARD_POOL[11], // Five-Minute Scroll (epic)
      ],
    },
  ];

  // 12. Fellowship / Guild Preview Data
  const lastTeamData = {
    team: {
      id: 'GUILD-ASTRAL-01',
      name: 'Astral Vanguard',
      description: 'Graduate researchers & systems engineers building deep focus habits together.',
      createdAt: subDays(now, 30).getTime(),
      myUserId: 'demo-scholar-aria',
      config: {
        permission: 'captain_only',
        targetType: 'weekly_time',
        targetValue: 3600, // 60 hours weekly team goal
        rewardType: 'text',
        rewardContent: 'Weekend Hotpot & Board Game Night!',
        joinRule: 'direct',
        resetTime: '04:00',
      },
      members: [
        {
          userId: 'demo-scholar-aria',
          uniqueId: 'ID-ARIA7',
          name: 'Archmage Aria',
          avatar: 'wizard',
          title: 'Grand Chronomancer',
          bio: 'Sparse attention kernels & daily 5km runs.',
          level: 42,
          joinedAt: subDays(now, 30).getTime(),
          totalFocusTime: 4280,
          cycleFocusTime: 1120,
          cycleKey: currentWeekStr,
          isCaptain: true,
          lastActive: now.getTime() - 10 * 60 * 1000,
        },
        {
          userId: 'demo-scholar-kaelen',
          uniqueId: 'ID-KAEL2',
          name: 'Sir Kaelen',
          avatar: 'knight',
          title: 'Iron Vanguard',
          bio: 'Distributed systems & Rust compiler internals.',
          level: 38,
          joinedAt: subDays(now, 28).getTime(),
          totalFocusTime: 3890,
          cycleFocusTime: 960,
          cycleKey: currentWeekStr,
          isCaptain: false,
          lastActive: now.getTime() - 35 * 60 * 1000,
        },
        {
          userId: 'demo-scholar-lyra',
          uniqueId: 'ID-LYRA9',
          name: 'Lyra the Scribe',
          avatar: 'sage',
          title: 'Lorekeeper',
          bio: 'Computational neuroscience & digital illustration.',
          level: 35,
          joinedAt: subDays(now, 25).getTime(),
          totalFocusTime: 3420,
          cycleFocusTime: 850,
          cycleKey: currentWeekStr,
          isCaptain: false,
          lastActive: now.getTime() - 2 * 3600 * 1000,
        },
        {
          userId: 'demo-scholar-orion',
          uniqueId: 'ID-ORIO4',
          name: 'Orion Vance',
          avatar: 'alchemist',
          title: 'Arcane Alchemist',
          bio: 'Bayesian optimization & espresso calibration.',
          level: 31,
          joinedAt: subDays(now, 19).getTime(),
          totalFocusTime: 2760,
          cycleFocusTime: 620,
          cycleKey: currentWeekStr,
          isCaptain: false,
          lastActive: now.getTime() - 4 * 3600 * 1000,
        },
      ],
    },
    messages: [
      {
        id: 'tm-1',
        userId: 'demo-scholar-kaelen',
        name: 'Sir Kaelen',
        avatar: 'knight',
        content: 'Just finished 3 pomodoros on the Raft state machine! How is the kernel benchmark looking?',
        timestamp: now.getTime() - 2 * 3600 * 1000,
      },
      {
        id: 'tm-2',
        userId: 'demo-scholar-aria',
        name: 'Archmage Aria',
        avatar: 'wizard',
        content: 'Shared-memory tiling boosted throughput by 1.4x! Pushing the ablation plots this afternoon.',
        timestamp: now.getTime() - 95 * 60 * 1000,
      },
      {
        id: 'tm-3',
        userId: 'demo-scholar-lyra',
        name: 'Lyra the Scribe',
        avatar: 'sage',
        content: 'We are already at 59h / 60h for our weekly Fellowship target—one more session and we unlock the reward!',
        timestamp: now.getTime() - 40 * 60 * 1000,
      },
    ],
    events: [
      {
        id: 'te-1',
        type: 'focus',
        content: 'Archmage Aria completed a 50m focus session (+50m to Fellowship goal)',
        timestamp: now.getTime() - 45 * 60 * 1000,
      },
      {
        id: 'te-2',
        type: 'focus',
        content: 'Sir Kaelen completed a 25m focus session (+25m to Fellowship goal)',
        timestamp: now.getTime() - 110 * 60 * 1000,
      },
      {
        id: 'te-3',
        type: 'focus',
        content: 'Lyra the Scribe completed a 50m focus session (+50m to Fellowship goal)',
        timestamp: now.getTime() - 3 * 3600 * 1000,
      },
    ],
  };

  // 13. Sage AI Conversations
  const sageConversations = [
    {
      id: 'sage-conv-1',
      title: 'Structuring Thesis Chapter 3 & Kernel Ablations',
      updatedAt: now.getTime() - 3 * 3600 * 1000,
      messages: [
        {
          role: 'user' as const,
          content: 'How should I balance finishing the Triton kernel ablations with drafting Chapter 3 of my thesis this week?',
          timestamp: now.getTime() - 3.2 * 3600 * 1000,
        },
        {
          role: 'assistant' as const,
          content:
            'A dual-block rhythm works best here:\n\n1. **Morning High-Cognition Block (08:30–12:00 at Lab)**: Dedicate 2–3 sessions to *Implement Block-Sparse Attention Kernel* and launch long-running ablation jobs before lunch.\n2. **Afternoon Synthesis Block (14:00–17:30 at Library)**: While GPU jobs run, switch to *Draft Methodology & Architecture Figures* so your writing captures fresh experimental details without context-switching overhead.',
          timestamp: now.getTime() - 3.1 * 3600 * 1000,
        },
      ],
    },
  ];

  const state: AppState = {
    level: 42,
    xp: 840,
    coins: 4850,
    talentPoints: 5,
    talentShards: 2,
    deathDefyingMedals: 3,
    doubleXpCards: 2,
    doubleGoldCards: 2,
    doubleXpActive: true,
    doubleGoldActive: false,
    unlockedTalents: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'],
    activeTalents: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'],
    currentDungeonId: 'd-thesis-p2-1',
    history,
    rewardHistory,
    transactionHistory,
    questHistory,
    lastStudyDate: todayStr,
    streak: 14,
    dailySessions: 5,
    lastDailyReset: todayStr,
    lastWeeklyReset: currentWeekStr,
    lastMonthlyReset: currentMonthStr,
    patchedDays: [format(subDays(now, 9), 'yyyy-MM-dd')],
    dailyRerollUsed: false,
    claimedDailyTalents: [],
    inventory: ['coffee_bean', 'bookmark'],
    userName: 'Archmage Aria',
    userUniqueId: 'ID-ARIA7',
    userTitle: 'Grand Chronomancer',
    userBio: 'Exploring sparse neural architectures, systems programming, and daily creative mastery.',
    userAvatar: 'wizard',
    todayTodos,
    quests,
    questNotificationStyle: 'red_dot',
    unclaimedQuests: 2,
    devModeEnabled: false,
    devBaseXP: 25,
    devMinXP: 20,
    devMaxXP: 30,
    devXpMode: 'random',
    devBaseCoins: 10,
    devMinCoins: 5,
    devMaxCoins: 15,
    devCoinMode: 'random',
    devCritChance: 0.05,
    devCritMultiplier: 5,
    theme: 'daylight',
    autoTheme: false,
    dayTheme: 'daylight',
    nightTheme: 'night',
    autoThemeDayStart: '08:00',
    autoThemeNightStart: '20:00',
    heatmapScaleMax: 8,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    gachaAnimation: 'card',
    ichibanAnimation: 'scratch',
    gachaAllowOverlap: false,
    defaultMarkdownEnabled: true,
    standardSessionMinutes: 25,
    standardRestMinutes: 5,
    includeRestTimeInTasks: true,
    efficiencyRatingConfig: {
      autoCalculateOnOpen: true,
      maxDistractionsPerHour: 10,
      completionRateWeight: 70,
      focusQualityWeight: 30,
      ratingDisplayPreference: 'efficiency',
      targetTimeMode: 'daily_goal',
      capMetrics: true,
    },
    requireFocusConfirmation: false,
    timerBannerCompactMode: false,
    timerSkipVictoryMode: 'none',
    timerBannerShortcuts: ['pomodoro', 'short_break', 'long_break'],
    dailyLogs,
    journalBookmarks,
    reflectionTemplates: [
      {
        id: 'preset-1',
        name: 'Standard Review',
        content:
          '### 🎯 Accomplishments & Deep Work\n- \n\n### 🧠 Focus Quality & Distractions\n- \n\n### 💡 Key Insights & Adjustments\n- \n\n### 🚀 Top Priority for Tomorrow\n- ',
      },
      {
        id: 'preset-2',
        name: '3-2-1 Summary',
        content:
          '### 3 Completed Quests / Tasks\n1. \n2. \n3. \n\n### 2 Insights & Lessons Learned\n1. \n2. \n\n### 1 Main Goal for Tomorrow\n1. ',
      },
      {
        id: 'preset-3',
        name: 'KISS Retrospective',
        content:
          '### 🟢 Keep (What worked well and should continue)\n- \n\n### 🟡 Improve (What could be done better)\n- \n\n### 🔴 Stop (What caused distractions or friction)\n- \n\n### 🔵 Start (What new habit or strategy to try)\n- ',
      },
    ],
    autoLoadTemplateId: 'preset-1',
    autoLoadTemplateMode: 'empty',
    rewardPoolMode: 'fixed',
    rewardPool: INITIAL_REWARD_POOL,
    pendingRewardChest,
    shopItems: [
      {
        id: 'shop-1',
        name: 'Specialty Pour-Over Coffee & Pastry',
        price: 180,
        description: 'Visit a favorite cafe for an artisan pour-over and croissant',
      },
      {
        id: 'shop-2',
        name: 'Watch a Movie / Anime Marathon',
        price: 500,
        description: 'Treat yourself to a guilt-free cinema night or 3-episode marathon',
      },
      {
        id: 'shop-3',
        name: 'New Hardcover Book or Artbook',
        price: 1200,
        description: 'Pick up a book from your wishlist',
      },
      {
        id: 'shop-4',
        name: 'Mechanical Keyboard Artisan Keycap',
        price: 2500,
        description: 'Upgrade your workstation desk setup',
      },
      {
        id: 'shop-5',
        name: 'Weekend Getaway Trip',
        price: 8000,
        description: 'A well-deserved weekend excursion and nature recharge',
      },
    ],
    gachaPools: [
      {
        id: 'standard_gacha',
        name: 'Astral Sanctum Gacha',
        type: 'gacha',
        cost: 100,
        rarities: [
          { id: 'SSR', name: 'SSR', color: 'amber', weight: 5, rarityValue: 5 },
          { id: 'SR', name: 'SR', color: 'purple', weight: 15, rarityValue: 4 },
          { id: 'R', name: 'R', color: 'blue', weight: 80, rarityValue: 3 },
        ],
        items: [
          { rarity: 'SSR', name: 'Big Lego Set / New Gadget / Weekend Trip', rarityValue: 5 },
          { rarity: 'SR', name: 'Fancy Dinner / Movie Night / Dessert', rarityValue: 4 },
          { rarity: 'R', name: '1 Hour Gaming / 15m Nap / Favorite Snack', rarityValue: 3 },
        ],
      },
      {
        id: 'ichiban_1',
        name: 'Scholar Ichiban Kuji',
        type: 'ichiban',
        cost: 50,
        items: [
          { rarity: 'A Prize', name: 'Premium Figure / Collector Artbook', count: 1, initialCount: 1, color: 'amber', rarityValue: 5 },
          { rarity: 'B Prize', name: 'Luxury Ergonomic Cushion / Desk Mat', count: 1, initialCount: 2, color: 'purple', rarityValue: 4 },
          { rarity: 'C Prize', name: 'Specialty Tea Tin / Acrylic Stand', count: 4, initialCount: 5, color: 'blue', rarityValue: 3 },
          { rarity: 'D Prize', name: '30m Guilt-Free Gaming Ticket', count: 9, initialCount: 12, color: 'emerald', rarityValue: 2 },
          { rarity: 'LastOne', name: 'Golden Scholar Trophy / Noise-Cancelling Headphones', count: 1, initialCount: 1, color: 'rose', rarityValue: 6 },
        ],
      },
    ],
    activeGachaPoolId: 'standard_gacha',
    activeIchibanPoolId: 'ichiban_1',
    sagePrompts: DEFAULT_SAGE_PROMPTS,
    sageConversations,
    activeSageConversationId: 'sage-conv-1',
    workstationLocations: ['Lab', 'Library', 'Home'],
    workstationLogs,
    dailyProgressGoal: 6,
    useSameDailyProgressGoalEveryDay: true,
    statsViewOpts: {
      showDailyBar: true,
      showDailyDonut: true,
      showWeeklyBar: true,
      showWeeklyDonut: true,
      showRoutineTracker: true,
      showWorkstationTracker: true,
      showSleepTracker: true,
      showTagTracker: true,
      showHeatmap: true,
      dailyDonutMode: 'tags',
      weeklyDonutMode: 'tags',
      averageCalculationBase: 'active_days',
      yAxisMaxMode: 'dynamic',
    },
    tags,
    lastTeamData,
    account: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  return { state, dungeons, majorDungeons };
}

export function loadPreviewDemoDataIntoStorage(): void {
  const existingMain = localStorage.getItem('scholars_dungeon_state');
  const existingDungeons = localStorage.getItem('scholars_dungeon_state_dungeons');
  const existingMajors = localStorage.getItem('scholars_dungeon_state_major_dungeons');

  // Preserve non-demo backup if not already backed up
  if (existingMain && !localStorage.getItem(PRE_DEMO_BACKUP_KEY)) {
    try {
      const parsed = JSON.parse(existingMain);
      if (parsed?.userUniqueId !== 'ID-ARIA7') {
        localStorage.setItem(
          PRE_DEMO_BACKUP_KEY,
          JSON.stringify({
            state: existingMain,
            dungeons: existingDungeons || '[]',
            majorDungeons: existingMajors || '[]',
          })
        );
      }
    } catch {
      // ignore parse errors
    }
  }

  const demo = buildPreviewDemoData(new Date());
  localStorage.setItem('scholars_dungeon_state', JSON.stringify(demo.state));
  localStorage.setItem('scholars_dungeon_state_dungeons', JSON.stringify(demo.dungeons));
  localStorage.setItem('scholars_dungeon_state_major_dungeons', JSON.stringify(demo.majorDungeons));
  localStorage.setItem(DEMO_SEEDED_FLAG_KEY, 'true');
}

export function restorePreDemoBackupFromStorage(): boolean {
  const raw = localStorage.getItem(PRE_DEMO_BACKUP_KEY);
  if (!raw) return false;
  try {
    const backup = JSON.parse(raw);
    if (backup.state) {
      localStorage.setItem('scholars_dungeon_state', backup.state);
      localStorage.setItem('scholars_dungeon_state_dungeons', backup.dungeons || '[]');
      localStorage.setItem('scholars_dungeon_state_major_dungeons', backup.majorDungeons || '[]');
      localStorage.removeItem(PRE_DEMO_BACKUP_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function downloadPreviewDemoJsonFile(): void {
  const demo = buildPreviewDemoData(new Date());
  const exportPayload = {
    ...demo.state,
    dungeons: demo.dungeons,
    majorDungeons: demo.majorDungeons,
  };
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'scholars_dungeon_preview_demo.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
