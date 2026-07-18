import { forwardRef } from 'react'
import { Dialog, Zoom } from '@mui/material'

const ZoomTransition = forwardRef(function ZoomTransition(props, ref) {
  return <Zoom ref={ref} {...props} />
})

export default function AnimatedDialog({ transitionDuration = 220, ...props }) {
  return (
    <Dialog
      TransitionComponent={ZoomTransition}
      transitionDuration={transitionDuration}
      {...props}
    />
  )
}
