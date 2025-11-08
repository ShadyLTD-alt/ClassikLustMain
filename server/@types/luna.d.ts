declare module '../LunaBug/luna.js' {
  export default class LunaBug {
    constructor();
    start(): Promise<void>;
  }
}

declare module './routes/luna.js' {
  export const router: any;
  export function setLunaInstance(instance: any): void;
}