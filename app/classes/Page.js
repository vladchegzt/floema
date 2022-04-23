import AutoBind from 'auto-bind'
import EventEmitter from 'events'
import GSAP from 'gsap'
import Prefix from 'prefix'

import Button from 'animations/Button'
import Link from 'animations/Link'
import Magnetic from 'animations/Magnetic'
import Parallax from 'animations/Parallax'
import Paragraph from 'animations/Paragraph'
import Rotation from 'animations/Rotation'
import Translate from 'animations/Translate'

import AsyncLoad from 'classes/AsyncLoad'
import Detection from 'classes/Detection'

import each from 'lodash/each'

import { mapEach } from 'utils/dom'
import { clamp, lerp } from 'utils/math'
import { split } from 'utils/text'
export default class extends EventEmitter {
  constructor ({ classes, element, elements, isScrollable = true }) {
    super()

    AutoBind(this)

    this.classes = {
      ...classes
    }

    this.selectors = {
      element,
      elements: {
        preloaders: '[data-src]',

        animationsButtons: '[data-animation="button"]',
        animationsLinks: '[data-animation="link"]',
        animationsMagnetics: '[data-animation="magnetic"]',
        animationsParallaxes: '[data-animation="parallax"]',
        animationsParagraphs: '[data-animation="paragraph"]',
        animationsRotations: '[data-animation="rotation"]',
        animationsTranslates: '[data-animation="translate"]',

        footer: '.footer',
        footerCredits: '.footer__credits',

        ...elements
      }
    }

    this.scroll = {
      ease: 0.07,
      position: 0,
      current: 0,
      target: 0,
      limit: 0
    }

    this.isScrollable = isScrollable

    this.transformPrefix = Prefix('transform')

    this.create()
  }

  create () {
    this.animations = []

    this.element = document.querySelector(this.selectors.element)
    this.elements = {}

    each(this.selectors.elements, (selector, key) => {
      if (selector instanceof window.HTMLElement || selector instanceof window.NodeList) {
        this.elements[key] = selector
      } else if (Array.isArray(selector)) {
        this.elements[key] = selector
      } else {
        this.elements[key] = this.element.querySelectorAll(selector)

        if (this.elements[key].length === 0) {
          this.elements[key] = null
        } else if (this.elements[key].length === 1) {
          this.elements[key] = this.element.querySelector(selector)
        }
      }
    })

    if (this.isScrollable) {
      this.scroll = {
        ease: 0.07,
        position: 0,
        current: 0,
        target: 0,
        limit: this.elements.wrapper.clientHeight - window.innerHeight
      }
    }

    this.createAnimations()
    this.createObserver()
    this.createPreloaders()
  }

  /**
   * Animations.
   */
  createAnimations () {
    /**
     * Buttons.
     */
    this.animationsButtons = mapEach(this.elements.animationsButtons, (element, index) => {
      return new Button({
        element
      })
    })

    this.animations.push(...this.animationsButtons)

    /**
     * Links.
     */
    this.animationsLinks = mapEach(this.elements.animationsLinks, (element, index) => {
      return new Link({
        element
      })
    })

    this.animations.push(...this.animationsLinks)

    /**
     * Magnetics.
     */
    this.animationsMagnetics = mapEach(this.elements.animationsMagnetics, (element, index) => {
      return new Magnetic({
        element
      })
    })

    this.animations.push(...this.animationsMagnetics)

    /**
     * Parallaxes.
     */
    this.animationsParallaxes = mapEach(this.elements.animationsParallaxes, element => {
      return new Parallax({ element })
    })

    this.animations.push(...this.animationsParallaxes)

    /**
     * Paragraphs.
     */
    this.animationsParagraphs = mapEach(this.elements.animationsParagraphs, element => {
      return new Paragraph({ element })
    })

    this.animations.push(...this.animationsParagraphs)

    /**
     * Rotations.
     */
    this.animationsRotations = mapEach(this.elements.animationsRotations, element => {
      return new Rotation({ element })
    })

    this.animations.push(...this.animationsRotations)

    /**
     * Translates.
     */
    this.animationsTranslates = mapEach(this.elements.animationsTranslates, element => {
      return new Translate({ element })
    })

    this.animations.push(...this.animationsTranslates)
  }

  /**
   * Observer.
   */
  createObserver () {
    this.observer = new window.ResizeObserver(entries => {
      for (const entry of entries) { // eslint-disable-line
        window.requestAnimationFrame(_ => {
          this.scroll.limit = this.elements.wrapper.clientHeight - window.innerHeight
        })
      }
    })

    this.observer.observe(this.elements.wrapper)
  }

  /**
   * Footer.
   */
  createPreloaders () {
    this.preloaders = mapEach(this.elements.preloaders, element => {
      return new AsyncLoad({
        element
      })
    })
  }

  /**
   * Animations.
   */
  reset () {
    this.scroll = {
      ease: 0.07,
      position: 0,
      current: 0,
      target: 0,
      limit: 0
    }
  }

  set (value) {
    this.scroll.current = this.scroll.target = this.scroll.last = value

    this.transform(this.elements.wrapper, this.scroll.current)
  }

  show (url) {
    this.reset()

    this.isVisible = true

    this.addEventListeners()

    GSAP.set(document.documentElement, {
      backgroundColor: this.element.getAttribute('data-background'),
      color: this.element.getAttribute('data-color')
    })

    return Promise.resolve()
  }

  hide (url) {
    this.isVisible = false

    this.removeEventListeners()

    return Promise.resolve()
  }

  transform (element, y) {
    element.style[this.transformPrefix] = `translate3d(0, ${-Math.round(y)}px, 0)`
  }

  /**
   * Events.
   */
  onResize () {
    if (!this.elements.wrapper) return

    window.requestAnimationFrame(_ => {
      this.scroll.limit = this.elements.wrapper.clientHeight - window.innerHeight

      each(this.animations, animation => {
        animation.onResize && animation.onResize()
      })
    })
  }

  onTouchDown (event) {
    if (!Detection.isPhone()) return

    this.isDown = true

    this.scroll.position = this.scroll.current
    this.start = event.touches ? event.touches[0].clientY : event.clientY
  }

  onTouchMove (event) {
    if (!Detection.isPhone() || !this.isDown) return

    const y = event.touches ? event.touches[0].clientY : event.clientY
    const distance = (this.start - y) * 3

    this.scroll.target = this.scroll.position + distance
  }

  onTouchUp (event) {
    if (!Detection.isPhone()) return

    this.isDown = false
  }

  onWheel (normalized) {
    const speed = normalized.pixelY

    this.scroll.target += speed

    return speed
  }

  /**
   * Listeners.
   */
  addEventListeners () {

  }

  removeEventListeners () {

  }

  /**
   * Frames.
   */
  update () {
    this.scroll.target = clamp(0, this.scroll.limit, this.scroll.target)

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease)
    this.scroll.current = Math.floor(this.scroll.current)

    if (this.scroll.current < 0.1) {
      this.scroll.current = 0
    }

    if (this.elements.wrapper) {
      this.transform(this.elements.wrapper, this.scroll.current)
    }

    each(this.animations, animation => {
      animation.update && animation.update(this.scroll)
    })

    this.scroll.last = this.scroll.current
  }
}
