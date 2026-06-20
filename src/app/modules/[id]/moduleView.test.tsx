import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleView } from './ModuleView';
import type { Module } from '@/curriculum/types';

const mod: Module = {
  id: 'm',
  title: 'Test module',
  orderHint: 1,
  difficulty: 1,
  weaknessTags: ['hangsPieces'],
  content: 'Lesson body here',
  examplePositions: [],
  practice: [],
  completionCriteria: { practiceToPass: 0 },
};

describe('ModuleView', () => {
  it('renders the module title and content', () => {
    render(<ModuleView module={mod} />);
    expect(screen.getByRole('heading', { name: /test module/i })).toBeInTheDocument();
    expect(screen.getByText(/lesson body/i)).toBeInTheDocument();
  });
});
