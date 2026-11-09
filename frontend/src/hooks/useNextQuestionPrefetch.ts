import { useEffect, useRef } from 'react'
import type { TestQuestion } from '@/types/api'

/**
 * Collects every image URL a question will render: the main diagram plus the
 * per-option images (`option_images` is an open JSON object keyed by option
 * letter, so values are checked at runtime rather than cast).
 */
export function getQuestionImageUrls(question: TestQuestion | undefined): string[] {
  if (!question) return []

  const urls: string[] = []
  if (typeof question.question_image_url === 'string' && question.question_image_url) {
    urls.push(question.question_image_url)
  }

  const optionImages = question.option_images
  if (optionImages && typeof optionImages === 'object') {
    for (const value of Object.values(optionImages)) {
      if (typeof value === 'string' && value) urls.push(value)
    }
  }
  return urls
}

/**
 * Warms the browser cache with the NEXT question's diagrams so they render
 * instantly on "Save & Next". Does nothing until the exam has started, so the
 * instruction screen never downloads exam content early.
 */
export default function useNextQuestionPrefetch(
  questions: TestQuestion[],
  current: number,
  enabled: boolean
): void {
  // Holding the Image objects keeps in-flight requests from being collected
  // before they finish; the Map also dedupes URLs already requested.
  const requested = useRef<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    if (!enabled) return

    for (const url of getQuestionImageUrls(questions[current + 1])) {
      if (requested.current.has(url)) continue
      const img = new Image()
      img.src = url
      requested.current.set(url, img)
    }
  }, [questions, current, enabled])
}
