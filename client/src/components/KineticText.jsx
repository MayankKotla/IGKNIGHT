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
//     ExtrudedHeadline. On hover, the per-letter padding/font-weight bump
//     pushes the line wider than that box, and with flex-wrap on, the
//     trailing letters would wrap onto a second line mid-hover. Since
//     nothing here clips overflow, letting the line spill past its own box
//     with nowrap instead just extends past the edge harmlessly, which
//     reads as "the word breathes" instead of "the word breaks."
export default function KineticText({ text, as: Tag = 'span', className = '' }) {
  return (
    <Tag
      className={`inline-flex flex-nowrap ${className}`}
      style={{
        '--hover-padding': 'calc(1em / 12)',
        '--text-stroke-width': 'calc(1em * 125 / 6000)',
      }}
    >
      {text.split('').map((letter, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="[will-change:font-weight,-webkit-text-stroke-width,padding] [-webkit-text-stroke-color:transparent] [-webkit-text-stroke-width:var(--text-stroke-width)] [transition:font-weight_0.4s,_-webkit-text-stroke-color_0.4s,_padding_0.4s] hover:[padding-inline:var(--hover-padding)] hover:font-[900] hover:[-webkit-text-stroke-color:currentcolor] hover:[-webkit-text-stroke-width:calc(var(--text-stroke-width)*2)] has-[+span+span:hover]:font-[400] has-[+span:hover]:[padding-inline:var(--hover-padding)] has-[+span:hover]:font-[600] [:hover+&]:[padding-inline:var(--hover-padding)] [:hover+&]:font-[600] [:hover+span+&]:font-[400]"
        >
          {letter === ' ' ? ' ' : letter}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
