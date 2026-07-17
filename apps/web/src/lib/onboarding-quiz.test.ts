import { describe, expect, it } from 'vitest'
import {
  type Answers,
  isComplete,
  nextQuestion,
  prunedAnswers,
  QUESTIONS,
} from './onboarding-quiz'

describe('onboarding quiz graph', () => {
  it('starts with the coffee question', () => {
    expect(nextQuestion({})?.id).toBe('coffee')
  })

  it('skips the chocolate confirm when coffee is unambiguous (black)', () => {
    expect(nextQuestion({ coffee: 'black' })?.id).toBe('bitterness_direct')
  })

  it('asks the chocolate confirm when coffee is ambiguous (milk_based)', () => {
    expect(nextQuestion({ coffee: 'milk_based' })?.id).toBe('chocolate')
  })

  it('asks the sour-wild refinement only when sour is loved', () => {
    const base: Answers = {
      coffee: 'black',
      bitterness_direct: 'some',
      water: 'strong',
      sweet_tooth: 'dry',
      roasted: 'neutral',
      strength: 'strong',
    }
    expect(nextQuestion({ ...base, sour_foods: 'love' })?.id).toBe('sour_wild')
    expect(nextQuestion({ ...base, sour_foods: 'okay' })?.id).toBe('smoked_foods')
  })

  it('asks the CATA avoid question only on an extreme avoid', () => {
    const base: Answers = {
      coffee: 'black',
      bitterness_direct: 'some',
      water: 'strong',
      sweet_tooth: 'dry',
      roasted: 'neutral',
      strength: 'strong',
      sour_foods: 'avoid',
      smoked_foods: 'okay',
      adventure: 'high',
    }
    expect(nextQuestion(base)?.id).toBe('avoids')
    const noAvoid = { ...base, sour_foods: 'okay' as const }
    // No extreme avoid -> CATA skipped, capstone (optional) is next.
    expect(nextQuestion(noAvoid)?.id).toBe('flavor_cues')
  })

  it('the unbranched core path is 9 always-shown questions', () => {
    const core = QUESTIONS.filter(
      (q) => !q.shouldAsk && !q.optional,
    ).map((q) => q.id)
    expect(core).toEqual([
      'coffee',
      'bitterness_direct',
      'water',
      'sweet_tooth',
      'roasted',
      'strength',
      'sour_foods',
      'smoked_foods',
      'adventure',
    ])
  })

  it('is complete only when every active question is answered', () => {
    const a: Answers = {
      coffee: 'black',
      bitterness_direct: 'some',
      water: 'strong',
      sweet_tooth: 'dry',
      roasted: 'neutral',
      strength: 'strong',
      sour_foods: 'okay',
      smoked_foods: 'okay',
      adventure: 'high',
    }
    expect(isComplete(a)).toBe(false) // capstone (optional) still pending
    expect(isComplete({ ...a, flavor_cues: [] })).toBe(true) // skipping it completes
  })

  it('prunes answers whose branch went inactive', () => {
    const a: Answers = { coffee: 'black', chocolate: 'dark_70', water: 'still' }
    expect(prunedAnswers(a)).not.toHaveProperty('chocolate')
    expect(prunedAnswers(a)).toMatchObject({ coffee: 'black', water: 'still' })
  })
})
