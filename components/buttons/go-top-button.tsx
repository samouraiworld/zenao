"use client";

import { Button } from "../shadcn/button";

export function GoTopButton() {
  return (
    <div className="fixed right-4 bottom-16 animate-gotop-appear translate-y-32 transition-all">
      <Button>Go to top</Button>
    </div>
  );
}
