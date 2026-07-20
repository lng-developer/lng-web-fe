import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeQcLayerMove,
  computeQcLayerResize,
  computeQcWheelView,
  formatQcCustomizationValue,
  shouldSuppressBrowserZoomWheel,
} from './qcCanvas.js'

test('computeQcLayerMove changes only local overlay position', () => {
  assert.deepEqual(computeQcLayerMove({ x: 10, y: 20 }, { dx: 20, dy: 10 }), {
    x: 30,
    y: 30,
  })
})

test('computeQcLayerResize changes only local overlay geometry', () => {
  assert.deepEqual(
    computeQcLayerResize({ x: 10, y: 20, width: 100, height: 50 }, { dx: 20, dy: 10 }),
    { x: 10, y: 20, width: 120, height: 60 },
  )

  assert.deepEqual(
    computeQcLayerResize({ x: 10, y: 20, width: 100, height: 50 }, { dx: -200, dy: -100 }),
    { x: 10, y: 20, width: 24, height: 24 },
  )
})

test('computeQcWheelView zooms around pointer with ctrl and pans horizontally with shift', () => {
  const view = { stagePos: { x: 10, y: 20 }, stageScale: 2 }

  assert.deepEqual(
    computeQcWheelView({
      ...view,
      deltaY: -1,
      ctrlKey: true,
      pointer: { x: 110, y: 220 },
      zoomStep: 2,
      minScale: 0.25,
      maxScale: 50,
    }),
    { stagePos: { x: -90, y: -180 }, stageScale: 4 },
  )

  assert.deepEqual(
    computeQcWheelView({
      ...view,
      deltaX: 5,
      deltaY: 20,
      shiftKey: true,
      shiftPanMultiplier: 0.45,
    }),
    { stagePos: { x: 1, y: 20 }, stageScale: 2 },
  )
})

test('formatQcCustomizationValue keeps label value display readable', () => {
  assert.equal(formatQcCustomizationValue('Mia'), 'Mia')
  assert.equal(formatQcCustomizationValue(['Front', 'Back']), 'Front, Back')
  assert.equal(formatQcCustomizationValue({ value: 'Sky' }), 'Sky')
  assert.equal(formatQcCustomizationValue({ color: 'Blue', size: 'XL' }), 'Blue, XL')
  assert.equal(formatQcCustomizationValue(null), '-')
})

test('shouldSuppressBrowserZoomWheel only blocks browser zoom gestures', () => {
  assert.equal(shouldSuppressBrowserZoomWheel({ ctrlKey: true }), true)
  assert.equal(shouldSuppressBrowserZoomWheel({ metaKey: true }), true)
  assert.equal(shouldSuppressBrowserZoomWheel({ shiftKey: true }), false)
  assert.equal(shouldSuppressBrowserZoomWheel({}), false)
})
