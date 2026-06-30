"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type CoolMap from "./CoolMap";

const CoolMapNoSSR = dynamic(() => import("./CoolMap"), { ssr: false });

export default function CoolMapClient(props: ComponentProps<typeof CoolMap>) {
  return <CoolMapNoSSR {...props} />;
}
