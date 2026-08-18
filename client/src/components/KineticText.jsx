import React from 'react'

// Ported from Magic UI's Kinetic Text (magicui.design/docs/components/kinetic-text)
// — that component is meant to be dropped in as a standalone shadcn/Next.js
// registry component (`as="h1"` by default, sets its own font-weight), but
// here it's nested inside the hero's existing extruded <h1> layers
// (see ExtrudedHeadline in Landing.jsx), so:
//   - `as` defaults to 'span' and uses inline-flex instead of flex, so it
//     flows inline within the parent heading instead of starting a new block.
//   - It does NOT set its own base font-weight — the original resets to
//     font-light at rest, but the hero heading is font-extrabold and the
//     back extrusion layers (which stay plain text, unchanged) are drawn at
//     that same weight to fake a solid 3D block. Overriding to font-light
//     here would visually detach the front (hoverable) layer from the
//     depth behind it. It still escalates to font-900 on hover for the
//     per-letter "kinetic" bump.
//   - Color is left to inherit (`currentColor`) from whatever wraps it, so
//     it picks up the front layer's white/gold coloring automatically.
//   - Uses flex-nowrap, not the original's flex-wrap. The parent <h1> here
//     is absolutely positioned (inset: 0) inside a box sized by the resting
//     (non-hovered) width of an invisible spacer copy — see
//     ExtrudedHeadline. On hover, the per-letter grow effect pushes the
//     line wider than that box, and with flex-wrap on, the trailing
//     letters would wrap onto a second line mid-hover. Since nothing here
//     clips overflow, letting the line spill past its own box with nowrap
//     instead just extends past the edge harmlessly, which reads as "the
//     word breathes" instead of "the word breaks."
//   - Grows letters with a centered `scale()` transform instead of the
//     original's `padding-inline`. Padding is real box-model width, so
//     growing it physically shoves every letter after the hovered one
//     sideways — including out from under a stationary cursor, which
//     un-hovers it, the padding snaps back, the cursor's over it again,
//     and it oscillates (visible as jitter/flicker). `scale()` grows a
//     letter from its own center without pushing siblings, so the cursor
//     stays inside the letter for the whole animation instead of the
//     letter sliding out from under it.
export default function KineticText({ text, as: Tag = 'span', className = '' }) {
  return (
    <Tag
      className={`inline-flex flex-nowrap ${className}`}
      style={{ '--text-stroke-width': 'calc(1em * 125 / 6000)' }}
    >
      {text.split('').map((letter, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block [will-change:transform,font-weight,-webkit-text-stroke-width] [-webkit-text-stroke-color:transparent] [-webkit-text-stroke-width:var(--text-stroke-width)] [transition:transform_0.25s,_font-weight_0.25s,_-webkit-text-stroke-color_0.25s] hover:scale-125 hover:font-[900] hover:[-webkit-text-stroke-color:currentcolor] hover:[-webkit-text-stroke-width:calc(var(--text-stroke-width)*2)] has-[+span+span:hover]:font-[400] has-[+span:hover]:scale-110 has-[+span:hover]:font-[600] [:hover+&]:scale-110 [:hover+&]:font-[600] [:hover+span+&]:font-[400]"
        >
          {letter === ' ' ? ' ' : letter}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
