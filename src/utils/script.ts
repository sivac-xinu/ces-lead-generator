import type { Lead, Solution, Tone } from '@/types'

export function fillTemplate(template: string, lead: Lead, solutions: Solution[], rep = 'CES'): string {
  const firstName = lead.contact_name?.split(' ')[0] || 'there'
  const pains = lead.pain_points || []
  const matched = solutions.slice(0, 3)
  const solutionNames = matched.length ? matched.map(s => s.service).join(', ') : 'our managed IT services'
  const solutionText = matched.length
    ? matched
        .map(
          s =>
            `${s.service}: ${s.pitch}`
        )
        .join('\n\n')
    : 'CES provides end-to-end managed IT services tailored to your environment.'

  return template
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{rep\}/g, rep)
    .replace(/\{company\}/g, lead.company)
    .replace(/\{industry\}/g, lead.industry)
    .replace(/\{infra\}/g, lead.current_infra || 'your current environment')
    .replace(/\{pain1\}/g, pains[0] || 'operational efficiency gaps')
    .replace(/\{pain2\}/g, pains[1] || 'security and compliance exposure')
    .replace(/\{solutions\}/g, solutionNames)
    .replace(/\{solutionText\}/g, solutionText)
}

export function buildScript(lead: Lead, tone: Tone, solutions: Solution[]): { section: string; text: string }[] {
  return [
    { section: 'Opening / Hook', text: fillTemplate(tone.scripts.hook, lead, solutions) },
    { section: 'Discovery / Pain', text: fillTemplate(tone.scripts.pain, lead, solutions) },
    { section: 'Value Proposition', text: fillTemplate(tone.scripts.value, lead, solutions) },
    { section: 'Objection Handle', text: fillTemplate(tone.scripts.objection, lead, solutions) },
    { section: 'Close / CTA', text: fillTemplate(tone.scripts.cta, lead, solutions) },
  ]
}

export function getTalkingPoints(lead: Lead, solutions: Solution[]): string[] {
  const points = [
    `Lead with: ${lead.it_type === 'Cloud' ? '"AI cost governance and cloud overspend"' : lead.it_type === 'On-Premise' ? '"EOL risk and the cost of staying put"' : '"hybrid complexity — visibility gaps and security blind spots"'}`,
    `Relevant trend: ${solutions[0]?.trend || 'IT infrastructure modernisation is accelerating across the sector.'}`,
    `Buy signal to listen for: ${solutions[0]?.buySignal || 'mentions of budget pressure, legacy systems, or compliance deadlines.'}`,
    `CES differentiator: ${solutions[0]?.stat || 'Proven track record managing enterprise IT infrastructure.'}`,
  ]
  return points
}

export function downloadScript(lead: Lead, toneLabel: string, sections: { section: string; text: string }[]) {
  const text = sections.map(s => `${s.section}\n${s.text}`).join('\n\n---\n\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${lead.company.replace(/\s+/g, '_')}_${toneLabel}_script.txt`
  a.click()
  URL.revokeObjectURL(url)
}
