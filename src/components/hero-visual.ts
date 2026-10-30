import { getHeroImage } from '../lib/hero-images'
import { heroInitials, type Hero } from '../lib/heroes'

export function fillHeroVisual(container: HTMLElement, hero: Hero | null): void {
  container.replaceChildren()

  const fallback = document.createElement('span')
  fallback.textContent = hero ? heroInitials(hero.name) : '+'
  container.append(fallback)

  if (!hero) return

  const src = getHeroImage(hero.id)
  if (!src) return

  const image = document.createElement('img')
  image.alt = ''
  image.loading = 'lazy'
  image.decoding = 'async'
  image.referrerPolicy = 'no-referrer'
  image.draggable = false
  image.className = 'absolute inset-0 h-full w-full object-cover'
  image.addEventListener(
    'load',
    () => {
      fallback.hidden = true
    },
    { once: true },
  )
  image.addEventListener('error', () => image.remove(), { once: true })
  image.src = src
  container.append(image)
}
