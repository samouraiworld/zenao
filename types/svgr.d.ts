// instruct TS that, when we do
// import Svg from './assets/file.svg'
// Svg should be in FC<SVGProps<SVGSVGElement>> type
// i.e. an SVG component
declare module "*.svg" {
  import { FC, SVGProps } from "react";

  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}

// instruct TS that, when we do
// import svg from './assets/file.svg?url'
// svg should be in string type
declare module "*.svg?url" {
  const content: string;
  export default content;
}
