declare module 'clipper-lib' {
  export type IntPoint = {
    X: number;
    Y: number;
  };

  export type Paths = IntPoint[][];

  export class Clipper {
    AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
    Execute(
      clipType: number,
      solution: Paths,
      subjFillType: number,
      clipFillType: number,
    ): boolean;
  }

  export const PolyType: {
    ptSubject: number;
    ptClip: number;
  };

  export const PolyFillType: {
    pftNonZero: number;
  };

  export const ClipType: {
    ctUnion: number;
  };
}
