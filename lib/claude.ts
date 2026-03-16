import Anthropic from '@anthropic-ai/sdk'
import type { ChartConfig, KeyMetric } from './supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MODEL = 'claude-haiku-4-5'

export interface AnalysisResult {
  narrative: string
  key_metrics: KeyMetric[]
  chart_configs: ChartConfig[]
  recommendations: string[]
}

export async function analyzeDataset(params: {
  filename: string
  rowCount: number
  columns: string[]
  columnTypes: Record<string, string>
  summaryStats: Record<string, unknown>
  dataSample: string
}): Promise<AnalysisResult> {
  const { filename, rowCount, columns, columnTypes, summaryStats, dataSample } = params

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `You are an expert data analyst. Analyze datasets and return structured insights that business owners can immediately act on. Respond with a single valid JSON object. No markdown. No backticks. No explanation outside the JSON.`,
    messages: [
      {
        role: 'user',
        content: `Analyze this dataset and return ONLY this JSON structure (no markdown, no backticks, raw JSON only):
{
  "narrative": "<3-4 paragraph plain-English analysis covering: what this data shows, key trends found, anomalies or outliers, performance highlights and lowlights. Be specific — reference actual column names and values from the data.>",
  "key_metrics": [
    {
      "label": "<metric name>",
      "value": "<metric value with unit>",
      "trend": "<up | down | stable>",
      "significance": "<1 sentence why it matters>"
    }
  ],
  "chart_configs": [
    {
      "type": "<bar | line | pie | doughnut>",
      "title": "<chart title>",
      "labels": ["<label1>", "<label2>"],
      "datasets": [
        {
          "label": "<dataset label>",
          "data": [0, 0]
        }
      ],
      "reasoning": "<why this chart type for this data>"
    }
  ],
  "recommendations": [
    "<specific actionable recommendation 1>",
    "<specific actionable recommendation 2>",
    "<specific actionable recommendation 3>",
    "<specific actionable recommendation 4>"
  ]
}

Rules:
- key_metrics: return 4-6 most important metrics
- chart_configs: return 2-3 most relevant charts
- recommendations: return exactly 4 specific, actionable items
- Use actual numbers from the data in narrative and metrics
- Chart data arrays must contain numbers only, no strings

Dataset info:
Filename: ${filename}
Rows: ${rowCount}
Columns: ${columns.join(', ')}
Column types: ${JSON.stringify(columnTypes)}
Summary stats: ${JSON.stringify(summaryStats)}

Data sample:
${dataSample}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const result = JSON.parse(cleaned) as AnalysisResult
  return result
}

export async function askQuestion(params: {
  question: string
  analysisId: string
  columns: string[]
  narrative: string
  summaryStats: Record<string, unknown>
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<string> {
  const { question, columns, narrative, summaryStats, conversationHistory } = params

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: question,
    },
  ]

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are a data analyst assistant. Answer questions about the dataset below concisely and accurately. Use specific numbers from the data when possible. Keep answers to 2-4 sentences unless a longer answer is clearly needed.

Dataset context:
Columns: ${columns.join(', ')}
Summary stats: ${JSON.stringify(summaryStats)}
AI Analysis: ${narrative}`,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
