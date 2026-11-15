import { ReactNode } from "react";

import { PageEnter } from "@/components/PageEnter";

const Template = ({ children }: { children: ReactNode }) => (
  <PageEnter>{children}</PageEnter>
);

export default Template;
