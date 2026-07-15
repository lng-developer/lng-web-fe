import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeQcLayerMove,
  computeQcLayerResize,
  computeQcWheelView,
  formatQcCustomizationValue,
  shouldSuppressBrowserZoomWheel,
} from './qcCanvas.js'

test('computeQcLayerMove locks movement to the dominant axis when shift is pressed', () => {
  const layer = { x: 100, y: 80 }

  assert.deepEqual(computeQcLayerMove(layer, { dx: 40, dy: 12, shiftKey: true }), {
    x: 140,
    y: 80,
  })
  assert.deepEqual(computeQcLayerMove(layer, { dx: 8, dy: 30, shiftKey: true }), {
    x: 100,
    y: 110,
  })
})

test('computeQcLayerResize supports free resize, shift ratio lock, and ctrl center resize', () => {
  const layer = { x: 100, y: 100, width: 200, height: 100 }

  assert.deepEqual(
    computeQcLayerResize(layer, {
      dx: 40,
      dy: 20,
      handle: 'bottom-right',
      minSize: 24,
    }),
    { x: 100, y: 100, width: 240, height: 120 },
  )

  assert.deepEqual(
    computeQcLayerResize(layer, {
      dx: 40,
      dy: 80,
      handle: 'bottom-right',
      minSize: 24,
      shiftKey: true,
    }),
    { x: 100, y: 100, width: 240, height: 120 },
  )

  assert.deepEqual(
    computeQcLayerResize(layer, {
      dx: 40,
      dy: 20,
      handle: 'bottom-right',
      minSize: 24,
      ctrlKey: true,
    }),
    { x: 60, y: 80, width: 280, height: 140 },
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
