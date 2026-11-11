/** Small line icons, drawn for this product. All take the text colour. */

type IconProps = { size?: number };

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** The KeepAlive mark: a keep-alive signal, one pulse on a steady line. */
export function Mark({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0a0a0a" />
      <path
        d="M5 17h6.5l2.6-7.5 4 13 2.6-5.5H27"
        fill="none"
        stroke="#4ade80"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Arrow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5l3 3 6-7" />
  </Svg>
);

/** A pointer: the subscriber's click. */
export const Pointer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 2.5l9.5 4.2-4 1.5-1.5 4z" />
  </Svg>
);

export const Chat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 4.5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H7l-3 2.5v-2.6a2 2 0 01-1.5-1.9z" />
  </Svg>
);

/** A gate: the merchant's limits. */
export const Gate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 1.8l5 1.9v3.9c0 3-2.1 5.3-5 6.6-2.9-1.3-5-3.6-5-6.6V3.7z" />
    <path d="M5.8 8.2l1.6 1.6 2.9-3.3" />
  </Svg>
);

/** A ledger: the payment record. */
export const Ledger = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
    <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" />
  </Svg>
);

export const Gauge = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="2" width="5" height="6" rx="1.2" />
    <rect x="9" y="2" width="5" height="3.5" rx="1.2" />
    <rect x="9" y="7.5" width="5" height="6.5" rx="1.2" />
    <rect x="2" y="10" width="5" height="4" rx="1.2" />
  </Svg>
);

export const People = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="5.5" r="2.3" />
    <path d="M1.8 13.2c.4-2.2 2-3.5 4.2-3.5s3.8 1.3 4.2 3.5" />
    <path d="M10.7 3.5a2.2 2.2 0 010 4.2M12.3 10.2c1 .5 1.7 1.5 1.9 3" />
  </Svg>
);

export const Pulse = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.5 8.5h3l1.6-4.5 2.8 8 1.6-3.5h4" />
  </Svg>
);

export const Sliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
    <circle cx="10" cy="4.5" r="1.5" />
    <circle cx="6" cy="11.5" r="1.5" />
  </Svg>
);

export const Refresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 8a5 5 0 01-9 3M3 8a5 5 0 019-3" />
    <path d="M12.5 2.5V5H10M3.5 13.5V11H6" />
  </Svg>
);
