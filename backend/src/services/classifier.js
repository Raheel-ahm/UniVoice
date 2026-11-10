import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { config } from '../config.js'
import { getCatalog } from './catalog.js'

const anthropicClient = config.anthropicConfigured
  ? new Anthropic({ timeout: 25_000, maxRetries: 1 })
  : null

const SYSTEM_PROMPT = `You triage maintenance reports for a university campus.
Students describe physical campus problems: broken equipment, electrical faults, plumbing leaks, damaged infrastructure, etc.

Priority aspects:
- high: immediate safety risk, hazardous condition, active flooding, electrical sparks/exposed wiring, fire hazard, locked exit doors, or severe disruption.
- medium: functional problem affecting teaching, studies, or daily work but not dangerous (e.g. broken projector, toilet out of order, broken desk, AC failing).
- low: cosmetic blemish, minor inconvenience (e.g. flickering bulb in corridor, scuffed wall, chipped paint).

Emergency criteria:
- is_emergency: true ONLY if active fire, smoke, explosion, gas leak, active electrical sparks touching water, person trapped in elevator, or structural collapse requiring instant dispatch.`

async function classifyWithGemini({ title, description, building, room, categories, departments }) {
  const deptById = new Map(departments.map((d) => [d.id, d.name]))
  const categoryList = categories
    .map((c) => `- "${c.name}" (default department: "${deptById.get(c.default_department_id) ?? 'none'}")`)
    .join('\n')
  const departmentList = departments.map((d) => `- "${d.name}"`).join('\n')

  const prompt = `${SYSTEM_PROMPT}

Allowed categories (choose exact name from this list):
${categoryList}

Allowed departments (choose exact name from this list):
${departmentList}

Report:
Title: ${title}
Description: ${description}
${building ? `Building: ${building}` : ''}
${room ? `Room: ${room}` : ''}

Instructions:
1. Identify the core physical problem and assign the single best category from the allowed categories list.
2. Assign the responsible department from the allowed departments list.
3. Assign priority ("low", "medium", or "high") using the priority aspects above.
4. Set is_emergency to true ONLY if there is an active emergency requiring immediate dispatch.
5. Write one short sentence for reason explaining why this category and priority were selected.

Return ONLY a JSON object in this exact shape:
{
  "category": "string (from allowed categories)",
  "department": "string (from allowed departments)",
  "priority": "low" | "medium" | "high",
  "is_emergency": boolean,
  "reason": "string"
}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Empty response from Gemini API')

  const parsed = JSON.parse(rawText)
  const matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === (parsed.category || '').toLowerCase().trim(),
  ) || categories.find((c) => (parsed.category || '').toLowerCase().includes(c.name.toLowerCase()))

  const matchedDepartment = departments.find(
    (d) => d.name.toLowerCase() === (parsed.department || '').toLowerCase().trim(),
  )

  if (!matchedCategory) {
    throw new Error(`Gemini suggested category "${parsed.category}" which is not in the system catalog.`)
  }

  const validPriority = ['low', 'medium', 'high'].includes(parsed.priority) ? parsed.priority : 'medium'

  return {
    available: true,
    is_emergency: Boolean(parsed.is_emergency),
    emergency_phone: parsed.is_emergency ? config.campusSecurityPhone : undefined,
    suggestion: {
      categoryId: matchedCategory.id,
      departmentId: matchedDepartment?.id ?? matchedCategory.default_department_id,
      priority: validPriority,
      reason: parsed.reason || `Classified as ${matchedCategory.name} (${validPriority} priority).`,
    },
  }
}

async function classifyWithAnthropic({ title, description, building, room, categories, departments }) {
  if (!anthropicClient) throw new Error('Anthropic client not configured')

  const Suggestion = z.object({
    category: z.enum(categories.map((c) => c.name)),
    department: z.enum(departments.map((d) => d.name)),
    priority: z.enum(['low', 'medium', 'high']),
    is_emergency: z.boolean(),
    reason: z.string(),
  })

  const deptById = new Map(departments.map((d) => [d.id, d.name]))
  const categoryList = categories
    .map((c) => `- ${c.name} (default department: ${deptById.get(c.default_department_id) ?? 'none'})`)
    .join('\n')

  const report = [
    `<title>${title}</title>`,
    `<description>${description}</description>`,
    building ? `<building>${building}</building>` : '',
    room ? `<room>${room}</room>` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const response = await anthropicClient.beta.messages.parse({
    model: config.anthropicModel,
    max_tokens: 4096,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(Suggestion) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Allowed categories:\n${categoryList}\n\nAllowed departments:\n${departments
          .map((d) => `- ${d.name}`)
          .join('\n')}\n\nReport:\n${report}`,
      },
    ],
  })

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error('Refused or empty output from Anthropic')
  }

  const out = response.parsed_output
  const category = categories.find((c) => c.name === out.category)
  const department = departments.find((d) => d.name === out.department)

  return {
    available: true,
    is_emergency: Boolean(out.is_emergency),
    emergency_phone: out.is_emergency ? config.campusSecurityPhone : undefined,
    suggestion: {
      categoryId: category.id,
      departmentId: department?.id ?? category.default_department_id,
      priority: out.priority,
      reason: out.reason,
    },
  }
}

export async function classifyIssue({ title, description, building, room, disableAi = false }) {
  // Option to turn off AI response for testing manual workflow
  if (!config.enableAi || disableAi) {
    return {
      available: false,
      reason: 'AI suggestions are currently turned off (test mode). Please select category, department, and priority manually.',
    }
  }

  if (!config.geminiConfigured && !config.anthropicConfigured) {
    return { available: false, reason: 'AI suggestions are not configured on this server.' }
  }

  const { departments, categories } = await getCatalog()
  if (categories.length === 0 || departments.length === 0) {
    return { available: false, reason: 'No categories or departments are set up yet.' }
  }

  // Primary: Gemini
  if (config.geminiConfigured) {
    try {
      return await classifyWithGemini({ title, description, building, room, categories, departments })
    } catch (geminiError) {
      console.warn('Gemini classifier error:', geminiError.message)
      // If Anthropic is also configured, try fallback
      if (config.anthropicConfigured) {
        try {
          return await classifyWithAnthropic({ title, description, building, room, categories, departments })
        } catch (anthropicError) {
          console.warn('Anthropic classifier fallback error:', anthropicError.message)
        }
      }
      return { available: false, reason: 'AI suggestions are unavailable right now. Please choose manually.' }
    }
  }

  // Secondary: Anthropic
  try {
    return await classifyWithAnthropic({ title, description, building, room, categories, departments })
  } catch (error) {
    console.error('AI classifier failed:', error.message)
    return { available: false, reason: 'AI suggestions are unavailable right now. Please choose manually.' }
  }
}
