// Типы bpmn-js: пакет не поставляет собственные декларации.
declare module 'bpmn-js/lib/Modeler' {
  export default class Modeler {
    constructor(options?: { container?: HTMLElement | string; keyboard?: any; [k: string]: any })
    importXML(xml: string): Promise<{ warnings: any[] }>
    saveXML(opts?: { format?: boolean }): Promise<{ xml: string }>
    get<T = any>(name: string): T
    destroy(): void
  }
}
