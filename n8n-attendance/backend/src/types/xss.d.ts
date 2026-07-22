declare module 'xss' {
  interface IFilterXSSOptions {
    whiteList?: { [key: string]: string[] | boolean };
    stripIgnoreTag?: boolean;
    stripIgnoreTagBody?: string[];
    allowCommentTag?: boolean;
    stripBlankChar?: boolean;
    css?: boolean | object;
    onIgnoreTag?: (tag: string, html: string, options: any) => string;
    onIgnoreTagAttr?: (tag: string, name: string, value: string, isWhiteAttr: boolean) => string;
    onTagAttr?: (tag: string, name: string, value: string, isWhiteAttr: boolean) => string;
    safeAttrValue?: (tag: string, name: string, value: string, cssFilter: any) => string;
    escapeHtml?: (html: string) => string;
  }

  function filterXSS(html: string, options?: IFilterXSSOptions): string;
  
  export = filterXSS;
}