import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntelligenceResultView } from './IntelligenceResultView';
import { LEADS } from '@/data/leads';
import type { IntelligenceResult } from '@/types';

const result: IntelligenceResult = {
  icp_options: [{ value: 'Enterprise Finance', confidence: 'high', reasoning: 'r' }],
  tier: 'Tier 1',
  it_type: 'Cloud',
  pain_points: ['legacy hardware'],
};

describe('IntelligenceResultView', () => {
  it('renders ICP options and fires onSelectIcp', () => {
    const onSelect = vi.fn();
    render(
      <IntelligenceResultView
        result={result}
        lead={LEADS[0]}
        selectedIcp={null}
        onSelectIcp={onSelect}
        depth="deep"
      />
    );
    fireEvent.click(screen.getByText('Enterprise Finance'));
    expect(onSelect).toHaveBeenCalledWith('Enterprise Finance');
  });

  it('renders the inferred tier', () => {
    render(
      <IntelligenceResultView
        result={result}
        lead={LEADS[0]}
        selectedIcp="Enterprise Finance"
        onSelectIcp={() => {}}
        depth="deep"
      />
    );
    expect(screen.getByText('Tier 1')).toBeInTheDocument();
  });
});
