import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

export type Goal = 'lose_fat' | 'gain_mass' | 'endurance' | 'general';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface WorkoutInput {
  goal: Goal;
  level: Level;
  daysPerWeek: number;   // 1-7
  minutesPerSession: number; // 20-120
  equipment?: 'full_gym' | 'bodyweight';
}

export interface WorkoutDay {
  day: number;
  focus: string;
  exercises: { name: string; sets: number; reps: string; restSec: number }[];
}

export interface WorkoutPlan {
  summary: string;
  weeklySchedule: WorkoutDay[];
  notes: string[];
  source: 'ai' | 'mock';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly redis = this.redisSvc.getClient();
  private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  private readonly model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';

  constructor(private readonly redisSvc: RedisService) {}

  async generateWorkoutPlan(input: WorkoutInput): Promise<WorkoutPlan> {
    this.validate(input);

    const key = this.cacheKey(input);
    const cached = await this.redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as WorkoutPlan;
      } catch {
        // fall through and regenerate
      }
    }

    let plan: WorkoutPlan;
    if (this.apiKey) {
      try {
        plan = await this.callClaude(input);
      } catch (err: any) {
        this.logger.warn(`Claude call failed, returning mock plan: ${err?.message ?? err}`);
        plan = this.mockPlan(input);
      }
    } else {
      plan = this.mockPlan(input);
    }

    await this.redis.set(key, JSON.stringify(plan), 'EX', 60 * 60 * 24);
    return plan;
  }

  private validate(input: WorkoutInput) {
    const goals: Goal[] = ['lose_fat', 'gain_mass', 'endurance', 'general'];
    const levels: Level[] = ['beginner', 'intermediate', 'advanced'];
    if (!goals.includes(input.goal)) throw new BadRequestException('Invalid goal');
    if (!levels.includes(input.level)) throw new BadRequestException('Invalid level');
    if (input.daysPerWeek < 1 || input.daysPerWeek > 7) {
      throw new BadRequestException('daysPerWeek must be 1..7');
    }
    if (input.minutesPerSession < 20 || input.minutesPerSession > 120) {
      throw new BadRequestException('minutesPerSession must be 20..120');
    }
  }

  private cacheKey(input: WorkoutInput) {
    const h = crypto
      .createHash('sha1')
      .update(JSON.stringify(input))
      .digest('hex')
      .slice(0, 12);
    return `ai:workout:${h}`;
  }

  private async callClaude(input: WorkoutInput): Promise<WorkoutPlan> {
    const prompt = this.buildPrompt(input);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Claude API ${res.status}`);
    }
    const data: any = await res.json();
    const text: string =
      data?.content?.[0]?.text ??
      data?.content?.[0]?.['text'] ??
      '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');
    const parsed = JSON.parse(jsonMatch[0]) as Omit<WorkoutPlan, 'source'>;
    return { ...parsed, source: 'ai' };
  }

  private buildPrompt(input: WorkoutInput): string {
    return [
      'You are a certified strength & conditioning coach.',
      `Design a ${input.daysPerWeek}-day weekly workout plan for a ${input.level} client.`,
      `Goal: ${input.goal}. Session length: ${input.minutesPerSession} minutes.`,
      `Equipment: ${input.equipment ?? 'full_gym'}.`,
      'Return ONLY valid JSON matching this TypeScript type, with no extra prose:',
      '```',
      'type WorkoutPlan = {',
      '  summary: string;',
      '  weeklySchedule: Array<{',
      '    day: number;',
      '    focus: string;',
      '    exercises: Array<{ name: string; sets: number; reps: string; restSec: number }>;',
      '  }>;',
      '  notes: string[];',
      '};',
      '```',
    ].join('\n');
  }

  // ---------- Mock fallback ----------
  private mockPlan(input: WorkoutInput): WorkoutPlan {
    const templates: Record<Goal, { focus: string; ex: { name: string; sets: number; reps: string; rest: number }[] }[]> = {
      gain_mass: [
        { focus: 'Push (chest/shoulders/triceps)', ex: [
          { name: 'Bench Press',         sets: 4, reps: '6-8',  rest: 120 },
          { name: 'Overhead DB Press',   sets: 3, reps: '8-10', rest: 90 },
          { name: 'Incline DB Fly',      sets: 3, reps: '10-12',rest: 60 },
          { name: 'Triceps Pushdown',    sets: 3, reps: '10-12',rest: 60 },
        ]},
        { focus: 'Pull (back/biceps)', ex: [
          { name: 'Deadlift',            sets: 4, reps: '5',    rest: 150 },
          { name: 'Pull-up',             sets: 4, reps: '6-10', rest: 90 },
          { name: 'Seated Cable Row',    sets: 3, reps: '8-12', rest: 75 },
          { name: 'Barbell Curl',        sets: 3, reps: '8-12', rest: 60 },
        ]},
        { focus: 'Legs', ex: [
          { name: 'Back Squat',          sets: 5, reps: '5',    rest: 150 },
          { name: 'Romanian Deadlift',   sets: 3, reps: '8',    rest: 90 },
          { name: 'Walking Lunge',       sets: 3, reps: '12/leg', rest: 75 },
          { name: 'Standing Calf Raise', sets: 4, reps: '12-15', rest: 45 },
        ]},
      ],
      lose_fat: [
        { focus: 'Full body strength + finisher', ex: [
          { name: 'Goblet Squat',  sets: 4, reps: '10', rest: 60 },
          { name: 'DB Bench Press', sets: 4, reps: '10', rest: 60 },
          { name: 'Bent-over Row', sets: 4, reps: '10', rest: 60 },
          { name: 'Burpees AMRAP', sets: 1, reps: '8 min', rest: 0 },
        ]},
        { focus: 'Conditioning + core', ex: [
          { name: 'Row Erg Intervals', sets: 6, reps: '500m', rest: 90 },
          { name: 'Plank',         sets: 3, reps: '60s',  rest: 30 },
          { name: 'Hanging Knee Raise', sets: 3, reps: '12', rest: 45 },
        ]},
      ],
      endurance: [
        { focus: 'Z2 cardio + posterior chain', ex: [
          { name: 'Treadmill Z2',    sets: 1, reps: '40 min', rest: 0 },
          { name: 'Kettlebell Swing', sets: 4, reps: '20', rest: 60 },
          { name: 'Back Extension',   sets: 3, reps: '15', rest: 45 },
        ]},
        { focus: 'Tempo run', ex: [
          { name: 'Run @ tempo pace', sets: 1, reps: '20 min', rest: 0 },
          { name: 'Dynamic stretching', sets: 1, reps: '10 min', rest: 0 },
        ]},
      ],
      general: [
        { focus: 'Upper body', ex: [
          { name: 'DB Bench Press', sets: 3, reps: '10', rest: 60 },
          { name: 'Lat Pulldown',   sets: 3, reps: '10', rest: 60 },
          { name: 'DB Shoulder Press', sets: 3, reps: '10', rest: 60 },
          { name: 'Plank',          sets: 3, reps: '45s', rest: 30 },
        ]},
        { focus: 'Lower body', ex: [
          { name: 'Goblet Squat', sets: 3, reps: '10', rest: 60 },
          { name: 'Romanian DL',  sets: 3, reps: '10', rest: 60 },
          { name: 'Step-up',      sets: 3, reps: '10/leg', rest: 60 },
          { name: 'Calf Raise',   sets: 3, reps: '15', rest: 45 },
        ]},
      ],
    };

    const pool = templates[input.goal];
    const weeklySchedule: WorkoutDay[] = [];
    for (let i = 0; i < input.daysPerWeek; i++) {
      const t = pool[i % pool.length];
      weeklySchedule.push({
        day: i + 1,
        focus: t.focus,
        exercises: t.ex.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          restSec: e.rest,
        })),
      });
    }

    return {
      summary: `Mock ${input.daysPerWeek}-day plan for ${input.goal} (${input.level}). Set ANTHROPIC_API_KEY in .env for a personalised plan.`,
      weeklySchedule,
      notes: [
        'Warm up 5-10 minutes before each session.',
        'Add 5 min cooldown stretching after.',
        'Sleep 7-9 h, hydrate, eat enough protein (1.6-2.2 g/kg).',
      ],
      source: 'mock',
    };
  }
}
